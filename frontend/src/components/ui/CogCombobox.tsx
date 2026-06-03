import { useState, useMemo, Fragment } from 'react'
import { Combobox, Transition } from '@headlessui/react'
import { ChevronUpDownIcon, CheckIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

export interface CogOption {
  id: number
  codigo: string
  descripcion: string
  capitulo: string
  concepto: string
  partida_generica: string
  palabras_clave?: string
}

interface CogComboboxProps {
  label?: string
  error?: string
  options: CogOption[]
  value: number | null
  onChange: (value: number | null) => void
  placeholder?: string
  disabled?: boolean
}

// Nombres descriptivos para los capítulos
const CAPITULO_NAMES: Record<string, string> = {
  '1000': 'Servicios Personales',
  '2000': 'Materiales y Suministros',
  '3000': 'Servicios Generales',
  '4000': 'Transferencias',
  '5000': 'Bienes Muebles e Inmuebles',
  '6000': 'Obra Pública',
  '7000': 'Inversiones Financieras',
  '8000': 'Participaciones y Aportaciones',
  '9000': 'Deuda Pública',
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos
}

/** Determina el "nivel" visual del COG según su código */
function getCogLevel(cog: CogOption): 'capitulo' | 'concepto' | 'partida' {
  const code = cog.codigo.trim()
  if (code.length === 4 && code.endsWith('000')) return 'capitulo'
  if (code.length === 4 && code.endsWith('00')) return 'concepto'
  return 'partida'
}

export default function CogCombobox({
  label,
  error,
  options,
  value,
  onChange,
  placeholder = 'Buscar por código, descripción o palabra clave...',
  disabled = false,
}: CogComboboxProps) {
  const [query, setQuery] = useState('')

  // Encontrar el objeto seleccionado
  const selectedCog = useMemo(
    () => options.find(c => c.id === value) ?? null,
    [options, value]
  )

  // Filtrar opciones: busca en código, descripción y palabras clave
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options

    const terms = normalize(query).split(/\s+/).filter(Boolean)

    return options.filter(cog => {
      const searchable = normalize(
        `${cog.codigo} ${cog.descripcion} ${cog.palabras_clave || ''}`
      )
      // Todos los términos deben coincidir (AND)
      return terms.every(term => searchable.includes(term))
    })
  }, [options, query])

  // Agrupar resultados por capítulo
  const groupedOptions = useMemo(() => {
    const groups: Record<string, { name: string; items: CogOption[] }> = {}

    for (const cog of filteredOptions) {
      const cap = cog.capitulo || '0000'
      if (!groups[cap]) {
        groups[cap] = {
          name: CAPITULO_NAMES[cap] || `Capítulo ${cap}`,
          items: [],
        }
      }
      groups[cap].items.push(cog)
    }

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredOptions])

  const handleClear = () => {
    onChange(null)
    setQuery('')
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <Combobox value={selectedCog} onChange={(cog: CogOption | null) => onChange(cog?.id ?? null)} disabled={disabled}>
        <div className="relative">
          {/* Input de búsqueda */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
            </div>

            <Combobox.Input
              className={clsx(
                'block w-full rounded-md shadow-sm sm:text-sm py-2 pl-9 pr-16',
                'border focus:outline-none focus:ring-2 focus:ring-offset-0',
                error
                  ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500',
                disabled && 'bg-gray-100 cursor-not-allowed'
              )}
              displayValue={(cog: CogOption | null) =>
                cog ? `${cog.codigo} - ${cog.descripcion}` : ''
              }
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
            />

            <div className="absolute inset-y-0 right-0 flex items-center pr-1">
              {/* Botón limpiar */}
              {selectedCog && !disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 focus:outline-none"
                  tabIndex={-1}
                  title="Limpiar selección"
                  aria-label="Limpiar selección"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
              <Combobox.Button className="p-1 rounded-md text-gray-400 hover:text-gray-600 focus:outline-none">
                <ChevronUpDownIcon className="h-5 w-5" aria-hidden="true" />
              </Combobox.Button>
            </div>
          </div>

          {/* Chip del COG seleccionado (debajo del input) */}
          {selectedCog && !query && (
            <div className="mt-1">
              <span className={clsx(
                'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
                getCogLevel(selectedCog) === 'capitulo' && 'bg-primary-100 text-primary-800',
                getCogLevel(selectedCog) === 'concepto' && 'bg-blue-100 text-blue-800',
                getCogLevel(selectedCog) === 'partida' && 'bg-emerald-100 text-emerald-800',
              )}>
                {selectedCog.codigo}
                <span className="text-gray-500 font-normal">·</span>
                {selectedCog.descripcion}
              </span>
            </div>
          )}

          {/* Dropdown de opciones */}
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options className="absolute z-50 mt-1 max-h-96 w-full min-w-[28rem] overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/10 focus:outline-none text-sm">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <MagnifyingGlassIcon className="mx-auto h-8 w-8 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">
                    No se encontraron resultados para "<span className="font-medium">{query}</span>"
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Intenta buscar por código, descripción o palabra relacionada
                  </p>
                </div>
              ) : (
                <>
                  {/* Contador de resultados */}
                  {query && (
                    <div className="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-100">
                      {filteredOptions.length} resultado{filteredOptions.length !== 1 ? 's' : ''}
                    </div>
                  )}

                  {groupedOptions.map(([capCode, group]) => (
                    <div key={capCode}>
                      {/* Header del grupo/capítulo */}
                      <div className="sticky top-0 z-10 bg-white border-b-2 border-primary-200 px-3 py-2 shadow-sm">
                        <span className="text-xs font-bold text-primary-700 uppercase tracking-wider">
                          {capCode} · {group.name}
                        </span>
                      </div>

                      {group.items.map((cog) => {
                        const level = getCogLevel(cog)
                        return (
                          <Combobox.Option
                            key={cog.id}
                            value={cog}
                            className={({ active }) =>
                              clsx(
                                'relative cursor-pointer select-none py-2 pr-10',
                                level === 'capitulo' && 'pl-3',
                                level === 'concepto' && 'pl-6',
                                level === 'partida' && 'pl-9',
                                active ? 'bg-primary-50 text-primary-900' : 'text-gray-900'
                              )
                            }
                          >
                            {({ selected, active }) => (
                              <>
                                <div className="flex items-center gap-2">
                                  {/* Badge del código */}
                                  <span
                                    className={clsx(
                                      'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-mono font-semibold',
                                      level === 'capitulo' && 'bg-primary-100 text-primary-700',
                                      level === 'concepto' && 'bg-blue-100 text-blue-700',
                                      level === 'partida' && (active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'),
                                    )}
                                  >
                                    {cog.codigo}
                                  </span>

                                  {/* Descripción */}
                                  <span
                                    className={clsx(
                                      '',
                                      level === 'capitulo' && 'font-bold text-sm',
                                      level === 'concepto' && 'font-semibold text-sm',
                                      level === 'partida' && 'font-normal text-sm',
                                      selected && 'font-semibold'
                                    )}
                                  >
                                    {cog.descripcion}
                                  </span>
                                </div>

                                {/* Check de seleccionado */}
                                {selected && (
                                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-primary-600">
                                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                  </span>
                                )}
                              </>
                            )}
                          </Combobox.Option>
                        )
                      })}
                    </div>
                  ))}
                </>
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
