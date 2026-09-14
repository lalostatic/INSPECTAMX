import {
  Env, AuthUser, jsonResponse, jsonError, corsHeaders,
  requireAuth, requireTenant, generateId, generateFolio
} from './middleware';

export async function handleMR(
  request: Request,
  env: Env,
  user: AuthUser | undefined
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/mr', '');

  if (request.method === 'OPTIONS') return corsHeaders();

  const authError = requireAuth(user);
  if (authError) return authError;
  const tenantError = requireTenant(user);
  if (tenantError) return tenantError;

  const tenantId = user!.tenant_id!;

  if (path === '' || path === '/') {
    if (request.method === 'GET') return listWorkOrders(url, env, tenantId, user!);
    if (request.method === 'POST') return createWorkOrder(request, env, tenantId, user!);
  }

  const match = path.match(/^\/([^/]+)$/);
  if (match) {
    const id = match[1];
    if (request.method === 'GET') return getWorkOrder(id, env, tenantId);
    if (request.method === 'PUT') return updateWorkOrder(request, id, env, tenantId, user!);
    if (request.method === 'DELETE') return deleteWorkOrder(id, env, tenantId);
  }

  const statusMatch = path.match(/^\/([^/]+)\/(start|complete|cancel)$/);
  if (statusMatch) {
    const [, id, action] = statusMatch;
    return updateWorkOrderStatus(request, id, action, env, tenantId, user!);
  }

  const itemsMatch = path.match(/^\/([^/]+)\/items$/);
  if (itemsMatch) {
    const id = itemsMatch[1];
    if (request.method === 'GET') return getWorkOrderItems(id, env, tenantId);
    if (request.method === 'POST') return addWorkOrderItem(request, id, env, tenantId);
  }

  const mediaMatch = path.match(/^\/([^/]+)\/media$/);
  if (mediaMatch) {
    const id = mediaMatch[1];
    if (request.method === 'POST') return addWorkOrderMedia(request, id, env, tenantId);
  }

  const statsMatch = path.match(/^\/stats$/);
  if (statsMatch && request.method === 'GET') {
    return getWorkOrderStats(env, tenantId);
  }

  return jsonError('Ruta no encontrada', 404);
}

