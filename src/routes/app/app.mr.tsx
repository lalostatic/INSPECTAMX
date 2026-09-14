// @ts-nocheck
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { workOrdersApi } from '~/lib/api';
import { Card, CardContent } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Plus, Wrench } from 'lucide-react';
import { cn, formatDate, formatCurrency } from '~/lib/utils';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS } from '~/lib/types';

function AppMR() {
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['work-orders', statusFilter],
    queryFn: () => workOrdersApi.list(statusFilter ? { status: statusFilter } : undefined),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Taller M&R</h2>
          <p className="text-sm text-muted-foreground">
            {data?.pagination?.total || 0} órdenes de trabajo
          </p>
        </div>
        <Link to="/app/mr/nueva">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Nueva OT
          </Button>
        </Link>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="in_progress">En progreso</SelectItem>
            <SelectItem value="completed">Completado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Cargando órdenes...</div>
        ) : data?.work_orders?.length === 0 ? (
          <div className="text-center py-16">
            <Wrench className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">No se encontraron órdenes de trabajo</p>
            <Link to="/app/mr/nueva">
              <Button className="mt-4">Crear primera OT</Button>
            </Link>
          </div>
        ) : (
          data?.work_orders?.map((wo) => (
            <Link key={wo.id} to="/app/mr/$id" params={{ id: wo.id }}>
              <Card className="hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                        <Wrench className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold font-mono text-sm">{wo.folio}</p>
                          <span className={cn('status-badge text-xs', STATUS_COLORS[wo.priority as keyof typeof STATUS_COLORS])}>
                            {PRIORITY_LABELS[wo.priority] || wo.priority}
                          </span>
                          <span className={cn('status-badge text-xs', STATUS_COLORS[wo.status as keyof typeof STATUS_COLORS])}>
                            {STATUS_LABELS[wo.status] || wo.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {wo.container_no || 'Sin contenedor'} · {wo.tech_name || 'Sin técnico'}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(wo.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {wo.total_cost != null && wo.total_cost > 0 && (
                        <p className="text-sm font-semibold">{formatCurrency(wo.total_cost)}</p>
                      )}
                      {wo.labor_hours && (
                        <p className="text-xs text-muted-foreground">{wo.labor_hours}h</p>
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

export const Route = createFileRoute('/app/app/mr')({
  component: AppMR,
});