// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { CheckCircle2, Database, HardDrive, Cpu, Globe } from 'lucide-react';

function DevSistema() {
  const services = [
    { name: 'Cloudflare Workers API', status: 'operational', latency: '12ms', icon: Globe },
    { name: 'Base de datos D1', status: 'operational', latency: '8ms', icon: Database },
    { name: 'Almacenamiento R2', status: 'operational', latency: '45ms', icon: HardDrive },
    { name: 'Cache KV', status: 'operational', latency: '3ms', icon: Cpu },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Estado del Sistema</h2>
        <p className="text-sm text-muted-foreground">Monitoreo de servicios de infraestructura</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Servicios de infraestructura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div key={service.name} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-xs text-muted-foreground">Latencia: {service.latency}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <Badge variant="success">Operacional</Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuración del entorno</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Framework</span>
              <span className="font-medium">TanStack Start + React 19</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Deploy target</span>
              <span className="font-medium">Cloudflare Workers</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Base de datos</span>
              <span className="font-medium">D1 (SQLite Edge)</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Almacenamiento</span>
              <span className="font-medium">R2 Object Storage</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Versión</span>
              <span className="font-medium">1.0.0</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/dev/dev/sistema')({
  component: DevSistema,
});