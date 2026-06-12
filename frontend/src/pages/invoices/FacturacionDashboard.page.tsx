import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { facturacionService } from '@/services/facturacionService';
import InvoiceMetrics from '@/components/invoices/InvoiceMetrics';
import InvoiceStatusBadge from '@/components/invoices/InvoiceStatusBadge';
import { Factura, FacturaStatus } from '@/types/facturacion';

export default function FacturacionDashboard() {
  useAuthStore();
  const [metrics, setMetrics] = useState({ pendientes: 0, autorizadas: 0, programadas: 0, rechazadas: 0 });
  const [recentInvoices, setRecentInvoices] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await facturacionService.getFacturas({ limit: 10 });
      const facturas = Array.isArray(data) ? data : [];
      
      // Calculate metrics safely
      const p = facturas.filter(f => f?.status === FacturaStatus.VALIDANDO).length;
      const a = facturas.filter(f => f?.status === FacturaStatus.AUTORIZADA).length;
      const prog = facturas.filter(f => f?.status === FacturaStatus.PROGRAMADA).length;
      const r = facturas.filter(f => f?.status === FacturaStatus.RECHAZADA).length;
      
      setMetrics({ pendientes: p, autorizadas: a, programadas: prog, rechazadas: r });
      setRecentInvoices(facturas.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Fallback on error so the page doesn't break
      setRecentInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading && recentInvoices.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-gray-600">Cargando dashboard...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Dashboard de Facturación
          </h2>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <Link
            to="/facturacion/nueva"
            className="ml-3 inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Nueva Factura
          </Link>
        </div>
      </div>

      <InvoiceMetrics {...metrics} />

      <div className="mt-8">
        <h3 className="text-base font-semibold leading-6 text-gray-900">Facturas de atención reciente</h3>
        <div className="mt-4 overflow-hidden rounded-lg bg-white shadow ring-1 ring-gray-300">
          <ul role="list" className="divide-y divide-gray-200">
            {recentInvoices?.map((factura) => (
              <li key={factura?.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="truncate">
                    <p className="truncate font-medium text-indigo-600">Folio: {factura?.folio || 'N/A'}</p>
                    <p className="mt-1 flex text-sm text-gray-500">Proveedor: {factura?.proveedor_nombre || 'Sin proveedor'}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <InvoiceStatusBadge status={factura?.status || FacturaStatus.PENDIENTE} />
                    <span className="mt-1 text-sm font-medium text-gray-900">
                      ${Number(factura?.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
            {(!recentInvoices || recentInvoices.length === 0) && !loading && (
              <li className="p-4 text-center text-sm text-gray-500">No hay facturas recientes</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
