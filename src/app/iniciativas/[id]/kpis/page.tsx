'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic']

interface KpiRow { id?: string; mes: number; kpi_plan: number | null; kpi_real: number | null; ebitda_plan_k: number | null; ebitda_real_k: number | null }

export default function KpisPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [iniciativa, setIniciativa] = useState<{ codigo: string; titulo: string; kpi_unidad?: string } | null>(null)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [rows, setRows] = useState<KpiRow[]>(
    Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, kpi_plan: null, kpi_real: null, ebitda_plan_k: null, ebitda_real_k: null }))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const loadData = useCallback(async () => {
    const [{ data: ini }, { data: kpis }] = await Promise.all([
      supabase.from('iniciativas').select('codigo, titulo, kpi_unidad').eq('id', id).single(),
      supabase.from('kpi_mensual').select('*').eq('iniciativa_id', id).eq('anio', anio).order('mes'),
    ])
    if (ini) setIniciativa(ini)
    setRows(Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1
      const kpi = kpis?.find(k => k.mes === mes)
      return {
        id: kpi?.id,
        mes,
        kpi_plan: kpi?.kpi_plan ?? null,
        kpi_real: kpi?.kpi_real ?? null,
        ebitda_plan_k: kpi?.ebitda_plan_k ?? null,
        ebitda_real_k: kpi?.ebitda_real_k ?? null,
      }
    }))
  }, [supabase, id, anio])

  useEffect(() => { loadData() }, [loadData])

  const updateRow = (mes: number, field: string, value: string) => {
    setRows(prev => prev.map(r => r.mes === mes ? { ...r, [field]: value === '' ? null : parseFloat(value) } : r))
  }

  const handleSave = async () => {
    setSaving(true)
    const toUpsert = rows
      .filter(r => r.kpi_plan != null || r.kpi_real != null || r.ebitda_plan_k != null || r.ebitda_real_k != null)
      .map(r => ({ iniciativa_id: id, anio, mes: r.mes, kpi_plan: r.kpi_plan, kpi_real: r.kpi_real, ebitda_plan_k: r.ebitda_plan_k, ebitda_real_k: r.ebitda_real_k }))

    await supabase.from('kpi_mensual').upsert(toUpsert, { onConflict: 'iniciativa_id,anio,mes' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    await loadData()
  }

  // Calcular totales
  const totalPlan = rows.reduce((s, r) => s + (r.kpi_plan ?? 0), 0)
  const totalReal = rows.reduce((s, r) => s + (r.kpi_real ?? 0), 0)
  const totalEbitdaPlan = rows.reduce((s, r) => s + (r.ebitda_plan_k ?? 0), 0)
  const totalEbitdaReal = rows.reduce((s, r) => s + (r.ebitda_real_k ?? 0), 0)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1 mb-4 transition">
          ← Volver
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Seguimiento KPI Mensual</h1>
            {iniciativa && (
              <p className="text-slate-400 text-sm mt-1">
                <span className="font-mono text-blue-400">{iniciativa.codigo}</span> · {iniciativa.titulo}
                {iniciativa.kpi_unidad && <span className="ml-2 text-slate-500">· KPI: {iniciativa.kpi_unidad}</span>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              <button onClick={() => setAnio(a => a - 1)} className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-700 transition text-sm">‹</button>
              <span className="px-3 text-sm font-medium text-white">{anio}</span>
              <button onClick={() => setAnio(a => a + 1)} className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-700 transition text-sm">›</button>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition flex items-center gap-2"
            >
              {saving ? '...' : saved ? '✓ Guardado' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabla KPI */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700/50 bg-slate-800/80">
          <h3 className="text-sm font-semibold text-slate-300">KPI Principal</h3>
          <p className="text-xs text-slate-500 mt-0.5">Ingresa los valores plan y real para cada mes</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-800/80 w-28">Concepto</th>
                {MESES.map(m => (
                  <th key={m} className="px-2 py-3 text-center text-xs font-semibold text-slate-400 uppercase w-20">{m}</th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-700/30">
                <td className="px-4 py-3 text-xs font-medium text-slate-400 sticky left-0 bg-slate-800/50">Plan</td>
                {rows.map(r => (
                  <td key={r.mes} className="px-2 py-2 text-center">
                    <input
                      type="number" step="0.01"
                      value={r.kpi_plan ?? ''}
                      onChange={e => updateRow(r.mes, 'kpi_plan', e.target.value)}
                      className="w-16 px-1.5 py-1 bg-slate-900/60 border border-slate-600 rounded text-slate-300 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="—"
                    />
                  </td>
                ))}
                <td className="px-4 py-3 text-center text-xs font-semibold text-slate-300">{totalPlan.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-slate-700/30">
                <td className="px-4 py-3 text-xs font-medium text-slate-400 sticky left-0 bg-slate-800/50">Real</td>
                {rows.map(r => {
                  const diff = r.kpi_plan != null && r.kpi_real != null ? r.kpi_real - r.kpi_plan : null
                  return (
                    <td key={r.mes} className="px-2 py-2 text-center">
                      <input
                        type="number" step="0.01"
                        value={r.kpi_real ?? ''}
                        onChange={e => updateRow(r.mes, 'kpi_real', e.target.value)}
                        className={`w-16 px-1.5 py-1 border rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500
                          ${diff != null ? (diff >= 0 ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-300' : 'bg-red-900/30 border-red-700/50 text-red-300') : 'bg-slate-900/60 border-slate-600 text-slate-300'}`}
                        placeholder="—"
                      />
                    </td>
                  )
                })}
                <td className={`px-4 py-3 text-center text-xs font-semibold ${totalReal >= totalPlan ? 'text-emerald-400' : 'text-red-400'}`}>
                  {totalReal.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla EBITDA */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700/50 bg-slate-800/80">
          <h3 className="text-sm font-semibold text-slate-300">EBITDA (k$)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-800/80 w-28">Concepto</th>
                {MESES.map(m => (
                  <th key={m} className="px-2 py-3 text-center text-xs font-semibold text-slate-400 uppercase w-20">{m}</th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              {(['ebitda_plan_k', 'ebitda_real_k'] as const).map((field, idx) => (
                <tr key={field} className="border-b border-slate-700/30">
                  <td className="px-4 py-3 text-xs font-medium text-slate-400 sticky left-0 bg-slate-800/50">
                    {idx === 0 ? 'Plan' : 'Real'}
                  </td>
                  {rows.map(r => (
                    <td key={r.mes} className="px-2 py-2 text-center">
                      <input
                        type="number" step="0.001"
                        value={r[field] ?? ''}
                        onChange={e => updateRow(r.mes, field, e.target.value)}
                        className="w-16 px-1.5 py-1 bg-slate-900/60 border border-slate-600 rounded text-slate-300 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="—"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center text-xs font-semibold text-slate-300">
                    {(idx === 0 ? totalEbitdaPlan : totalEbitdaReal).toFixed(3)}
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
