import clsx from 'clsx';
import { FacturaStatus } from '@/types/facturacion';

interface Props {
  status: FacturaStatus | string;
  className?: string;
}

export default function InvoiceStatusBadge({ status, className }: Props) {
  const styles: Record<string, string> = {
    [FacturaStatus.BORRADOR]: 'bg-gray-100 text-gray-800 border-gray-200',
    [FacturaStatus.PENDIENTE]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [FacturaStatus.VALIDANDO]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [FacturaStatus.RECHAZADA]: 'bg-red-100 text-red-800 border-red-200',
    [FacturaStatus.AUTORIZADA]: 'bg-blue-100 text-blue-800 border-blue-200',
    [FacturaStatus.PROGRAMADA]: 'bg-purple-100 text-purple-800 border-purple-200',
    [FacturaStatus.PAGADA]: 'bg-green-100 text-green-800 border-green-200',
  };

  const currentStyle = styles[status] || 'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', currentStyle, className)}>
      {status}
    </span>
  );
}
