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
        <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1 mb-4 transition">
          ← Volver a iniciativa
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Plan Master de Hitos</h1>
            {iniciativa && (
              <p className="text-slate-400 text-sm mt-1">
                <span className="font-mono text-blue-400">{iniciativa.codigo}</span> · {iniciativa.titulo}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition"
          >
            + Agregar Hito
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3">
          <p className="text-xs text-slate-500">Total</p>
          <p className="text-xl font-bold text-white">{hitos.length}</p>
        </div>
        <div className="bg-emerald-900/30 border border-emerald-700/30 rounded-lg px-4 py-3">
          <p className="text-xs text-emerald-500">Completados</p>
          <p className="text-xl font-bold text-emerald-400">{completados}</p>
        </div>
        <div className="bg-amber-900/30 border border-amber-700/30 rounded-lg px-4 py-3">
          <p className="text-xs text-amber-500">En Riesgo</p>
          <p className="text-xl font-bold text-amber-400">{enRiesgo}</p>
        </div>
        {hitos.length > 0 && (
          <div className="bg-blue-900/30 border border-blue-700/30 rounded-lg px-4 py-3">
            <p className="text-xs text-blue-500">Avance General</p>
            <p className="text-xl font-bold text-blue-400">{Math.round((completados / hitos.length) * 100)}%</p>
          </div>
        )}
      </div>

      {/* Add Hito Form */}
      {showAdd && (
        <div className="bg-slate-800/70 border border-blue-500/30 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-blue-400">Nuevo Hito</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Gate</label>
              <select
                value={newHito.gate}
                onChange={e => setNewHito(n => ({ ...n, gate: e.target.value as Gate }))}
                className={sClass}
              >
                {GATES_ORDER.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Responsable</label>
              <input value={newHito.responsable_texto} onChange={e => setNewHito(n => ({ ...n, responsable_texto: e.target.value }))}
                placeholder="Nombre responsable" className={iClass} />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">F. Inicio</label>
              <input type="date" value={newHito.fecha_inicio_plan} onChange={e => setNewHito(n => ({ ...n, fecha_inicio_plan: e.target.value }))} className={iClass} />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">F. Fin</label>
              <input type="date" value={newHito.fecha_fin_plan} onChange={e => setNewHito(n => ({ ...n, fecha_fin_plan: e.target.value }))} className={iClass} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Descripción *</label>
            <input
              value={newHito.descripcion}
              onChange={e => setNewHito(n => ({ ...n, descripcion: e.target.value }))}
              placeholder="Describe la actividad o entregable del hito..."
              className={`${iClass} w-full`}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={newHito.es_money_step}
                onChange={e => setNewHito(n => ({ ...n, es_money_step: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500"
              />
              💰 Money Step (inicio captura de valor)
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={addHito} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition">
              Guardar Hito
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition">
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
          <div key={gate} className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className={`px-5 py-3 border-b border-slate-700/50 flex items-center justify-between ${GATE_COLORS[gate]} bg-opacity-20`}>
              <span className="text-sm font-bold">{gate}</span>
              <span className="text-xs">{gateHitos.filter(h => h.completado).length}/{gateHitos.length} completados</span>
            </div>
            <div className="divide-y divide-slate-700/30">
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
    Completado: 'text-emerald-400', 'En Ejecución': 'text-blue-400',
    'Fuera de Fecha': 'text-red-400', 'En Riesgo': 'text-amber-400', Pendiente: 'text-slate-500',
  }

  return (
    <div className={`p-4 ${hito.en_riesgo ? 'bg-amber-900/10' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Checkbox completado */}
        <button
          onClick={() => onUpdate('completado', !hito.completado)}
          className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition
            ${hito.completado ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500 hover:border-emerald-400'}`}
        >
          {hito.completado && <span className="text-white text-xs">✓</span>}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 font-mono">#{hito.numero}</span>
                {hito.es_money_step && <span className="text-xs text-emerald-400 font-medium">💰 Money Step</span>}
                {hito.en_riesgo && <span className="text-xs text-amber-400">⚠ En Riesgo</span>}
              </div>
              <p className={`text-sm font-medium mt-0.5 ${hito.completado ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                {hito.descripcion}
              </p>
              <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                {hito.responsable_texto && (
                  <span className="text-xs text-slate-500">👤 {hito.responsable_texto}</span>
                )}
                {(hito.fecha_inicio_plan || hito.fecha_fin_plan) && (
                  <span className="text-xs text-slate-500">
                    📅 {hito.fecha_inicio_plan ? new Date(hito.fecha_inicio_plan).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : '?'}
                    {' → '}
                    {hito.fecha_fin_plan ? new Date(hito.fecha_fin_plan).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : '?'}
                  </span>
                )}
                <span className={`text-xs font-medium ${statusColors[hito.estatus] ?? statusColors.Pendiente}`}>
                  ● {hito.estatus}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {saving && <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />}
              <button onClick={onToggleEdit} className="p-1.5 text-slate-500 hover:text-slate-200 transition">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button onClick={onDelete} className="p-1.5 text-slate-600 hover:text-red-400 transition">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Expanded edit */}
          {editing && (
            <div className="mt-3 grid grid-cols-2 gap-3 p-3 bg-slate-900/40 rounded-lg border border-slate-700/40">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Estatus</label>
                <select value={hito.estatus} onChange={e => onUpdate('estatus', e.target.value)} className={`${sClass} w-full`}>
                  {ESTATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Avance %</label>
                <input type="number" min={0} max={100} value={hito.avance_pct}
                  onChange={e => onUpdate('avance_pct', parseInt(e.target.value))}
                  className={iClass} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500 block mb-1">Causa del semáforo / Acción</label>
                <input value={hito.causa_semaforo ?? ''} onChange={e => onUpdate('causa_semaforo', e.target.value)}
                  placeholder="¿Por qué está en este estado?" className={`${iClass} w-full`} />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer mt-1">
                  <input type="checkbox" checked={hito.en_riesgo} onChange={e => onUpdate('en_riesgo', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600" />
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

const iClass = 'px-3 py-1.5 bg-slate-900/60 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition'
const sClass = 'px-2 py-1.5 bg-slate-900/60 border border-slate-600 rounded-lg text-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition'
