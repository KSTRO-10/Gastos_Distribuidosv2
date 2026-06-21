import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { facturacionService } from '@/services/facturacionService';
import { Factura } from '@/types/facturacion';
import InvoiceStatusBadge from '@/components/invoices/InvoiceStatusBadge';
import InvoiceFilters from '@/components/invoices/InvoiceFilters';

export default function FacturasList() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFacturas();
  }, []);

  const isLoadingRef = React.useRef(false);

  const fetchFacturas = async (filters: any = {}) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    try {
      const data = await facturacionService.getFacturas(filters);
      setFacturas(data);
    } catch (error) {
      console.error('Error fetching facturas:', error);
      setFacturas([]);
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  };

  const handleFilterChange = (filters: any) => {
    fetchFacturas(filters);
  };

  const safeFacturas = Array.isArray(facturas) ? facturas : (facturas as any)?.results || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Listado de Facturas
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            Administración centralizada de cuentas por pagar y proceso de validación.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-4">
          <Link
            to="/facturacion/nueva"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            Nueva Factura
          </Link>
        </div>
      </div>

      <InvoiceFilters onFilterChange={handleFilterChange} />

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Folio / UUID</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Proveedor</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Fecha Emisión</th>
                    <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Monto Total</th>
                    <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Estado</th>
                    <th className="relative px-3 py-3.5"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-4 text-gray-500">Cargando...</td></tr>
                  ) : safeFacturas.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-4 text-gray-500">No se encontraron facturas.</td></tr>
                  ) : safeFacturas.map((factura: any) => (
                    <tr key={factura?.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        <div className="font-medium text-indigo-600">{factura?.folio || 'N/A'}</div>
                        <div className="text-gray-500 text-xs">{factura?.uuid || 'N/A'}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{factura?.proveedor_nombre || 'Sin proveedor'}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{factura?.fecha_emision}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right font-medium">
                        ${Number(factura?.total || 0).toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                        <InvoiceStatusBadge status={factura?.status || 'BORRADOR'} />
                      </td>
                      <td className="relative whitespace-nowrap px-3 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() => navigate(`/facturacion/${factura?.id}`)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Ver detalle<span className="sr-only">, {factura?.folio}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
