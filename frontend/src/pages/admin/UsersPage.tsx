import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { Button, Table, Modal, Input, Select, PageHeader } from '@/components/ui'
import { userService, Role, CreateUserData } from '@/services/userService'
import { areaService, Area } from '@/services/areaService'
import type { User } from '@/stores/authStore'
import { useForm } from 'react-hook-form'

interface UserFormData extends Omit<CreateUserData, 'ine_documento'> {
  id?: number
  ine_documento?: FileList
}

// Colores por rol para las badges (keys en minúsculas para coincidir con role_display.toLowerCase())
const roleColors: Record<string, string> = {
  'administrador': 'bg-red-100 text-red-800 border-red-200',
  'admin': 'bg-red-100 text-red-800 border-red-200',
  'adquisiciones': 'bg-blue-100 text-blue-800 border-blue-200',
  'almacén': 'bg-amber-100 text-amber-800 border-amber-200',
  'almacen': 'bg-amber-100 text-amber-800 border-amber-200',
  'área': 'bg-green-100 text-green-800 border-green-200',
  'area': 'bg-green-100 text-green-800 border-green-200',
  'proveedor': 'bg-purple-100 text-purple-800 border-purple-200',
  'tesorería': 'bg-teal-100 text-teal-800 border-teal-200',
  'tesoreria': 'bg-teal-100 text-teal-800 border-teal-200',
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectMotivo, setRejectMotivo] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('todos')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserFormData>()

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersData, rolesData, areasData] = await Promise.all([
        userService.getUsers(),
        userService.getRoles(),
        areaService.getAreas()
      ])
      console.log('Usuarios cargados:', usersData)
      console.log('Roles cargados:', rolesData)
      setUsers(usersData)
      setRoles(rolesData)
      setAreas(areasData)
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filtrar usuarios
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Filtro de búsqueda
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = !searchTerm ||
        (user.username?.toLowerCase().includes(searchLower)) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.full_name?.toLowerCase().includes(searchLower))

      // Filtro de rol
      const userRoleName = user.role_display?.toLowerCase() || ''
      const matchesRole = roleFilter === 'todos' || userRoleName === roleFilter.toLowerCase()

      return matchesSearch && matchesRole
    })
  }, [users, searchTerm, roleFilter])

  // Estadísticas por rol (usando role_display)
  const userStats = useMemo(() => {
    const stats: Record<string, number> = {}
    users.forEach(user => {
      const roleName = user.role_display?.toLowerCase() || 'otro'
      stats[roleName] = (stats[roleName] || 0) + 1
    })
    return stats
  }, [users])

  const handleCreate = () => {
    setSelectedUser(null)
    setIsEditing(false)
    reset({
      email: '',
      username: '',
      full_name: '',
      phone: '',
      area: undefined,
      puesto: '',
      role: undefined,
      password: '',
      password_confirm: ''
    })
    setModalOpen(true)
  }

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setIsEditing(true)
    reset({
      id: user.id,
      email: user.email,
      username: user.username,
      full_name: user.full_name || '',
      phone: user.phone || '',
      area: user.area || undefined,
      puesto: user.puesto || '',
      role: typeof user.role === 'number' ? user.role : roles.find(r => r.name === user.role)?.id,
      password: '',
      password_confirm: ''
    })
    setModalOpen(true)
  }

  const handleDelete = (user: User) => {
    setSelectedUser(user)
    setDeleteModalOpen(true)
  }

  const onSubmit = async (data: UserFormData) => {
    setSubmitting(true)
    try {
      if (isEditing && selectedUser) {
        // Actualizar usuario existente
        await userService.updateUser(selectedUser.id, {
          full_name: data.full_name,
          phone: data.phone,
          area: data.area,
          puesto: data.puesto,
          ine_documento: data.ine_documento && data.ine_documento.length > 0 ? data.ine_documento[0] : null,
        })
        toast.success('Usuario actualizado correctamente')
      } else {
        // Crear nuevo usuario
        await userService.createUser({
          ...data,
          ine_documento: data.ine_documento && data.ine_documento.length > 0 ? data.ine_documento[0] : null,
        })
        toast.success('Usuario creado correctamente')
      }
      setModalOpen(false)
      loadData()
    } catch (error: any) {
      // Extraer mensaje de error más descriptivo
      const errorData = error.response?.data
      let errorMessage = `Error al ${isEditing ? 'actualizar' : 'crear'} usuario`

      if (errorData) {
        if (typeof errorData === 'string') {
          errorMessage = errorData
        } else if (errorData.detail) {
          errorMessage = errorData.detail
        } else if (errorData.message) {
          errorMessage = errorData.message
        } else {
          // Mostrar errores de campo específicos
          const fieldErrors = Object.entries(errorData)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
            .join('; ')
          if (fieldErrors) errorMessage = fieldErrors
        }
      }

      toast.error(errorMessage)
      console.error('Error creating/updating user:', error.response?.data)
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!selectedUser) return
    setSubmitting(true)
    try {
      const response = await userService.deleteUser(selectedUser.id)
      // Check if user was deactivated instead of deleted
      if (response && typeof response === 'object' && 'detail' in response) {
        // User was deactivated (has related records)
        toast.success(response.detail as string)
      } else {
        toast.success('Usuario eliminado correctamente')
      }
      setDeleteModalOpen(false)
      loadData()
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail ||
        error.response?.data?.message ||
        'Error al eliminar usuario'
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handleApproveIne = async (user: User) => {
    try {
      await userService.approveIne(user.id)
      toast.success('INE aprobada correctamente')
      loadData()
    } catch (error) {
      toast.error('Error al aprobar INE')
    }
  }

  const handleRejectClick = (user: User) => {
    setSelectedUser(user)
    setRejectMotivo('')
    setRejectModalOpen(true)
  }

  const submitRejectIne = async () => {
    if (!selectedUser) return
    if (!rejectMotivo.trim()) {
      toast.error('Debes proporcionar un motivo de rechazo')
      return
    }
    setSubmitting(true)
    try {
      await userService.rejectIne(selectedUser.id, rejectMotivo)
      toast.success('INE rechazada')
      setRejectModalOpen(false)
      loadData()
    } catch (error) {
      toast.error('Error al rechazar INE')
    } finally {
      setSubmitting(false)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setRoleFilter('todos')
  }

  const columns = [
    {
      key: 'username',
      header: 'Usuario',
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            {user.avatar ? (
              <img src={user.avatar} alt={user.full_name || user.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <span className="font-medium text-gray-900">{user.username}</span>
        </div>
      )
    },
    { key: 'email', header: 'Correo' },
    { key: 'full_name', header: 'Nombre Completo' },
    { key: 'area_name', header: 'Área', render: (u: User) => u.area_name || '-' },
    { key: 'puesto', header: 'Puesto', render: (u: User) => u.puesto || '-' },
    {
      key: 'role',
      header: 'Rol',
      render: (user: User) => {
        const roleName = user.role_display?.toLowerCase() || 'otro'
        const colorClass = roleColors[roleName] || 'bg-gray-100 text-gray-800 border-gray-200'
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
            {user.role_display || 'Sin rol'}
          </span>
        )
      }
    },
    {
      key: 'ine',
      header: 'INE',
      render: (user: User) => (
        user.ine_documento ? (
          <div className="flex flex-col gap-1 items-start">
            <a href={user.ine_documento} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm font-medium">Ver PDF</a>
            {user.ine_verificada ? (
              <span className="text-xs bg-green-100 text-green-800 px-2 rounded-full">Verificada</span>
            ) : user.ine_rechazada ? (
              <span className="text-xs bg-red-100 text-red-800 px-2 rounded-full" title={user.ine_rechazo_motivo}>Rechazada</span>
            ) : (
              <div className="flex gap-1 mt-1">
                <button onClick={(e) => { e.stopPropagation(); handleApproveIne(user) }} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded hover:bg-indigo-100">Aprobar</button>
                <button onClick={(e) => { e.stopPropagation(); handleRejectClick(user) }} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded hover:bg-red-100">Rechazar</button>
              </div>
            )}
          </div>
        ) : <span className="text-gray-400 text-sm">-</span>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (user: User) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleEdit(user) }}
            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
            title="Editar usuario"
            aria-label={`Editar usuario ${user.full_name || user.username}`}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(user) }}
            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            title="Eliminar usuario"
            aria-label={`Eliminar usuario ${user.full_name || user.username}`}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ]

  const hasActiveFilters = searchTerm || roleFilter !== 'todos'

  return (
    <div>
      <PageHeader
        title="Usuarios"
        subtitle="Gestiona los usuarios del sistema"
        icon={<UsersIcon className="w-6 h-6" />}
        gradient="indigo"
        actions={
          <Button onClick={handleCreate}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Nuevo Usuario
          </Button>
        }
      />

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Buscador */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, usuario o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtros por rol */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 hidden sm:inline">Rol:</span>
            {/* Botón Todos */}
            <button
              onClick={() => setRoleFilter('todos')}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-all flex items-center gap-1.5 ${roleFilter === 'todos'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium shadow-sm'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                }`}
            >
              Todos
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${roleFilter === 'todos'
                ? 'bg-indigo-200 text-indigo-800'
                : 'bg-gray-100 text-gray-500'
                }`}>
                {users.length}
              </span>
            </button>
            {/* Botones dinámicos por cada rol existente */}
            {roles.map((role) => {
              const roleKey = role.name.toLowerCase()
              const count = userStats[roleKey] || userStats[role.description?.toLowerCase() || ''] || 0
              if (count === 0) return null
              return (
                <button
                  key={role.id}
                  onClick={() => setRoleFilter(role.description?.toLowerCase() || roleKey)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-all flex items-center gap-1.5 ${roleFilter === (role.description?.toLowerCase() || roleKey)
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                >
                  {role.description || role.name}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${roleFilter === (role.description?.toLowerCase() || roleKey)
                    ? 'bg-indigo-200 text-indigo-800'
                    : 'bg-gray-100 text-gray-500'
                    }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Mostrando <span className="font-medium text-gray-900">{filteredUsers.length}</span> de <span className="font-medium">{users.length}</span> usuarios
            </p>
            <button
              onClick={clearFilters}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
              <XMarkIcon className="h-4 w-4" />
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-200">
        <Table
          columns={columns}
          data={filteredUsers}
          keyExtractor={(user) => user.id}
          loading={loading}
          emptyMessage={hasActiveFilters ? "No se encontraron usuarios con los filtros aplicados" : "No hay usuarios registrados"}
        />
      </div>

      {/* Create/Edit User Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={isEditing ? 'Editar Usuario' : 'Nuevo Usuario'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Usuario"
              disabled={isEditing}
              {...register('username', {
                required: !isEditing ? 'El usuario es requerido' : false,
                pattern: {
                  value: /^[\w.@+-]+$/,
                  message: 'Solo letras, números y @/./+/-/_'
                }
              })}
              error={errors.username?.message}
            />
            <Input
              label="Correo electrónico"
              type="email"
              disabled={isEditing}
              {...register('email', {
                required: !isEditing ? 'El correo es requerido' : false,
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Correo inválido'
                }
              })}
              error={errors.email?.message}
            />
            <Input
              label="Nombre completo"
              {...register('full_name', { required: 'El nombre es requerido' })}
              error={errors.full_name?.message}
            />
            <Input
              label="Teléfono"
              {...register('phone')}
            />
            <Select
              label="Área"
              options={areas.map(a => ({ value: a.id, label: a.nombre }))}
              placeholder="Selecciona un área (opcional)"
              {...register('area', { valueAsNumber: true })}
            />
            <Input
              label="Puesto"
              placeholder="Ej. Director, Auxiliar..."
              {...register('puesto')}
              error={errors.puesto?.message}
            />
            <div className="flex flex-col gap-1">
              <label className="block text-sm font-medium text-gray-700">Documento INE (PDF)</label>
              <input
                type="file"
                accept="application/pdf"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors cursor-pointer border border-gray-200 rounded-lg"
                {...register('ine_documento')}
              />
            </div>
            {!isEditing && (
              <Select
                label="Rol"
                options={roles.map(r => ({ value: r.id, label: r.description || r.name }))}
                placeholder="Selecciona un rol"
                {...register('role', { required: 'El rol es requerido', valueAsNumber: true })}
                error={errors.role?.message}
              />
            )}
          </div>

          {!isEditing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Contraseña"
                type="password"
                {...register('password', {
                  required: 'La contraseña es requerida',
                  minLength: { value: 8, message: 'Mínimo 8 caracteres' }
                })}
                error={errors.password?.message}
              />
              <Input
                label="Confirmar contraseña"
                type="password"
                {...register('password_confirm', { required: 'Confirma la contraseña' })}
                error={errors.password_confirm?.message}
              />
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Eliminar Usuario" size="sm">
        <p className="text-gray-600">
          ¿Estás seguro de que deseas eliminar al usuario <strong>{selectedUser?.full_name}</strong>?
          Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDelete} loading={submitting}>
            Eliminar
          </Button>
        </div>
      </Modal>

      {/* Reject INE Modal */}
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Rechazar INE" size="sm">
        <p className="text-gray-600 mb-4">
          Proporciona un motivo para rechazar la INE de <strong>{selectedUser?.full_name}</strong>.
        </p>
        <Input
          label="Motivo de rechazo"
          value={rejectMotivo}
          onChange={(e) => setRejectMotivo(e.target.value)}
          placeholder="Ej. Documento ilegible, no es un PDF válido..."
        />
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="secondary" onClick={() => setRejectModalOpen(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={submitRejectIne} loading={submitting}>
            Rechazar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
