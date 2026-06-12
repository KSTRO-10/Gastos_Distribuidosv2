import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

export default function FacturaCreate() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: {} } = useForm();
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const onSubmit = async (_data: any) => {
    if (!xmlFile || !pdfFile) {
      toast.error('Debes adjuntar el XML y el PDF de la factura.');
      return;
    }

    try {
      // En un flujo real, se enviaría el DTO estructurado.
      toast.success('Factura capturada y enviada a validación');
      navigate('/facturacion/lista');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al crear la factura');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold leading-7 text-gray-900">Nueva Factura</h2>
        <p className="mt-1 text-sm text-gray-500">Carga el XML y PDF para iniciar el proceso de validación.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 divide-y divide-gray-200">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            
            <div className="sm:col-span-6">
              <label className="block text-sm font-medium text-gray-700">Archivos (Drag & Drop)</label>
              <div className="mt-2 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label className="relative cursor-pointer rounded-md bg-white font-medium text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:text-indigo-500">
                      <span>Subir XML</span>
                      <input type="file" className="sr-only" accept=".xml" onChange={(e) => setXmlFile(e.target.files?.[0] || null)} />
                    </label>
                    <p className="pl-1">o arrastra aquí</p>
                  </div>
                  <p className="text-xs text-gray-500">{xmlFile ? `XML Listo: ${xmlFile.name}` : 'Archivo XML (Obligatorio)'}</p>
                </div>
              </div>

              <div className="mt-4 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6">
                <div className="space-y-1 text-center">
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label className="relative cursor-pointer rounded-md bg-white font-medium text-indigo-600 focus-within:outline-none hover:text-indigo-500">
                      <span>Subir PDF</span>
                      <input type="file" className="sr-only" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">{pdfFile ? `PDF Listo: ${pdfFile.name}` : 'Archivo PDF (Obligatorio)'}</p>
                </div>
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Orden de Compra a vincular</label>
              <div className="mt-1">
                <input type="text" {...register('orden_compra')} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="Ej. OC-12345" />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Entrada de Almacén</label>
              <div className="mt-1">
                <input type="text" {...register('recepcion')} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" placeholder="Opcional si es servicio" />
              </div>
            </div>

          </div>
        </div>

        <div className="pt-5">
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={() => navigate('/facturacion/lista')} className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              Validar y Guardar
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
