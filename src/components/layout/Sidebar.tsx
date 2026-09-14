import { Link, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard, ClipboardList, Container, Warehouse,
  Wrench, CheckSquare, AlertTriangle, BarChart2,
  Settings, Building2, Users, Monitor, ChevronRight,
  LogOut, Package
} from 'lucide-react';
import { cn } from '~/lib/utils';
import { useAuthStore } from '~/lib/auth';
import { useTranslation } from 'react-i18next';
import type { Role } from '~/lib/types';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  roles?: Role[];
}

const DEV_NAV: NavItem[] = [
  { label: 'Panel', icon: LayoutDashboard, href: '/dev' },
  { label: 'Empresas', icon: Building2, href: '/dev/empresas' },
  { label: 'Sistema', icon: Monitor, href: '/dev/sistema' },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Panel', icon: LayoutDashboard, href: '/admin' },
  { label: 'Usuarios', icon: Users, href: '/admin/usuarios' },
  { label: 'Sucursales', icon: Building2, href: '/admin/sucursales' },
  { label: 'Plantillas', icon: ClipboardList, href: '/admin/plantillas' },
  { label: 'Reportes', icon: BarChart2, href: '/admin/reportes' },
  { label: 'Configuración', icon: Settings, href: '/admin/configuracion' },
];

const APP_NAV: NavItem[] = [
  { label: 'Panel', icon: LayoutDashboard, href: '/app' },
  { label: 'Inspecciones', icon: ClipboardList, href: '/app/inspecciones' },
  { label: 'Taller M&R', icon: Wrench, href: '/app/mr' },
  { label: 'Contenedores', icon: Container, href: '/app/chasis' },
  { label: 'Almacén', icon: Package, href: '/app/almacen' },
  { label: 'Tareas', icon: CheckSquare, href: '/app/tareas' },
  { label: 'Incidencias', icon: AlertTriangle, href: '/app/incidencias' },
];

interface SidebarProps {
  type: 'dev' | 'admin' | 'app';
  collapsed?: boolean;
}

export function Sidebar({ type, collapsed = false }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const router = useRouterState();
  const currentPath = router.location.pathname;

  const navItems = type === 'dev' ? DEV_NAV : type === 'admin' ? ADMIN_NAV : APP_NAV;

  const isActive = (href: string) => {
    if (href === '/dev' || href === '/admin' || href === '/app') {
      return currentPath === href;
    }
    return currentPath.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'flex flex-col bg-gray-900 text-white h-full transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
        <div className="flex-shrink-0 w-8 h-8 rounded-md bg-blue-500 flex items-center justify-center font-bold text-sm">
          IX
        </div>
        {!collapsed && (
          <div>
            <div className="font-bold text-sm tracking-tight">INSPECTAMX</div>
            <div className="text-xs text-gray-400">{
              type === 'dev' ? 'Developer' :
              type === 'admin' ? user?.tenant_name || 'Admin' :
              'Operativo'
            }</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href as any}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && active && <ChevronRight className="ml-auto h-4 w-4 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-800 p-3">
        {!collapsed && user && (
          <div className="mb-2 px-2">
            <div className="text-xs font-medium text-white truncate">{user.name}</div>
            <div className="text-xs text-gray-400 truncate">{user.email}</div>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && 'Cerrar sesión'}
        </button>
      </div>
    </aside>
  );
}