async function listWorkOrders(url: URL, env: Env, tenantId: string, user: AuthUser): Promise<Response> {
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let where = 'WHERE wo.tenant_id = ?';
  const params: (string | number)[] = [tenantId];

  if (user.role === 'mr_tech') {
    where += ' AND wo.tech_id = ?';
    params.push(user.id);
  }

  if (status) {
    where += ' AND wo.status = ?';
    params.push(status);
  }

  if (type) {
    where += ' AND wo.type = ?';
    params.push(type);
  }

  const { results } = await env.DB.prepare(
    `SELECT wo.*,
            u.name as tech_name,
            c.container_no,
            b.name as branch_name,
            i.folio as inspection_folio
     FROM work_orders wo
     LEFT JOIN users u ON wo.tech_id = u.id
     LEFT JOIN containers c ON wo.container_id = c.id
     LEFT JOIN branches b ON wo.branch_id = b.id
     LEFT JOIN inspections i ON wo.inspection_id = i.id
     ${where}
     ORDER BY wo.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  const countResult = await env.DB.prepare(
    `SELECT COUNT(*) as total FROM work_orders wo ${where}`
  ).bind(...params).first<{ total: number }>();

  return jsonResponse({
    work_orders: results,
    pagination: { page, limit, total: countResult?.total || 0 },
  });
}

async function getWorkOrder(id: string, env: Env, tenantId: string): Promise<Response> {
  const workOrder = await env.DB.prepare(
    `SELECT wo.*,
            u.name as tech_name, u.email as tech_email,
            c.container_no, c.type as container_type,
            b.name as branch_name,
            i.folio as inspection_folio
     FROM work_orders wo
     LEFT JOIN users u ON wo.tech_id = u.id
     LEFT JOIN containers c ON wo.container_id = c.id
     LEFT JOIN branches b ON wo.branch_id = b.id
     LEFT JOIN inspections i ON wo.inspection_id = i.id
     WHERE wo.id = ? AND wo.tenant_id = ?`
  ).bind(id, tenantId).first();

  if (!workOrder) return jsonError('Orden de trabajo no encontrada', 404);

  const { results: items } = await env.DB.prepare(
    `SELECT woi.*, s.name as supply_name, s.sku
     FROM work_order_items woi
     LEFT JOIN supplies s ON woi.supply_id = s.id
     WHERE woi.work_order_id = ?`
  ).bind(id).all();

  const { results: media } = await env.DB.prepare(
    'SELECT * FROM work_order_media WHERE work_order_id = ? ORDER BY created_at DESC'
  ).bind(id).all();

  return jsonResponse({ work_order: workOrder, items, media });
}

async function createWorkOrder(request: Request, env: Env, tenantId: string, user: AuthUser): Promise<Response> {
  let body: {
    inspection_id?: string; container_id?: string; tech_id?: string;
    branch_id?: string; type?: string; description?: string; priority?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError('JSON inválido', 400);
  }

  const id = generateId();
  const folio = generateFolio('OT');
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO work_orders (id, tenant_id, folio, inspection_id, container_id, tech_id, branch_id, status, type, description, priority, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`
  ).bind(
    id, tenantId, folio,
    body.inspection_id || null,
    body.container_id || null,
    body.tech_id || null,
    body.branch_id || user.branch_id || null,
    body.type || 'repair',
    body.description || null,
    body.priority || 'normal',
    now, now
  ).run();

  return jsonResponse({ work_order_id: id, folio }, 201);
}

async function updateWorkOrder(request: Request, id: string, env: Env, tenantId: string, user: AuthUser): Promise<Response> {
  let body: {
    description?: string; priority?: string; tech_id?: string;
    labor_hours?: number; labor_cost?: number;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError('JSON inválido', 400);
  }

  await env.DB.prepare(
    `UPDATE work_orders SET
       description = COALESCE(?, description),
       priority = COALESCE(?, priority),
       tech_id = COALESCE(?, tech_id),
       labor_hours = COALESCE(?, labor_hours),
       labor_cost = COALESCE(?, labor_cost),
       updated_at = datetime('now')
     WHERE id = ? AND tenant_id = ?`
  ).bind(
    body.description || null, body.priority || null, body.tech_id || null,
    body.labor_hours ?? null, body.labor_cost ?? null, id, tenantId
  ).run();

  // Recalculate total cost
  const items = await env.DB.prepare(
    'SELECT SUM(total_cost) as items_total FROM work_order_items WHERE work_order_id = ?'
  ).bind(id).first<{ items_total: number }>();

  const wo = await env.DB.prepare(
    'SELECT labor_cost FROM work_orders WHERE id = ?'
  ).bind(id).first<{ labor_cost: number }>();

  const totalCost = (wo?.labor_cost || 0) + (items?.items_total || 0);
  await env.DB.prepare(
    `UPDATE work_orders SET total_cost = ? WHERE id = ? AND tenant_id = ?`
  ).bind(totalCost, id, tenantId).run();

  return jsonResponse({ message: 'Orden de trabajo actualizada' });
}

