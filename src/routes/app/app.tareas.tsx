// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, usersApi } from '~/lib/api';
import { Card, CardContent } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Badge } from '~/components/ui/badge';
import { Plus, CheckSquare, Calendar } from 'lucide-react';
import { cn, formatDate } from '~/lib/utils';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS } from '~/lib/types';
import { toast } from '~/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const taskSchema = z.object({
  title: z.string().min(2, 'Mínimo 2 caracteres'),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  due_date: z.string().optional(),
});

type TaskForm = z.infer<typeof taskSchema>;

function AppTareas() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['tasks'], queryFn: () => tasksApi.list() });
  const { data: usersData } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() });

  const form = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: { priority: 'normal' },
  });

  const createMutation = useMutation({
    mutationFn: (data: TaskForm) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setOpen(false);
      form.reset({ priority: 'normal' });
      toast({ title: 'Tarea creada' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tareas</h2>
          <p className="text-sm text-muted-foreground">
            {data?.tasks?.length || 0} tareas
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nueva tarea
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Cargando...</div>
        ) : data?.tasks?.length === 0 ? (
          <div className="text-center py-16">
            <CheckSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">Sin tareas</p>
            <Button className="mt-4" onClick={() => setOpen(true)}>Crear primera tarea</Button>
          </div>
        ) : (
          data?.tasks?.map((task) => (
            <Card key={task.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{task.title}</h3>
                      <span className={cn('status-badge text-xs', STATUS_COLORS[task.priority as keyof typeof STATUS_COLORS])}>
                        {PRIORITY_LABELS[task.priority] || task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {task.assigned_to_name && <span>Asignado a: {task.assigned_to_name}</span>}
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(task.due_date)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={cn('status-badge text-xs', STATUS_COLORS[task.status as keyof typeof STATUS_COLORS])}>
                    {STATUS_LABELS[task.status] || task.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva tarea</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input {...form.register('title')} placeholder="Título de la tarea" />
              {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input {...form.register('description')} placeholder="Descripción..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select defaultValue="normal" onValueChange={(v) => form.setValue('priority', v as TaskForm['priority'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha límite</Label>
                <Input type="date" {...form.register('due_date')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Asignar a</Label>
              <Select onValueChange={(v) => form.setValue('assigned_to', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar usuario" /></SelectTrigger>
                <SelectContent>
                  {usersData?.users?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creando...' : 'Crear tarea'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute('/app/app/tareas')({
  component: AppTareas,
});