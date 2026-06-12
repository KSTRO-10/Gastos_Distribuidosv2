import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { facturacionService } from '@/services/facturacionService';
import { Factura } from '@/types/facturacion';
import InvoiceStatusBadge from '@/components/invoices/InvoiceStatusBadge';
import TimelineTracker from '@/components/invoices/TimelineTracker';
import PdfViewer from '@/components/invoices/PdfViewer';
import { useAuthStore } from '@/stores/authStore';

export default function FacturaDetail() {
  const { id } = useParams<{ id: string }>();
  const [factura, setFactura] = useState<Factura | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    if (id) fetchFactura(parseInt(id));
  }, [id]);

  const fetchFactura = async (facturaId: number) => {
    try {
      setLoading(true);
      const data = await facturacionService.getFactura(facturaId);
      setFactura(data);
    } catch (error) {
      console.error('Error fetching factura detail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando detalles...</div>;
  if (!factura) return <div className="p-8 text-center text-red-500">Factura no encontrada</div>;

  const timelineEvents = [
    { id: 1, title: 'Factura Recibida', date: factura.creado_en || '2026-06-01', user: 'Sistema', status: 'completed' as const },
    { id: 2, title: 'Validación 3-Way Match', date: '2026-06-02', user: 'Adquisiciones', status: factura.status === 'VALIDANDO' ? 'current' as const : 'completed' as const },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold leading-7 text-gray-900">
            Factura {factura.folio}
          </h2>
          <InvoiceStatusBadge status={factura.status} />
        </div>
        <div className="flex space-x-3">
          {user?.role !== 'proveedor' && factura.status === 'VALIDANDO' && (
            <Link to={`/facturacion/${factura.id}/validacion`} className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
              Realizar Validación
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Left column: Data */}
        <div className="lg:w-1/2 flex flex-col gap-6 overflow-y-auto pr-2 pb-6">
          <div className="bg-white shadow sm:rounded-lg overflow-hidden flex-shrink-0">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Información Fiscal</h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Proveedor</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{factura.proveedor_nombre}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">UUID</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 break-all">{factura.uuid}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Monto Total</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-bold">${(factura.total || 0).toFixed(2)}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="bg-white shadow sm:rounded-lg overflow-hidden flex-shrink-0">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Entidades Relacionadas</h3>
            </div>
            <div className="border-t border-gray-200 p-4">
              <div className="flex space-x-4">
                {factura.orden_compra ? (
                  <Link to={`/ordenes/${factura.orden_compra}`} className="text-indigo-600 hover:text-indigo-900">
                    Orden de Compra #{factura.orden_compra_folio || factura.orden_compra}
                  </Link>
                ) : <span className="text-gray-500">Sin Orden de Compra</span>}
                <span className="text-gray-300">|</span>
                {factura.recepcion ? (
                  <Link to={`/inventario/entregas/${factura.recepcion}`} className="text-indigo-600 hover:text-indigo-900">
                    Recepción #{factura.recepcion_folio || factura.recepcion}
                  </Link>
                ) : <span className="text-gray-500">Sin Recepción</span>}
              </div>
            </div>
          </div>

          <div className="bg-white shadow sm:rounded-lg overflow-hidden flex-shrink-0">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Historial y Tracking</h3>
            </div>
            <div className="border-t border-gray-200 p-6">
              <TimelineTracker events={timelineEvents} />
            </div>
          </div>
        </div>

        {/* Right column: Split Screen PDF Viewer */}
        <div className="lg:w-1/2 flex flex-col min-h-0 bg-gray-50 rounded-lg p-2 shadow-inner border border-gray-200">
          <PdfViewer url={factura.archivo_pdf || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'} />
        </div>
      </div>
    </div>
  );
}
