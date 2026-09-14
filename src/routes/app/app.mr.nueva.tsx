// @ts-nocheck
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workOrdersApi, catalogApi, containersApi, usersApi } from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { toast } from '~/components/ui/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';

const schema = z.object({
  container_id: z.string().optional(),
  tech_id: z.string().optional(),
  branch_id: z.string().optional(),
  type: z.enum(['repair', 'maintenance', 'inspection', 'cleaning']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function NuevaOT() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: containersData } = useQuery({ queryKey: ['containers-list'], queryFn: () => containersApi.list({ limit: '100' }) });
  const { data: usersData } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() });
  const { data: branchesData } = useQuery({ queryKey: ['branches'], queryFn: () => catalogApi.branches() });

  const techUsers = usersData?.users?.filter((u) => u.role === 'mr_tech') || [];

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'repair', priority: 'normal' },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => workOrdersApi.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast({ title: `OT creada: ${res.folio}` });
      navigate({ to: '/app/mr' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/app/mr">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold">Nueva Orden de Trabajo</h2>
          <p className="text-sm text-muted-foreground">Crea una nueva OT de M&R</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Datos de la orden</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contenedor</Label>
                <Select onValueChange={(v) => form.setValue('container_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {containersData?.containers?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.container_no}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Técnico asignado</Label>
                <Select onValueChange={(v) => form.setValue('tech_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar técnico" /></SelectTrigger>
                  <SelectContent>
                    {techUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de trabajo *</Label>
                <Select defaultValue="repair" onValueChange={(v) => form.setValue('type', v as FormData['type'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="repair">Reparación</SelectItem>
                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                    <SelectItem value="inspection">Inspección</SelectItem>
                    <SelectItem value="cleaning">Limpieza</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridad *</Label>
                <Select defaultValue="normal" onValueChange={(v) => form.setValue('priority', v as FormData['priority'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-2">
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
                <Label>Descripción del trabajo</Label>
                <Input {...form.register('description')} placeholder="Describe el trabajo a realizar..." />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Link to="/app/mr">
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
              <Button type="submit" disabled={createMutation.isPending} className="gap-2">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Crear orden de trabajo
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/app/app/mr/nueva')({
  component: NuevaOT,
});