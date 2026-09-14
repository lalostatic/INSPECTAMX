// @ts-nocheck
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inspectionsApi } from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Badge } from '~/components/ui/badge';
import { Plus, Search, ClipboardList } from 'lucide-react';
import { cn, formatDate } from '~/lib/utils';
import { STATUS_LABELS, STATUS_COLORS } from '~/lib/types';

function AppInspecciones() {
  const [statusFilter, setStatusFilter] = useState('');
  const [search] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['inspections', statusFilter],
    queryFn: () => inspectionsApi.list(statusFilter ? { status: statusFilter } : undefined),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inspecciones</h2>
          <p className="text-sm text-muted-foreground">
            {data?.pagination?.total || 0} inspecciones encontradas
          </p>
        </div>
        <Link to="/app/inspecciones/nueva">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Nueva inspección
          </Button>
        </Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por folio o contenedor..." className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="in_progress">En progreso</SelectItem>
            <SelectItem value="completed">Completado</SelectItem>
            <SelectItem value="approved">Aprobado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Cargando inspecciones...</div>
        ) : data?.inspections?.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">No se encontraron inspecciones</p>
            <Link to="/app/inspecciones/nueva">
              <Button className="mt-4">Crear primera inspección</Button>
            </Link>
          </div>
        ) : (
          data?.inspections?.map((insp) => (
            <Link key={insp.id} to="/app/inspecciones/$id" params={{ id: insp.id }}>
              <Card className="hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <ClipboardList className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold font-mono text-sm">{insp.folio}</p>
                          <span className={cn('status-badge text-xs', STATUS_COLORS[insp.status as keyof typeof STATUS_COLORS])}>
                            {STATUS_LABELS[insp.status] || insp.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {insp.container_no || 'Sin contenedor'} · {insp.inspector_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {insp.branch_name} · {formatDate(insp.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {insp.location && (
                        <p className="text-xs text-muted-foreground">{insp.location}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/app/app/inspecciones')({
  component: AppInspecciones,
});