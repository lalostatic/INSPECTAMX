// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '~/lib/api';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { formatCurrency } from '~/lib/utils';

export function AlmacenInsumos() {
  const { data, isLoading } = useQuery({
    queryKey: ['supplies'],
    queryFn: () => inventoryApi.list(),
  });

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium">SKU</th>
                <th className="text-left p-3 font-medium">Nombre</th>
                <th className="text-right p-3 font-medium">Cantidad</th>
                <th className="text-right p-3 font-medium">Costo</th>
                <th className="text-center p-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Cargando...</td></tr>
              ) : data?.supplies?.map((s) => (
                <tr key={s.id} className={s.quantity <= s.min_stock ? 'bg-red-50' : ''}>
                  <td className="p-3 font-mono text-xs">{s.sku}</td>
                  <td className="p-3">{s.name}</td>
                  <td className="p-3 text-right">{s.quantity} {s.unit}</td>
                  <td className="p-3 text-right">{formatCurrency(s.cost)}</td>
                  <td className="p-3 text-center">
                    <Badge variant={s.quantity <= s.min_stock ? 'destructive' : 'success'}>
                      {s.quantity <= s.min_stock ? 'Stock bajo' : 'OK'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function AlmacenInsumosPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Insumos</h2>
      <AlmacenInsumos />
    </div>
  );
}

export const Route = createFileRoute('/app/app/almacen/insumos')({
  component: AlmacenInsumosPage,
});