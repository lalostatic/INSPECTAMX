// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Plus, FileText } from 'lucide-react';

const DEMO_TEMPLATES = [
  { id: '1', name: 'Inspección General Contenedor', type: 'container', active: 1 },
  { id: '2', name: 'Inspección de Daños', type: 'damage', active: 1 },
  { id: '3', name: 'Inspección Pre-trip', type: 'pre_trip', active: 0 },
];

function AdminPlantillas() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Plantillas de Inspección</h2>
          <p className="text-sm text-muted-foreground">Configura las plantillas para tus inspecciones</p>
        </div>
        <Button className="gap-2" disabled>
          <Plus className="h-4 w-4" /> Nueva plantilla
        </Button>
      </div>

      <div className="grid gap-4">
        {DEMO_TEMPLATES.map((tmpl) => (
          <Card key={tmpl.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{tmpl.name}</h3>
                    <p className="text-sm text-muted-foreground">Tipo: {tmpl.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={tmpl.active ? 'success' : 'gray'}>
                    {tmpl.active ? 'Activa' : 'Inactiva'}
                  </Badge>
                  <Button variant="outline" size="sm" disabled>Editar</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/admin/admin/plantillas')({
  component: AdminPlantillas,
});