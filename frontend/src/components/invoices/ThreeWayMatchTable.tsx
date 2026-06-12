import clsx from 'clsx';
import { FacturaLinea } from '@/types/facturacion';

interface Props {
  facturaLineas: FacturaLinea[];
  ordenLineas?: any[];
  recepcionLineas?: any[];
  tolerancePercent?: number;
}

export default function ThreeWayMatchTable({ facturaLineas = [] }: Props) {
  return (
    <div className="overflow-x-auto ring-1 ring-gray-300 rounded-lg">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concepto</th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">Orden de Compra</th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">Recepción Almacén</th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">Factura Proveedor</th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Resultado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {facturaLineas.map((linea, idx) => {
            const hasDiscrepancy = false; // Mock discrepancy logic
            return (
              <tr key={linea.id || idx}>
                <td className="px-3 py-4 text-sm text-gray-900">{linea.descripcion}</td>
                <td className="px-3 py-4 text-sm text-center bg-blue-50/30 text-gray-600">-</td>
                <td className="px-3 py-4 text-sm text-center bg-yellow-50/30 text-gray-600">-</td>
                <td className="px-3 py-4 text-sm text-center bg-green-50/30 font-medium">
                  {linea.cantidad} x ${(linea.precio_unitario || 0).toFixed(2)}
                </td>
                <td className="px-3 py-4 text-sm text-center">
                  <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium", hasDiscrepancy ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800")}>
                    {hasDiscrepancy ? 'Requiere Revisión' : 'Coincide'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
