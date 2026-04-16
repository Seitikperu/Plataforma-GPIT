import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { GATE_COLORS, GATE_LABELS, GATES_ORDER } from '@/types'
import type { Gate, EstatusSemaforo, Hito } from '@/types'

async function getIniciativa(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('iniciativas')
    .select(`
      *,
      unidad:unidades(id, nombre, codigo),
      area:areas(id, nombre),
      lider:perfiles!lider_id(id, nombre, apellido, cargo, email),
      hitos(*, responsable:perfiles(nombre, apellido)),
      kpi_mensual(*),
      actualizaciones(*, autor:perfiles(nombre, apellido, avatar_url))
    `)
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data
}

interface PageProps { params: Promise<{ id: string }> }

export default async function IniciativaDetailPage({ params }: PageProps) {
  const { id } = await params
  const ini = await getIniciativa(id)
  if (!ini) notFound()

  const hitos = (ini.hitos ?? []) as Hito[]
  const hitosOrdenados = [...hitos].sort((a, b) => a.numero - b.numero)
  const kpis = (ini.kpi_mensual ?? []) as { mes: number; anio: number; kpi_plan: number; kpi_real: number; ebitda_plan_k: number; ebitda_real_k: number }[]
  const actualizaciones = (ini.actualizaciones ?? []) as { id: string; tipo: string; contenido: string; created_at: string; autor: { nombre: string; apellido: string } | null }[]
  const currentYear = new Date().getFullYear()
  const kpisAnio = kpis.filter(k => k.anio === currentYear).sort((a, b) => a.mes - b.mes)

  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic']
  const semaforo = ini.estatus_semaforo as EstatusSemaforo
  const semaforoColors = { 1: 'bg-emerald-500', 2: 'bg-amber-500', 3: 'bg-red-500' }
  const semaforoLabels = { 1: 'Verde', 2: 'Amarillo', 3: 'Rojo' }

  const ejecPct = ini.plan_anual_m > 0 ? Math.round((ini.real_acumulado_m / ini.plan_anual_m) * 100) : 0
  const hitosCompletados = hitosOrdenados.filter(h => h.completado).length
  const hitosTotal = hitosOrdenados.length

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/iniciativas" className="hover:text-slate-300 transition">Iniciativas</Link>
        <span>/</span>
        <span className="text-slate-300 font-mono">{ini.codigo}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${GATE_COLORS[ini.gate_actual as Gate]}`}>
              {GATE_LABELS[ini.gate_actual as Gate]}
            </span>
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg
              ${semaforo === 1 ? 'bg-emerald-500/10 text-emerald-400' : semaforo === 2 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
              <div className={`w-2 h-2 rounded-full ${semaforoColors[semaforo]}`} />
              {semaforoLabels[semaforo]}
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-lg font-medium
              ${ini.estado === 'Activa' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>
              {ini.estado}
            </span>
            {ini.origen && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-700/50 text-slate-400">{ini.origen}</span>
            )}
          </div>
          <h1 className="text-xl font-bold text-white leading-snug">{ini.titulo}</h1>
          <p className="text-slate-400 text-sm mt-1 font-mono">{ini.codigo}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link
            href={`/iniciativas/${id}/hitos`}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition"
          >
            Plan Master
          </Link>
          <Link
            href={`/iniciativas/${id}/editar`}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition"
          >
            Editar
          </Link>
        </div>
      </div>

      {/* Gate Progress */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Progreso por Gate</p>
        <div className="flex items-center gap-1">
          {GATES_ORDER.map((gate, idx) => {
            const gateIdx = GATES_ORDER.indexOf(ini.gate_actual as Gate)
            const isPassed = idx < gateIdx
            const isCurrent = gate === ini.gate_actual
            const dateKey = `fecha_${gate.toLowerCase()}` as keyof typeof ini
            const fecha = ini[dateKey] as string | undefined

            return (
              <div key={gate} className="flex-1 flex flex-col items-center gap-1.5">
                <div className={`w-full h-1.5 rounded-full ${idx === 0 ? 'rounded-l-full' : ''} ${idx === 5 ? 'rounded-r-full' : ''}
                  ${isPassed ? 'bg-blue-500' : isCurrent ? 'bg-blue-400' : 'bg-slate-700'}`} />
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2
                  ${isPassed ? 'bg-blue-600 border-blue-500 text-white' : isCurrent ? 'bg-blue-500 border-blue-400 text-white ring-2 ring-blue-400/30' : 'bg-slate-800 border-slate-600 text-slate-500'}`}>
                  {isPassed ? '✓' : gate.replace('L', '')}
                </div>
                <span className={`text-xs ${isCurrent ? 'text-blue-400 font-semibold' : 'text-slate-600'}`}>{gate}</span>
                {fecha && (
                  <span className="text-xs text-slate-600">
                    {new Date(fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left - Info principal */}
        <div className="lg:col-span-2 space-y-5">
          {/* Descripción */}
          {(ini.contexto || ini.objetivo) && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
              {ini.contexto && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Contexto</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{ini.contexto}</p>
                </div>
              )}
              {ini.objetivo && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Objetivo</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{ini.objetivo}</p>
                </div>
              )}
              {ini.riesgos && (
                <div>
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1.5">⚠ Riesgos / Premisas</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{ini.riesgos}</p>
                </div>
              )}
            </div>
          )}

          {/* Impacto Financiero */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Impacto Financiero</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <MetricBox label="Plan Año (M$)" value={`$${ini.plan_anual_m?.toFixed(2)}M`} />
              <MetricBox label="Real Acum. (M$)" value={`$${ini.real_acumulado_m?.toFixed(2)}M`} />
              <MetricBox label="Ejecución" value={`${ejecPct}%`}
                color={ejecPct >= 90 ? 'emerald' : ejecPct >= 70 ? 'amber' : 'red'} />
              {ini.npv_k && <MetricBox label="NPV (k$)" value={`$${ini.npv_k.toFixed(0)}k`} />}
              {ini.tir_pct && <MetricBox label="TIR" value={`${ini.tir_pct.toFixed(1)}%`} />}
              {ini.payback_anios && <MetricBox label="Payback" value={`${ini.payback_anios.toFixed(1)} años`} />}
              {ini.ebitda_anio_actual_k && <MetricBox label="EBITDA Año (k$)" value={`$${ini.ebitda_anio_actual_k.toFixed(0)}k`} />}
            </div>

            {/* Barra progreso */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>Ejecución Plan vs Real</span>
                <span>{ejecPct}%</span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${ejecPct >= 90 ? 'bg-emerald-500' : ejecPct >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(ejecPct, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* KPI Mensual */}
          {kpisAnio.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  KPI Mensual {currentYear} {ini.kpi_unidad && `· ${ini.kpi_unidad}`}
                </p>
                <Link href={`/iniciativas/${id}/kpis`} className="text-xs text-blue-400 hover:text-blue-300">Ver todo →</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <td className="pb-2 text-slate-500 pr-3">Mes</td>
                      {kpisAnio.map(k => (
                        <td key={k.mes} className="pb-2 text-slate-400 text-center font-medium w-10">{meses[k.mes - 1]}</td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-1 text-slate-500 pr-3">Plan</td>
                      {kpisAnio.map(k => (
                        <td key={k.mes} className="py-1 text-center text-slate-300">{k.kpi_plan?.toFixed(1) ?? '-'}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-500 pr-3">Real</td>
                      {kpisAnio.map(k => (
                        <td key={k.mes} className="py-1 text-center">
                          <span className={k.kpi_real != null
                            ? (k.kpi_real >= (k.kpi_plan ?? 0) ? 'text-emerald-400' : 'text-red-400')
                            : 'text-slate-600'}>
                            {k.kpi_real?.toFixed(1) ?? '-'}
                          </span>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Hitos recientes */}
          {hitosOrdenados.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Plan Master · {hitosCompletados}/{hitosTotal} hitos
                </p>
                <Link href={`/iniciativas/${id}/hitos`} className="text-xs text-blue-400 hover:text-blue-300">Ver todo →</Link>
              </div>
              <div className="space-y-2">
                {hitosOrdenados.slice(0, 6).map(hito => (
                  <HitoRow key={hito.id} hito={hito} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right - Sidebar info */}
        <div className="space-y-5">
          {/* Responsables */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Responsables</p>
            <div className="space-y-3">
              {ini.lider && (
                <InfoRow label="Líder" value={`${(ini.lider as {nombre: string; apellido: string}).nombre} ${(ini.lider as {nombre: string; apellido: string; cargo?: string}).apellido}`}
                  sub={(ini.lider as {cargo?: string}).cargo} />
              )}
              {ini.lider_texto && !ini.lider && (
                <InfoRow label="Líder" value={ini.lider_texto} />
              )}
              {ini.unidad && <InfoRow label="Unidad" value={(ini.unidad as {nombre: string}).nombre} />}
              {ini.area && <InfoRow label="Área" value={(ini.area as {nombre: string}).nombre} />}
            </div>
          </div>

          {/* Clasificación */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Clasificación</p>
            <div className="space-y-3">
              {ini.tipo_iniciativa && <InfoRow label="Tipo" value={ini.tipo_iniciativa} />}
              {ini.categoria_general && <InfoRow label="Categoría" value={ini.categoria_general} />}
              {ini.origen && <InfoRow label="Origen" value={ini.origen} />}
              {ini.dimension_aspiracion && <InfoRow label="Dimensión" value={ini.dimension_aspiracion} />}
              <InfoRow label="En Presupuesto" value={ini.incluido_presupuesto ? 'Sí' : 'No'} />
            </div>
          </div>

          {/* KPI Base */}
          {ini.kpi_unidad && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">KPI Principal</p>
              <p className="text-sm text-slate-300 font-medium mb-3">{ini.kpi_unidad}</p>
              <div className="grid grid-cols-2 gap-3">
                {ini.kpi_base != null && <MetricBox label="Línea Base" value={ini.kpi_base.toFixed(2)} />}
                {ini.kpi_plan != null && <MetricBox label="Meta" value={ini.kpi_plan.toFixed(2)} />}
              </div>
            </div>
          )}

          {/* Próximos Pasos */}
          {(ini.proximos_pasos || ini.solicitud_apoyo) && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Próximos Pasos</p>
              {ini.proximos_pasos && <p className="text-sm text-slate-300 leading-relaxed">{ini.proximos_pasos}</p>}
              {ini.solicitud_apoyo && (
                <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-xs font-semibold text-amber-400 mb-1">Solicitud de Apoyo</p>
                  <p className="text-sm text-slate-300">{ini.solicitud_apoyo}</p>
                </div>
              )}
            </div>
          )}

          {/* Bitácora */}
          {actualizaciones.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Actividad Reciente</p>
              <div className="space-y-3">
                {actualizaciones.slice(0, 5).map(act => (
                  <div key={act.id} className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs">{act.tipo === 'cambio_gate' ? '🔄' : act.tipo === 'alerta' ? '⚠' : '💬'}</span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-300">{act.contenido}</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {act.autor ? `${act.autor.nombre} · ` : ''}
                        {new Date(act.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricBox({ label, value, color }: { label: string; value: string; color?: string }) {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-400', amber: 'text-amber-400', red: 'text-red-400', default: 'text-white'
  }
  return (
    <div className="bg-slate-900/50 border border-slate-700/30 rounded-lg p-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${colors[color ?? 'default']}`}>{value}</p>
    </div>
  )
}

function InfoRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm text-slate-200 font-medium mt-0.5">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

function HitoRow({ hito }: { hito: Hito }) {
  const statusColors: Record<string, string> = {
    Completado: 'text-emerald-400',
    'En Ejecución': 'text-blue-400',
    'Fuera de Fecha': 'text-red-400',
    'En Riesgo': 'text-amber-400',
    Pendiente: 'text-slate-500',
  }
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-700/30 last:border-0">
      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center
        ${hito.completado ? 'bg-emerald-500 border-emerald-500' : hito.en_riesgo ? 'border-amber-500' : 'border-slate-600'}`}>
        {hito.completado && <span className="text-white text-xs">✓</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-300 line-clamp-1">{hito.descripcion}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs ${statusColors[hito.estatus] ?? statusColors.Pendiente}`}>{hito.estatus}</span>
          {hito.fecha_fin_plan && (
            <span className="text-xs text-slate-600">
              → {new Date(hito.fecha_fin_plan).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>
      </div>
      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${GATE_COLORS[hito.gate as Gate]}`}>{hito.gate}</span>
    </div>
  )
}
export const dynamic = "force-dynamic"
