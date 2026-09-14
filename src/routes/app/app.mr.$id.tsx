// @ts-nocheck
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workOrdersApi } from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { ArrowLeft, Play, CheckSquare, X } from 'lucide-react';
import { cn, formatDateTime, formatCurrency } from '~/lib/utils';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS } from '~/lib/types';
import { toast } from '~/components/ui/use-toast';
import { useAuthStore } from '~/lib/auth';
import { MediaCapture } from '~/components/shared/MediaCapture';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';

function OTDetalle() {
  const { id } = Route.useParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => workOrdersApi.get(id),
  });

  const statusMutation = useMutation({
    mutationFn: (action: string) => {
      if (action === 'start') return workOrdersApi.start(id);
      if (action === 'complete') return workOrdersApi.complete(id);
      if (action === 'cancel') return workOrdersApi.cancel(id);
      throw new Error('Unknown action');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast({ title: 'Estado actualizado' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) return <div className="text-center py-12">Cargando...</div>;
  if (!data?.work_order) return <div className="text-center py-12">OT no encontrada</div>;

  const { work_order: wo, items } = data;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/app/mr">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-mono">{wo.folio}</h2>
              <span className={cn('status-badge', STATUS_COLORS[wo.priority as keyof typeof STATUS_COLORS])}>
                {PRIORITY_LABELS[wo.priority] || wo.priority}
              </span>
              <span className={cn('status-badge', STATUS_COLORS[wo.status as keyof typeof STATUS_COLORS])}>
                {STATUS_LABELS[wo.status] || wo.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{formatDateTime(wo.created_at)}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {wo.status === 'pending' && (
            <Button size="sm" onClick={() => statusMutation.mutate('start')} className="gap-1">
              <Play className="h-3 w-3" /> Iniciar
            </Button>
          )}
          {wo.status === 'in_progress' && (
            <Button size="sm" onClick={() => statusMutation.mutate('complete')} className="gap-1">
              <CheckSquare className="h-3 w-3" /> Completar
            </Button>
          )}
          {['pending', 'in_progress'].includes(wo.status) && (
            <Button size="sm" variant="outline" className="gap-1 text-red-600" onClick={() => statusMutation.mutate('cancel')}>
              <X className="h-3 w-3" /> Cancelar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Contenedor</p>
          <p className="font-semibold font-mono">{wo.container_no || '—'}</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Técnico</p>
          <p className="font-semibold">{wo.tech_name || '—'}</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Horas</p>
          <p className="font-semibold">{wo.labor_hours || '—'}</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Costo total</p>
          <p className="font-semibold">{formatCurrency(wo.total_cost as number)}</p>
        </div>
      </div>

      {wo.description && (
        <Card>
          <CardHeader><CardTitle className="text-base">Descripción</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{wo.description}</p></CardContent>
        </Card>
      )}

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Materiales ({items?.length || 0})</TabsTrigger>
          <TabsTrigger value="media">Evidencia</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <Card>
            <CardContent className="p-0">
              {!items?.length ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Sin materiales registrados</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Descripción</th>
                      <th className="text-right p-3 font-medium">Cantidad</th>
                      <th className="text-right p-3 font-medium">Costo unit.</th>
                      <th className="text-right p-3 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3">{item.description}</td>
                        <td className="p-3 text-right">{item.quantity_used}</td>
                        <td className="p-3 text-right">{formatCurrency(item.unit_cost)}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(item.total_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media">
          <Card>
            <CardHeader><CardTitle className="text-base">Evidencia fotográfica</CardTitle></CardHeader>
            <CardContent>
              {wo.status !== 'completed' && wo.status !== 'cancelled' && (
                <MediaCapture
                  entityType="work_order"
                  entityId={wo.id}
                  onCapture={() => toast({ title: 'Evidencia capturada' })}
                />
              )}
              {wo.status === 'completed' && (
                <p className="text-sm text-muted-foreground">OT completada - sin edición de evidencia</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const Route = createFileRoute('/app/app/mr/$id')({
  component: OTDetalle,
});