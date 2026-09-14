// @ts-nocheck
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { containersApi } from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Badge } from '~/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Label } from '~/components/ui/label';
import { Plus, Search, Container, MapPin } from 'lucide-react';
import { cn, formatDate } from '~/lib/utils';
import { STATUS_LABELS, STATUS_COLORS } from '~/lib/types';
import { toast } from '~/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const containerSchema = z.object({
  container_no: z.string().min(4, 'Número requerido').toUpperCase(),
  type: z.enum(['container', 'chassis', 'trailer']),
  size: z.enum(['20', '40', '45', '53']).optional(),
  owner: z.string().optional(),
  location_bay: z.string().optional(),
  location_row: z.string().optional(),
  location_slot: z.string().optional(),
  notes: z.string().optional(),
});

type ContainerForm = z.infer<typeof containerSchema>;

function AppChasis() {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: statsData } = useQuery({
    queryKey: ['container-stats'],
    queryFn: () => containersApi.stats(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['containers', statusFilter, search],
    queryFn: () => containersApi.list({
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(search ? { search } : {}),
    }),
  });

  const form = useForm<ContainerForm>({
    resolver: zodResolver(containerSchema),
    defaultValues: { type: 'container' },
  });

  const createMutation = useMutation({
    mutationFn: (data: ContainerForm) => containersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      setOpen(false);
      form.reset({ type: 'container' });
      toast({ title: 'Contenedor registrado' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const stats = (statsData as { stats?: Record<string, number> })?.stats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Contenedores / Chasis</h2>
          <p className="text-sm text-muted-foreground">Control de patio</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-700' },
            { label: 'En patio', value: stats.in_yard, color: 'text-green-700' },
            { label: 'Fuera', value: stats.out, color: 'text-blue-700' },
            { label: 'Mantenimiento', value: stats.maintenance, color: 'text-orange-700' },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value || 0}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="in_yard">En patio</SelectItem>
            <SelectItem value="out">Fuera</SelectItem>
            <SelectItem value="maintenance">Mantenimiento</SelectItem>
            <SelectItem value="damaged">Dañado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Cargando contenedores...</div>
        ) : data?.containers?.length === 0 ? (
          <div className="text-center py-16">
            <Container className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">No se encontraron contenedores</p>
            <Button className="mt-4" onClick={() => setOpen(true)}>Registrar primero</Button>
          </div>
        ) : (
          data?.containers?.map((container) => (
            <Link key={container.id} to="/app/chasis/$id" params={{ id: container.id }}>
              <Card className="hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <Container className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold font-mono">{container.container_no}</p>
                          <span className={cn('status-badge text-xs', STATUS_COLORS[container.status as keyof typeof STATUS_COLORS])}>
                            {STATUS_LABELS[container.status] || container.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {container.type === 'container' ? 'Contenedor' : container.type === 'chassis' ? 'Chasis' : 'Remolque'}
                          {container.size && ` ${container.size}'`}
                          {container.owner && ` · ${container.owner}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {container.location && (
                        <div className="flex items-center gap-1 text-sm font-mono text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {container.location}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">{formatDate(container.updated_at)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar contenedor</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="space-y-2">
              <Label>Número de contenedor *</Label>
              <Input {...form.register('container_no')} placeholder="MSCU1234567" />
              {form.formState.errors.container_no && (
                <p className="text-xs text-destructive">{form.formState.errors.container_no.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select defaultValue="container" onValueChange={(v) => form.setValue('type', v as ContainerForm['type'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="container">Contenedor</SelectItem>
                    <SelectItem value="chassis">Chasis</SelectItem>
                    <SelectItem value="trailer">Remolque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tamaño</Label>
                <Select onValueChange={(v) => form.setValue('size', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20'</SelectItem>
                    <SelectItem value="40">40'</SelectItem>
                    <SelectItem value="45">45'</SelectItem>
                    <SelectItem value="53">53'</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Propietario / Naviera</Label>
              <Input {...form.register('owner')} placeholder="MSC, CMA CGM, etc." />
            </div>
            <div className="space-y-2">
              <Label>Ubicación (BAY-ROW-SLOT)</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input {...form.register('location_bay')} placeholder="Bahía (A)" />
                <Input {...form.register('location_row')} placeholder="Fila (01)" />
                <Input {...form.register('location_slot')} placeholder="Slot (03)" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Registrando...' : 'Registrar contenedor'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute('/app/app/chasis')({
  component: AppChasis,
});