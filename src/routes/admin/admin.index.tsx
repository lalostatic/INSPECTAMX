// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { ClipboardList, Container, Wrench, Package, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '~/lib/utils';
import { STATUS_LABELS, STATUS_COLORS } from '~/lib/types';
import { cn } from '~/lib/utils';
import type { DashboardStats } from '~/lib/types';

function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', '30d'],
    queryFn: () => reportsApi.dashboard('30d'),
    refetchInterval: 60000,
  });

  const stats = data as DashboardStats | undefined;

  const kpiCards = [
    {
      label: 'Inspecciones (30 días)',
      value: stats?.inspections?.total || 0,
      sub: `${stats?.inspections?.completed || 0} completadas`,
      icon: ClipboardList,
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Contenedores en patio',
      value: stats?.containers?.in_yard || 0,
      sub: `${stats?.containers?.total || 0} total`,
      icon: Container,
      color: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Órdenes M&R activas',
      value: (stats?.work_orders?.pending || 0) + (stats?.work_orders?.in_progress || 0),
      sub: `${stats?.work_orders?.completed || 0} completadas`,
      icon: Wrench,
      color: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
    {
      label: 'Alertas de stock bajo',
      value: stats?.low_stock_count || 0,
      sub: 'Insumos por reabastecer',
      icon: Package,
      color: stats?.low_stock_count ? 'bg-red-50' : 'bg-gray-50',
      iconColor: stats?.low_stock_count ? 'text-red-600' : 'text-gray-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Panel de Administración</h2>
        <p className="text-sm text-muted-foreground">Últimos 30 días · Actualizado en tiempo real</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="text-3xl font-bold mt-1">{isLoading ? '...' : card.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                  </div>
                  <div className={cn('p-2 rounded-lg', card.color)}>
                    <Icon className={cn('h-5 w-5', card.iconColor)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Inspections */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inspecciones recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground text-sm">Cargando...</div>
              ) : stats?.recent_inspections?.length ? (
                stats.recent_inspections.map((insp) => (
                  <div key={insp.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{insp.folio}</p>
                      <p className="text-xs text-muted-foreground">
                        {insp.inspector_name} · {insp.container_no || 'Sin contenedor'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('status-badge text-xs', STATUS_COLORS[insp.status as keyof typeof STATUS_COLORS])}>
                        {STATUS_LABELS[insp.status] || insp.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Sin inspecciones recientes</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Work Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Órdenes de trabajo recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground text-sm">Cargando...</div>
              ) : stats?.recent_work_orders?.length ? (
                stats.recent_work_orders.map((wo) => (
                  <div key={wo.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{wo.folio}</p>
                      <p className="text-xs text-muted-foreground">
                        {wo.tech_name || 'Sin técnico'} · {wo.container_no || 'Sin contenedor'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('status-badge text-xs', STATUS_COLORS[wo.priority as keyof typeof STATUS_COLORS])}>
                        {wo.priority}
                      </span>
                      <span className={cn('status-badge text-xs', STATUS_COLORS[wo.status as keyof typeof STATUS_COLORS])}>
                        {STATUS_LABELS[wo.status] || wo.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Sin órdenes recientes</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/admin/admin/')({
  component: AdminDashboard,
});