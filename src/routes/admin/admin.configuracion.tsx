// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';

function AdminConfiguracion() {
  const { data: equipData } = useQuery({
    queryKey: ['catalog-equipment'],
    queryFn: () => catalogApi.equipmentTypes(),
  });

  const { data: damageData } = useQuery({
    queryKey: ['catalog-damage'],
    queryFn: () => catalogApi.damageTypes(),
  });

  const { data: inspTypeData } = useQuery({
    queryKey: ['catalog-inspection-types'],
    queryFn: () => catalogApi.inspectionTypes(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Configuración</h2>
        <p className="text-sm text-muted-foreground">Gestiona el catálogo de tu empresa</p>
      </div>

      <Tabs defaultValue="equipment">
        <TabsList>
          <TabsTrigger value="equipment">Tipos de equipo</TabsTrigger>
          <TabsTrigger value="damage">Tipos de daño</TabsTrigger>
          <TabsTrigger value="inspection">Tipos de inspección</TabsTrigger>
        </TabsList>

        <TabsContent value="equipment">
          <Card>
            <CardHeader><CardTitle>Tipos de equipo</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {equipData?.equipment_types?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground font-mono">{item.code}</p>
                    </div>
                    <Badge variant={item.active ? 'success' : 'gray'}>
                      {item.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="damage">
          <Card>
            <CardHeader><CardTitle>Tipos de daño</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {damageData?.damage_types?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground font-mono">{item.code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        item.severity_default === 'severe' ? 'destructive' :
                        item.severity_default === 'moderate' ? 'orange' : 'warning'
                      }>
                        {item.severity_default}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inspection">
          <Card>
            <CardHeader><CardTitle>Tipos de inspección</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {inspTypeData?.inspection_types?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground font-mono">{item.code}</p>
                    </div>
                    <Badge variant={item.active ? 'success' : 'gray'}>
                      {item.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const Route = createFileRoute('/admin/admin/configuracion')({
  component: AdminConfiguracion,
});