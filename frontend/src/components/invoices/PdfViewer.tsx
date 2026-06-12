
interface Props {
  url?: string;
}

export default function PdfViewer({ url }: Props) {
  if (!url) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg min-h-[500px]">
        <div className="text-center">
          <p className="mt-1 text-sm text-gray-500">No hay PDF disponible para previsualizar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-300 shadow-inner">
      <iframe src={url} className="w-full h-full min-h-[600px] border-0" title="Visor de Factura PDF" />
    </div>
  );
}
