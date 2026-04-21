'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic']

interface KpiRow { id?: string; mes: number; kpi_plan: number | null; kpi_real: number | null; ebitda_plan_k: number | null; ebitda_real_k: number | null }

export default function KpisPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { isAdmin } = useAuth()
  const [iniciativa, setIniciativa] = useState<{ codigo: string; titulo: string; kpi_unidad?: string } | null>(null)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [rows, setRows] = useState<KpiRow[]>(
    Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, kpi_plan: null, kpi_real: null, ebitda_plan_k: null, ebitda_real_k: null }))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasKpiPlan, setHasKpiPlan] = useState(false)
  const [hasEbitdaPlan, setHasEbitdaPlan] = useState(false)
  const [showMassiveAdd, setShowMassiveAdd] = useState(false)
  const [massiveInput, setMassiveInput] = useState('')
  const [massiveTarget, setMassiveTarget] = useState<string>('kpi_plan')
  const [parsedMassive, setParsedMassive] = useState<(number | null)[]>(Array(12).fill(null))

  const loadData = useCallback(async () => {
    const [{ data: ini }, { data: kpis }] = await Promise.all([
      supabase.from('iniciativas').select('codigo, titulo, kpi_unidad').eq('id', id).single(),
      supabase.from('kpi_mensual').select('*').eq('iniciativa_id', id).eq('anio', anio).order('mes'),
    ])
    if (ini) setIniciativa(ini)
    setHasKpiPlan(kpis?.some(k => k.kpi_plan != null) ?? false)
    setHasEbitdaPlan(kpis?.some(k => k.ebitda_plan_k != null) ?? false)

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

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, startMes: number, startField: string) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    if (!text) return
    
    // El orden vertical lógico de la pantalla es:
    const fieldOrder = ['kpi_plan', 'kpi_real', 'ebitda_plan_k', 'ebitda_real_k'] as const
    const startFieldIndex = fieldOrder.indexOf(startField as any)
    if (startFieldIndex === -1) return
    
    const rowsText = text.split(/\r?\n/).filter(line => line.trim() !== '')
    
    setRows(prev => {
      const next = [...prev]
      
      rowsText.forEach((rowText, rowIdx) => {
        const targetFieldIndex = startFieldIndex + rowIdx
        if (targetFieldIndex >= fieldOrder.length) return // Ignorar filas extras si copian de más
        
        const targetField = fieldOrder[targetFieldIndex]
        
        // Bloqueo de seguridad: No sobreescribir plan si está fijo y no es admin
        if (targetField === 'kpi_plan' && hasKpiPlan && !isAdmin) return
        if (targetField === 'ebitda_plan_k' && hasEbitdaPlan && !isAdmin) return
        
        const cols = rowText.split(/\t/)
        cols.forEach((colText, colIdx) => {
          const m = startMes + colIdx
          if (m > 12) return
          
          let cleaned = colText.replace(/[S/$\\s]/g, '').trim()
          if (cleaned === '' || cleaned === '-') return // Ignorar vacíos o guiones
          
          // Formato europeo 1.000,50 -> 1000.50
          if (cleaned.match(/^-?[0-9.]+,[0-9]+$/)) {
            cleaned = cleaned.replace(/\\./g, '').replace(',', '.')
          } else {
            cleaned = cleaned.replace(/,/g, '')
          }
          const val = parseFloat(cleaned)
          
          if (!isNaN(val)) {
            const targetRowIndex = next.findIndex(r => r.mes === m)
            if (targetRowIndex !== -1) {
              next[targetRowIndex] = { ...next[targetRowIndex], [targetField]: val }
            }
          }
        })
      })
      return next
    })
  }

  const handleMassiveParse = (text: string) => {
    setMassiveInput(text)
    const textLines = text.split(/\r?\n/).filter(line => line.trim() !== '')
    if (textLines.length === 0) {
      setParsedMassive(Array(12).fill(null))
      return
    }
    const cols = textLines[0].split(/\t/)
    const parsed: (number | null)[] = Array(12).fill(null)
    
    cols.forEach((colText, i) => {
      if (i >= 12) return
      let cleaned = colText.replace(/[S/$\\s]/g, '').trim()
      if (cleaned === '' || cleaned === '-') return
      
      if (cleaned.match(/^-?[0-9.]+,[0-9]+$/)) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.')
      } else {
        cleaned = cleaned.replace(/,/g, '')
      }
      const val = parseFloat(cleaned)
      if (!isNaN(val)) parsed[i] = val
    })
    setParsedMassive(parsed)
  }

  const applyMassive = () => {
    if (massiveTarget === 'kpi_plan' && hasKpiPlan && !isAdmin) {
      alert('El KPI Plan ya está fijado y no tienes permisos de administrador.')
      return
    }
    if (massiveTarget === 'ebitda_plan_k' && hasEbitdaPlan && !isAdmin) {
      alert('El EBITDA Plan ya está fijado y no tienes permisos de administrador.')
      return
    }

    setRows(prev => prev.map((r, i) => {
      if (parsedMassive[i] !== null) {
        return { ...r, [massiveTarget]: parsedMassive[i] }
      }
      return r
    }))
    
    setShowMassiveAdd(false)
    setMassiveInput('')
    setParsedMassive(Array(12).fill(null))
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
        <button onClick={() => router.back()} className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1 mb-4 transition">
          ← Volver
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Seguimiento KPI Mensual</h1>
            {iniciativa && (
              <p className="text-slate-600 text-sm mt-1">
                <span className="font-mono text-blue-600 font-semibold">{iniciativa.codigo}</span> · {iniciativa.titulo}
                {iniciativa.kpi_unidad && <span className="ml-2 text-slate-500">· KPI: {iniciativa.kpi_unidad}</span>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMassiveAdd(!showMassiveAdd)}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-medium rounded-lg transition flex items-center gap-2"
            >
              ⚡ Carga Masiva (Excel)
            </button>
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg overflow-hidden shadow-sm">
              <button onClick={() => setAnio(a => a - 1)} className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition text-sm">‹</button>
              <span className="px-3 text-sm font-medium text-slate-900">{anio}</span>
              <button onClick={() => setAnio(a => a + 1)} className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition text-sm">›</button>
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

      {showMassiveAdd && (
        <div className="bg-slate-50 border border-emerald-200 rounded-xl p-5 space-y-4 shadow-sm">
          <h3 className="text-sm font-semibold text-emerald-700">⚡ Carga Masiva desde Excel</h3>
          
          <div className="flex gap-4 items-center">
            <label className="text-xs text-slate-600">Selecciona el concepto destino:</label>
            <select 
              value={massiveTarget}
              onChange={e => setMassiveTarget(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="kpi_plan">KPI Principal (Plan)</option>
              <option value="kpi_real">KPI Principal (Real)</option>
              <option value="ebitda_plan_k">EBITDA k$ (Plan)</option>
              <option value="ebitda_real_k">EBITDA k$ (Real)</option>
            </select>
          </div>

          <p className="text-xs text-slate-600">
            Copia <strong>1 fila con 12 columnas (Ene a Dic)</strong> desde Excel y pégala aquí:
          </p>
          <textarea
            value={massiveInput}
            onChange={e => handleMassiveParse(e.target.value)}
            placeholder="Pega aquí (Ctrl+V) las celdas directamente desde Excel..."
            className="w-full h-20 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          
          {parsedMassive.some(val => val !== null) && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-emerald-700">Vista Previa:</p>
              <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                <table className="w-full text-xs min-w-max">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      {MESES.map(m => <th key={m} className="px-2 py-1.5 text-center font-semibold text-slate-700 w-16">{m}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      {parsedMassive.map((val, i) => (
                        <td key={i} className="px-2 py-2 text-center text-slate-900 font-mono bg-slate-50">
                          {val !== null ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '-'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button 
              disabled={!parsedMassive.some(val => val !== null)}
              onClick={applyMassive} 
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
            >
              Aplicar a la tabla
            </button>
            <button onClick={() => { setShowMassiveAdd(false); setMassiveInput(''); setParsedMassive(Array(12).fill(null)) }} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-medium rounded-lg transition">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Tabla KPI */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-800">KPI Principal</h3>
          <p className="text-xs text-slate-500 mt-0.5">Puedes pegar (Ctrl+V) una fila desde Excel directo en las celdas para carga masiva</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider sticky left-0 bg-slate-50 w-28">Concepto</th>
                {MESES.map(m => (
                  <th key={m} className="px-2 py-3 text-center text-xs font-bold text-slate-700 uppercase w-20 bg-slate-50">{m}</th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase w-24 bg-slate-50">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-3 text-xs font-semibold text-slate-600 sticky left-0 bg-white">Plan</td>
                {rows.map(r => (
                  <td key={r.mes} className="px-2 py-2 text-center bg-white">
                    <input
                      type="number" step="0.01"
                      value={r.kpi_plan ?? ''}
                      onChange={e => updateRow(r.mes, 'kpi_plan', e.target.value)}
                      onPaste={e => handlePaste(e, r.mes, 'kpi_plan')}
                      disabled={hasKpiPlan && !isAdmin}
                      title={hasKpiPlan && !isAdmin ? "El plan ya fijó valores. Solicita apoyo a un Administrador." : ""}
                      className={`w-16 px-1.5 py-1 border rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500
                        ${hasKpiPlan && !isAdmin ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-300 text-slate-900 font-medium'}`}
                      placeholder="—"
                    />
                  </td>
                ))}
                <td className="px-4 py-3 text-center text-xs font-bold text-slate-800 bg-white">{totalPlan.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="px-4 py-3 text-xs font-semibold text-slate-600 sticky left-0 bg-white">Real</td>
                {rows.map(r => {
                  const diff = r.kpi_plan != null && r.kpi_real != null ? r.kpi_real - r.kpi_plan : null
                  return (
                    <td key={r.mes} className="px-2 py-2 text-center bg-white">
                      <input
                        type="number" step="0.01"
                        value={r.kpi_real ?? ''}
                        onChange={e => updateRow(r.mes, 'kpi_real', e.target.value)}
                        onPaste={e => handlePaste(e, r.mes, 'kpi_real')}
                        className={`w-16 px-1.5 py-1 border rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium
                          ${diff != null ? (diff >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700') : 'bg-white border-slate-300 text-slate-900'}`}
                        placeholder="—"
                      />
                    </td>
                  )
                })}
                <td className={`px-4 py-3 text-center text-xs font-bold bg-white ${totalReal >= totalPlan ? 'text-emerald-600' : 'text-red-600'}`}>
                  {totalReal.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla EBITDA */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-800">EBITDA (k$)</h3>
          <p className="text-xs text-slate-500 mt-0.5">Puedes pegar (Ctrl+V) una fila desde Excel directo en las celdas para carga masiva</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider sticky left-0 bg-slate-50 w-28">Concepto</th>
                {MESES.map(m => (
                  <th key={m} className="px-2 py-3 text-center text-xs font-bold text-slate-700 uppercase w-20 bg-slate-50">{m}</th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase w-24 bg-slate-50">Total</th>
              </tr>
            </thead>
            <tbody>
              {(['ebitda_plan_k', 'ebitda_real_k'] as const).map((field, idx) => (
                <tr key={field} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-xs font-semibold text-slate-600 sticky left-0 bg-white">
                    {idx === 0 ? 'Plan' : 'Real'}
                  </td>
                  {rows.map(r => (
                    <td key={r.mes} className="px-2 py-2 text-center bg-white">
                      <input
                        type="number" step="0.001"
                        value={r[field] ?? ''}
                        onChange={e => updateRow(r.mes, field, e.target.value)}
                        onPaste={e => handlePaste(e, r.mes, field)}
                        disabled={field === 'ebitda_plan_k' && hasEbitdaPlan && !isAdmin}
                        title={field === 'ebitda_plan_k' && hasEbitdaPlan && !isAdmin ? "El plan ya fijó valores. Solicita apoyo a un Administrador." : ""}
                        className={`w-16 px-1.5 py-1 border rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium
                          ${field === 'ebitda_plan_k' && hasEbitdaPlan && !isAdmin ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-300 text-slate-900'}`}
                        placeholder="—"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center text-xs font-bold text-slate-800 bg-white">
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
