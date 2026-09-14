import { Outlet } from '@tanstack/react-router';
import { Sidebar } from './Sidebar';
import { LanguageToggle } from '~/components/shared/LanguageToggle';
import { OfflineIndicator } from '~/components/shared/OfflineIndicator';
import { useAuthStore } from '~/lib/auth';
import { Bell, Wifi, WifiOff } from 'lucide-react';
import { getInitials } from '~/lib/utils';
import { useState, useEffect } from 'react';
import { ROLE_LABELS } from '~/lib/auth/roles';
import type { Role } from '~/lib/types';

export function AppLayout() {
  const { user } = useAuthStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar type="app" />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm flex-shrink-0">
          <div>
            <h1 className="text-sm font-semibold text-gray-900">
              {user?.tenant_name || 'INSPECTAMX'}
            </h1>
            <p className="text-xs text-gray-500">
              {user?.role ? ROLE_LABELS[user.role as Role] : ''} · {user?.branch_name || 'Sin sucursal'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle />

            {/* Online indicator */}
            <div
              title={isOnline ? 'En línea' : 'Sin conexión'}
              className="flex items-center gap-1 text-xs"
            >
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500 animate-pulse" />
              )}
            </div>

            <button className="p-2 rounded-md hover:bg-gray-100">
              <Bell className="h-4 w-4 text-gray-500" />
            </button>

            <div className="flex items-center gap-2 pl-2 border-l">
              <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                {user?.name ? getInitials(user.name) : 'U'}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-medium text-gray-700">{user?.name}</div>
                <div className="text-xs text-gray-400">
                  {user?.role ? ROLE_LABELS[user.role as Role] : ''}
                </div>
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
