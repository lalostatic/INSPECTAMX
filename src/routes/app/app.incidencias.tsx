// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { AlertTriangle, Plus } from 'lucide-react';
import { Badge } from '~/components/ui/badge';

const DEMO_INCIDENTS = [
  { id: '1', title: 'Contenedor con daño estructural', priority: 'high', status: 'open', reported_by: 'Inspector 1', created_at: new Date().toISOString() },
  { id: '2', title: 'Derrame de aceite en zona B', priority: 'urgent', status: 'investigating', reported_by: 'Inspector 2', created_at: new Date().toISOString() },
];

function AppIncidencias() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Incidencias</h2>
          <p className="text-sm text-muted-foreground">Reporte y seguimiento de incidentes</p>
        </div>
        <Button className="gap-2" disabled>
          <Plus className="h-4 w-4" /> Nueva incidencia
        </Button>
      </div>

      <div className="space-y-3">
        {DEMO_INCIDENTS.map((incident) => (
          <Card key={incident.id} className="hover:shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">{incident.title}</h3>
                    <p className="text-sm text-muted-foreground">Reportado por: {incident.reported_by}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={incident.priority === 'urgent' ? 'destructive' : 'warning'}>
                    {incident.priority}
                  </Badge>
                  <Badge variant="info">{incident.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/app/app/incidencias')({
  component: AppIncidencias,
});