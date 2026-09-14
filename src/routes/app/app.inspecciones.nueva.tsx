// @ts-nocheck
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inspectionsApi, catalogApi, containersApi } from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { PointMap } from '~/components/shared/PointMap';
import { MediaCapture } from '~/components/shared/MediaCapture';
import { toast } from '~/components/ui/use-toast';
import { ArrowLeft, Loader2, MapPin } from 'lucide-react';
import type { InspectionPoint } from '~/lib/types';

const schema = z.object({
  container_id: z.string().optional(),
  template_id: z.string().optional(),
  branch_id: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function NuevaInspeccion() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [points, setPoints] = useState<Partial<InspectionPoint>[]>([]);
  const [activeView, setActiveView] = useState<'side_left' | 'side_right' | 'top' | 'front' | 'rear'>('side_left');
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number; view: string } | null>(null);
  const [damageType, setDamageType] = useState('');
  const [severity, setSeverity] = useState<'minor' | 'moderate' | 'severe'>('minor');

  const { data: containersData } = useQuery({
    queryKey: ['containers-list'],
    queryFn: () => containersApi.list({ limit: '100' }),
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => catalogApi.branches(),
  });

  const { data: damageTypesData } = useQuery({
    queryKey: ['damage-types'],
    queryFn: () => catalogApi.damageTypes(),
  });

  const form = useForm<FormData>({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => inspectionsApi.create(data),
    onSuccess: (res) => {
      const id = res.inspection?.id;
      if (id) {
        setInspectionId(id);
        toast({ title: 'Inspección creada. Ahora marca los daños.' });
      }
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const completeMutation = useMutation({
    mutationFn: () => inspectionsApi.complete(inspectionId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast({ title: 'Inspección completada' });
      navigate({ to: '/app/inspecciones' });
    },
  });

  const handleMapClick = (x: number, y: number, view: string) => {
    setPendingPoint({ x, y, view });
  };

  const confirmPoint = async () => {
    if (!pendingPoint || !inspectionId) return;
    const pointCount = points.length + 1;
    const newPoint: Partial<InspectionPoint> = {
      point_code: `P-${pointCount.toString().padStart(3, '0')}`,
      x_coord: pendingPoint.x,
      y_coord: pendingPoint.y,
      view: pendingPoint.view as InspectionPoint['view'],
      damage_type: damageType || undefined,
      severity,
    };

    await inspectionsApi.addPoint(inspectionId, newPoint);
    setPoints((prev) => [...prev, newPoint]);
    setPendingPoint(null);
    setDamageType('');
    setSeverity('minor');
    toast({ title: `Punto de daño P-${pointCount.toString().padStart(3, '0')} agregado` });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/app/inspecciones">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold">Nueva Inspección</h2>
          <p className="text-sm text-muted-foreground">
            {inspectionId ? `Folio en progreso · Agregando evidencias` : 'Paso 1: Datos generales'}
          </p>
        </div>
      </div>

      {!inspectionId ? (
        <Card>
          <CardHeader><CardTitle>Datos generales</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contenedor</Label>
                  <Select onValueChange={(v) => form.setValue('container_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar contenedor" /></SelectTrigger>
                    <SelectContent>
                      {containersData?.containers?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.container_no} ({c.status})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sucursal</Label>
                  <Select onValueChange={(v) => form.setValue('branch_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar sucursal" /></SelectTrigger>
                    <SelectContent>
                      {branchesData?.branches?.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Ubicación (BAY-ROW-SLOT)</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      placeholder="Ej: A-01-03"
                      {...form.register('location')}
                    />
                  </div>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Notas iniciales</Label>
                  <Input {...form.register('notes')} placeholder="Observaciones iniciales..." />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={createMutation.isPending} className="gap-2">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Iniciar inspección
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="map">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="map">Mapa de daños ({points.length})</TabsTrigger>
            <TabsTrigger value="media">Evidencia fotográfica</TabsTrigger>
          </TabsList>

          <TabsContent value="map">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Marcar puntos de daño</CardTitle>
                  <Select
                    value={activeView}
                    onValueChange={(v) => setActiveView(v as typeof activeView)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="side_left">Vista lateral izq.</SelectItem>
                      <SelectItem value="side_right">Vista lateral der.</SelectItem>
                      <SelectItem value="top">Vista superior</SelectItem>
                      <SelectItem value="front">Frente</SelectItem>
                      <SelectItem value="rear">Trasera</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <PointMap
                  view={activeView}
                  points={points as InspectionPoint[]}
                  onAddPoint={handleMapClick}
                />

                {pendingPoint && (
                  <div className="p-4 rounded-lg border bg-blue-50 space-y-3">
                    <p className="text-sm font-medium text-blue-900">Configurar punto de daño</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Tipo de daño</Label>
                        <Select value={damageType} onValueChange={setDamageType}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {damageTypesData?.damage_types?.map((dt) => (
                              <SelectItem key={dt.id} value={dt.code}>{dt.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Severidad</Label>
                        <Select value={severity} onValueChange={(v) => setSeverity(v as typeof severity)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minor">Menor</SelectItem>
                            <SelectItem value="moderate">Moderado</SelectItem>
                            <SelectItem value="severe">Severo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={confirmPoint}>Confirmar punto</Button>
                      <Button size="sm" variant="outline" onClick={() => setPendingPoint(null)}>Cancelar</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media">
            <Card>
              <CardHeader><CardTitle>Capturar evidencia</CardTitle></CardHeader>
              <CardContent>
                <MediaCapture
                  entityType="inspection"
                  entityId={inspectionId}
                  onCapture={(id) => {
                    if (id) toast({ title: 'Evidencia capturada' });
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {inspectionId && (
        <div className="flex justify-end gap-3">
          <Link to="/app/inspecciones">
            <Button variant="outline">Guardar y salir</Button>
          </Link>
          <Button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
            {completeMutation.isPending ? 'Completando...' : 'Completar inspección'}
          </Button>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/app/app/inspecciones/nueva')({
  component: NuevaInspeccion,
});