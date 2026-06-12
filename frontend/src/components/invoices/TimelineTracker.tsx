import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface Event {
  id: number;
  title: string;
  date: string;
  user: string;
  status: 'completed' | 'current' | 'upcoming' | 'error';
  comments?: string;
}

interface Props {
  events: Event[];
}

export default function TimelineTracker({ events }: Props) {
  return (
    <div className="flow-root mt-4">
      <ul role="list" className="-mb-8">
        {events.map((event, eventIdx) => (
          <li key={event.id}>
            <div className="relative pb-8">
              {eventIdx !== events.length - 1 ? (
                <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className={clsx(
                    event.status === 'completed' ? 'bg-green-500' : 
                    event.status === 'error' ? 'bg-red-500' :
                    event.status === 'current' ? 'bg-blue-500' : 'bg-gray-300',
                    'h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white'
                  )}>
                    {event.status === 'error' ? (
                      <XCircleIcon className="h-5 w-5 text-white" aria-hidden="true" />
                    ) : event.status === 'upcoming' ? (
                      <ClockIcon className="h-5 w-5 text-white" aria-hidden="true" />
                    ) : (
                      <CheckCircleIcon className="h-5 w-5 text-white" aria-hidden="true" />
                    )}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm text-gray-500">{event.title} <span className="font-medium text-gray-900">{event.user}</span></p>
                    {event.comments && <p className="mt-1 text-sm text-gray-600">{event.comments}</p>}
                  </div>
                  <div className="whitespace-nowrap text-right text-sm text-gray-500">
                    <time dateTime={event.date}>{event.date}</time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
