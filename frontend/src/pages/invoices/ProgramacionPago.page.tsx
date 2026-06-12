import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { facturacionService } from '@/services/facturacionService';
import { Factura, FacturaStatus } from '@/types/facturacion';

export default function ProgramacionPago() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [fechaPago, setFechaPago] = useState('');
  const [cuenta, setCuenta] = useState('');

  useEffect(() => {
    fetchFacturasAutorizadas();
  }, []);

  const fetchFacturasAutorizadas = async () => {
    try {
      const data = await facturacionService.getFacturas({ status: FacturaStatus.AUTORIZADA });
      setFacturas(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(facturas.map(f => f.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleProgramar = async () => {
    if (selectedIds.size === 0) return toast.error('Selecciona al menos una factura');
    if (!fechaPago || !cuenta) return toast.error('Selecciona fecha y cuenta bancaria');

    try {
      await facturacionService.programarPagos({
        factura_ids: Array.from(selectedIds),
        fecha_pago: fechaPago,
        cuenta_origen: cuenta
      });
      toast.success('Lote de pagos programado con éxito');
      setSelectedIds(new Set());
      fetchFacturasAutorizadas();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al programar pagos');
    }
  };

  const totalSelected = facturas
    .filter(f => selectedIds.has(f.id))
    .reduce((sum, f) => sum + (f.total || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900">
            Programación de Pagos (Tesorería)
          </h2>
          <p className="mt-1 text-sm text-gray-500">Facturas aprobadas listas para dispersión financiera.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-3/4 flex flex-col">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="relative px-4 py-3.5 sm:w-12 sm:px-6">
                    <input
                      type="checkbox"
                      className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      onChange={handleSelectAll}
                      checked={selectedIds.size === facturas.length && facturas.length > 0}
                    />
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Proveedor / Folio</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Vencimiento</th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {facturas.map((f) => (
                  <tr key={f.id} className={selectedIds.has(f.id) ? 'bg-indigo-50' : ''}>
                    <td className="relative px-4 py-4 sm:w-12 sm:px-6">
                      <input
                        type="checkbox"
                        className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedIds.has(f.id)}
                        onChange={() => handleSelect(f.id)}
                      />
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      <div className="font-medium">{f.proveedor_nombre}</div>
                      <div className="text-gray-500">{f.folio}</div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">{f.fecha_vencimiento}</td>
                    <td className="px-3 py-4 text-sm text-gray-900 text-right font-bold">${(f.total || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:w-1/4">
          <div className="bg-white shadow sm:rounded-lg sticky top-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Acción en Lote</h3>
              <div className="mt-5">
                <p className="text-sm text-gray-500">Facturas seleccionadas: {selectedIds.size}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">${totalSelected.toFixed(2)}</p>
              </div>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cuenta Bancaria Origen</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    value={cuenta}
                    onChange={e => setCuenta(e.target.value)}
                  >
                    <option value="">Selecciona cuenta...</option>
                    <option value="banamex-mn">Banamex (MN)</option>
                    <option value="banorte-usd">Banorte (USD)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha Estimada de Pago</label>
                  <input
                    type="date"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={fechaPago}
                    onChange={e => setFechaPago(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleProgramar}
                  className="w-full inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none sm:text-sm mt-4"
                >
                  Programar Pagos
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
