// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { containersApi } from '~/lib/api';
import { Card, CardContent } from '~/components/ui/card';
import { cn } from '~/lib/utils';
import { STATUS_LABELS, STATUS_COLORS } from '~/lib/types';

export function AlmacenContenedores() {
  const { data, isLoading } = useQuery({
    queryKey: ['containers-all'],
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
                <th className="text-left p-3 font-medium">Ubicación</th>
                <th className="text-center p-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Cargando...</td></tr>
              ) : data?.containers?.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="p-3 font-mono font-medium">{c.container_no}</td>
                  <td className="p-3">{c.type}</td>
                  <td className="p-3">{c.size ? `${c.size}'` : '—'}</td>
                  <td className="p-3 font-mono text-xs">{c.location || '—'}</td>
                  <td className="p-3 text-center">
                    <span className={cn('status-badge text-xs', STATUS_COLORS[c.status as keyof typeof STATUS_COLORS])}>
                      {STATUS_LABELS[c.status] || c.status}
                    </span>
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

function AlmacenContenedoresPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Inventario de Contenedores</h2>
      <AlmacenContenedores />
    </div>
  );
}

export const Route = createFileRoute('/app/app/almacen/contenedores')({
  component: AlmacenContenedoresPage,
});