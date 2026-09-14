import {
  Env, AuthUser, jsonResponse, jsonError, corsHeaders,
  requireAuth, requireTenant
} from './middleware';

export async function handleReports(
  request: Request,
  env: Env,
  user: AuthUser | undefined
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/reports', '');

  if (request.method === 'OPTIONS') return corsHeaders();

  const authError = requireAuth(user);
  if (authError) return authError;
  const tenantError = requireTenant(user);
  if (tenantError) return tenantError;

  const tenantId = user!.tenant_id!;

  if (path === '/dashboard' && request.method === 'GET') {
    return getDashboardData(url, env, tenantId);
  }

  if (path === '/inspections' && request.method === 'GET') {
    return getInspectionsReport(url, env, tenantId);
  }

  if (path === '/mr' && request.method === 'GET') {
    return getMRReport(url, env, tenantId);
  }

  if (path === '/inventory' && request.method === 'GET') {
    return getInventoryReport(url, env, tenantId);
  }

  if (path === '/containers' && request.method === 'GET') {
    return getContainersReport(url, env, tenantId);
  }

  if (path === '/kpis' && request.method === 'GET') {
    return getKPIs(env, tenantId);
  }

  return jsonError('Ruta no encontrada', 404);
}

async function getDashboardData(url: URL, env: Env, tenantId: string): Promise<Response> {
  const period = url.searchParams.get('period') || '30d';
  const daysBack = period === '7d' ? 7 : period === '30d' ? 30 : 90;

  const [inspStats, containerStats, woStats, supplyAlerts] = await Promise.all([
    env.DB.prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'completed' OR status = 'approved' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
         SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
         SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) as today
       FROM inspections WHERE tenant_id = ? AND created_at >= datetime('now', '-${daysBack} days')`
    ).bind(tenantId).first(),

    env.DB.prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'in_yard' THEN 1 ELSE 0 END) as in_yard,
         SUM(CASE WHEN status = 'out' THEN 1 ELSE 0 END) as out,
         SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
       FROM containers WHERE tenant_id = ?`
    ).bind(tenantId).first(),

    env.DB.prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(total_cost) as total_cost
       FROM work_orders WHERE tenant_id = ? AND created_at >= datetime('now', '-${daysBack} days')`
    ).bind(tenantId).first(),

    env.DB.prepare(
      `SELECT COUNT(*) as count FROM supplies
       WHERE tenant_id = ? AND active = 1 AND quantity <= min_stock`
    ).bind(tenantId).first<{ count: number }>(),
  ]);

  // Daily inspection trend
  const { results: trend } = await env.DB.prepare(
    `SELECT date(created_at) as date, COUNT(*) as count
     FROM inspections
     WHERE tenant_id = ? AND created_at >= datetime('now', '-${daysBack} days')
     GROUP BY date(created_at)
     ORDER BY date`
  ).bind(tenantId).all();

  // Recent inspections
  const { results: recentInspections } = await env.DB.prepare(
    `SELECT i.folio, i.status, i.created_at,
            u.name as inspector_name, c.container_no
     FROM inspections i
     LEFT JOIN users u ON i.inspector_id = u.id
     LEFT JOIN containers c ON i.container_id = c.id
     WHERE i.tenant_id = ?
     ORDER BY i.created_at DESC
     LIMIT 5`
  ).bind(tenantId).all();

  // Recent work orders
  const { results: recentWO } = await env.DB.prepare(
    `SELECT wo.folio, wo.status, wo.priority, wo.created_at,
            u.name as tech_name, c.container_no
     FROM work_orders wo
     LEFT JOIN users u ON wo.tech_id = u.id
     LEFT JOIN containers c ON wo.container_id = c.id
     WHERE wo.tenant_id = ?
     ORDER BY wo.created_at DESC
     LIMIT 5`
  ).bind(tenantId).all();

  return jsonResponse({
    period,
    inspections: inspStats,
    containers: containerStats,
    work_orders: woStats,
    low_stock_count: supplyAlerts?.count || 0,
    trend,
    recent_inspections: recentInspections,
    recent_work_orders: recentWO,
  });
}

async function getInspectionsReport(url: URL, env: Env, tenantId: string): Promise<Response> {
  const from = url.searchParams.get('from') || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const to = url.searchParams.get('to') || new Date().toISOString().split('T')[0];

  const { results } = await env.DB.prepare(
    `SELECT i.*,
            u.name as inspector_name,
            c.container_no,
            b.name as branch_name,
            t.name as template_name,
            COUNT(ip.id) as damage_count,
            COUNT(im.id) as media_count
     FROM inspections i
     LEFT JOIN users u ON i.inspector_id = u.id
     LEFT JOIN containers c ON i.container_id = c.id
     LEFT JOIN branches b ON i.branch_id = b.id
     LEFT JOIN inspection_templates t ON i.template_id = t.id
     LEFT JOIN inspection_points ip ON ip.inspection_id = i.id
     LEFT JOIN inspection_media im ON im.inspection_id = i.id
     WHERE i.tenant_id = ? AND date(i.created_at) BETWEEN ? AND ?
     GROUP BY i.id
     ORDER BY i.created_at DESC`
  ).bind(tenantId, from, to).all();

  return jsonResponse({ inspections: results, from, to, total: results.length });
}

async function getMRReport(url: URL, env: Env, tenantId: string): Promise<Response> {
  const from = url.searchParams.get('from') || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const to = url.searchParams.get('to') || new Date().toISOString().split('T')[0];

  const { results } = await env.DB.prepare(
    `SELECT wo.*,
            u.name as tech_name,
            c.container_no,
            b.name as branch_name,
            COUNT(woi.id) as item_count
     FROM work_orders wo
     LEFT JOIN users u ON wo.tech_id = u.id
     LEFT JOIN containers c ON wo.container_id = c.id
     LEFT JOIN branches b ON wo.branch_id = b.id
     LEFT JOIN work_order_items woi ON woi.work_order_id = wo.id
     WHERE wo.tenant_id = ? AND date(wo.created_at) BETWEEN ? AND ?
     GROUP BY wo.id
     ORDER BY wo.created_at DESC`
  ).bind(tenantId, from, to).all();

  const totals = await env.DB.prepare(
    `SELECT
       SUM(total_cost) as total_cost,
       SUM(labor_hours) as total_hours,
       AVG(labor_hours) as avg_hours
     FROM work_orders
     WHERE tenant_id = ? AND status = 'completed' AND date(created_at) BETWEEN ? AND ?`
  ).bind(tenantId, from, to).first();

  return jsonResponse({ work_orders: results, totals, from, to });
}

async function getInventoryReport(url: URL, env: Env, tenantId: string): Promise<Response> {
  const { results: supplies } = await env.DB.prepare(
    `SELECT s.*,
            b.name as branch_name,
            (quantity * cost) as total_value,
            CASE WHEN quantity <= min_stock THEN 1 ELSE 0 END as is_low
     FROM supplies s
     LEFT JOIN branches b ON s.branch_id = b.id
     WHERE s.tenant_id = ? AND s.active = 1
     ORDER BY s.category, s.name`
  ).bind(tenantId).all();

  const summary = await env.DB.prepare(
    `SELECT
       COUNT(*) as total_items,
       SUM(quantity * cost) as total_value,
       SUM(CASE WHEN quantity <= min_stock THEN 1 ELSE 0 END) as low_stock_count,
       COUNT(DISTINCT category) as categories
     FROM supplies WHERE tenant_id = ? AND active = 1`
  ).bind(tenantId).first();

  return jsonResponse({ supplies, summary });
}

async function getContainersReport(url: URL, env: Env, tenantId: string): Promise<Response> {
  const { results: containers } = await env.DB.prepare(
    `SELECT c.*,
            b.name as branch_name,
            location_bay || '-' || location_row || '-' || location_slot as full_location,
            (SELECT COUNT(*) FROM inspections i WHERE i.container_id = c.id AND i.tenant_id = c.tenant_id) as inspection_count,
            (SELECT COUNT(*) FROM work_orders wo WHERE wo.container_id = c.id AND wo.tenant_id = c.tenant_id) as work_order_count
     FROM containers c
     LEFT JOIN branches b ON c.branch_id = b.id
     WHERE c.tenant_id = ?
     ORDER BY c.status, c.container_no`
  ).bind(tenantId).all();

  const summary = await env.DB.prepare(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'in_yard' THEN 1 ELSE 0 END) as in_yard,
       SUM(CASE WHEN status = 'out' THEN 1 ELSE 0 END) as out,
       SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
       SUM(CASE WHEN type = 'container' THEN 1 ELSE 0 END) as containers_count,
       SUM(CASE WHEN type = 'chassis' THEN 1 ELSE 0 END) as chassis_count
     FROM containers WHERE tenant_id = ?`
  ).bind(tenantId).first();

  return jsonResponse({ containers, summary });
}

