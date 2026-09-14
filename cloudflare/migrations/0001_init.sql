-- INSPECTAMX Database Schema
-- Cloudflare D1 (SQLite) - Multi-tenant with tenant_id scoping

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ============================================================
-- CORE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'trial')),
  plan TEXT NOT NULL DEFAULT 'basic' CHECK(plan IN ('basic', 'pro', 'enterprise')),
  config_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('developer', 'company_admin', 'supervisor', 'inspector', 'mr_tech')),
  branch_id TEXT REFERENCES branches(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
  avatar_url TEXT,
  phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- ============================================================
-- CATALOG TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS catalog_equipment_types (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cat_equip_tenant ON catalog_equipment_types(tenant_id);

CREATE TABLE IF NOT EXISTS catalog_damage_types (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  severity_default TEXT NOT NULL DEFAULT 'minor' CHECK(severity_default IN ('minor', 'moderate', 'severe')),
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cat_damage_tenant ON catalog_damage_types(tenant_id);

CREATE TABLE IF NOT EXISTS catalog_inspection_types (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cat_insp_tenant ON catalog_inspection_types(tenant_id);

-- ============================================================
-- INSPECTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS inspection_templates (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  config_json TEXT DEFAULT '{}',
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tmpl_tenant ON inspection_templates(tenant_id);

CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  folio TEXT NOT NULL,
  container_id TEXT REFERENCES containers(id),
  template_id TEXT REFERENCES inspection_templates(id),
  inspector_id TEXT NOT NULL REFERENCES users(id),
  branch_id TEXT REFERENCES branches(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'in_progress', 'completed', 'approved', 'rejected')),
  location TEXT,
  notes TEXT,
  started_at TEXT,
  completed_at TEXT,
  approved_by TEXT REFERENCES users(id),
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_insp_tenant ON inspections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_insp_folio ON inspections(folio);
CREATE INDEX IF NOT EXISTS idx_insp_status ON inspections(status);
CREATE INDEX IF NOT EXISTS idx_insp_inspector ON inspections(inspector_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_insp_folio_tenant ON inspections(tenant_id, folio);

CREATE TABLE IF NOT EXISTS inspection_points (
  id TEXT PRIMARY KEY,
  inspection_id TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  point_code TEXT NOT NULL,
  damage_type TEXT,
  severity TEXT CHECK(severity IN ('minor', 'moderate', 'severe')),
  notes TEXT,
  x_coord REAL,
  y_coord REAL,
  view TEXT CHECK(view IN ('top', 'side_left', 'side_right', 'front', 'rear')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_points_inspection ON inspection_points(inspection_id);

CREATE TABLE IF NOT EXISTS inspection_media (
  id TEXT PRIMARY KEY,
  inspection_id TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('photo', 'video')),
  r2_key TEXT,
  filename TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  synced INTEGER NOT NULL DEFAULT 0,
  offline_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_media_inspection ON inspection_media(inspection_id);
CREATE INDEX IF NOT EXISTS idx_media_synced ON inspection_media(synced);

-- ============================================================
-- CONTAINERS / CHASSIS
-- ============================================================

CREATE TABLE IF NOT EXISTS containers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  container_no TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'container' CHECK(type IN ('container', 'chassis', 'trailer')),
  size TEXT CHECK(size IN ('20', '40', '45', '53')),
  owner TEXT,
  iso_code TEXT,
  status TEXT NOT NULL DEFAULT 'in_yard' CHECK(status IN ('in_yard', 'out', 'maintenance', 'damaged')),
  location_bay TEXT,
  location_row TEXT,
  location_slot TEXT,
  branch_id TEXT REFERENCES branches(id),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cont_tenant ON containers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cont_no ON containers(container_no);
CREATE INDEX IF NOT EXISTS idx_cont_status ON containers(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cont_no_tenant ON containers(tenant_id, container_no);

CREATE TABLE IF NOT EXISTS container_movements (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  container_id TEXT NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK(movement_type IN ('check_in', 'check_out', 'relocate', 'maintenance_in', 'maintenance_out')),
  from_location TEXT,
  to_location TEXT,
  user_id TEXT NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_movements_tenant ON container_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_movements_container ON container_movements(container_id);

-- ============================================================
-- MAINTENANCE & REPAIR (TALLER M&R)
-- ============================================================

CREATE TABLE IF NOT EXISTS work_orders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  folio TEXT NOT NULL,
  inspection_id TEXT REFERENCES inspections(id),
  container_id TEXT REFERENCES containers(id),
  tech_id TEXT REFERENCES users(id),
  branch_id TEXT REFERENCES branches(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  type TEXT NOT NULL DEFAULT 'repair' CHECK(type IN ('repair', 'maintenance', 'inspection', 'cleaning')),
  description TEXT,
  labor_hours REAL DEFAULT 0,
  labor_cost REAL DEFAULT 0,
  total_cost REAL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wo_tenant ON work_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wo_folio ON work_orders(folio);
CREATE INDEX IF NOT EXISTS idx_wo_status ON work_orders(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wo_folio_tenant ON work_orders(tenant_id, folio);

CREATE TABLE IF NOT EXISTS work_order_items (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  supply_id TEXT REFERENCES supplies(id),
  description TEXT NOT NULL,
  quantity_used REAL NOT NULL DEFAULT 1,
  unit_cost REAL NOT NULL DEFAULT 0,
  total_cost REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_woi_wo ON work_order_items(work_order_id);

CREATE TABLE IF NOT EXISTS work_order_media (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  r2_key TEXT,
  type TEXT NOT NULL CHECK(type IN ('photo', 'video')),
  filename TEXT,
  synced INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wom_wo ON work_order_media(work_order_id);

-- ============================================================
-- INVENTORY (ALMACÉN)
-- ============================================================

CREATE TABLE IF NOT EXISTS supplies (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'pza',
  quantity REAL NOT NULL DEFAULT 0,
  min_stock REAL NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  branch_id TEXT REFERENCES branches(id),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sup_tenant ON supplies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sup_sku ON supplies(sku);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sup_sku_tenant ON supplies(tenant_id, sku);

CREATE TABLE IF NOT EXISTS supply_movements (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supply_id TEXT NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK(movement_type IN ('in', 'out', 'adjustment')),
  quantity REAL NOT NULL,
  quantity_before REAL NOT NULL DEFAULT 0,
  quantity_after REAL NOT NULL DEFAULT 0,
  reference_id TEXT,
  reference_type TEXT,
  user_id TEXT NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sm_tenant ON supply_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sm_supply ON supply_movements(supply_id);

-- ============================================================
-- TASKS & INCIDENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT REFERENCES users(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date TEXT,
  branch_id TEXT REFERENCES branches(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  reported_by TEXT NOT NULL REFERENCES users(id),
  container_id TEXT REFERENCES containers(id),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'investigating', 'resolved', 'closed')),
  branch_id TEXT REFERENCES branches(id),
  resolved_at TEXT,
  resolved_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inc_tenant ON incidents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inc_status ON incidents(status);

CREATE TABLE IF NOT EXISTS incident_media (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  r2_key TEXT,
  type TEXT NOT NULL CHECK(type IN ('photo', 'video')),
  filename TEXT,
  synced INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_incm_incident ON incident_media(incident_id);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  changes_json TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Developer tenant (system-level)
INSERT OR IGNORE INTO tenants (id, name, slug, status, plan, config_json) VALUES
  ('system', 'INSPECTAMX System', 'system', 'active', 'enterprise', '{"is_system": true}');

-- MYRMEX tenant
INSERT OR IGNORE INTO tenants (id, name, slug, status, plan, config_json) VALUES
  ('myrmex', 'MYRMEX', 'myrmex', 'active', 'enterprise', '{"modules": ["inspections", "mr", "inventory", "tasks"]}');

-- MYRMEX main branch
INSERT OR IGNORE INTO branches (id, tenant_id, name, address, city, state, status) VALUES
  ('myrmex-branch-1', 'myrmex', 'Sucursal Principal', 'Av. Industrial 1234', 'Monterrey', 'NL', 'active');

-- Developer user (password: DevPass2026! - bcrypt hash)
INSERT OR IGNORE INTO users (id, tenant_id, email, password_hash, name, role, status) VALUES
  ('dev-001', NULL, 'dev@inspecta.mx', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGX6OtFLvmq3PbhM/1h5XEYbzQy', 'Developer Admin', 'developer', 'active');

-- MYRMEX Admin user (password: AdminPass2026! - bcrypt hash)
INSERT OR IGNORE INTO users (id, tenant_id, email, password_hash, name, role, branch_id, status) VALUES
  ('myrmex-admin-001', 'myrmex', 'Admin@myrmex.com', '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWEHvz6', 'Admin MYRMEX', 'company_admin', 'myrmex-branch-1', 'active');

-- Base catalog for MYRMEX - Equipment Types
INSERT OR IGNORE INTO catalog_equipment_types (id, tenant_id, name, code) VALUES
  ('meq-1', 'myrmex', 'Contenedor 20 pies', 'CONT-20'),
  ('meq-2', 'myrmex', 'Contenedor 40 pies', 'CONT-40'),
  ('meq-3', 'myrmex', 'Contenedor 40HC', 'CONT-40HC'),
  ('meq-4', 'myrmex', 'Chasis 20 pies', 'CHAS-20'),
  ('meq-5', 'myrmex', 'Chasis 40 pies', 'CHAS-40'),
  ('meq-6', 'myrmex', 'Remolque', 'REM-GEN');

-- Base catalog for MYRMEX - Damage Types
INSERT OR IGNORE INTO catalog_damage_types (id, tenant_id, name, code, severity_default) VALUES
  ('mdt-1', 'myrmex', 'Abolladura', 'ABL', 'minor'),
  ('mdt-2', 'myrmex', 'Corrosión', 'COR', 'moderate'),
  ('mdt-3', 'myrmex', 'Perforación', 'PER', 'severe'),
  ('mdt-4', 'myrmex', 'Corte', 'COR-C', 'severe'),
  ('mdt-5', 'myrmex', 'Fisura', 'FIS', 'moderate'),
  ('mdt-6', 'myrmex', 'Deformación', 'DEF', 'minor'),
  ('mdt-7', 'myrmex', 'Pintura deteriorada', 'PIN', 'minor'),
  ('mdt-8', 'myrmex', 'Piso dañado', 'PIS', 'moderate'),
  ('mdt-9', 'myrmex', 'Puerta dañada', 'PUT', 'moderate'),
  ('mdt-10', 'myrmex', 'Lona rasgada', 'LON', 'minor');

-- Base catalog for MYRMEX - Inspection Types
INSERT OR IGNORE INTO catalog_inspection_types (id, tenant_id, name, code) VALUES
  ('mit-1', 'myrmex', 'Inspección de entrada', 'ENT'),
  ('mit-2', 'myrmex', 'Inspección de salida', 'SAL'),
  ('mit-3', 'myrmex', 'Inspección de daños', 'DAN'),
  ('mit-4', 'myrmex', 'Inspección pre-trip', 'PRE'),
  ('mit-5', 'myrmex', 'Inspección IICL', 'IICL'),
  ('mit-6', 'myrmex', 'Inspección PTI', 'PTI');

-- Base inspection template for MYRMEX
INSERT OR IGNORE INTO inspection_templates (id, tenant_id, name, type, description, config_json, active) VALUES
  ('mt-1', 'myrmex', 'Inspección General Contenedor', 'container', 'Plantilla estándar para inspección general de contenedores',
   '{"views": ["top", "side_left", "side_right", "front", "rear"], "require_photo": true, "require_signature": false}', 1);

-- Sample containers for MYRMEX
INSERT OR IGNORE INTO containers (id, tenant_id, container_no, type, size, owner, status, location_bay, location_row, location_slot, branch_id) VALUES
  ('mc-1', 'myrmex', 'MSCU1234567', 'container', '40', 'MSC', 'in_yard', 'A', '01', '03', 'myrmex-branch-1'),
  ('mc-2', 'myrmex', 'CMAU9876543', 'container', '20', 'CMA CGM', 'in_yard', 'B', '02', '01', 'myrmex-branch-1'),
  ('mc-3', 'myrmex', 'HLXU5551234', 'container', '40', 'Hapag-Lloyd', 'maintenance', 'C', '01', '05', 'myrmex-branch-1');

-- Sample supplies for MYRMEX
INSERT OR IGNORE INTO supplies (id, tenant_id, sku, name, category, unit, quantity, min_stock, cost, branch_id) VALUES
  ('ms-1', 'myrmex', 'SOL-001', 'Soldadura E6013 3/32"', 'soldadura', 'kg', 50, 10, 45.00, 'myrmex-branch-1'),
  ('ms-2', 'myrmex', 'PIN-001', 'Pintura anticorrosiva gris', 'pintura', 'lt', 30, 5, 85.00, 'myrmex-branch-1'),
  ('ms-3', 'myrmex', 'LIJ-001', 'Lija #80', 'abrasivos', 'pza', 100, 20, 5.50, 'myrmex-branch-1'),
  ('ms-4', 'myrmex', 'DIS-001', 'Disco de corte 4.5"', 'abrasivos', 'pza', 60, 15, 18.00, 'myrmex-branch-1'),
  ('ms-5', 'myrmex', 'COR-001', 'Correa de amarre 2"', 'sujeción', 'pza', 25, 5, 120.00, 'myrmex-branch-1');
