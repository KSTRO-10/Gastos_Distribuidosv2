import { useState, useRef, useCallback } from 'react'
import { CameraIcon, TrashIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

interface AvatarUploadProps {
  /** URL actual de la imagen (avatar o logo) */
  currentImage?: string | null
  /** Texto alternativo / inicial a mostrar cuando no hay imagen */
  fallbackText?: string
  /** Callback cuando se selecciona un nuevo archivo */
  onFileSelect: (file: File) => void
  /** Callback cuando se quiere eliminar la imagen actual */
  onRemove?: () => void
  /** Tamaño del componente: sm, md, lg */
  size?: 'sm' | 'md' | 'lg'
  /** Forma: circle para avatares, rounded para logos */
  shape?: 'circle' | 'rounded'
  /** Texto de label */
  label?: string
  /** Mensaje de error */
  error?: string
  /** Deshabilitar interacción */
  disabled?: boolean
}

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
}

const textSizeClasses = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
}

export default function AvatarUpload({
  currentImage,
  fallbackText = 'U',
  onFileSelect,
  onRemove,
  size = 'lg',
  shape = 'circle',
  label,
  error,
  disabled = false,
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Solo se permiten imágenes JPG, PNG o WebP.'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'La imagen no debe superar los 2 MB.'
    }
    return null
  }

  const handleFile = useCallback(
    (file: File) => {
      const err = validateFile(file)
      if (err) {
        setValidationError(err)
        return
      }
      setValidationError(null)

      // Crear preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      onFileSelect(file)
    },
    [onFileSelect]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input para permitir seleccionar el mismo archivo otra vez
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleRemove = () => {
    setPreview(null)
    setValidationError(null)
    onRemove?.()
  }

  const displayImage = preview || currentImage
  const displayError = error || validationError

  return (
    <div className="flex flex-col items-center gap-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}

      {/* Imagen / Placeholder */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            !disabled && fileInputRef.current?.click()
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={clsx(
          'relative group cursor-pointer overflow-hidden border-2 transition-all duration-200',
          sizeClasses[size],
          shape === 'circle' ? 'rounded-full' : 'rounded-xl',
          dragOver
            ? 'border-primary-500 ring-4 ring-primary-200'
            : 'border-gray-200 hover:border-primary-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {displayImage ? (
          <img
            src={displayImage}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
            <span className={clsx('font-bold text-white', textSizeClasses[size])}>
              {fallbackText.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Overlay al hover */}
        {!disabled && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <CameraIcon className="w-6 h-6 text-white" />
          </div>
        )}
      </div>

      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      {/* Botones */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => !disabled && fileInputRef.current?.click()}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <CameraIcon className="w-4 h-4" />
          {displayImage ? 'Cambiar' : 'Subir'}
        </button>
        {displayImage && onRemove && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <TrashIcon className="w-4 h-4" />
            Quitar
          </button>
        )}
      </div>

      {/* Texto de ayuda */}
      <p className="text-xs text-gray-400">JPG, PNG o WebP. Máx. 2 MB</p>

      {/* Error */}
      {displayError && (
        <p className="text-sm text-red-600">{displayError}</p>
      )}
    </div>
  )
}