async function getKPIs(env: Env, tenantId: string): Promise<Response> {
  const [insp30, insp7, wo30, topInspectors] = await Promise.all([
    env.DB.prepare(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN status IN ('completed','approved') THEN 1 ELSE 0 END) as completed
       FROM inspections WHERE tenant_id = ? AND created_at >= datetime('now', '-30 days')`
    ).bind(tenantId).first<{ total: number; completed: number }>(),

    env.DB.prepare(
      `SELECT COUNT(*) as total FROM inspections
       WHERE tenant_id = ? AND created_at >= datetime('now', '-7 days')`
    ).bind(tenantId).first<{ total: number }>(),

    env.DB.prepare(
      `SELECT AVG(labor_hours) as avg_hours, SUM(total_cost) as total_cost
       FROM work_orders WHERE tenant_id = ? AND status = 'completed' AND created_at >= datetime('now', '-30 days')`
    ).bind(tenantId).first(),

    env.DB.prepare(
      `SELECT u.name, COUNT(*) as count
       FROM inspections i
       JOIN users u ON i.inspector_id = u.id
       WHERE i.tenant_id = ? AND i.created_at >= datetime('now', '-30 days')
       GROUP BY i.inspector_id
       ORDER BY count DESC
       LIMIT 5`
    ).bind(tenantId).all(),
  ]);

  const completionRate = insp30 && insp30.total > 0
    ? Math.round((insp30.completed / insp30.total) * 100)
    : 0;

  return jsonResponse({
    inspections_30d: insp30,
    inspections_7d: insp7,
    completion_rate: completionRate,
    work_orders_30d: wo30,
    top_inspectors: topInspectors.results,
  });
}
