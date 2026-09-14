import {
  Env, AuthUser, jsonResponse, jsonError, corsHeaders,
  requireAuth, requireTenant, generateId
} from './middleware';

export async function handleInventory(
  request: Request,
  env: Env,
  user: AuthUser | undefined
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/inventory', '');

  if (request.method === 'OPTIONS') return corsHeaders();

  const authError = requireAuth(user);
  if (authError) return authError;
  const tenantError = requireTenant(user);
  if (tenantError) return tenantError;

  const tenantId = user!.tenant_id!;

  if (path === '' || path === '/') {
    if (request.method === 'GET') return listSupplies(url, env, tenantId);
    if (request.method === 'POST') return createSupply(request, env, tenantId, user!);
  }

  const match = path.match(/^\/([^/]+)$/);
  if (match) {
    const id = match[1];
    if (request.method === 'GET') return getSupply(id, env, tenantId);
    if (request.method === 'PUT') return updateSupply(request, id, env, tenantId);
    if (request.method === 'DELETE') return deleteSupply(id, env, tenantId);
  }

  const movMatch = path.match(/^\/([^/]+)\/movement$/);
  if (movMatch) {
    const id = movMatch[1];
    if (request.method === 'POST') return recordSupplyMovement(request, id, env, tenantId, user!);
  }

  const movListMatch = path.match(/^\/movements$/);
  if (movListMatch && request.method === 'GET') {
    return listMovements(url, env, tenantId);
  }

  const alertsMatch = path.match(/^\/alerts$/);
  if (alertsMatch && request.method === 'GET') {
    return getLowStockAlerts(env, tenantId);
  }

  return jsonError('Ruta no encontrada', 404);
}

