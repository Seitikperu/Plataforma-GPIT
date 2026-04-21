'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Empresa, RolUsuario } from '@/types'

const ROLES: { id: RolUsuario; label: string }[] = [
  { id: 'admin', label: 'Administrador' },
  { id: 'lider', label: 'Líder de Iniciativa' },
  { id: 'ejecutor', label: 'Ejecutor' },
  { id: 'viewer', label: 'Solo lectura' },
]

export default function NuevoUsuarioPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [empresas, setEmpresas] = useState<Empresa[]>([])

  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    rol: 'viewer' as RolUsuario,
    empresa_id: '',
    cargo: '',
    activo: true,
  })

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('empresas').select('*').eq('activo', true).order('nombre')
      if (data) setEmpresas(data)
    }
    load()
  }, [supabase])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre || !form.apellido || !form.email || !form.rol) {
      setError('Nombre, apellido, email y rol son obligatorios.')
      return
    }
    setLoading(true)
    setError('')

    // Insertar el perfil en la base de datos (Nota: idealmente esto debe ir de la mano con la 
    // creación de un usuario en auth.users a través de Edge Functions o Admin API).
    const payload = {
      ...form,
      empresa_id: form.empresa_id || null,
      cargo: form.cargo || null,
      unidades_acceso: [],
    }

    // Aquí llamaríamos a un endpoint o función para invitar al usuario
    // Por motivos de la interfaz actual, se mostrará intentando guardarlo en la tabla
    const { data: userData, error: userError } = await supabase.auth.admin?.createUser({
      email: form.email,
      email_confirm: true,
      user_metadata: { nombre: form.nombre, apellido: form.apellido }
    }) ?? { data: null, error: new Error('La creación de usuarios requiere Auth Admin API') }
    
    if (userError && userError.message !== 'La creación de usuarios requiere Auth Admin API') {
        setError(userError.message)
        setLoading(false)
        return
    }

    try {
        const insertId = userData?.user?.id ?? crypto.randomUUID()
        const { error: err } = await supabase.from('perfiles').insert({ ...payload, id: insertId })
        
        if (err) throw err
        
        router.push('/admin/usuarios')
    } catch (err: any) {
        setError(err.message || 'Error al guardar el perfil.')
        setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-4 transition">
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Nuevo Usuario</h1>
        <p className="text-slate-600 text-sm mt-1 mb-2">Registra un nuevo perfil para el acceso a la plataforma</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos Personales */}
        <Section title="Datos Personales">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre *" required>
              <Input placeholder="Ej: Juan" value={form.nombre} onChange={set('nombre')} />
            </Field>
            <Field label="Apellido *" required>
              <Input placeholder="Ej: Pérez" value={form.apellido} onChange={set('apellido')} />
            </Field>
            <Field label="Correo Electrónico *" required>
              <Input type="email" placeholder="juan.perez@aesa.com.pe" value={form.email} onChange={set('email')} />
            </Field>
          </div>
        </Section>

        {/* Clasificación */}
        <Section title="Rol y Posición">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Rol en el Sistema *" required>
              <Select value={form.rol} onChange={set('rol')}>
                {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </Select>
            </Field>
            <Field label="Empresa">
              <Select value={form.empresa_id} onChange={set('empresa_id')}>
                <option value="">Seleccionar empresa...</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </Select>
            </Field>
            <div className="col-span-2">
              <Field label="Cargo Corporativo">
                <Input placeholder="Ej: Gerente General" value={form.cargo} onChange={set('cargo')} />
              </Field>
            </div>
            <div className="col-span-2 flex items-center gap-3 mt-2">
              <input
                type="checkbox"
                id="activo"
                checked={form.activo}
                onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 bg-slate-100 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="activo" className="text-sm font-medium text-slate-700">Usuario Activo en el sistema</label>
            </div>
          </div>
        </Section>

        {error && (
          <div className="flex items-center gap-2 text-red-600 font-medium text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            ⚠ {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-bold rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition"
          >
            {loading ? 'Guardando...' : 'Crear Usuario'}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputClass = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:border-blue-500 focus:ring-blue-500 transition'
const selectClass = `${inputClass} cursor-pointer`

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClass} ${className}`} {...props} />
}

function Select({ children, disabled, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select className={`${selectClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={disabled} {...props}>
      {children}
    </select>
  )
}
