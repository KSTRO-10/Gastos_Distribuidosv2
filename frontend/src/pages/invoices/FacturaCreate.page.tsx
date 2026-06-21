import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { DocumentTextIcon, ArrowUpTrayIcon, DocumentIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">
          Nueva Factura
        </h2>
        <p className="mt-3 text-base text-gray-500">
          Carga el XML y PDF para iniciar el proceso de validación automatizada.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)} className="p-8 sm:p-10">
          <div className="space-y-10">
            {/* Archivos Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <DocumentIcon className="h-5 w-5 mr-2 text-indigo-500" />
                Documentos de la Factura
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* XML Upload */}
                <div className={`relative group flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-200 ${xmlFile ? 'border-green-400 bg-green-50' : 'border-indigo-200 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-400'}`}>
                  <label className="absolute inset-0 w-full h-full cursor-pointer">
                    <input type="file" className="sr-only" accept=".xml" onChange={(e) => setXmlFile(e.target.files?.[0] || null)} />
                  </label>
                  {xmlFile ? (
                    <>
                      <CheckCircleIcon className="h-12 w-12 text-green-500 mb-3" />
                      <p className="text-sm font-medium text-green-800">{xmlFile.name}</p>
                      <p className="text-xs text-green-600 mt-1">XML Cargado Exitosamente</p>
                    </>
                  ) : (
                    <>
                      <div className="p-3 bg-indigo-100 rounded-full mb-3 group-hover:scale-110 transition-transform duration-200">
                        <ArrowUpTrayIcon className="h-8 w-8 text-indigo-600" />
                      </div>
                      <p className="text-sm font-medium text-indigo-600">Subir XML</p>
                      <p className="text-xs text-gray-500 mt-1">o arrastra y suelta aquí</p>
                      <p className="text-[10px] text-gray-400 mt-2 font-semibold tracking-wider uppercase">Obligatorio</p>
                    </>
                  )}
                </div>

                {/* PDF Upload */}
                <div className={`relative group flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-200 ${pdfFile ? 'border-green-400 bg-green-50' : 'border-purple-200 bg-gray-50 hover:bg-purple-50 hover:border-purple-400'}`}>
                  <label className="absolute inset-0 w-full h-full cursor-pointer">
                    <input type="file" className="sr-only" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
                  </label>
                  {pdfFile ? (
                    <>
                      <CheckCircleIcon className="h-12 w-12 text-green-500 mb-3" />
                      <p className="text-sm font-medium text-green-800">{pdfFile.name}</p>
                      <p className="text-xs text-green-600 mt-1">PDF Cargado Exitosamente</p>
                    </>
                  ) : (
                    <>
                      <div className="p-3 bg-purple-100 rounded-full mb-3 group-hover:scale-110 transition-transform duration-200">
                        <DocumentTextIcon className="h-8 w-8 text-purple-600" />
                      </div>
                      <p className="text-sm font-medium text-purple-600">Subir PDF</p>
                      <p className="text-xs text-gray-500 mt-1">o arrastra y suelta aquí</p>
                      <p className="text-[10px] text-gray-400 mt-2 font-semibold tracking-wider uppercase">Obligatorio</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Referencias Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-indigo-500" />
                Referencias Adicionales
              </h3>
              <div className="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Orden de Compra</label>
                  <input 
                    type="text" 
                    {...register('orden_compra')} 
                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 transition-colors duration-200" 
                    placeholder="Ej. OC-12345" 
                  />
                  <p className="mt-2 text-xs text-gray-500">Opcional. Vincula esta factura con una OC existente.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Entrada de Almacén</label>
                  <input 
                    type="text" 
                    {...register('recepcion')} 
                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 transition-colors duration-200" 
                    placeholder="Opcional si es servicio" 
                  />
                  <p className="mt-2 text-xs text-gray-500">Opcional. Requerido para productos físicos.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-gray-100 flex items-center justify-end space-x-4">
            <button 
              type="button" 
              onClick={() => navigate('/facturacion/lista')} 
              className="px-6 py-3 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="px-8 py-3 rounded-xl border border-transparent bg-gradient-to-r from-indigo-600 to-purple-600 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transform transition-all duration-200 active:scale-95"
            >
              Validar y Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
