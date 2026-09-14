import {
  Env, AuthUser, jsonResponse, jsonError, corsHeaders,
  requireAuth, requireTenant, generateId
} from './middleware';

// ISO 6346 container number validation
function validateContainerNumber(containerNo: string): boolean {
  const clean = containerNo.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length !== 11) return false;
  if (!/^[A-Z]{4}[0-9]{7}$/.test(clean)) return false;

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const values: Record<string, number> = {};
  let val = 10;
  for (const letter of letters) {
    if (val === 11 || val === 22 || val === 33) val++;
    values[letter] = val++;
  }

  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const char = clean[i];
    const charVal = /[A-Z]/.test(char) ? values[char] : parseInt(char);
    sum += charVal * Math.pow(2, i);
  }

  const checkDigit = sum % 11 % 10;
  return checkDigit === parseInt(clean[10]);
}

export async function handleContainers(
  request: Request,
  env: Env,
  user: AuthUser | undefined
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/containers', '');

  if (request.method === 'OPTIONS') return corsHeaders();

  const authError = requireAuth(user);
  if (authError) return authError;
  const tenantError = requireTenant(user);
  if (tenantError) return tenantError;

  const tenantId = user!.tenant_id!;

  if (path === '' || path === '/') {
    if (request.method === 'GET') return listContainers(url, env, tenantId);
    if (request.method === 'POST') return createContainer(request, env, tenantId, user!);
  }

  const match = path.match(/^\/([^/]+)$/);
  if (match) {
    const id = match[1];
    if (request.method === 'GET') return getContainer(id, env, tenantId);
    if (request.method === 'PUT') return updateContainer(request, id, env, tenantId);
    if (request.method === 'DELETE') return deleteContainer(id, env, tenantId);
  }

  const moveMatch = path.match(/^\/([^/]+)\/movement$/);
  if (moveMatch) {
    const id = moveMatch[1];
    if (request.method === 'POST') return recordMovement(request, id, env, tenantId, user!);
    if (request.method === 'GET') return getMovements(id, env, tenantId);
  }

  const statsMatch = path.match(/^\/stats$/);
  if (statsMatch && request.method === 'GET') {
    return getContainerStats(env, tenantId);
  }

  return jsonError('Ruta no encontrada', 404);
}

