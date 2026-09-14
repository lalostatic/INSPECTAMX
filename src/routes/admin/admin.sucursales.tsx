// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Plus, Building2, MapPin } from 'lucide-react';

function AdminSucursales() {
  const { data, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => catalogApi.branches(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sucursales</h2>
          <p className="text-sm text-muted-foreground">Gestiona las sucursales de tu empresa</p>
        </div>
        <Button className="gap-2" disabled>
          <Plus className="h-4 w-4" /> Nueva sucursal
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">Cargando...</div>
        ) : data?.branches?.map((branch) => (
          <Card key={branch.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <Badge variant={branch.status === 'active' ? 'success' : 'gray'}>
                  {branch.status === 'active' ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>
              <h3 className="font-semibold">{branch.name}</h3>
              {(branch.city || branch.address) && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {[branch.address, branch.city, branch.state].filter(Boolean).join(', ')}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/admin/admin/sucursales')({
  component: AdminSucursales,
});