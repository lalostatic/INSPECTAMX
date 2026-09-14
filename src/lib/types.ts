export type Role = 'developer' | 'company_admin' | 'supervisor' | 'inspector' | 'mr_tech';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenant_id: string | null;
  branch_id: string | null;
  tenant_name?: string;
  tenant_slug?: string;
  branch_name?: string;
  status: 'active' | 'inactive' | 'suspended';
  avatar_url?: string | null;
  phone?: string | null;
  created_at?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'trial';
  plan: 'basic' | 'pro' | 'enterprise';
  config_json: string;
  created_at: string;
  user_count?: number;
  branch_count?: number;
}

export interface Branch {
  id: string;
  tenant_id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Container {
  id: string;
  tenant_id: string;
  container_no: string;
  type: 'container' | 'chassis' | 'trailer';
  size?: '20' | '40' | '45' | '53' | null;
  owner?: string | null;
  iso_code?: string | null;
  status: 'in_yard' | 'out' | 'maintenance' | 'damaged';
  location_bay?: string | null;
  location_row?: string | null;
  location_slot?: string | null;
  location?: string | null; // computed: BAY-ROW-SLOT
  branch_id?: string | null;
  branch_name?: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContainerMovement {
  id: string;
  tenant_id: string;
  container_id: string;
  movement_type: 'check_in' | 'check_out' | 'relocate' | 'maintenance_in' | 'maintenance_out';
  from_location?: string | null;
  to_location?: string | null;
  user_id: string;
  user_name?: string;
  notes?: string | null;
  created_at: string;
}

export interface InspectionTemplate {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  description?: string | null;
  config_json: string;
  active: number;
  created_by?: string | null;
  created_at: string;
}

export interface Inspection {
  id: string;
  tenant_id: string;
  folio: string;
  container_id?: string | null;
  container_no?: string | null;
  template_id?: string | null;
  template_name?: string | null;
  inspector_id: string;
  inspector_name?: string;
  inspector_email?: string;
  branch_id?: string | null;
  branch_name?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'approved' | 'rejected';
  location?: string | null;
  notes?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  approved_by?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InspectionPoint {
  id: string;
  inspection_id: string;
  point_code: string;
  damage_type?: string | null;
  severity?: 'minor' | 'moderate' | 'severe' | null;
  notes?: string | null;
  x_coord?: number | null;
  y_coord?: number | null;
  view?: 'top' | 'side_left' | 'side_right' | 'front' | 'rear' | null;
  created_at: string;
}

export interface InspectionMedia {
  id: string;
  inspection_id: string;
  type: 'photo' | 'video';
  r2_key?: string | null;
  filename?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  synced: number;
  offline_id?: string | null;
  created_at: string;
}

export interface WorkOrder {
  id: string;
  tenant_id: string;
  folio: string;
  inspection_id?: string | null;
  inspection_folio?: string | null;
  container_id?: string | null;
  container_no?: string | null;
  tech_id?: string | null;
  tech_name?: string;
  branch_id?: string | null;
  branch_name?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  type: 'repair' | 'maintenance' | 'inspection' | 'cleaning';
  description?: string | null;
  labor_hours?: number | null;
  labor_cost?: number | null;
  total_cost?: number | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  updated_at: string;
}

export interface WorkOrderItem {
  id: string;
  work_order_id: string;
  supply_id?: string | null;
  supply_name?: string | null;
  sku?: string | null;
  description: string;
  quantity_used: number;
  unit_cost: number;
  total_cost: number;
  created_at: string;
}

export interface Supply {
  id: string;
  tenant_id: string;
  sku: string;
  name: string;
  category?: string | null;
  unit: string;
  quantity: number;
  min_stock: number;
  cost: number;
  branch_id?: string | null;
  branch_name?: string;
  active: number;
  total_value?: number;
  is_low?: number;
  created_at: string;
  updated_at: string;
}

export interface SupplyMovement {
  id: string;
  tenant_id: string;
  supply_id: string;
  supply_name?: string;
  sku?: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  reference_id?: string | null;
  reference_type?: string | null;
  user_id: string;
  user_name?: string;
  notes?: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  tenant_id: string;
  title: string;
  description?: string | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  created_by: string;
  created_by_name?: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: string | null;
  branch_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  tenant_id: string;
  title: string;
  description?: string | null;
  reported_by: string;
  container_id?: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  branch_id?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CatalogItem {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  description?: string | null;
  active: number;
  created_at: string;
}

export interface DamageType extends CatalogItem {
  severity_default: 'minor' | 'moderate' | 'severe';
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

export interface DashboardStats {
  period: string;
  inspections: {
    total: number;
    completed: number;
    in_progress: number;
    draft: number;
    today: number;
  };
  containers: {
    total: number;
    in_yard: number;
    out: number;
    maintenance: number;
  };
  work_orders: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    total_cost: number;
  };
  low_stock_count: number;
  trend: Array<{ date: string; count: number }>;
  recent_inspections: Inspection[];
  recent_work_orders: WorkOrder[];
}

// Offline queue types
export interface OfflineMediaItem {
  id: string;
  entity_type: 'inspection' | 'work_order' | 'incident';
  entity_id: string;
  file_blob: Blob;
  filename: string;
  mime_type: string;
  created_at: string;
  attempts: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}

export const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-gray-100 text-gray-500',
  in_yard: 'bg-green-100 text-green-700',
  out: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-orange-100 text-orange-700',
  damaged: 'bg-red-100 text-red-700',
  open: 'bg-red-100 text-red-700',
  investigating: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
  low: 'bg-blue-100 text-blue-700',
  normal: 'bg-gray-100 text-gray-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
} as const;

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  in_progress: 'En progreso',
  completed: 'Completado',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  pending: 'Pendiente',
  cancelled: 'Cancelado',
  in_yard: 'En patio',
  out: 'Fuera',
  maintenance: 'Mantenimiento',
  damaged: 'Dañado',
  open: 'Abierto',
  investigating: 'Investigando',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};