async function listSupplies(url: URL, env: Env, tenantId: string): Promise<Response> {
  const category = url.searchParams.get('category');
  const search = url.searchParams.get('search');
  const lowStock = url.searchParams.get('low_stock') === 'true';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  let where = 'WHERE tenant_id = ? AND active = 1';
  const params: (string | number | boolean)[] = [tenantId];

  if (category) {
    where += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    where += ' AND (name LIKE ? OR sku LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (lowStock) {
    where += ' AND quantity <= min_stock';
  }

  const { results } = await env.DB.prepare(
    `SELECT s.*, b.name as branch_name
     FROM supplies s
     LEFT JOIN branches b ON s.branch_id = b.id
     ${where}
     ORDER BY s.name
     LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  const countResult = await env.DB.prepare(
    `SELECT COUNT(*) as total FROM supplies ${where}`
  ).bind(...params).first<{ total: number }>();

  return jsonResponse({
    supplies: results,
    pagination: { page, limit, total: countResult?.total || 0 },
  });
}

async function getSupply(id: string, env: Env, tenantId: string): Promise<Response> {
  const supply = await env.DB.prepare(
    `SELECT s.*, b.name as branch_name
     FROM supplies s
     LEFT JOIN branches b ON s.branch_id = b.id
     WHERE s.id = ? AND s.tenant_id = ?`
  ).bind(id, tenantId).first();

  if (!supply) return jsonError('Insumo no encontrado', 404);

  const { results: movements } = await env.DB.prepare(
    `SELECT sm.*, u.name as user_name
     FROM supply_movements sm
     LEFT JOIN users u ON sm.user_id = u.id
     WHERE sm.supply_id = ? AND sm.tenant_id = ?
     ORDER BY sm.created_at DESC
     LIMIT 20`
  ).bind(id, tenantId).all();

  return jsonResponse({ supply, movements });
}

async function createSupply(request: Request, env: Env, tenantId: string, user: AuthUser): Promise<Response> {
  let body: {
    sku?: string; name?: string; category?: string; unit?: string;
    quantity?: number; min_stock?: number; cost?: number; branch_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError('JSON inválido', 400);
  }

  if (!body.sku || !body.name) return jsonError('SKU y nombre requeridos', 400);

  const existing = await env.DB.prepare(
    'SELECT id FROM supplies WHERE tenant_id = ? AND sku = ?'
  ).bind(tenantId, body.sku).first();

  if (existing) return jsonError('SKU ya registrado', 409);

  const id = generateId();
  await env.DB.prepare(
    `INSERT INTO supplies (id, tenant_id, sku, name, category, unit, quantity, min_stock, cost, branch_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, tenantId, body.sku, body.name,
    body.category || 'general',
    body.unit || 'pza',
    body.quantity || 0,
    body.min_stock || 0,
    body.cost || 0,
    body.branch_id || user.branch_id || null
  ).run();

  // Record initial stock movement if quantity > 0
  if ((body.quantity || 0) > 0) {
    await env.DB.prepare(
      `INSERT INTO supply_movements (id, tenant_id, supply_id, movement_type, quantity, quantity_before, quantity_after, user_id, notes)
       VALUES (?, ?, ?, 'in', ?, 0, ?, ?, 'Stock inicial')`
    ).bind(
      generateId(), tenantId, id,
      body.quantity, body.quantity, user.id
    ).run();
  }

  return jsonResponse({ supply_id: id }, 201);
}

async function updateSupply(request: Request, id: string, env: Env, tenantId: string): Promise<Response> {
  let body: {
    name?: string; category?: string; unit?: string;
    min_stock?: number; cost?: number; branch_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError('JSON inválido', 400);
  }

  await env.DB.prepare(
    `UPDATE supplies SET
       name = COALESCE(?, name),
       category = COALESCE(?, category),
       unit = COALESCE(?, unit),
       min_stock = COALESCE(?, min_stock),
       cost = COALESCE(?, cost),
       branch_id = COALESCE(?, branch_id),
       updated_at = datetime('now')
     WHERE id = ? AND tenant_id = ?`
  ).bind(
    body.name || null, body.category || null, body.unit || null,
    body.min_stock ?? null, body.cost ?? null, body.branch_id || null,
    id, tenantId
  ).run();

  return jsonResponse({ message: 'Insumo actualizado' });
}

async function deleteSupply(id: string, env: Env, tenantId: string): Promise<Response> {
  await env.DB.prepare(
    'UPDATE supplies SET active = 0, updated_at = datetime(\'now\') WHERE id = ? AND tenant_id = ?'
  ).bind(id, tenantId).run();
  return jsonResponse({ message: 'Insumo eliminado' });
}

async function recordSupplyMovement(request: Request, supplyId: string, env: Env, tenantId: string, user: AuthUser): Promise<Response> {
  let body: {
    movement_type?: string; quantity?: number;
    reference_id?: string; reference_type?: string; notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError('JSON inválido', 400);
  }

  if (!body.movement_type || !body.quantity) {
    return jsonError('Tipo y cantidad requeridos', 400);
  }

  const supply = await env.DB.prepare(
    'SELECT id, quantity FROM supplies WHERE id = ? AND tenant_id = ?'
  ).bind(supplyId, tenantId).first<{ id: string; quantity: number }>();

  if (!supply) return jsonError('Insumo no encontrado', 404);

  let newQuantity = supply.quantity;
  if (body.movement_type === 'in') {
    newQuantity += body.quantity;
  } else if (body.movement_type === 'out') {
    if (supply.quantity < body.quantity) {
      return jsonError('Stock insuficiente', 400);
    }
    newQuantity -= body.quantity;
  } else if (body.movement_type === 'adjustment') {
    newQuantity = body.quantity;
  }

  const movId = generateId();

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO supply_movements (id, tenant_id, supply_id, movement_type, quantity, quantity_before, quantity_after, reference_id, reference_type, user_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      movId, tenantId, supplyId,
      body.movement_type, body.quantity,
      supply.quantity, newQuantity,
      body.reference_id || null, body.reference_type || null,
      user.id, body.notes || null
    ),
    env.DB.prepare(
      `UPDATE supplies SET quantity = ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?`
    ).bind(newQuantity, supplyId, tenantId),
  ]);

  return jsonResponse({
    movement_id: movId,
    new_quantity: newQuantity,
    low_stock: newQuantity <= ((supply as { quantity: number } & { min_stock?: number }).min_stock ?? 0),
  }, 201);
}

async function listMovements(url: URL, env: Env, tenantId: string): Promise<Response> {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  const { results } = await env.DB.prepare(
    `SELECT sm.*, s.name as supply_name, s.sku, u.name as user_name
     FROM supply_movements sm
     LEFT JOIN supplies s ON sm.supply_id = s.id
     LEFT JOIN users u ON sm.user_id = u.id
     WHERE sm.tenant_id = ?
     ORDER BY sm.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(tenantId, limit, offset).all();

  return jsonResponse({ movements: results });
}

async function getLowStockAlerts(env: Env, tenantId: string): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT s.*, b.name as branch_name
     FROM supplies s
     LEFT JOIN branches b ON s.branch_id = b.id
     WHERE s.tenant_id = ? AND s.active = 1 AND s.quantity <= s.min_stock
     ORDER BY (s.quantity - s.min_stock) ASC`
  ).bind(tenantId).all();

  return jsonResponse({ alerts: results, count: results.length });
}
