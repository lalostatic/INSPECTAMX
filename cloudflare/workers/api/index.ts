import { handleAuth } from './src/auth';
import { handleTenants } from './src/tenants';
import { handleInspections } from './src/inspections';
import { handleContainers } from './src/containers';
import { handleInventory } from './src/inventory';
import { handleMR } from './src/mr';
import { handleReports } from './src/reports';
import { validateSession, jsonError, jsonResponse, corsHeaders } from './src/middleware';
import type { Env, AuthUser } from './src/middleware';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return corsHeaders();
    }

    // Health check
    if (path === '/health' || path === '/api/health') {
      return jsonResponse({
        status: 'ok',
        service: 'INSPECTAMX API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      });
    }

    // Auth routes (no session required)
    if (path.startsWith('/api/auth')) {
      return handleAuth(request, env);
    }

    // Validate session for all other routes
    const user: AuthUser | undefined = (await validateSession(request, env)) ?? undefined;

    // Dev-only routes
    if (path.startsWith('/api/dev')) {
      if (!user || user.role !== 'developer') {
        return jsonError('Acceso no autorizado', 403);
      }
      return handleDevRoutes(request, url, env, user);
    }

    // Protected routes
    if (path.startsWith('/api/tenants')) {
      return handleTenants(request, env, user);
    }

    if (path.startsWith('/api/inspections')) {
      return handleInspections(request, env, user);
    }

    if (path.startsWith('/api/containers')) {
      return handleContainers(request, env, user);
    }

    if (path.startsWith('/api/inventory')) {
      return handleInventory(request, env, user);
    }

    if (path.startsWith('/api/mr')) {
      return handleMR(request, env, user);
    }

    if (path.startsWith('/api/reports')) {
      return handleReports(request, env, user);
    }

    if (path.startsWith('/api/users')) {
      return handleUsers(request, url, env, user);
    }

    if (path.startsWith('/api/tasks')) {
      return handleTasks(request, url, env, user);
    }

    if (path.startsWith('/api/media/upload')) {
      return handleMediaUpload(request, env, user);
    }

    if (path.startsWith('/api/catalog')) {
      return handleCatalog(request, url, env, user);
    }

    return jsonError('Ruta no encontrada', 404);
  },
};

