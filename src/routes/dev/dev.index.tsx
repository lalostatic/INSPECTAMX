// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { devApi, tenantsApi } from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Building2, Users, ClipboardList, Container, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDate, formatDateTime } from '~/lib/utils';
import { Link } from '@tanstack/react-router';

function DevDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dev-stats'],
    queryFn: () => devApi.stats(),
    refetchInterval: 30000,
  });

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenantsApi.list(),
  });

  const statCards = [
    { label: 'Empresas activas', value: (stats as Record<string, number>)?.total_tenants || 0, icon: Building2, color: 'text-blue-600' },
    { label: 'Usuarios totales', value: (stats as Record<string, number>)?.total_users || 0, icon: Users, color: 'text-emerald-600' },
    { label: 'Inspecciones hoy', value: (stats as Record<string, number>)?.inspections_today || 0, icon: ClipboardList, color: 'text-orange-600' },
    { label: 'Contenedores registrados', value: (stats as Record<string, number>)?.total_containers || 0, icon: Container, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Panel del Sistema</h2>
          <p className="text-sm text-gray-500">Vista global de todas las empresas</p>
        </div>
        <Link to="/dev/empresas/nueva">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva empresa
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="text-3xl font-bold mt-1">
                      {statsLoading ? '...' : card.value}
                    </p>
                  </div>
                  <Icon className={`h-8 w-8 ${card.color} opacity-80`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tenants List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle>Empresas registradas</CardTitle>
          <Link to="/dev/empresas">
            <Button variant="outline" size="sm">Ver todas</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {tenantsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : (
            <div className="space-y-3">
              {tenantsData?.tenants?.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm">
                      {tenant.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{tenant.name}</p>
                      <p className="text-xs text-gray-500">
                        {tenant.slug} · {tenant.user_count || 0} usuarios · {tenant.branch_count || 0} sucursales
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={tenant.status === 'active' ? 'success' : 'warning'}>
                      {tenant.status === 'active' ? 'Activo' : tenant.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {tenant.plan}
                    </Badge>
                    <span className="text-xs text-gray-400">{formatDate(tenant.created_at)}</span>
                  </div>
                </div>
              ))}
              {(!tenantsData?.tenants || tenantsData.tenants.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>No hay empresas registradas</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle>Estado del sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { service: 'API Workers', status: 'ok' },
              { service: 'Base de datos D1', status: 'ok' },
              { service: 'Almacenamiento R2', status: 'ok' },
              { service: 'Cache KV', status: 'ok' },
            ].map((item) => (
              <div key={item.service} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm font-medium">{item.service}</span>
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Operacional
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/dev/dev/')({
  component: DevDashboard,
});