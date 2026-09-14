// @ts-nocheck
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsApi } from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { toast } from '~/components/ui/use-toast';
import { slugify } from '~/lib/utils';
import { ArrowLeft, Building2, Loader2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  plan: z.enum(['basic', 'pro', 'enterprise']),
  adminEmail: z.string().email('Correo inválido'),
  adminName: z.string().min(2, 'Mínimo 2 caracteres'),
  adminPassword: z.string().min(8, 'Mínimo 8 caracteres'),
});

type FormData = z.infer<typeof schema>;

function NuevaEmpresa() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      plan: 'basic',
      slug: '',
      adminPassword: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => tenantsApi.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: 'Empresa creada exitosamente',
        description: `${form.getValues('name')} ha sido aprovisionada.`,
      });
      navigate({ to: '/dev/empresas' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al crear empresa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue('name', e.target.value);
    if (!form.getValues('slug')) {
      form.setValue('slug', slugify(e.target.value));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/dev/empresas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold">Nueva empresa</h2>
          <p className="text-sm text-muted-foreground">Aprovisiona una nueva empresa en el sistema</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Datos de la empresa
          </CardTitle>
          <CardDescription>
            Al crear la empresa se aprovisionará automáticamente: sucursal principal, catálogo base y usuario administrador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name">Nombre de la empresa *</Label>
                <Input
                  id="name"
                  placeholder="Ej: ACME Logística"
                  {...form.register('name')}
                  onChange={handleNameChange}
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Identificador (slug) *</Label>
                <Input
                  id="slug"
                  placeholder="acme-logistica"
                  {...form.register('slug')}
                />
                <p className="text-xs text-muted-foreground">Solo letras minúsculas, números y guiones</p>
                {form.formState.errors.slug && (
                  <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Plan *</Label>
                <Select
                  onValueChange={(v) => form.setValue('plan', v as 'basic' | 'pro' | 'enterprise')}
                  defaultValue="basic"
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Usuario administrador</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="adminName">Nombre completo *</Label>
                  <Input
                    id="adminName"
                    placeholder="Ej: Juan Pérez"
                    {...form.register('adminName')}
                  />
                  {form.formState.errors.adminName && (
                    <p className="text-xs text-destructive">{form.formState.errors.adminName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Correo electrónico *</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@empresa.com"
                    {...form.register('adminEmail')}
                  />
                  {form.formState.errors.adminEmail && (
                    <p className="text-xs text-destructive">{form.formState.errors.adminEmail.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Contraseña *</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    {...form.register('adminPassword')}
                  />
                  {form.formState.errors.adminPassword && (
                    <p className="text-xs text-destructive">{form.formState.errors.adminPassword.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Link to="/dev/empresas">
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
              <Button type="submit" disabled={createMutation.isPending} className="gap-2">
                {createMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Aprovisionando...</>
                ) : (
                  'Crear empresa'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/dev/dev/empresas/nueva')({
  component: NuevaEmpresa,
});