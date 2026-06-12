import { DocumentTextIcon, CheckBadgeIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Props {
  pendientes: number;
  autorizadas: number;
  programadas: number;
  rechazadas: number;
}

export default function InvoiceMetrics({ pendientes, autorizadas, programadas, rechazadas }: Props) {
  const metrics = [
    { name: 'Pendientes Validación', value: pendientes, icon: ClockIcon, bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
    { name: 'Autorizadas (CXP)', value: autorizadas, icon: CheckBadgeIcon, bgColor: 'bg-green-100', textColor: 'text-green-700' },
    { name: 'Programadas', value: programadas, icon: DocumentTextIcon, bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
    { name: 'Rechazadas / Disputa', value: rechazadas, icon: ExclamationTriangleIcon, bgColor: 'bg-red-100', textColor: 'text-red-700' },
  ];

  return (
    <div>
      <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((item) => (
          <div key={item.name} className="relative overflow-hidden rounded-lg bg-white px-4 pb-6 pt-5 shadow sm:px-6 sm:pt-6">
            <dt>
              <div className={`absolute rounded-md p-3 ${item.bgColor}`}>
                <item.icon className={`h-6 w-6 ${item.textColor}`} aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">{item.name}</p>
            </dt>
            <dd className="ml-16 flex items-baseline sm:pb-2">
              <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
