import {
  Env, AuthUser, jsonResponse, jsonError, corsHeaders,
  requireRole, generateId
} from './middleware';

export async function handleTenants(
  request: Request,
  env: Env,
  user: AuthUser | undefined
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/tenants', '');

  if (request.method === 'OPTIONS') return corsHeaders();

  const roleError = requireRole(user, ['developer']);
  if (roleError) return roleError;

  if (path === '' || path === '/') {
    if (request.method === 'GET') return listTenants(env);
    if (request.method === 'POST') return createTenant(request, env, user!);
  }

  const match = path.match(/^\/([^/]+)$/);
  if (match) {
    const tenantId = match[1];
    if (request.method === 'GET') return getTenant(tenantId, env);
    if (request.method === 'PUT') return updateTenant(request, tenantId, env);
    if (request.method === 'DELETE') return deleteTenant(tenantId, env);
  }

  const toggleMatch = path.match(/^\/([^/]+)\/(suspend|activate)$/);
  if (toggleMatch) {
    const [, tenantId, action] = toggleMatch;
    return toggleTenantStatus(tenantId, action, env);
  }

  return jsonError('Ruta no encontrada', 404);
}

async function listTenants(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT t.id, t.name, t.slug, t.status, t.plan, t.created_at,
            COUNT(DISTINCT u.id) as user_count,
            COUNT(DISTINCT b.id) as branch_count
     FROM tenants t
     LEFT JOIN users u ON u.tenant_id = t.id
     LEFT JOIN branches b ON b.tenant_id = t.id
     WHERE t.id != 'system'
     GROUP BY t.id
     ORDER BY t.created_at DESC`
  ).all();

  return jsonResponse({ tenants: results });
}

async function getTenant(tenantId: string, env: Env): Promise<Response> {
  const tenant = await env.DB.prepare(
    `SELECT t.*, COUNT(DISTINCT u.id) as user_count
     FROM tenants t
     LEFT JOIN users u ON u.tenant_id = t.id
     WHERE t.id = ?
     GROUP BY t.id`
  ).bind(tenantId).first();

  if (!tenant) return jsonError('Empresa no encontrada', 404);

  const branches = await env.DB.prepare(
    'SELECT * FROM branches WHERE tenant_id = ? ORDER BY name'
  ).bind(tenantId).all();

  const users = await env.DB.prepare(
    'SELECT id, email, name, role, status, created_at FROM users WHERE tenant_id = ? ORDER BY name'
  ).bind(tenantId).all();

  return jsonResponse({ tenant, branches: branches.results, users: users.results });
}

async function createTenant(request: Request, env: Env, creator: AuthUser): Promise<Response> {
  let body: {
    name?: string; slug?: string; plan?: string;
    adminEmail?: string; adminName?: string; adminPassword?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError('JSON inválido', 400);
  }

  const { name, slug, plan = 'basic', adminEmail, adminName, adminPassword } = body;

  if (!name || !slug || !adminEmail || !adminName || !adminPassword) {
    return jsonError('Campos requeridos: name, slug, adminEmail, adminName, adminPassword', 400);
  }

  const slugClean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  // Check slug uniqueness
  const existing = await env.DB.prepare(
    'SELECT id FROM tenants WHERE slug = ?'
  ).bind(slugClean).first();

  if (existing) return jsonError('El slug ya está en uso', 409);

  const tenantId = slugClean;
  const branchId = generateId();
  const adminId = generateId();

  // Simulate password hash (in production use bcrypt)
  const encoder = new TextEncoder();
  const data = encoder.encode(adminPassword);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Create tenant
  await env.DB.prepare(
    `INSERT INTO tenants (id, name, slug, status, plan, config_json)
     VALUES (?, ?, ?, 'active', ?, ?)`
  ).bind(
    tenantId, name, slugClean, plan,
    JSON.stringify({ modules: ['inspections', 'mr', 'inventory'], created_by: creator.id })
  ).run();

  // Create main branch
  await env.DB.prepare(
    `INSERT INTO branches (id, tenant_id, name, status) VALUES (?, ?, 'Sucursal Principal', 'active')`
  ).bind(branchId, tenantId).run();

  // Create admin user
  await env.DB.prepare(
    `INSERT INTO users (id, tenant_id, email, password_hash, name, role, branch_id, status)
     VALUES (?, ?, ?, ?, ?, 'company_admin', ?, 'active')`
  ).bind(adminId, tenantId, adminEmail.toLowerCase(), passwordHash, adminName, branchId).run();

  // Seed base catalog
  await seedBaseCatalog(env, tenantId);

  return jsonResponse({
    message: 'Empresa creada exitosamente',
    tenant: { id: tenantId, name, slug: slugClean, plan },
    admin: { id: adminId, email: adminEmail, name: adminName },
    branch: { id: branchId, name: 'Sucursal Principal' },
  }, 201);
}

async function seedBaseCatalog(env: Env, tenantId: string): Promise<void> {
  const equipmentTypes = [
    { name: 'Contenedor 20 pies', code: 'CONT-20' },
    { name: 'Contenedor 40 pies', code: 'CONT-40' },
    { name: 'Chasis 20 pies', code: 'CHAS-20' },
    { name: 'Chasis 40 pies', code: 'CHAS-40' },
  ];

  const damageTypes = [
    { name: 'Abolladura', code: 'ABL', severity_default: 'minor' },
    { name: 'Corrosión', code: 'COR', severity_default: 'moderate' },
    { name: 'Perforación', code: 'PER', severity_default: 'severe' },
    { name: 'Fisura', code: 'FIS', severity_default: 'moderate' },
  ];

  const inspectionTypes = [
    { name: 'Inspección de entrada', code: 'ENT' },
    { name: 'Inspección de salida', code: 'SAL' },
    { name: 'Inspección de daños', code: 'DAN' },
  ];

  for (const eq of equipmentTypes) {
    await env.DB.prepare(
      'INSERT INTO catalog_equipment_types (id, tenant_id, name, code) VALUES (?, ?, ?, ?)'
    ).bind(generateId(), tenantId, eq.name, eq.code).run();
  }

  for (const dt of damageTypes) {
    await env.DB.prepare(
      'INSERT INTO catalog_damage_types (id, tenant_id, name, code, severity_default) VALUES (?, ?, ?, ?, ?)'
    ).bind(generateId(), tenantId, dt.name, dt.code, dt.severity_default).run();
  }

  for (const it of inspectionTypes) {
    await env.DB.prepare(
      'INSERT INTO catalog_inspection_types (id, tenant_id, name, code) VALUES (?, ?, ?, ?)'
    ).bind(generateId(), tenantId, it.name, it.code).run();
  }

  // Default inspection template
  await env.DB.prepare(
    `INSERT INTO inspection_templates (id, tenant_id, name, type, description, config_json, active)
     VALUES (?, ?, 'Inspección General', 'container', 'Plantilla estándar', ?, 1)`
  ).bind(
    generateId(), tenantId,
    JSON.stringify({ views: ['top', 'side_left', 'side_right', 'front', 'rear'], require_photo: true })
  ).run();
}

async function updateTenant(request: Request, tenantId: string, env: Env): Promise<Response> {
  let body: { name?: string; plan?: string; config_json?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError('JSON inválido', 400);
  }

  const { name, plan, config_json } = body;

  await env.DB.prepare(
    `UPDATE tenants SET
       name = COALESCE(?, name),
       plan = COALESCE(?, plan),
       config_json = COALESCE(?, config_json),
       updated_at = datetime('now')
     WHERE id = ?`
  ).bind(name || null, plan || null, config_json || null, tenantId).run();

  return jsonResponse({ message: 'Empresa actualizada' });
}

async function deleteTenant(tenantId: string, env: Env): Promise<Response> {
  if (tenantId === 'system' || tenantId === 'myrmex') {
    return jsonError('No se puede eliminar este tenant', 403);
  }

  await env.DB.prepare('DELETE FROM tenants WHERE id = ?').bind(tenantId).run();
  return jsonResponse({ message: 'Empresa eliminada' });
}

async function toggleTenantStatus(tenantId: string, action: string, env: Env): Promise<Response> {
  const status = action === 'suspend' ? 'suspended' : 'active';
  await env.DB.prepare(
    'UPDATE tenants SET status = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).bind(status, tenantId).run();
  return jsonResponse({ message: `Empresa ${action === 'suspend' ? 'suspendida' : 'activada'}` });
}
