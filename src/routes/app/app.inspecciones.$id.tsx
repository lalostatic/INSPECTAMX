// @ts-nocheck
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inspectionsApi } from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { PointMap } from '~/components/shared/PointMap';
import { ArrowLeft, CheckCircle, XCircle, Play, CheckSquare } from 'lucide-react';
import { cn, formatDateTime } from '~/lib/utils';
import { STATUS_LABELS, STATUS_COLORS } from '~/lib/types';
import { toast } from '~/components/ui/use-toast';
import { useAuthStore } from '~/lib/auth';

function InspeccionDetalle() {
  const { id } = Route.useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['inspection', id],
    queryFn: () => inspectionsApi.get(id),
  });

  const statusMutation = useMutation({
    mutationFn: (action: string) => {
      if (action === 'start') return inspectionsApi.start(id);
      if (action === 'complete') return inspectionsApi.complete(id);
      if (action === 'approve') return inspectionsApi.approve(id);
      if (action === 'reject') return inspectionsApi.reject(id);
      throw new Error('Unknown action');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection', id] });
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast({ title: 'Estado actualizado' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) return <div className="text-center py-12">Cargando...</div>;
  if (!data?.inspection) return <div className="text-center py-12">Inspección no encontrada</div>;

  const { inspection, points, media } = data;
  const canApprove = ['supervisor', 'company_admin', 'developer'].includes(user?.role || '');
  const canEdit = inspection.status !== 'approved' && inspection.status !== 'rejected';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/app/inspecciones">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-mono">{inspection.folio}</h2>
              <span className={cn('status-badge', STATUS_COLORS[inspection.status as keyof typeof STATUS_COLORS])}>
                {STATUS_LABELS[inspection.status] || inspection.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Inspector: {inspection.inspector_name} · {formatDateTime(inspection.created_at)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {inspection.status === 'draft' && canEdit && (
            <Button size="sm" onClick={() => statusMutation.mutate('start')} className="gap-1">
              <Play className="h-3 w-3" /> Iniciar
            </Button>
          )}
          {inspection.status === 'in_progress' && canEdit && (
            <Button size="sm" onClick={() => statusMutation.mutate('complete')} className="gap-1">
              <CheckSquare className="h-3 w-3" /> Completar
            </Button>
          )}
          {inspection.status === 'completed' && canApprove && (
            <>
              <Button size="sm" variant="outline" onClick={() => statusMutation.mutate('reject')} className="gap-1 text-red-600">
                <XCircle className="h-3 w-3" /> Rechazar
              </Button>
              <Button size="sm" onClick={() => statusMutation.mutate('approve')} className="gap-1">
                <CheckCircle className="h-3 w-3" /> Aprobar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Contenedor</p>
          <p className="font-semibold font-mono">{inspection.container_no || '—'}</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Ubicación</p>
          <p className="font-semibold">{inspection.location || '—'}</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Puntos de daño</p>
          <p className="font-semibold">{points?.length || 0}</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Evidencias</p>
          <p className="font-semibold">{media?.length || 0}</p>
        </div>
      </div>

      <Tabs defaultValue="map">
        <TabsList>
          <TabsTrigger value="map">Mapa de daños</TabsTrigger>
          <TabsTrigger value="points">Lista de daños ({points?.length || 0})</TabsTrigger>
          <TabsTrigger value="media">Evidencia ({media?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="map">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {(['side_left', 'side_right', 'top', 'front', 'rear'] as const).map((view) => (
                  <div key={view}>
                    <p className="text-sm font-medium mb-2 text-muted-foreground capitalize">
                      {view.replace('_', ' ')}
                    </p>
                    <PointMap
                      view={view}
                      points={points || []}
                      readonly
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="points">
          <Card>
            <CardContent className="p-0">
              {points?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">Sin puntos de daño registrados</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Código</th>
                      <th className="text-left p-3 font-medium">Vista</th>
                      <th className="text-left p-3 font-medium">Tipo de daño</th>
                      <th className="text-left p-3 font-medium">Severidad</th>
                      <th className="text-left p-3 font-medium">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {points?.map((p) => (
                      <tr key={p.id}>
                        <td className="p-3 font-mono font-medium">{p.point_code}</td>
                        <td className="p-3 text-muted-foreground">{p.view}</td>
                        <td className="p-3">{p.damage_type || '—'}</td>
                        <td className="p-3">
                          <Badge variant={
                            p.severity === 'severe' ? 'destructive' :
                            p.severity === 'moderate' ? 'orange' : 'warning'
                          }>
                            {p.severity || 'minor'}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{p.notes || '—'}</td>
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
            <CardContent className="pt-6">
              {media?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">Sin evidencia registrada</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {media?.map((m) => (
                    <div key={m.id} className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center border">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">{m.type}</p>
                        <p className="text-xs text-green-600">{m.synced ? 'Sincronizado' : 'Pendiente'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {inspection.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notas</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{inspection.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export const Route = createFileRoute('/app/app/inspecciones/$id')({
  component: InspeccionDetalle,
});