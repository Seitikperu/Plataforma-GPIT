import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { GATE_COLORS, GATE_LABELS, SEMAFORO_COLORS } from '@/types'
import type { Gate, EstatusSemaforo, Iniciativa } from '@/types'

interface PageProps {
  searchParams: Promise<{
    gate?: string
    estado?: string
    unidad?: string
    busqueda?: string
    vista?: string
  }>
}

async function getIniciativas(filtros: Record<string, string>) {
  const supabase = await createClient()
  let query = supabase
    .from('iniciativas')
    .select(`
      id, codigo, titulo, gate_actual, estado, estatus_semaforo,
      plan_anual_m, real_acumulado_m, avance_real_pct, origen,
      fecha_proximo_gate, lider_texto,
      unidad:unidades(nombre),
      area:areas(nombre),
      lider:perfiles!lider_id(nombre, apellido)
    `)
    .neq('estado', 'Descartada')
    .order('orden', { ascending: true })

  if (filtros.gate) query = query.eq('gate_actual', filtros.gate)
  if (filtros.estado) query = query.eq('estado', filtros.estado)
  if (filtros.unidad) query = query.eq('unidad_id', filtros.unidad)
  if (filtros.busqueda) query = query.or(`titulo.ilike.%${filtros.busqueda}%,codigo.ilike.%${filtros.busqueda}%`)

  const { data } = await query
  return (data ?? []) as unknown as (Iniciativa & { unidad: { nombre: string }; area: { nombre: string }; lider: { nombre: string; apellido: string } | null })[]
}

async function getUnidades() {
  const supabase = await createClient()
  const { data } = await supabase.from('unidades').select('id, nombre').eq('activo', true)
  return data ?? []
}

export default async function IniciativasPage({ searchParams }: PageProps) {
  const params = await searchParams
  const [iniciativas, unidades] = await Promise.all([
    getIniciativas(params),
    getUnidades(),
  ])

  const gatesOrder = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'] as Gate[]
  const isKanban = params.vista === 'kanban'

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Iniciativas</h1>
          <p className="text-slate-400 text-sm mt-0.5">{iniciativas.length} iniciativas encontradas</p>
        </div>
        <Link
          href="/iniciativas/nueva"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Iniciativa
        </Link>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3 p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl">
        <input
          name="busqueda"
          defaultValue={params.busqueda}
          placeholder="Buscar por código o título..."
          className="flex-1 min-w-48 px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          name="gate"
          defaultValue={params.gate ?? ''}
          className="px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todos los gates</option>
          {gatesOrder.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select
          name="estado"
          defaultValue={params.estado ?? ''}
          className="px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          <option value="Activa">Activa</option>
          <option value="Completada">Completada</option>
          <option value="En Pausa">En Pausa</option>
        </select>
        <select
          name="unidad"
          defaultValue={params.unidad ?? ''}
          className="px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todas las unidades</option>
          {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition"
        >
          Filtrar
        </button>

        {/* Vista toggle */}
        <div className="ml-auto flex gap-1 bg-slate-900/60 border border-slate-600 rounded-lg p-1">
          <Link
            href="/iniciativas"
            className={`px-3 py-1 rounded text-xs font-medium transition ${!isKanban ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >Lista</Link>
          <Link
            href="/iniciativas?vista=kanban"
            className={`px-3 py-1 rounded text-xs font-medium transition ${isKanban ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >Funnel</Link>
        </div>
      </form>

      {/* Content */}
      {isKanban ? (
        // KANBAN VIEW
        <div className="flex gap-4 overflow-x-auto pb-4">
          {gatesOrder.map(gate => {
            const cols = iniciativas.filter(i => i.gate_actual === gate)
            return (
              <div key={gate} className="flex-shrink-0 w-72">
                <div className={`flex items-center justify-between px-3 py-2 rounded-lg mb-3 ${GATE_COLORS[gate]}`}>
                  <span className="text-xs font-bold uppercase tracking-wider">{GATE_LABELS[gate]}</span>
                  <span className="text-xs font-bold">{cols.length}</span>
                </div>
                <div className="space-y-2">
                  {cols.map(ini => (
                    <Link key={ini.id} href={`/iniciativas/${ini.id}`}>
                      <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 hover:border-blue-500/40 hover:bg-slate-800 transition cursor-pointer">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-xs text-slate-500 font-mono">{ini.codigo}</span>
                          <SemaforoIcon semaforo={ini.estatus_semaforo as EstatusSemaforo} />
                        </div>
                        <p className="text-sm text-slate-200 font-medium leading-snug line-clamp-2">{ini.titulo}</p>
                        {(ini.lider?.nombre || ini.lider_texto) && (
                          <p className="text-xs text-slate-500 mt-2 truncate">
                            👤 {ini.lider ? `${ini.lider.nombre} ${ini.lider.apellido}` : ini.lider_texto}
                          </p>
                        )}
                        {ini.plan_anual_m > 0 && (
                          <p className="text-xs text-emerald-400 mt-1">${ini.plan_anual_m.toFixed(2)}M</p>
                        )}
                      </div>
                    </Link>
                  ))}
                  {cols.length === 0 && (
                    <div className="border-2 border-dashed border-slate-700/40 rounded-lg p-4 text-center">
                      <p className="text-xs text-slate-600">Sin iniciativas</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // LIST VIEW
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          {iniciativas.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-slate-400 font-medium">No se encontraron iniciativas</p>
              <p className="text-slate-500 text-sm mt-1">Ajusta los filtros o crea una nueva</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {['', 'Código', 'Iniciativa', 'Área', 'Gate', 'Plan M$', 'Real M$', 'Avance', 'Próx. Gate'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {iniciativas.map(ini => {
                  const ejec = ini.plan_anual_m > 0 ? Math.round((ini.real_acumulado_m / ini.plan_anual_m) * 100) : 0
                  return (
                    <tr key={ini.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition">
                      <td className="px-4 py-3">
                        <SemaforoIcon semaforo={ini.estatus_semaforo as EstatusSemaforo} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{ini.codigo}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <Link href={`/iniciativas/${ini.id}`} className="text-blue-400 hover:text-blue-300 font-medium line-clamp-2">
                          {ini.titulo}
                        </Link>
                        {(ini.lider?.nombre || ini.lider_texto) && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {ini.lider ? `${ini.lider.nombre} ${ini.lider.apellido}` : ini.lider_texto}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{(ini.area as {nombre?: string})?.nombre ?? '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${GATE_COLORS[ini.gate_actual as Gate]}`}>
                          {ini.gate_actual}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">${ini.plan_anual_m?.toFixed(2)}M</td>
                      <td className="px-4 py-3 text-slate-300">${ini.real_acumulado_m?.toFixed(2)}M</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${ejec >= 90 ? 'bg-emerald-500' : ejec >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(ejec, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${ejec >= 90 ? 'text-emerald-400' : ejec >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                            {ejec}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {ini.fecha_proximo_gate
                          ? new Date(ini.fecha_proximo_gate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
                          : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function SemaforoIcon({ semaforo }: { semaforo: EstatusSemaforo }) {
  const colors: Record<number, string> = { 1: 'bg-emerald-500', 2: 'bg-amber-500', 3: 'bg-red-500' }
  return <div className={`w-2.5 h-2.5 rounded-full ${colors[semaforo] ?? colors[1]}`} />
}
export const dynamic = "force-dynamic"
