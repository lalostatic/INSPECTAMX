// @ts-nocheck
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { containersApi } from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { ArrowLeft, MapPin, Container } from 'lucide-react';
import { cn, formatDateTime } from '~/lib/utils';
import { STATUS_LABELS, STATUS_COLORS } from '~/lib/types';

function ChasisDetalle() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ['container', id],
    queryFn: () => containersApi.get(id),
  });

  if (isLoading) return <div className="text-center py-12">Cargando...</div>;
  if (!data?.container) return <div className="text-center py-12">Contenedor no encontrado</div>;

  const { container, movements, inspections } = data;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/app/chasis">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold font-mono">{container.container_no}</h2>
            <span className={cn('status-badge', STATUS_COLORS[container.status as keyof typeof STATUS_COLORS])}>
              {STATUS_LABELS[container.status] || container.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {container.type === 'container' ? 'Contenedor' : container.type === 'chassis' ? 'Chasis' : 'Remolque'}
            {container.size && ` ${container.size}'`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Propietario</p>
          <p className="font-semibold">{container.owner || '—'}</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Ubicación</p>
          <p className="font-semibold flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {container.location || '—'}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Sucursal</p>
          <p className="font-semibold">{container.branch_name || '—'}</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Inspecciones</p>
          <p className="font-semibold">{inspections?.length || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Historial de movimientos</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {movements?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin movimientos</p>
              ) : movements?.map((mov) => (
                <div key={mov.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs font-medium">
                    {mov.movement_type === 'check_in' ? '↓' : mov.movement_type === 'check_out' ? '↑' : '↔'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {mov.movement_type === 'check_in' ? 'Entrada' :
                       mov.movement_type === 'check_out' ? 'Salida' :
                       mov.movement_type === 'relocate' ? 'Reubicación' :
                       mov.movement_type}
                    </p>
                    <p className="text-xs text-muted-foreground">{mov.user_name} · {formatDateTime(mov.created_at)}</p>
                    {mov.notes && <p className="text-xs text-muted-foreground">{mov.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Inspecciones</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inspections?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin inspecciones</p>
              ) : inspections?.map((insp) => (
                <Link key={insp.id} to="/app/inspecciones/$id" params={{ id: insp.id }}>
                  <div className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded">
                    <div>
                      <p className="text-sm font-mono font-medium">{insp.folio}</p>
                      <p className="text-xs text-muted-foreground">{insp.inspector_name}</p>
                    </div>
                    <span className={cn('status-badge text-xs', STATUS_COLORS[insp.status as keyof typeof STATUS_COLORS])}>
                      {STATUS_LABELS[insp.status] || insp.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/app/app/chasis/$id')({
  component: ChasisDetalle,
});