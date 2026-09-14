// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '~/lib/api';
import { useAuthStore } from '~/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { ClipboardList, Wrench, Package, CheckSquare, Plus } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { cn, formatDate } from '~/lib/utils';
import { STATUS_LABELS, STATUS_COLORS } from '~/lib/types';
import type { DashboardStats } from '~/lib/types';

function AppIndex() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', '7d'],
    queryFn: () => reportsApi.dashboard('7d'),
  });

  const stats = data as DashboardStats | undefined;

  const isInspector = user?.role === 'inspector';
  const isMRTech = user?.role === 'mr_tech';
  const isSupervisor = user?.role === 'supervisor' || user?.role === 'company_admin';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Buenos días, {user?.name?.split(' ')[0]}</h2>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Quick KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {!isMRTech && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Inspecciones (7 días)</p>
                  <p className="text-2xl font-bold">{isLoading ? '...' : stats?.inspections?.total || 0}</p>
                </div>
                <ClipboardList className="h-6 w-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        )}

        {!isInspector && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">OT activas</p>
                  <p className="text-2xl font-bold">
                    {isLoading ? '...' : (stats?.work_orders?.pending || 0) + (stats?.work_orders?.in_progress || 0)}
                  </p>
                </div>
                <Wrench className="h-6 w-6 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">En patio</p>
                <p className="text-2xl font-bold">{isLoading ? '...' : stats?.containers?.in_yard || 0}</p>
              </div>
              <Package className="h-6 w-6 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        {stats?.low_stock_count !== undefined && stats.low_stock_count > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600">Alertas de stock</p>
                  <p className="text-2xl font-bold text-red-700">{stats.low_stock_count}</p>
                </div>
                <Package className="h-6 w-6 text-red-500" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Inspections */}
        {!isMRTech && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Mis inspecciones recientes</CardTitle>
              <Link to="/app/inspecciones/nueva">
                <Button size="sm" className="gap-1 h-8">
                  <Plus className="h-3 w-3" /> Nueva
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
                ) : stats?.recent_inspections?.length ? (
                  stats.recent_inspections.map((insp) => (
                    <Link key={insp.id} to="/app/inspecciones/$id" params={{ id: insp.id }}>
                      <div className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded cursor-pointer">
                        <div>
                          <p className="text-sm font-medium">{insp.folio}</p>
                          <p className="text-xs text-muted-foreground">
                            {insp.container_no || 'Sin contenedor'} · {formatDate(insp.created_at)}
                          </p>
                        </div>
                        <span className={cn('status-badge text-xs', STATUS_COLORS[insp.status as keyof typeof STATUS_COLORS])}>
                          {STATUS_LABELS[insp.status] || insp.status}
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin inspecciones recientes</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Work Orders */}
        {!isInspector && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Órdenes de trabajo</CardTitle>
              <Link to="/app/mr/nueva">
                <Button size="sm" className="gap-1 h-8">
                  <Plus className="h-3 w-3" /> Nueva
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
                ) : stats?.recent_work_orders?.length ? (
                  stats.recent_work_orders.map((wo) => (
                    <Link key={wo.id} to="/app/mr/$id" params={{ id: wo.id }}>
                      <div className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded cursor-pointer">
                        <div>
                          <p className="text-sm font-medium">{wo.folio}</p>
                          <p className="text-xs text-muted-foreground">
                            {wo.container_no || 'Sin contenedor'} · {formatDate(wo.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={cn('status-badge text-xs', STATUS_COLORS[wo.priority as keyof typeof STATUS_COLORS])}>
                            {wo.priority}
                          </span>
                          <span className={cn('status-badge text-xs', STATUS_COLORS[wo.status as keyof typeof STATUS_COLORS])}>
                            {STATUS_LABELS[wo.status] || wo.status}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin órdenes recientes</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/app/app/')({
  component: AppIndex,
});