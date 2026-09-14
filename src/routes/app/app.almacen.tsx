// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi, containersApi } from '~/lib/api';
import { Card, CardContent } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { AlertTriangle } from 'lucide-react';
import { cn, formatCurrency } from '~/lib/utils';
import { STATUS_LABELS, STATUS_COLORS } from '~/lib/types';

function AlmacenInsumosTab() {
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['supplies', lowStockOnly],
    queryFn: () => inventoryApi.list(lowStockOnly ? { low_stock: 'true' } : undefined),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant={lowStockOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className="gap-2"
        >
          <AlertTriangle className="h-4 w-4" />
          {lowStockOnly ? 'Ver todos' : 'Solo alertas de stock'}
        </Button>
        {data?.pagination && (
          <span className="text-sm text-muted-foreground">
            {data.pagination.total} insumos
          </span>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium">SKU</th>
                  <th className="text-left p-3 font-medium">Nombre</th>
                  <th className="text-left p-3 font-medium">Categoría</th>
                  <th className="text-right p-3 font-medium">Cantidad</th>
                  <th className="text-right p-3 font-medium">Stock mín.</th>
                  <th className="text-right p-3 font-medium">Costo</th>
                  <th className="text-center p-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Cargando...</td></tr>
                ) : data?.supplies?.map((s) => (
                  <tr key={s.id} className={s.quantity <= s.min_stock ? 'bg-red-50' : 'hover:bg-gray-50'}>
                    <td className="p-3 font-mono text-xs">{s.sku}</td>
                    <td className="p-3 font-medium">{s.name}</td>
                    <td className="p-3 text-muted-foreground">{s.category}</td>
                    <td className="p-3 text-right">{s.quantity} {s.unit}</td>
                    <td className="p-3 text-right">{s.min_stock}</td>
                    <td className="p-3 text-right">{formatCurrency(s.cost)}</td>
                    <td className="p-3 text-center">
                      {s.quantity <= s.min_stock ? (
                        <Badge variant="destructive" className="text-xs">Stock bajo</Badge>
                      ) : (
                        <Badge variant="success" className="text-xs">OK</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {!isLoading && !data?.supplies?.length && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Sin insumos registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AlmacenContenedoresTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['containers-inventory'],
    queryFn: () => containersApi.list({ limit: '200' }),
  });

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium">Número</th>
                <th className="text-left p-3 font-medium">Tipo</th>
                <th className="text-left p-3 font-medium">Tamaño</th>
                <th className="text-left p-3 font-medium">Propietario</th>
                <th className="text-left p-3 font-medium">Ubicación</th>
                <th className="text-center p-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Cargando...</td></tr>
              ) : data?.containers?.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="p-3 font-mono font-medium">{c.container_no}</td>
                  <td className="p-3">{c.type === 'container' ? 'Contenedor' : c.type === 'chassis' ? 'Chasis' : 'Remolque'}</td>
                  <td className="p-3">{c.size ? `${c.size}'` : '—'}</td>
                  <td className="p-3 text-muted-foreground">{c.owner || '—'}</td>
                  <td className="p-3 font-mono text-xs">{c.location || '—'}</td>
                  <td className="p-3 text-center">
                    <span className={cn('status-badge text-xs', STATUS_COLORS[c.status as keyof typeof STATUS_COLORS])}>
                      {STATUS_LABELS[c.status] || c.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!isLoading && !data?.containers?.length && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Sin contenedores</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function AppAlmacen() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Almacén</h2>
        <p className="text-sm text-muted-foreground">Control de inventario y movimientos</p>
      </div>

      <Tabs defaultValue="supplies">
        <TabsList>
          <TabsTrigger value="supplies">Insumos</TabsTrigger>
          <TabsTrigger value="containers">Contenedores en patio</TabsTrigger>
        </TabsList>
        <TabsContent value="supplies">
          <AlmacenInsumosTab />
        </TabsContent>
        <TabsContent value="containers">
          <AlmacenContenedoresTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const Route = createFileRoute('/app/app/almacen')({
  component: AppAlmacen,
});