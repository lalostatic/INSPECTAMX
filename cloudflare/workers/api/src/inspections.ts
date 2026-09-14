import {
  Env, AuthUser, jsonResponse, jsonError, corsHeaders,
  requireAuth, requireTenant, generateId, generateFolio
} from './middleware';

export async function handleInspections(
  request: Request,
  env: Env,
  user: AuthUser | undefined
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/inspections', '');

  if (request.method === 'OPTIONS') return corsHeaders();

  const authError = requireAuth(user);
  if (authError) return authError;
  const tenantError = requireTenant(user);
  if (tenantError) return tenantError;

  const tenantId = user!.tenant_id!;

  if (path === '' || path === '/') {
    if (request.method === 'GET') return listInspections(url, env, tenantId, user!);
    if (request.method === 'POST') return createInspection(request, env, tenantId, user!);
  }

  const match = path.match(/^\/([^/]+)$/);
  if (match) {
    const id = match[1];
    if (request.method === 'GET') return getInspection(id, env, tenantId);
    if (request.method === 'PUT') return updateInspection(request, id, env, tenantId, user!);
    if (request.method === 'DELETE') return deleteInspection(id, env, tenantId);
  }

  const statusMatch = path.match(/^\/([^/]+)\/(approve|reject|complete|start)$/);
  if (statusMatch) {
    const [, id, action] = statusMatch;
    return updateInspectionStatus(request, id, action, env, tenantId, user!);
  }

  const pointsMatch = path.match(/^\/([^/]+)\/points$/);
  if (pointsMatch) {
    const id = pointsMatch[1];
    if (request.method === 'GET') return getInspectionPoints(id, env, tenantId);
    if (request.method === 'POST') return addInspectionPoint(request, id, env, tenantId);
  }

  const mediaMatch = path.match(/^\/([^/]+)\/media$/);
  if (mediaMatch) {
    const id = mediaMatch[1];
    if (request.method === 'GET') return getInspectionMedia(id, env, tenantId);
    if (request.method === 'POST') return addInspectionMedia(request, id, env, tenantId);
  }

  return jsonError('Ruta no encontrada', 404);
}

async function listInspections(url: URL, env: Env, tenantId: string, user: AuthUser): Promise<Response> {
  const status = url.searchParams.get('status');
  const inspectorId = url.searchParams.get('inspector_id');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE i.tenant_id = ?';
  const params: (string | number)[] = [tenantId];

  if (user.role === 'inspector') {
    whereClause += ' AND i.inspector_id = ?';
    params.push(user.id);
  }

  if (status) {
    whereClause += ' AND i.status = ?';
    params.push(status);
  }

  if (inspectorId) {
    whereClause += ' AND i.inspector_id = ?';
    params.push(inspectorId);
  }

  const query = `
    SELECT i.*,
           u.name as inspector_name,
           c.container_no,
           b.name as branch_name,
           t.name as template_name
    FROM inspections i
    LEFT JOIN users u ON i.inspector_id = u.id
    LEFT JOIN containers c ON i.container_id = c.id
    LEFT JOIN branches b ON i.branch_id = b.id
    LEFT JOIN inspection_templates t ON i.template_id = t.id
    ${whereClause}
    ORDER BY i.created_at DESC
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);

  const { results } = await env.DB.prepare(query).bind(...params).all();

  const countResult = await env.DB.prepare(
    `SELECT COUNT(*) as total FROM inspections i ${whereClause}`
  ).bind(...params.slice(0, params.length - 2)).first<{ total: number }>();

  return jsonResponse({
    inspections: results,
    pagination: { page, limit, total: countResult?.total || 0 },
  });
}

async function getInspection(id: string, env: Env, tenantId: string): Promise<Response> {
  const inspection = await env.DB.prepare(
    `SELECT i.*,
            u.name as inspector_name, u.email as inspector_email,
            c.container_no, c.type as container_type, c.size as container_size,
            b.name as branch_name,
            t.name as template_name, t.config_json as template_config,
            a.name as approved_by_name
     FROM inspections i
     LEFT JOIN users u ON i.inspector_id = u.id
     LEFT JOIN containers c ON i.container_id = c.id
     LEFT JOIN branches b ON i.branch_id = b.id
     LEFT JOIN inspection_templates t ON i.template_id = t.id
     LEFT JOIN users a ON i.approved_by = a.id
     WHERE i.id = ? AND i.tenant_id = ?`
  ).bind(id, tenantId).first();

  if (!inspection) return jsonError('Inspección no encontrada', 404);

  const { results: points } = await env.DB.prepare(
    'SELECT * FROM inspection_points WHERE inspection_id = ? ORDER BY created_at'
  ).bind(id).all();

  const { results: media } = await env.DB.prepare(
    'SELECT * FROM inspection_media WHERE inspection_id = ? ORDER BY created_at'
  ).bind(id).all();

  return jsonResponse({ inspection, points, media });
}

async function createInspection(request: Request, env: Env, tenantId: string, user: AuthUser): Promise<Response> {
  let body: {
    container_id?: string; template_id?: string;
    branch_id?: string; location?: string; notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError('JSON inválido', 400);
  }

  const id = generateId();
  const folio = generateFolio('INS');
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO inspections (id, tenant_id, folio, container_id, template_id, inspector_id, branch_id, status, location, notes, started_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)`
  ).bind(
    id, tenantId, folio,
    body.container_id || null,
    body.template_id || null,
    user.id,
    body.branch_id || user.branch_id || null,
    body.location || null,
    body.notes || null,
    now, now, now
  ).run();

  const inspection = await env.DB.prepare(
    'SELECT * FROM inspections WHERE id = ?'
  ).bind(id).first();

  return jsonResponse({ inspection }, 201);
}

