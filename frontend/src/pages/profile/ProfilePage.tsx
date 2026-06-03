import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  UserCircleIcon,
  KeyIcon,
  Cog6ToothIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import { useAuthStore } from '@/stores/authStore'
import { userService } from '@/services/userService'
import { Card, Input, Button, PageHeader, AvatarUpload } from '@/components/ui'
import { useForm } from 'react-hook-form'

interface ProfileFormData {
  full_name: string
  phone: string
}

interface PasswordFormData {
  old_password: string
  new_password: string
  new_password_confirm: string
}

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'preferences'>('info')
  const [passwordLoading, setPasswordLoading] = useState(false)

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<ProfileFormData>()

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormData>()

  // Cargar datos del perfil al montar
  useEffect(() => {
    if (user) {
      resetProfile({
        full_name: user.full_name || '',
        phone: user.phone || '',
      })
    }
  }, [user, resetProfile])

  const onSubmitProfile = async (data: ProfileFormData) => {
    setLoading(true)
    try {
      const updateData: Record<string, unknown> = {
        full_name: data.full_name,
        phone: data.phone,
      }
      if (avatarFile) {
        updateData.avatar = avatarFile
      }

      const updatedUser = await userService.updateMyProfile(updateData as Parameters<typeof userService.updateMyProfile>[0])
      
      // Actualizar el store
      updateUser({
        full_name: updatedUser.full_name,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
      })

      setAvatarFile(null)
      toast.success('Perfil actualizado correctamente')
    } catch (error: any) {
      const detail = error.response?.data?.detail || error.response?.data?.avatar?.[0] || 'Error al actualizar el perfil'
      toast.error(detail)
    } finally {
      setLoading(false)
    }
  }

  const onSubmitPassword = async (data: PasswordFormData) => {
    setPasswordLoading(true)
    try {
      await userService.changePassword(data)
      resetPassword()
      toast.success('Contraseña actualizada correctamente')
    } catch (error: any) {
      const detail =
        error.response?.data?.old_password ||
        error.response?.data?.new_password_confirm ||
        error.response?.data?.detail ||
        'Error al cambiar la contraseña'
      toast.error(typeof detail === 'string' ? detail : detail[0])
    } finally {
      setPasswordLoading(false)
    }
  }

  const getRoleLabel = (role: string | undefined): string => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      tesoreria: 'Tesorería',
      adquisiciones: 'Adquisiciones',
      almacen: 'Almacén',
      area: 'Responsable de Área',
      proveedor: 'Proveedor',
    }
    return role ? labels[role] || role : 'Usuario'
  }

  const getRoleColor = (role: string | undefined): string => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      tesoreria: 'bg-amber-100 text-amber-800',
      adquisiciones: 'bg-blue-100 text-blue-800',
      almacen: 'bg-emerald-100 text-emerald-800',
      area: 'bg-purple-100 text-purple-800',
      proveedor: 'bg-indigo-100 text-indigo-800',
    }
    return role ? colors[role] || 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-800'
  }

  const tabs = [
    { id: 'info' as const, label: 'Información Personal', icon: UserCircleIcon },
    { id: 'password' as const, label: 'Contraseña', icon: KeyIcon },
    { id: 'preferences' as const, label: 'Preferencias', icon: Cog6ToothIcon },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi Perfil"
        subtitle="Gestiona tu información personal y preferencias"
        icon={<UserCircleIcon className="w-6 h-6" />}
        variant="gradient"
        gradient="indigo"
      />

      {/* Tarjeta de resumen del usuario */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-shrink-0">
            {/* Avatar grande */}
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-gray-900">{user?.full_name || 'Usuario'}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <div className="mt-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(user?.role)}`}>
                {getRoleLabel(user?.role)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Información Personal */}
      {activeTab === 'info' && (
        <Card className="p-6">
          <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Columna izquierda: Avatar */}
              <div className="flex flex-col items-center">
                <AvatarUpload
                  currentImage={user?.avatar}
                  fallbackText={user?.full_name || user?.email || 'U'}
                  onFileSelect={(file) => setAvatarFile(file)}
                  onRemove={() => setAvatarFile(null)}
                  size="lg"
                  shape="circle"
                  label="Foto de perfil"
                />
              </div>

              {/* Columna derecha: Campos */}
              <div className="lg:col-span-2 space-y-4">
                <Input
                  label="Nombre completo"
                  id="full_name"
                  placeholder="Tu nombre completo"
                  error={profileErrors.full_name?.message}
                  {...registerProfile('full_name', {
                    required: 'El nombre es requerido',
                  })}
                />

                <Input
                  label="Correo electrónico"
                  id="email"
                  value={user?.email || ''}
                  disabled
                  helperText="El correo no puede ser modificado"
                />

                <Input
                  label="Teléfono"
                  id="phone"
                  placeholder="Tu número de teléfono"
                  error={profileErrors.phone?.message}
                  {...registerProfile('phone')}
                />

                <Input
                  label="Nombre de usuario"
                  id="username"
                  value={user?.username || ''}
                  disabled
                  helperText="El usuario no puede ser modificado"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Guardando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4" />
                    Guardar cambios
                  </span>
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab: Contraseña */}
      {activeTab === 'password' && (
        <Card className="p-6">
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Cambiar contraseña</h3>
            <p className="text-sm text-gray-500 mb-6">
              Asegúrate de usar una contraseña segura de al menos 8 caracteres.
            </p>

            <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4">
              <Input
                label="Contraseña actual"
                id="old_password"
                type="password"
                placeholder="••••••••"
                error={passwordErrors.old_password?.message}
                {...registerPassword('old_password', {
                  required: 'La contraseña actual es requerida',
                })}
              />

              <Input
                label="Nueva contraseña"
                id="new_password"
                type="password"
                placeholder="••••••••"
                error={passwordErrors.new_password?.message}
                {...registerPassword('new_password', {
                  required: 'La nueva contraseña es requerida',
                  minLength: { value: 8, message: 'Mínimo 8 caracteres' },
                })}
              />

              <Input
                label="Confirmar nueva contraseña"
                id="new_password_confirm"
                type="password"
                placeholder="••••••••"
                error={passwordErrors.new_password_confirm?.message}
                {...registerPassword('new_password_confirm', {
                  required: 'Confirma la nueva contraseña',
                })}
              />

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={passwordLoading}>
                  {passwordLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Guardando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <KeyIcon className="w-4 h-4" />
                      Cambiar contraseña
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* Tab: Preferencias */}
      {activeTab === 'preferences' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Preferencias</h3>
          <p className="text-sm text-gray-500 mb-6">
            Personaliza tu experiencia en el sistema.
          </p>

          <div className="space-y-6">
            {/* Tema - placeholder para futuro */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Notificaciones por email</p>
                <p className="text-xs text-gray-500">Recibe alertas de actividad importante</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Notificaciones en el sistema</p>
                <p className="text-xs text-gray-500">Muestra alertas dentro de la plataforma</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Próximamente:</strong> Más opciones de personalización incluyendo temas, formato de moneda y configuración de reportes.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
