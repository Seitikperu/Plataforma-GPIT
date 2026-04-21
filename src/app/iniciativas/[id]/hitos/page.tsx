'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Gate, EstatusHito } from '@/types'
import { GATE_COLORS, GATES_ORDER } from '@/types'

interface Hito {
  id: string
  numero: number
  gate: Gate
  descripcion: string
  responsable_texto?: string
  fecha_inicio_plan?: string
  fecha_fin_plan?: string
  completado: boolean
  en_riesgo: boolean
  es_money_step: boolean
  estatus: EstatusHito
  avance_pct: number
  causa_semaforo?: string
  accion_semana?: string
}

interface Iniciativa {
  id: string
  codigo: string
  titulo: string
  gate_actual: Gate
}

const ESTATUS_OPTIONS: EstatusHito[] = ['Pendiente', 'En Ejecución', 'Completado', 'Fuera de Fecha', 'En Riesgo']

export default function HitosPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [iniciativa, setIniciativa] = useState<Iniciativa | null>(null)
  const [hitos, setHitos] = useState<Hito[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showMassiveAdd, setShowMassiveAdd] = useState(false)
  const [massiveInput, setMassiveInput] = useState('')
  const [parsedHitos, setParsedHitos] = useState<Partial<Hito>[]>([])
  const [newHito, setNewHito] = useState({
    gate: 'L1' as Gate, descripcion: '', responsable_texto: '',
    fecha_inicio_plan: '', fecha_fin_plan: '', es_money_step: false
  })

  const load = useCallback(async () => {
    const [{ data: ini }, { data: h }] = await Promise.all([
      supabase.from('iniciativas').select('id, codigo, titulo, gate_actual').eq('id', id).single(),
      supabase.from('hitos').select('*').eq('iniciativa_id', id).order('numero'),
    ])
    if (ini) setIniciativa(ini)
    if (h) setHitos(h)
    setLoading(false)
  }, [supabase, id])

  useEffect(() => { load() }, [load])

  const updateHito = async (hitoId: string, field: string, value: unknown) => {
    setSaving(hitoId)
    setHitos(prev => prev.map(h => h.id === hitoId ? { ...h, [field]: value } : h))
    await supabase.from('hitos').update({ [field]: value }).eq('id', hitoId)
    setSaving(null)
  }

  const addHito = async () => {
    if (!newHito.descripcion) return
    const nextNum = hitos.length + 1
    const { data } = await supabase.from('hitos').insert({
      iniciativa_id: id, numero: nextNum, ...newHito,
      estatus: 'Pendiente', avance_pct: 0,
    }).select().single()
    if (data) {
      setHitos(prev => [...prev, data])
      setNewHito({ gate: 'L1', descripcion: '', responsable_texto: '', fecha_inicio_plan: '', fecha_fin_plan: '', es_money_step: false })
      setShowAdd(false)
    }
  }

  const handleMassiveParse = (text: string) => {
    setMassiveInput(text)
    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '')
    const parsed = lines.map(line => {
      const cols = line.split('\t').map(c => c.trim())
      const gate = cols[0] as Gate
      const descripcion = cols[1] || ''
      const responsable_texto = cols[2] || ''
      
      const parseDate = (dString: string) => {
        if (!dString) return ''
        if (dString.includes('/')) {
            const parts = dString.split('/')
            if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`
        }
        if (dString.match(/^\d{4}-\d{2}-\d{2}$/)) return dString
        return ''
      }
      return {
        gate: GATES_ORDER.includes(gate) ? gate : 'L1',
        descripcion,
        responsable_texto,
        fecha_inicio_plan: parseDate(cols[3] || ''),
        fecha_fin_plan: parseDate(cols[4] || ''),
        es_money_step: false,
        estatus: 'Pendiente' as EstatusHito,
        avance_pct: 0
      }
    }).filter(h => h.descripcion !== '')
    
    setParsedHitos(parsed)
  }

  const saveMassive = async () => {
    if (parsedHitos.length === 0) return
    setSaving('massive')
    
    let baseNum = hitos.length
    const toInsert = parsedHitos.map(h => {
        baseNum++
        return { iniciativa_id: id, numero: baseNum, ...h }
    })
    
    const { data } = await supabase.from('hitos').insert(toInsert).select()
    if (data) {
        setHitos(prev => [...prev, ...data])
    }
    
    setShowMassiveAdd(false)
    setMassiveInput('')
    setParsedHitos([])
    setSaving(null)
  }

  const deleteHito = async (hitoId: string) => {
    if (!confirm('¿Eliminar este hito?')) return
    await supabase.from('hitos').delete().eq('id', hitoId)
    setHitos(prev => prev.filter(h => h.id !== hitoId))
  }

  const completados = hitos.filter(h => h.completado).length
  const enRiesgo = hitos.filter(h => h.en_riesgo).length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <button onClick={() => router.back()} className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1 mb-4 transition">
          ← Volver a iniciativa
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Plan Master de Hitos</h1>
            {iniciativa && (
              <p className="text-slate-500 text-sm mt-1">
                <span className="font-mono text-blue-600 font-semibold">{iniciativa.codigo}</span> · {iniciativa.titulo}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowMassiveAdd(!showMassiveAdd); setShowAdd(false) }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-medium rounded-lg transition"
            >
              ⚡ Carga Masiva (Excel)
            </button>
            <button
              onClick={() => { setShowAdd(!showAdd); setShowMassiveAdd(false) }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition"
            >
              + Agregar Hito
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg px-4 py-3">
          <p className="text-xs text-slate-500">Total</p>
          <p className="text-xl font-bold text-slate-900">{hitos.length}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
          <p className="text-xs text-emerald-600 font-semibold">Completados</p>
          <p className="text-xl font-bold text-emerald-700">{completados}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <p className="text-xs text-amber-600 font-semibold">En Riesgo</p>
          <p className="text-xl font-bold text-amber-700">{enRiesgo}</p>
        </div>
        {hitos.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-xs text-blue-600 font-semibold">Avance General</p>
            <p className="text-xl font-bold text-blue-700">{Math.round((completados / hitos.length) * 100)}%</p>
          </div>
        )}
      </div>

      {/* Add Hito Form */}
      {showAdd && (
        <div className="bg-white border border-blue-200 shadow-sm rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-blue-700">Nuevo Hito</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-600 font-medium block mb-1">Gate</label>
              <select
                value={newHito.gate}
                onChange={e => setNewHito(n => ({ ...n, gate: e.target.value as Gate }))}
                className={sClass}
              >
                {GATES_ORDER.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600 font-medium block mb-1">Responsable</label>
              <input value={newHito.responsable_texto} onChange={e => setNewHito(n => ({ ...n, responsable_texto: e.target.value }))}
                placeholder="Nombre responsable" className={iClass} />
            </div>
            <div>
              <label className="text-xs text-slate-600 font-medium block mb-1">F. Inicio</label>
              <input type="date" value={newHito.fecha_inicio_plan} onChange={e => setNewHito(n => ({ ...n, fecha_inicio_plan: e.target.value }))} className={iClass} />
            </div>
            <div>
              <label className="text-xs text-slate-600 font-medium block mb-1">F. Fin</label>
              <input type="date" value={newHito.fecha_fin_plan} onChange={e => setNewHito(n => ({ ...n, fecha_fin_plan: e.target.value }))} className={iClass} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-600 font-medium block mb-1">Descripción *</label>
            <input
              value={newHito.descripcion}
              onChange={e => setNewHito(n => ({ ...n, descripcion: e.target.value }))}
              placeholder="Describe la actividad o entregable del hito..."
              className={`${iClass} w-full`}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={newHito.es_money_step}
                onChange={e => setNewHito(n => ({ ...n, es_money_step: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600"
              />
              💰 Money Step (inicio captura de valor)
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={addHito} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
              Guardar Hito
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-medium rounded-lg transition">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Mass Add Form */}
      {showMassiveAdd && (
        <div className="bg-slate-50 border border-emerald-200 shadow-sm rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-emerald-700">⚡ Carga Masiva desde Excel</h3>
          <p className="text-xs text-slate-600">
            Copia filas directamente desde Excel con las siguientes columnas en este orden exacto:<br/>
            <strong className="text-slate-800">Gate | Descripción | Responsable | Fecha Inicio | Fecha Fin</strong>
          </p>
          <textarea
            value={massiveInput}
            onChange={e => handleMassiveParse(e.target.value)}
            placeholder="Pega aquí (Ctrl+V) las celdas directamente desde Excel..."
            className="w-full h-32 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          
          {parsedHitos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-emerald-700">Vista Previa ({parsedHitos.length} hitos detectados):</p>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-semibold text-slate-700">Gate</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-slate-700">Descripción</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-slate-700">Responsable</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-slate-700">F. Inicio</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-slate-700">F. Fin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedHitos.map((h, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-2 py-1.5 font-bold text-slate-800">{h.gate}</td>
                        <td className="px-2 py-1.5 text-slate-800 truncate max-w-[200px]" title={h.descripcion}>{h.descripcion}</td>
                        <td className="px-2 py-1.5 text-slate-500">{h.responsable_texto || '-'}</td>
                        <td className="px-2 py-1.5 text-slate-500">{h.fecha_inicio_plan || '-'}</td>
                        <td className="px-2 py-1.5 text-slate-500">{h.fecha_fin_plan || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button 
              disabled={parsedHitos.length === 0 || saving === 'massive'}
              onClick={saveMassive} 
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
            >
              {saving === 'massive' ? 'Guardando...' : `Guardar ${parsedHitos.length} Hitos`}
            </button>
            <button onClick={() => { setShowMassiveAdd(false); setMassiveInput(''); setParsedHitos([]) }} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-medium rounded-lg transition">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Hitos por Gate */}
      {GATES_ORDER.map(gate => {
        const gateHitos = hitos.filter(h => h.gate === gate)
        if (gateHitos.length === 0) return null
        return (
          <div key={gate} className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <div className={`px-5 py-3 border-b border-slate-200 flex items-center justify-between ${GATE_COLORS[gate]} bg-opacity-10 text-slate-900`}>
              <span className="text-sm font-bold">{gate}</span>
              <span className="text-xs font-medium text-slate-600">{gateHitos.filter(h => h.completado).length}/{gateHitos.length} completados</span>
            </div>
            <div className="divide-y divide-slate-100">
              {gateHitos.map(hito => (
                <HitoRow
                  key={hito.id}
                  hito={hito}
                  saving={saving === hito.id}
                  editing={editingId === hito.id}
                  onToggleEdit={() => setEditingId(editingId === hito.id ? null : hito.id)}
                  onUpdate={(field, value) => updateHito(hito.id, field, value)}
                  onDelete={() => deleteHito(hito.id)}
                />
              ))}
            </div>
          </div>
        )
      })}

      {hitos.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <p className="text-3xl mb-3">📋</p>
          <p className="font-medium text-slate-400">Sin hitos registrados</p>
          <p className="text-sm mt-1">Agrega el primer hito del plan master</p>
        </div>
      )}
    </div>
  )
}

function HitoRow({ hito, saving, editing, onToggleEdit, onUpdate, onDelete }: {
  hito: Hito; saving: boolean; editing: boolean
  onToggleEdit: () => void; onUpdate: (field: string, value: unknown) => void; onDelete: () => void
}) {
  const statusColors: Record<string, string> = {
    Completado: 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full', 
    'En Ejecución': 'text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full',
    'Fuera de Fecha': 'text-red-600 bg-red-50 px-2 py-0.5 rounded-full', 
    'En Riesgo': 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full', 
    Pendiente: 'text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full',
  }

  return (
    <div className={`p-4 hover:bg-slate-50 transition-colors ${hito.en_riesgo ? 'bg-amber-50/50' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Checkbox completado */}
        <button
          onClick={() => onUpdate('completado', !hito.completado)}
          className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition
            ${hito.completado ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-400 bg-white'}`}
        >
          {hito.completado && <span className="text-white text-xs">✓</span>}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 font-mono font-medium">#{hito.numero}</span>
                {hito.es_money_step && <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-md">💰 Money Step</span>}
                {hito.en_riesgo && <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-md">⚠ En Riesgo</span>}
              </div>
              <p className={`text-sm font-semibold mt-1 ${hito.completado ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                {hito.descripcion}
              </p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {hito.responsable_texto && (
                  <span className="text-xs text-slate-600 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    {hito.responsable_texto}
                  </span>
                )}
                {(hito.fecha_inicio_plan || hito.fecha_fin_plan) && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {hito.fecha_inicio_plan ? new Date(hito.fecha_inicio_plan).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : '?'}
                    {' → '}
                    {hito.fecha_fin_plan ? new Date(hito.fecha_fin_plan).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : '?'}
                  </span>
                )}
                <span className={`text-[11px] font-bold tracking-wide uppercase ${statusColors[hito.estatus] ?? statusColors.Pendiente}`}>
                  {hito.estatus}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {saving && <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />}
              <button onClick={onToggleEdit} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Expanded edit */}
          {editing && (
            <div className="mt-3 grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <label className="text-xs text-slate-600 font-medium block mb-1">Estatus</label>
                <select value={hito.estatus} onChange={e => onUpdate('estatus', e.target.value)} className={`${sClass} w-full`}>
                  {ESTATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600 font-medium block mb-1">Avance %</label>
                <input type="number" min={0} max={100} value={hito.avance_pct}
                  onChange={e => onUpdate('avance_pct', parseInt(e.target.value))}
                  className={iClass} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-600 font-medium block mb-1">Causa del semáforo / Acción</label>
                <input value={hito.causa_semaforo ?? ''} onChange={e => onUpdate('causa_semaforo', e.target.value)}
                  placeholder="¿Por qué está en este estado?" className={`${iClass} w-full`} />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mt-1">
                  <input type="checkbox" checked={hito.en_riesgo} onChange={e => onUpdate('en_riesgo', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500" />
                  Marcar En Riesgo
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const iClass = 'px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition'
const sClass = 'px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition'
