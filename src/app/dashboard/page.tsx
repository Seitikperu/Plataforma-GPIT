import { createClient } from '@/lib/supabase/server'
import { GATE_LABELS, GATE_COLORS } from '@/types'

async function getDashboardData() {
  const supabase = await createClient()

  const [resumenRes, funnelRes, semaforoRes] = await Promise.all([
    supabase.from('v_resumen_unidad').select('*'),
    supabase.from('v_funnel_gates').select('*'),
    supabase
      .from('iniciativas')
      .select('estatus_semaforo, gate_actual, codigo, titulo, unidad_id')
      .eq('estado', 'Activa')
      .eq('estatus_semaforo', 3)
      .limit(10),
  ])

  return {
    resumen: resumenRes.data ?? [],
    funnel: funnelRes.data ?? [],
    alertas: semaforoRes.data ?? [],
  }
}

export default async function DashboardPage() {
  const { resumen, funnel, alertas } = await getDashboardData()

  const totalActivas = resumen.reduce((s, r) => s + (r.iniciativas_activas || 0), 0)
  const totalPlan = resumen.reduce((s, r) => s + (r.plan_total_m || 0), 0)
  const totalReal = resumen.reduce((s, r) => s + (r.real_total_m || 0), 0)
  const totalRojo = resumen.reduce((s, r) => s + (r.semaforo_rojo || 0), 0)
  const capturaValor = resumen.reduce((s, r) => s + (r.en_captura_valor || 0), 0)

  const ejecucionPct = totalPlan > 0 ? Math.round((totalReal / totalPlan) * 100) : 0

  const gatesOrder = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'] as const
  const funnelByGate = gatesOrder.map(gate => ({
    gate,
    cantidad: funnel.filter(f => f.gate_actual === gate).reduce((s, f) => s + (f.cantidad || 0), 0),
    impacto: funnel.filter(f => f.gate_actual === gate).reduce((s, f) => s + (f.impacto_total_m || 0), 0),
  }))
  const maxCantidad = Math.max(...funnelByGate.map(f => f.cantidad), 1)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Ejecutivo</h1>
        <p className="text-slate-600 text-sm mt-1">Resumen de iniciativas GPIT · Año {new Date().getFullYear()}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Iniciativas Activas" value={totalActivas} icon="📋" color="blue" />
        <KpiCard label="En Captura de Valor (L4)" value={capturaValor} icon="💰" color="emerald" />
        <KpiCard label="Plan 2026 (M$)" value={`$${totalPlan.toFixed(1)}M`} icon="🎯" color="indigo" />
        <KpiCard
          label="Ejecución vs Plan"
          value={`${ejecucionPct}%`}
          icon={ejecucionPct >= 90 ? '✅' : ejecucionPct >= 70 ? '⚠️' : '🔴'}
          color={ejecucionPct >= 90 ? 'emerald' : ejecucionPct >= 70 ? 'amber' : 'red'}
          sub={`Real: $${totalReal.toFixed(1)}M`}
        />
      </div>

      {/* Funnel + Semáforos */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Funnel de Gates */}
        <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-xl p-6">
          <h2 className="text-base font-bold text-slate-900 mb-5">Funnel de Iniciativas por Gate</h2>
          <div className="space-y-3">
            {funnelByGate.map(({ gate, cantidad, impacto }) => (
              <div key={gate} className="flex items-center gap-3">
                <span className={`text-[11px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-md w-24 text-center ${GATE_COLORS[gate]}`}>
                  {gate}
                </span>
                <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg flex items-center px-2 transition-all duration-700"
                    style={{ width: cantidad > 0 ? `${Math.max((cantidad / maxCantidad) * 100, 8)}%` : '0%' }}
                  >
                    {cantidad > 0 && (
                      <span className="text-xs font-bold text-white">{cantidad}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-600 w-20 text-right">
                  {impacto > 0 ? `$${impacto.toFixed(1)}M` : '-'}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-6 text-xs text-slate-500 font-medium">
            <span>Barras: cantidad de iniciativas</span>
            <span>Derecha: impacto acumulado</span>
          </div>
        </div>

        {/* Semáforos */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
          <h2 className="text-base font-bold text-slate-900 mb-5">Resumen Semáforos</h2>
          {resumen.length === 0 ? (
            <p className="text-slate-500 text-sm">Sin datos</p>
          ) : (
            <div className="space-y-4">
              {resumen.map(r => (
                <div key={r.unidad} className="space-y-2">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{r.unidad}</p>
                  <div className="flex gap-3">
                    <SemaforoChip color="emerald" label="Verde" count={r.semaforo_verde} />
                    <SemaforoChip color="amber" label="Amarillo" count={r.semaforo_amarillo} />
                    <SemaforoChip color="red" label="Rojo" count={r.semaforo_rojo} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Alertas rojas */}
          {alertas.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-200">
              <p className="text-xs font-bold text-red-600 mb-2">⚠ Iniciativas en Alerta</p>
              <ul className="space-y-1.5">
                {alertas.slice(0, 5).map(a => (
                  <li key={a.codigo} className="text-xs text-slate-600 truncate font-medium">
                    <span className="text-red-600 font-bold">{a.codigo}</span> · {a.titulo}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Tabla por unidad */}
      {resumen.length > 0 && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-base font-bold text-slate-900">Resumen por Unidad</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {['Unidad', 'Activas', 'L4 Captura', 'Completadas', '🟢', '🟡', '🔴', 'Plan M$', 'Real M$', 'Ejec.'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resumen.map(r => {
                  const ejec = r.plan_total_m > 0 ? Math.round((r.real_total_m / r.plan_total_m) * 100) : 0
                  return (
                    <tr key={r.unidad} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-800">{r.unidad}</td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{r.iniciativas_activas}</td>
                      <td className="px-4 py-3 text-emerald-600 font-bold">{r.en_captura_valor}</td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{r.completadas}</td>
                      <td className="px-4 py-3 text-emerald-600 font-medium">{r.semaforo_verde}</td>
                      <td className="px-4 py-3 text-amber-600 font-medium">{r.semaforo_amarillo}</td>
                      <td className="px-4 py-3 text-red-600 font-medium">{r.semaforo_rojo}</td>
                      <td className="px-4 py-3 text-slate-800 font-semibold">${r.plan_total_m?.toFixed(2)}M</td>
                      <td className="px-4 py-3 text-slate-800 font-semibold">${r.real_total_m?.toFixed(2)}M</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${ejec >= 90 ? 'text-emerald-600' : ejec >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                          {ejec}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {resumen.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          <div className="text-4xl mb-3">📊</div>
          <p className="font-bold text-slate-600">No hay datos aún</p>
          <p className="text-sm mt-1">Comienza creando la primera iniciativa</p>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, icon, color, sub }: {
  label: string; value: string | number; icon: string; color: string; sub?: string
}) {
  const colors: Record<string, string> = {
    blue: 'from-blue-50 to-white border-blue-100',
    emerald: 'from-emerald-50 to-white border-emerald-100',
    indigo: 'from-indigo-50 to-white border-indigo-100',
    amber: 'from-amber-50 to-white border-amber-100',
    red: 'from-red-50 to-white border-red-100',
  }
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-5 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {sub && <p className="text-xs font-semibold text-slate-600 mt-0.5">{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}

function SemaforoChip({ color, label, count }: { color: string; label: string; count: number }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${colors[color]}`}>
      <span>{count}</span>
      <span className="text-slate-600 font-medium">{label}</span>
    </div>
  )
}
export const dynamic = "force-dynamic"
