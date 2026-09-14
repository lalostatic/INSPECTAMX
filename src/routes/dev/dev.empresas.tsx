// @ts-nocheck
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsApi } from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Plus, Building2, Users, GitBranch, MoreVertical, Pause, Play, Trash2 } from 'lucide-react';
import { formatDate } from '~/lib/utils';
import { toast } from '~/components/ui/use-toast';

function DevEmpresas() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenantsApi.list(),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'suspend' | 'activate' }) =>
      action === 'suspend' ? tenantsApi.suspend(id) : tenantsApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({ title: 'Estado actualizado' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tenantsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({ title: 'Empresa eliminada' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Empresas</h2>
          <p className="text-sm text-muted-foreground">Administra todos los tenants del sistema</p>
        </div>
        <Link to="/dev/empresas/nueva">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva empresa
          </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {isLoading && (
          <div className="text-center py-12 text-muted-foreground">Cargando empresas...</div>
        )}

        {data?.tenants?.map((tenant) => (
          <Card key={tenant.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg">
                    {tenant.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{tenant.name}</h3>
                      <Badge variant={tenant.status === 'active' ? 'success' : 'warning'}>
                        {tenant.status === 'active' ? 'Activo' : tenant.status}
                      </Badge>
                      <Badge variant="outline">{tenant.plan}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ID: {tenant.id} · Slug: {tenant.slug}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {tenant.user_count || 0} usuarios
                      </span>
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        {tenant.branch_count || 0} sucursales
                      </span>
                      <span>Creado: {formatDate(tenant.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => suspendMutation.mutate({
                      id: tenant.id,
                      action: tenant.status === 'active' ? 'suspend' : 'activate'
                    })}
                    disabled={tenant.id === 'myrmex'}
                  >
                    {tenant.status === 'active' ? (
                      <><Pause className="h-3 w-3 mr-1" /> Suspender</>
                    ) : (
                      <><Play className="h-3 w-3 mr-1" /> Activar</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => {
                      if (confirm(`¿Eliminar empresa ${tenant.name}?`)) {
                        deleteMutation.mutate(tenant.id);
                      }
                    }}
                    disabled={tenant.id === 'myrmex' || tenant.id === 'system'}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {!isLoading && (!data?.tenants || data.tenants.length === 0) && (
          <div className="text-center py-16">
            <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">No hay empresas registradas</p>
            <Link to="/dev/empresas/nueva">
              <Button className="mt-4">Crear primera empresa</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/dev/dev/empresas')({
  component: DevEmpresas,
});