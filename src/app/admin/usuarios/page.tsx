import { createClient } from '@/lib/supabase/server'
import { ROL_LABELS } from '@/types'
import type { RolUsuario } from '@/types'

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: perfiles } = await supabase
    .from('perfiles')
    .select('*, empresa:empresas(nombre)')
    .order('nombre')

  const rolColors: Record<RolUsuario, string> = {
    admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    lider: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    ejecutor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    viewer: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Usuarios</h1>
          <p className="text-slate-400 text-sm mt-1">{perfiles?.length ?? 0} usuarios registrados</p>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              {['Usuario', 'Email', 'Empresa', 'Rol', 'Cargo', 'Estado'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(perfiles ?? []).map(p => (
              <tr key={p.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {p.nombre?.charAt(0)}{p.apellido?.charAt(0)}
                    </div>
                    <span className="text-slate-200 font-medium">{p.nombre} {p.apellido}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">{p.email}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{(p.empresa as {nombre?: string})?.nombre ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${rolColors[p.rol as RolUsuario]}`}>
                    {ROL_LABELS[p.rol as RolUsuario]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">{p.cargo ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${p.activo ? 'text-emerald-400' : 'text-red-400'}`}>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
export const dynamic = "force-dynamic"
