// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '~/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Download, FileSpreadsheet } from 'lucide-react';
import { formatDate, formatCurrency } from '~/lib/utils';
import { STATUS_LABELS } from '~/lib/types';
import { toast } from '~/components/ui/use-toast';

function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map((row) =>
    Object.values(row).map((v) => `"${v ?? ''}"`).join(',')
  ).join('\n');
  const csv = `${headers}\n${rows}`;
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function AdminReportes() {
  const [period, setPeriod] = useState('30d');

  const { data: dashData, isLoading } = useQuery({
    queryKey: ['dashboard', period],
    queryFn: () => reportsApi.dashboard(period),
  });

  const { data: inspData } = useQuery({
    queryKey: ['report-inspections'],
    queryFn: () => reportsApi.inspections(),
  });

  const { data: mrData } = useQuery({
    queryKey: ['report-mr'],
    queryFn: () => reportsApi.mr(),
  });

  const { data: invData } = useQuery({
    queryKey: ['report-inventory'],
    queryFn: () => reportsApi.inventory() as Promise<{ supplies: Record<string, unknown>[] }>,
  });

  const handleExportInspections = () => {
    if (inspData?.inspections) {
      exportToCSV(
        inspData.inspections.map((i) => ({
          Folio: i.folio,
          Inspector: i.inspector_name,
          Contenedor: i.container_no,
          Estado: STATUS_LABELS[i.status as string] || i.status,
          Sucursal: i.branch_name,
          Fecha: formatDate(i.created_at),
        })),
        'inspecciones'
      );
      toast({ title: 'Reporte exportado' });
    }
  };

  const handleExportMR = () => {
    if (mrData?.work_orders) {
      exportToCSV(
        mrData.work_orders.map((wo) => ({
          Folio: wo.folio,
          Técnico: wo.tech_name,
          Contenedor: wo.container_no,
          Estado: STATUS_LABELS[wo.status as string] || wo.status,
          'Horas trabajo': wo.labor_hours,
          'Costo total': wo.total_cost,
          Fecha: formatDate(wo.created_at),
        })),
        'ordenes-trabajo'
      );
      toast({ title: 'Reporte exportado' });
    }
  };

  const handleExportInventory = () => {
    if ((invData as { supplies?: Record<string, unknown>[] })?.supplies) {
      exportToCSV(
        ((invData as { supplies: Record<string, unknown>[] }).supplies).map((s) => ({
          SKU: s.sku,
          Nombre: s.name,
          Categoría: s.category,
          Unidad: s.unit,
          Cantidad: s.quantity,
          'Stock mínimo': s.min_stock,
          'Costo unitario': s.cost,
          'Valor total': s.total_value,
        })),
        'inventario'
      );
      toast({ title: 'Reporte exportado' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reportes</h2>
          <p className="text-sm text-muted-foreground">Exporta datos e indicadores del sistema</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 días</SelectItem>
            <SelectItem value="30d">Últimos 30 días</SelectItem>
            <SelectItem value="90d">Últimos 90 días</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="inspections">
        <TabsList>
          <TabsTrigger value="inspections">Inspecciones</TabsTrigger>
          <TabsTrigger value="mr">M&R</TabsTrigger>
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
        </TabsList>

        <TabsContent value="inspections" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportInspections}>
              <FileSpreadsheet className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Folio</th>
                      <th className="text-left p-3 font-medium">Inspector</th>
                      <th className="text-left p-3 font-medium">Contenedor</th>
                      <th className="text-left p-3 font-medium">Estado</th>
                      <th className="text-left p-3 font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {inspData?.inspections?.map((insp) => (
                      <tr key={insp.id} className="hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs">{insp.folio}</td>
                        <td className="p-3">{insp.inspector_name}</td>
                        <td className="p-3">{insp.container_no || '—'}</td>
                        <td className="p-3">{STATUS_LABELS[insp.status] || insp.status}</td>
                        <td className="p-3 text-muted-foreground">{formatDate(insp.created_at)}</td>
                      </tr>
                    ))}
                    {!inspData?.inspections?.length && (
                      <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Sin datos</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mr" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportMR}>
              <FileSpreadsheet className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Folio</th>
                      <th className="text-left p-3 font-medium">Técnico</th>
                      <th className="text-left p-3 font-medium">Estado</th>
                      <th className="text-right p-3 font-medium">Horas</th>
                      <th className="text-right p-3 font-medium">Costo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {mrData?.work_orders?.map((wo) => (
                      <tr key={wo.id} className="hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs">{wo.folio}</td>
                        <td className="p-3">{wo.tech_name || '—'}</td>
                        <td className="p-3">{STATUS_LABELS[wo.status] || wo.status}</td>
                        <td className="p-3 text-right">{wo.labor_hours || '—'}</td>
                        <td className="p-3 text-right">{formatCurrency(wo.total_cost as number)}</td>
                      </tr>
                    ))}
                    {!mrData?.work_orders?.length && (
                      <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Sin datos</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportInventory}>
              <FileSpreadsheet className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">SKU</th>
                      <th className="text-left p-3 font-medium">Nombre</th>
                      <th className="text-left p-3 font-medium">Categoría</th>
                      <th className="text-right p-3 font-medium">Cantidad</th>
                      <th className="text-right p-3 font-medium">Valor total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(invData as { supplies?: { id: string; sku: string; name: string; category: string; quantity: number; cost: number; min_stock: number; is_low: number }[] })?.supplies?.map((s) => (
                      <tr key={s.id} className={s.is_low ? 'bg-red-50' : 'hover:bg-gray-50'}>
                        <td className="p-3 font-mono text-xs">{s.sku}</td>
                        <td className="p-3">{s.name}</td>
                        <td className="p-3 text-muted-foreground">{s.category}</td>
                        <td className="p-3 text-right">{s.quantity}</td>
                        <td className="p-3 text-right">{formatCurrency(s.quantity * s.cost)}</td>
                      </tr>
                    ))}
                    {!(invData as { supplies?: unknown[] })?.supplies?.length && (
                      <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Sin datos</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const Route = createFileRoute('/admin/admin/reportes')({
  component: AdminReportes,
});