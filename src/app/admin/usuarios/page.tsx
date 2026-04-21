import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ROL_LABELS } from '@/types'
import type { RolUsuario } from '@/types'

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: perfiles } = await supabase
    .from('perfiles')
    .select('*, empresa:empresas(nombre)')
    .order('nombre')

  const rolColors: Record<RolUsuario, string> = {
    admin: 'bg-purple-50 text-purple-700 border-purple-200',
    lider: 'bg-blue-50 text-blue-700 border-blue-200',
    ejecutor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    viewer: 'bg-slate-100 text-slate-700 border-slate-300',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-slate-600 text-sm mt-1 mb-2">{perfiles?.length ?? 0} usuarios registrados</p>
        </div>
        <Link
          href="/admin/usuarios/nuevo"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Usuario
        </Link>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {['Usuario', 'Email', 'Empresa', 'Rol', 'Cargo', 'Estado'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
          <tbody className="divide-y divide-slate-100">
            {(perfiles ?? []).map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {p.nombre?.charAt(0)}{p.apellido?.charAt(0)}
                    </div>
                    <span className="text-slate-800 font-bold">{p.nombre} {p.apellido}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600 font-medium text-xs">{p.email}</td>
                <td className="px-4 py-3 text-slate-600 font-medium text-xs">{(p.empresa as {nombre?: string})?.nombre ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-lg border font-bold ${rolColors[p.rol as RolUsuario]}`}>
                    {ROL_LABELS[p.rol as RolUsuario]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 font-medium text-xs">{p.cargo ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold ${p.activo ? 'text-emerald-600' : 'text-red-600'}`}>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
export const dynamic = "force-dynamic"