async function listContainers(url: URL, env: Env, tenantId: string): Promise<Response> {
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  const search = url.searchParams.get('search');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE tenant_id = ?';
  const params: (string | number)[] = [tenantId];

  if (status) {
    whereClause += ' AND status = ?';
    params.push(status);
  }

  if (type) {
    whereClause += ' AND type = ?';
    params.push(type);
  }

  if (search) {
    whereClause += ' AND (container_no LIKE ? OR owner LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const { results } = await env.DB.prepare(
    `SELECT c.*, b.name as branch_name,
            location_bay || '-' || location_row || '-' || location_slot as location
     FROM containers c
     LEFT JOIN branches b ON c.branch_id = b.id
     ${whereClause}
     ORDER BY c.updated_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  const countResult = await env.DB.prepare(
    `SELECT COUNT(*) as total FROM containers ${whereClause}`
  ).bind(...params).first<{ total: number }>();

  return jsonResponse({
    containers: results,
    pagination: { page, limit, total: countResult?.total || 0 },
  });
}

async function getContainer(id: string, env: Env, tenantId: string): Promise<Response> {
  const container = await env.DB.prepare(
    `SELECT c.*, b.name as branch_name,
            location_bay || '-' || location_row || '-' || location_slot as location
     FROM containers c
     LEFT JOIN branches b ON c.branch_id = b.id
     WHERE c.id = ? AND c.tenant_id = ?`
  ).bind(id, tenantId).first();

  if (!container) return jsonError('Contenedor no encontrado', 404);

  const { results: movements } = await env.DB.prepare(
    `SELECT cm.*, u.name as user_name
     FROM container_movements cm
     LEFT JOIN users u ON cm.user_id = u.id
     WHERE cm.container_id = ?
     ORDER BY cm.created_at DESC
     LIMIT 10`
  ).bind(id).all();

  const { results: inspections } = await env.DB.prepare(
    `SELECT i.id, i.folio, i.status, i.created_at, u.name as inspector_name
     FROM inspections i
     LEFT JOIN users u ON i.inspector_id = u.id
     WHERE i.container_id = ? AND i.tenant_id = ?
     ORDER BY i.created_at DESC
     LIMIT 5`
  ).bind(id, tenantId).all();

  return jsonResponse({ container, movements, inspections });
}

async function createContainer(request: Request, env: Env, tenantId: string, user: AuthUser): Promise<Response> {
  let body: {
    container_no?: string; type?: string; size?: string; owner?: string;
    iso_code?: string; location_bay?: string; location_row?: string;
    location_slot?: string; branch_id?: string; notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError('JSON inválido', 400);
  }

  if (!body.container_no) return jsonError('Número de contenedor requerido', 400);

  // Validate ISO 6346 (optional, warn if invalid)
  const containerNo = body.container_no.toUpperCase().replace(/\s/g, '');
  const isValidIso = validateContainerNumber(containerNo);

  // Check uniqueness
  const existing = await env.DB.prepare(
    'SELECT id FROM containers WHERE tenant_id = ? AND container_no = ?'
  ).bind(tenantId, containerNo).first();

  if (existing) return jsonError('Número de contenedor ya registrado', 409);

  const id = generateId();
  await env.DB.prepare(
    `INSERT INTO containers (id, tenant_id, container_no, type, size, owner, iso_code, status, location_bay, location_row, location_slot, branch_id, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'in_yard', ?, ?, ?, ?, ?)`
  ).bind(
    id, tenantId, containerNo,
    body.type || 'container',
    body.size || '40',
    body.owner || null,
    body.iso_code || null,
    body.location_bay || null,
    body.location_row || null,
    body.location_slot || null,
    body.branch_id || user.branch_id || null,
    body.notes || null
  ).run();

  // Record check-in movement
  await env.DB.prepare(
    `INSERT INTO container_movements (id, tenant_id, container_id, movement_type, to_location, user_id, notes)
     VALUES (?, ?, ?, 'check_in', ?, ?, 'Registro inicial')`
  ).bind(
    generateId(), tenantId, id,
    body.location_bay ? `${body.location_bay}-${body.location_row}-${body.location_slot}` : null,
    user.id
  ).run();

  return jsonResponse({
    container_id: id,
    container_no: containerNo,
    iso_valid: isValidIso,
  }, 201);
}

async function updateContainer(request: Request, id: string, env: Env, tenantId: string): Promise<Response> {
  let body: {
    status?: string; location_bay?: string; location_row?: string;
    location_slot?: string; owner?: string; notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError('JSON inválido', 400);
  }

  await env.DB.prepare(
    `UPDATE containers SET
       status = COALESCE(?, status),
       location_bay = COALESCE(?, location_bay),
       location_row = COALESCE(?, location_row),
       location_slot = COALESCE(?, location_slot),
       owner = COALESCE(?, owner),
       notes = COALESCE(?, notes),
       updated_at = datetime('now')
     WHERE id = ? AND tenant_id = ?`
  ).bind(
    body.status || null, body.location_bay || null,
    body.location_row || null, body.location_slot || null,
    body.owner || null, body.notes || null,
    id, tenantId
  ).run();

  return jsonResponse({ message: 'Contenedor actualizado' });
}

async function deleteContainer(id: string, env: Env, tenantId: string): Promise<Response> {
  await env.DB.prepare(
    'DELETE FROM containers WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).run();
  return jsonResponse({ message: 'Contenedor eliminado' });
}

async function recordMovement(request: Request, containerId: string, env: Env, tenantId: string, user: AuthUser): Promise<Response> {
  let body: {
    movement_type?: string; from_location?: string;
    to_location?: string; notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError('JSON inválido', 400);
  }

  const validTypes = ['check_in', 'check_out', 'relocate', 'maintenance_in', 'maintenance_out'];
  if (!body.movement_type || !validTypes.includes(body.movement_type)) {
    return jsonError('Tipo de movimiento inválido', 400);
  }

  const movId = generateId();
  await env.DB.prepare(
    `INSERT INTO container_movements (id, tenant_id, container_id, movement_type, from_location, to_location, user_id, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    movId, tenantId, containerId,
    body.movement_type, body.from_location || null,
    body.to_location || null, user.id, body.notes || null
  ).run();

  // Update container status based on movement type
  const statusMap: Record<string, string> = {
    check_out: 'out',
    check_in: 'in_yard',
    maintenance_in: 'maintenance',
    maintenance_out: 'in_yard',
  };

  if (statusMap[body.movement_type]) {
    await env.DB.prepare(
      `UPDATE containers SET status = ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?`
    ).bind(statusMap[body.movement_type], containerId, tenantId).run();
  }

  return jsonResponse({ movement_id: movId }, 201);
}

async function getMovements(containerId: string, env: Env, tenantId: string): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT cm.*, u.name as user_name
     FROM container_movements cm
     LEFT JOIN users u ON cm.user_id = u.id
     WHERE cm.container_id = ? AND cm.tenant_id = ?
     ORDER BY cm.created_at DESC`
  ).bind(containerId, tenantId).all();

  return jsonResponse({ movements: results });
}

async function getContainerStats(env: Env, tenantId: string): Promise<Response> {
  const stats = await env.DB.prepare(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'in_yard' THEN 1 ELSE 0 END) as in_yard,
       SUM(CASE WHEN status = 'out' THEN 1 ELSE 0 END) as out,
       SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
       SUM(CASE WHEN status = 'damaged' THEN 1 ELSE 0 END) as damaged,
       SUM(CASE WHEN type = 'container' THEN 1 ELSE 0 END) as containers,
       SUM(CASE WHEN type = 'chassis' THEN 1 ELSE 0 END) as chassis
     FROM containers WHERE tenant_id = ?`
  ).bind(tenantId).first();

  return jsonResponse({ stats });
}