async function deleteWorkOrder(id: string, env: Env, tenantId: string): Promise<Response> {
  await env.DB.prepare(
    'DELETE FROM work_orders WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).run();
  return jsonResponse({ message: 'Orden de trabajo eliminada' });
}

async function updateWorkOrderStatus(
  request: Request, id: string, action: string,
  env: Env, tenantId: string, _user: AuthUser
): Promise<Response> {
  const statusMap: Record<string, string> = {
    start: 'in_progress',
    complete: 'completed',
    cancel: 'cancelled',
  };

  const newStatus = statusMap[action];
  if (!newStatus) return jsonError('Acción inválida', 400);

  const updates: string[] = [`status = '${newStatus}'`, "updated_at = datetime('now')"];

  if (action === 'start') {
    updates.push("started_at = datetime('now')");
  } else if (action === 'complete') {
    updates.push("completed_at = datetime('now')");
  }

  // Get labor hours from body for completion
  let laborHours: number | undefined;
  try {
    const body = await request.json() as { labor_hours?: number };
    laborHours = body.labor_hours;
  } catch {
    // ignore
  }

  if (laborHours !== undefined) {
    updates.push(`labor_hours = ${laborHours}`);
  }

  await env.DB.prepare(
    `UPDATE work_orders SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`
  ).bind(id, tenantId).run();

  return jsonResponse({ message: `Orden ${action === 'complete' ? 'completada' : action === 'cancel' ? 'cancelada' : 'iniciada'}` });
}

async function getWorkOrderItems(id: string, env: Env, tenantId: string): Promise<Response> {
  const wo = await env.DB.prepare(
    'SELECT id FROM work_orders WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).first();
  if (!wo) return jsonError('Orden no encontrada', 404);

  const { results } = await env.DB.prepare(
    `SELECT woi.*, s.name as supply_name, s.sku, s.unit
     FROM work_order_items woi
     LEFT JOIN supplies s ON woi.supply_id = s.id
     WHERE woi.work_order_id = ?`
  ).bind(id).all();

  return jsonResponse({ items: results });
}

async function addWorkOrderItem(request: Request, id: string, env: Env, tenantId: string): Promise<Response> {
  let body: {
    supply_id?: string; description?: string;
    quantity_used?: number; unit_cost?: number;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError('JSON inválido', 400);
  }

  if (!body.description) return jsonError('Descripción requerida', 400);

  const quantity = body.quantity_used || 1;
  const unitCost = body.unit_cost || 0;
  const totalCost = quantity * unitCost;

  const itemId = generateId();
  await env.DB.prepare(
    `INSERT INTO work_order_items (id, work_order_id, supply_id, description, quantity_used, unit_cost, total_cost)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(itemId, id, body.supply_id || null, body.description, quantity, unitCost, totalCost).run();

  // Update total cost on work order
  const items = await env.DB.prepare(
    'SELECT SUM(total_cost) as items_total FROM work_order_items WHERE work_order_id = ?'
  ).bind(id).first<{ items_total: number }>();

  const wo = await env.DB.prepare(
    'SELECT labor_cost FROM work_orders WHERE id = ?'
  ).bind(id).first<{ labor_cost: number }>();

  const newTotal = (wo?.labor_cost || 0) + (items?.items_total || 0);
  await env.DB.prepare(
    `UPDATE work_orders SET total_cost = ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?`
  ).bind(newTotal, id, tenantId).run();

  return jsonResponse({ item_id: itemId }, 201);
}

async function addWorkOrderMedia(request: Request, id: string, env: Env, tenantId: string): Promise<Response> {
  let body: { type?: string; filename?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError('JSON inválido', 400);
  }

  const mediaId = generateId();
  const r2Key = `${tenantId}/work-orders/${id}/${mediaId}`;

  await env.DB.prepare(
    `INSERT INTO work_order_media (id, work_order_id, r2_key, type, filename, synced)
     VALUES (?, ?, ?, ?, ?, 1)`
  ).bind(mediaId, id, r2Key, body.type || 'photo', body.filename || null).run();

  return jsonResponse({ media_id: mediaId, r2_key: r2Key }, 201);
}

async function getWorkOrderStats(env: Env, tenantId: string): Promise<Response> {
  const stats = await env.DB.prepare(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
       SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
       SUM(labor_hours) as total_labor_hours,
       SUM(total_cost) as total_cost
     FROM work_orders WHERE tenant_id = ?`
  ).bind(tenantId).first();

  return jsonResponse({ stats });
}
