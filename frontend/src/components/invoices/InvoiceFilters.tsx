import { FacturaStatus } from '@/types/facturacion';

interface Props {
  onFilterChange: (filters: { status?: string; search?: string }) => void;
}

export default function InvoiceFilters({ onFilterChange }: Props) {
  return (
    <div className="bg-white p-4 shadow rounded-lg mb-6 flex flex-col sm:flex-row gap-4 items-end">
      <div className="w-full sm:w-1/3">
        <label className="block text-sm font-medium text-gray-700">Estado de Factura</label>
        <select 
          className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm shadow-sm"
          onChange={(e) => onFilterChange({ status: e.target.value })}
          defaultValue=""
        >
          <option value="">Todos los estados</option>
          {Object.values(FacturaStatus).map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>
      <div className="w-full sm:w-1/3">
        <label className="block text-sm font-medium text-gray-700">Buscar</label>
        <input 
          type="text" 
          placeholder="Folio, UUID o Proveedor..."
          className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          onChange={(e) => onFilterChange({ search: e.target.value })}
        />
      </div>
      <div className="w-full sm:w-auto">
        <button
          type="button"
          className="inline-flex items-center rounded-md border border-transparent bg-white px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm hover:bg-indigo-50 border-indigo-200 focus:outline-none"
        >
          Limpiar Filtros
        </button>
      </div>
    </div>
  );
}