// Users handler
async function handleUsers(request: Request, url: URL, env: Env, user: AuthUser | undefined): Promise<Response> {
  if (!user) return jsonError('No autenticado', 401);

  const path = url.pathname.replace('/api/users', '');

  if (path === '' || path === '/') {
    if (request.method === 'GET') {
      const tenantId = user.tenant_id;
      if (!tenantId && user.role !== 'developer') return jsonError('Sin tenant', 403);

      let query = 'SELECT id, email, name, role, branch_id, status, created_at FROM users';
      const params: (string | null)[] = [];

      if (tenantId) {
        query += ' WHERE tenant_id = ?';
        params.push(tenantId);
      }

      query += ' ORDER BY name';
      const { results } = await env.DB.prepare(query).bind(...params).all();
      return jsonResponse({ users: results });
    }

    if (request.method === 'POST') {
      if (!['developer', 'company_admin'].includes(user.role)) {
        return jsonError('Sin permiso', 403);
      }

      let body: { email?: string; name?: string; role?: string; password?: string; branch_id?: string };
      try { body = await request.json(); } catch { return jsonError('JSON inválido', 400); }

      if (!body.email || !body.name || !body.role || !body.password) {
        return jsonError('Campos requeridos: email, name, role, password', 400);
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(body.password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { generateId } = await import('./src/middleware');
      const id = generateId();
      await env.DB.prepare(
        `INSERT INTO users (id, tenant_id, email, password_hash, name, role, branch_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`
      ).bind(id, user.tenant_id, body.email.toLowerCase(), passwordHash, body.name, body.role, body.branch_id || null).run();

      return jsonResponse({ user_id: id }, 201);
    }
  }

  const match = path.match(/^\/([^/]+)$/);
  if (match) {
    const userId = match[1];
    if (request.method === 'PUT') {
      let body: { name?: string; role?: string; status?: string; branch_id?: string };
      try { body = await request.json(); } catch { return jsonError('JSON inválido', 400); }

      await env.DB.prepare(
        `UPDATE users SET
           name = COALESCE(?, name),
           role = COALESCE(?, role),
           status = COALESCE(?, status),
           branch_id = COALESCE(?, branch_id),
           updated_at = datetime('now')
         WHERE id = ?`
      ).bind(body.name || null, body.role || null, body.status || null, body.branch_id || null, userId).run();

      return jsonResponse({ message: 'Usuario actualizado' });
    }
  }

  return jsonError('Ruta no encontrada', 404);
}

// Tasks handler
async function handleTasks(request: Request, url: URL, env: Env, user: AuthUser | undefined): Promise<Response> {
  if (!user || !user.tenant_id) return jsonError('No autenticado', 401);
  const tenantId = user.tenant_id;
  const path = url.pathname.replace('/api/tasks', '');

  if (path === '' || path === '/') {
    if (request.method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT t.*, u.name as assigned_to_name, c.name as created_by_name
         FROM tasks t
         LEFT JOIN users u ON t.assigned_to = u.id
         LEFT JOIN users c ON t.created_by = c.id
         WHERE t.tenant_id = ?
         ORDER BY t.created_at DESC`
      ).bind(tenantId).all();
      return jsonResponse({ tasks: results });
    }

    if (request.method === 'POST') {
      let body: { title?: string; description?: string; assigned_to?: string; priority?: string; due_date?: string };
      try { body = await request.json(); } catch { return jsonError('JSON inválido', 400); }

      if (!body.title) return jsonError('Título requerido', 400);

      const { generateId } = await import('./src/middleware');
      const id = generateId();
      await env.DB.prepare(
        `INSERT INTO tasks (id, tenant_id, title, description, assigned_to, created_by, priority, status, due_date, branch_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
      ).bind(
        id, tenantId, body.title, body.description || null,
        body.assigned_to || null, user.id, body.priority || 'normal',
        body.due_date || null, user.branch_id || null
      ).run();

      return jsonResponse({ task_id: id }, 201);
    }
  }

  return jsonError('Ruta no encontrada', 404);
}

// Media upload to R2
async function handleMediaUpload(request: Request, env: Env, user: AuthUser | undefined): Promise<Response> {
  if (!user || !user.tenant_id) return jsonError('No autenticado', 401);

  if (request.method !== 'POST') return jsonError('Método no permitido', 405);

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const entityType = formData.get('entity_type') as string;
  const entityId = formData.get('entity_id') as string;

  if (!file) return jsonError('Archivo requerido', 400);

  const { generateId } = await import('./src/middleware');
  const fileId = generateId();
  const ext = file.name.split('.').pop() || 'bin';
  const r2Key = `${user.tenant_id}/${entityType}/${entityId}/${fileId}.${ext}`;

  await env.R2.put(r2Key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
    customMetadata: {
      uploaded_by: user.id,
      entity_type: entityType,
      entity_id: entityId,
      original_name: file.name,
    },
  });

  return jsonResponse({
    r2_key: r2Key,
    url: `https://media.inspectamx.com/${r2Key}`,
    size: file.size,
    type: file.type,
  }, 201);
}

// Catalog handler
async function handleCatalog(request: Request, url: URL, env: Env, user: AuthUser | undefined): Promise<Response> {
  if (!user || !user.tenant_id) return jsonError('No autenticado', 401);
  const tenantId = user.tenant_id;
  const path = url.pathname.replace('/api/catalog', '');

  if (path === '/equipment-types' || path === '/equipment-types/') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM catalog_equipment_types WHERE tenant_id = ? AND active = 1 ORDER BY name'
    ).bind(tenantId).all();
    return jsonResponse({ equipment_types: results });
  }

  if (path === '/damage-types' || path === '/damage-types/') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM catalog_damage_types WHERE tenant_id = ? AND active = 1 ORDER BY name'
    ).bind(tenantId).all();
    return jsonResponse({ damage_types: results });
  }

  if (path === '/inspection-types' || path === '/inspection-types/') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM catalog_inspection_types WHERE tenant_id = ? AND active = 1 ORDER BY name'
    ).bind(tenantId).all();
    return jsonResponse({ inspection_types: results });
  }

  if (path === '/branches' || path === '/branches/') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM branches WHERE tenant_id = ? AND status = \'active\' ORDER BY name'
    ).bind(tenantId).all();
    return jsonResponse({ branches: results });
  }

  return jsonError('Ruta no encontrada', 404);
}

// Dev-only routes
async function handleDevRoutes(request: Request, url: URL, env: Env, user: AuthUser | undefined): Promise<Response> {
  const path = url.pathname.replace('/api/dev', '');

  if (path === '/stats') {
    const [tenantCount, userCount, inspCount, containerCount] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) as count FROM tenants WHERE id != \'system\'').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE tenant_id IS NOT NULL').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) as count FROM inspections WHERE date(created_at) = date(\'now\')').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) as count FROM containers').first<{ count: number }>(),
    ]);

    return jsonResponse({
      total_tenants: tenantCount?.count || 0,
      total_users: userCount?.count || 0,
      inspections_today: inspCount?.count || 0,
      total_containers: containerCount?.count || 0,
    });
  }

  return jsonError('Ruta de dev no encontrada', 404);
}
