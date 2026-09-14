import { Outlet } from '@tanstack/react-router';
import { Sidebar } from './Sidebar';
import { LanguageToggle } from '~/components/shared/LanguageToggle';
import { OfflineIndicator } from '~/components/shared/OfflineIndicator';
import { useAuthStore } from '~/lib/auth';
import { Bell, Building2 } from 'lucide-react';
import { getInitials } from '~/lib/utils';

export function AdminLayout() {
  const { user } = useAuthStore();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar type="admin" />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            <div>
              <h1 className="text-sm font-semibold text-gray-900">{user?.tenant_name || 'Administración'}</h1>
              <p className="text-xs text-gray-500">{user?.branch_name || 'Todas las sucursales'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button className="p-2 rounded-md hover:bg-gray-100">
              <Bell className="h-4 w-4 text-gray-500" />
            </button>
            <div className="flex items-center gap-2 pl-2 border-l">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {user?.name ? getInitials(user.name) : 'A'}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-medium text-gray-700">{user?.name}</div>
                <div className="text-xs text-gray-400">Admin</div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      <OfflineIndicator />
    </div>
  );
}