async function updateInspection(request: Request, id: string, env: Env, tenantId: string, user: AuthUser): Promise<Response> {
  let body: {
    location?: string; notes?: string; container_id?: string;
    template_id?: string; branch_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError('JSON inválido', 400);
  }

  const inspection = await env.DB.prepare(
    'SELECT id, status, inspector_id FROM inspections WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first<{ id: string; status: string; inspector_id: string }>();

  if (!inspection) return jsonError('Inspección no encontrada', 404);

  if (inspection.status === 'approved') {
    return jsonError('No se puede editar una inspección aprobada', 400);
  }

  if (user.role === 'inspector' && inspection.inspector_id !== user.id) {
    return jsonError('No tienes permiso para editar esta inspección', 403);
  }

  await env.DB.prepare(
    `UPDATE inspections SET
       location = COALESCE(?, location),
       notes = COALESCE(?, notes),
       container_id = COALESCE(?, container_id),
       template_id = COALESCE(?, template_id),
       branch_id = COALESCE(?, branch_id),
       updated_at = datetime('now')
     WHERE id = ? AND tenant_id = ?`
  ).bind(
    body.location || null, body.notes || null,
    body.container_id || null, body.template_id || null,
    body.branch_id || null, id, tenantId
  ).run();

  return jsonResponse({ message: 'Inspección actualizada' });
}

async function updateInspectionStatus(
  request: Request, id: string, action: string,
  env: Env, tenantId: string, user: AuthUser
): Promise<Response> {
  const statusMap: Record<string, string> = {
    start: 'in_progress',
    complete: 'completed',
    approve: 'approved',
    reject: 'rejected',
  };

  const newStatus = statusMap[action];
  if (!newStatus) return jsonError('Acción inválida', 400);

  if ((action === 'approve' || action === 'reject') && !['supervisor', 'company_admin', 'developer'].includes(user.role)) {
    return jsonError('Sin permiso para aprobar/rechazar', 403);
  }

  const updates: string[] = [`status = '${newStatus}'`, "updated_at = datetime('now')"];
  const params: string[] = [];

  if (action === 'start') {
    updates.push("started_at = datetime('now')");
  } else if (action === 'complete') {
    updates.push("completed_at = datetime('now')");
  } else if (action === 'approve') {
    updates.push("approved_by = ?", "approved_at = datetime('now')");
    params.push(user.id);
  }

  params.push(id, tenantId);

  await env.DB.prepare(
    `UPDATE inspections SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`
  ).bind(...params).run();

  return jsonResponse({ message: `Inspección ${action === 'approve' ? 'aprobada' : action === 'reject' ? 'rechazada' : 'actualizada'}` });
}

async function deleteInspection(id: string, env: Env, tenantId: string): Promise<Response> {
  await env.DB.prepare(
    'DELETE FROM inspections WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).run();
  return jsonResponse({ message: 'Inspección eliminada' });
}

async function getInspectionPoints(id: string, env: Env, tenantId: string): Promise<Response> {
  // Verify inspection belongs to tenant
  const inspection = await env.DB.prepare(
    'SELECT id FROM inspections WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first();
  if (!inspection) return jsonError('Inspección no encontrada', 404);

  const { results } = await env.DB.prepare(
    'SELECT * FROM inspection_points WHERE inspection_id = ? ORDER BY created_at'
  ).bind(id).all();

  return jsonResponse({ points: results });
}

async function addInspectionPoint(request: Request, id: string, env: Env, tenantId: string): Promise<Response> {
  let body: {
    point_code?: string; damage_type?: string; severity?: string;
    notes?: string; x_coord?: number; y_coord?: number; view?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError('JSON inválido', 400);
  }

  const pointId = generateId();
  await env.DB.prepare(
    `INSERT INTO inspection_points (id, inspection_id, point_code, damage_type, severity, notes, x_coord, y_coord, view)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    pointId, id,
    body.point_code || 'P-001',
    body.damage_type || null,
    body.severity || 'minor',
    body.notes || null,
    body.x_coord || null,
    body.y_coord || null,
    body.view || 'side_left'
  ).run();

  return jsonResponse({ point_id: pointId }, 201);
}

async function getInspectionMedia(id: string, env: Env, tenantId: string): Promise<Response> {
  const inspection = await env.DB.prepare(
    'SELECT id FROM inspections WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first();
  if (!inspection) return jsonError('Inspección no encontrada', 404);

  const { results } = await env.DB.prepare(
    'SELECT * FROM inspection_media WHERE inspection_id = ? ORDER BY created_at DESC'
  ).bind(id).all();

  return jsonResponse({ media: results });
}

async function addInspectionMedia(request: Request, id: string, env: Env, tenantId: string): Promise<Response> {
  let body: { type?: string; filename?: string; offline_id?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError('JSON inválido', 400);
  }

  const mediaId = generateId();
  const r2Key = `${tenantId}/inspections/${id}/${mediaId}`;

  await env.DB.prepare(
    `INSERT INTO inspection_media (id, inspection_id, type, r2_key, filename, synced, offline_id)
     VALUES (?, ?, ?, ?, ?, 1, ?)`
  ).bind(mediaId, id, body.type || 'photo', r2Key, body.filename || null, body.offline_id || null).run();

  return jsonResponse({ media_id: mediaId, r2_key: r2Key }, 201);
}
