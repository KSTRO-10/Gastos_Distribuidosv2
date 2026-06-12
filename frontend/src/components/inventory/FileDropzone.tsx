import React, { useCallback, useState } from 'react'
import { DocumentArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

interface FileDropzoneProps {
  onFilesSelect: (files: File[]) => void
  accept?: string
  maxSizeMB?: number
  multiple?: boolean
}

export default function FileDropzone({ onFilesSelect, accept = 'image/*', maxSizeMB = 10, multiple = true }: FileDropzoneProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const validateAndAddFiles = (filesList: FileList | File[]) => {
    setError(null)
    const validFiles: File[] = []
    
    Array.from(filesList).forEach(file => {
      if (accept && accept.includes('image/') && !file.type.startsWith('image/')) {
        setError('Algunos archivos fueron ignorados. Por favor sube solo imágenes.')
        return
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`El archivo ${file.name} excede el tamaño máximo de ${maxSizeMB}MB.`)
        return
      }
      validFiles.push(file)
    })

    if (validFiles.length > 0) {
      const newFiles = multiple ? [...selectedFiles, ...validFiles] : [validFiles[0]]
      setSelectedFiles(newFiles)
      onFilesSelect(newFiles)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files)
    }
  }, [multiple, selectedFiles])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files)
    }
  }

  const removeFile = (e: React.MouseEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    const newFiles = [...selectedFiles]
    newFiles.splice(index, 1)
    setSelectedFiles(newFiles)
    onFilesSelect(newFiles)
    setError(null)
  }

  return (
    <div className="w-full">
      <div
        className={clsx(
          "relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg transition-colors cursor-pointer",
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100",
          error && "border-red-500 bg-red-50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <input
          id="file-upload"
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
        />
        
        {selectedFiles.length > 0 ? (
          <div className="flex flex-wrap gap-4 items-center justify-center p-4 h-full overflow-y-auto">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="flex flex-col items-center text-center bg-white p-2 rounded shadow-sm border border-gray-200">
                <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{file.name}</p>
                <p className="text-xs text-gray-500 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                <button
                  onClick={(e) => removeFile(e, idx)}
                  className="mt-2 text-xs text-red-600 hover:text-red-800"
                >
                  <XMarkIcon className="h-4 w-4 inline mr-1" />
                  Quitar
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <DocumentArrowUpIcon className="w-10 h-10 mb-3 text-gray-400" />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold text-blue-600">Haz clic para subir</span> o arrastra y suelta
            </p>
            <p className="text-xs text-gray-500">
              PNG, JPG o JPEG (Max. {maxSizeMB}MB)
            </p>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
