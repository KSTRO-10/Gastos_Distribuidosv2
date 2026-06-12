import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { facturacionService } from '@/services/facturacionService';
import { Factura } from '@/types/facturacion';
import ThreeWayMatchTable from '@/components/invoices/ThreeWayMatchTable';

export default function FacturaValidation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [factura, setFactura] = useState<Factura | null>(null);
  const [comments, setComments] = useState('');

  useEffect(() => {
    if (id) fetchFactura(parseInt(id));
  }, [id]);

  const fetchFactura = async (facturaId: number) => {
    try {
      const data = await facturacionService.getFactura(facturaId);
      setFactura(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAction = async (aprobado: boolean) => {
    if (!aprobado && !comments) {
      toast.error('Los comentarios son obligatorios para rechazar.');
      return;
    }
    try {
      await facturacionService.validarFactura(parseInt(id!), { aprobado, comentarios: comments });
      toast.success(aprobado ? 'Factura aprobada y enviada a CXP' : 'Factura rechazada correctamente');
      navigate(`/facturacion/${id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al validar');
    }
  };

  if (!factura) return <div className="p-8">Cargando datos para validación...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900">
            Validación 3-Way Match: {factura.folio}
          </h2>
          <p className="mt-1 text-sm text-gray-500">Revisa las diferencias entre Orden, Recepción y Factura.</p>
        </div>
      </div>

      <ThreeWayMatchTable facturaLineas={factura.lineas || []} />

      <div className="mt-8 bg-white shadow sm:rounded-lg p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Resolución de Validación</h3>
        <div>
          <label htmlFor="comments" className="block text-sm font-medium text-gray-700">Comentarios u observaciones</label>
          <div className="mt-1">
            <textarea
              id="comments"
              rows={4}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Obligatorio si se rechaza..."
            />
          </div>
        </div>

        <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
          <button
            type="button"
            onClick={() => handleAction(true)}
            className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none sm:col-start-2 sm:text-sm"
          >
            Aprobar Factura (Pasar a CXP)
          </button>
          <button
            type="button"
            onClick={() => handleAction(false)}
            className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none sm:col-start-1 sm:mt-0 sm:text-sm"
          >
            Rechazar (Devolver a Proveedor)
          </button>
        </div>
      </div>
    </div>
  );
}
