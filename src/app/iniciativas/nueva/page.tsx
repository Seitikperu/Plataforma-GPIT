'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Gate } from '@/types'

const GATES: Gate[] = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5']
const TIPOS = ['Generación de Valor', 'Gestión', 'Sostenibilidad', 'Quick Win']
const ORIGENES = ['Cliente', 'Corporativo', 'Proyecto', 'Interno']
const CATEGORIAS = ['Costo', 'Top 15', 'Gestión', 'Sostenibilidad']
const DIMENSIONES = ['Generación de Valor', 'Gestión', 'Sostenibilidad']

interface Unidad { id: string; nombre: string; codigo: string }
interface Area { id: string; nombre: string; unidad_id: string }
interface Perfil { id: string; nombre: string; apellido: string }

export default function NuevaIniciativaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [filteredAreas, setFilteredAreas] = useState<Area[]>([])

  const [form, setForm] = useState({
    codigo: '',
    titulo: '',
    contexto: '',
    objetivo: '',
    riesgos: '',
    unidad_id: '',
    area_id: '',
    gate_actual: 'L0' as Gate,
    tipo_iniciativa: '',
    categoria_general: '',
    origen: '',
    dimension_aspiracion: '',
    lider_id: '',
    lider_texto: '',
    kpi_unidad: '',
    kpi_base: '',
    kpi_plan: '',
    plan_anual_m: '',
    incluido_presupuesto: false,
    fecha_proximo_gate: '',
    proximos_pasos: '',
  })

  useEffect(() => {
    async function load() {
      const [{ data: u }, { data: a }, { data: p }] = await Promise.all([
        supabase.from('unidades').select('id, nombre, codigo').eq('activo', true),
        supabase.from('areas').select('id, nombre, unidad_id').eq('activo', true),
        supabase.from('perfiles').select('id, nombre, apellido').eq('activo', true).order('nombre'),
      ])
      setUnidades(u ?? [])
      setAreas(a ?? [])
      setPerfiles(p ?? [])
    }
    load()
  }, [supabase])

  const handleUnidadChange = (unidadId: string) => {
    setForm(f => ({ ...f, unidad_id: unidadId, area_id: '' }))
    setFilteredAreas(areas.filter(a => a.unidad_id === unidadId))
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.codigo || !form.titulo || !form.unidad_id) {
      setError('Código, título y unidad son obligatorios.')
      return
    }
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      ...form,
      plan_anual_m: form.plan_anual_m ? parseFloat(form.plan_anual_m) : 0,
      kpi_base: form.kpi_base ? parseFloat(form.kpi_base) : null,
      kpi_plan: form.kpi_plan ? parseFloat(form.kpi_plan) : null,
      area_id: form.area_id || null,
      lider_id: form.lider_id || null,
      tipo_iniciativa: form.tipo_iniciativa || null,
      categoria_general: form.categoria_general || null,
      origen: form.origen || null,
      dimension_aspiracion: form.dimension_aspiracion || null,
      fecha_proximo_gate: form.fecha_proximo_gate || null,
      created_by: user?.id,
    }

    const { data, error: err } = await supabase.from('iniciativas').insert(payload).select().single()
    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      router.push(`/iniciativas/${data.id}`)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-4 transition">
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Nueva Iniciativa</h1>
        <p className="text-slate-600 text-sm mt-1 mb-2">Completa la información básica para registrar la iniciativa en el funnel GPIT</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identificación */}
        <Section title="Identificación">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Código *" required>
              <Input placeholder="SR-Mina-001" value={form.codigo} onChange={set('codigo')} />
            </Field>
            <Field label="Gate inicial">
              <Select value={form.gate_actual} onChange={set('gate_actual')}>
                {GATES.map(g => <option key={g} value={g}>{g}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Título de la Iniciativa *" required>
            <Input placeholder="AESA - Descripción breve de la iniciativa" value={form.titulo} onChange={set('titulo')} />
          </Field>
        </Section>

        {/* Clasificación */}
        <Section title="Clasificación">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Unidad *" required>
              <select
                value={form.unidad_id}
                onChange={e => handleUnidadChange(e.target.value)}
                className={selectClass}
                required
              >
                <option value="">Seleccionar...</option>
                {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </Field>
            <Field label="Área">
              <Select value={form.area_id} onChange={set('area_id')} disabled={!form.unidad_id}>
                <option value="">Seleccionar área...</option>
                {filteredAreas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </Select>
            </Field>
            <Field label="Tipo de Iniciativa">
              <Select value={form.tipo_iniciativa} onChange={set('tipo_iniciativa')}>
                <option value="">Seleccionar...</option>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Categoría General">
              <Select value={form.categoria_general} onChange={set('categoria_general')}>
                <option value="">Seleccionar...</option>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Origen">
              <Select value={form.origen} onChange={set('origen')}>
                <option value="">Seleccionar...</option>
                {ORIGENES.map(o => <option key={o} value={o}>{o}</option>)}
              </Select>
            </Field>
            <Field label="Dimensión de la Aspiración">
              <Select value={form.dimension_aspiracion} onChange={set('dimension_aspiracion')}>
                <option value="">Seleccionar...</option>
                {DIMENSIONES.map(d => <option key={d} value={d}>{d}</option>)}
              </Select>
            </Field>
          </div>
        </Section>

        {/* Responsables */}
        <Section title="Responsables">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Líder (sistema)">
              <Select value={form.lider_id} onChange={set('lider_id')}>
                <option value="">Seleccionar usuario...</option>
                {perfiles.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
              </Select>
            </Field>
            <Field label="Líder (texto libre)">
              <Input placeholder="Ej: Franklin T. / Eder V." value={form.lider_texto} onChange={set('lider_texto')} />
            </Field>
          </div>
        </Section>

        {/* Impacto */}
        <Section title="Impacto Financiero">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Plan Año Actual (M$)">
              <Input type="number" step="0.001" placeholder="0.000" value={form.plan_anual_m} onChange={set('plan_anual_m')} />
            </Field>
            <div className="flex items-center gap-3 mt-6">
              <input
                type="checkbox"
                id="presupuesto"
                checked={form.incluido_presupuesto}
                onChange={e => setForm(f => ({ ...f, incluido_presupuesto: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 bg-slate-100 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="presupuesto" className="text-sm font-medium text-slate-700">Incluido en presupuesto</label>
            </div>
          </div>
        </Section>

        {/* KPI Principal */}
        <Section title="KPI Principal">
          <div className="grid grid-cols-3 gap-4">
            <Field label="KPI (descripción)">
              <Input placeholder="Ej: $/Pza, Headcount, # Equipos" value={form.kpi_unidad} onChange={set('kpi_unidad')} />
            </Field>
            <Field label="Línea Base">
              <Input type="number" step="0.01" placeholder="0.00" value={form.kpi_base} onChange={set('kpi_base')} />
            </Field>
            <Field label="Meta / Plan">
              <Input type="number" step="0.01" placeholder="0.00" value={form.kpi_plan} onChange={set('kpi_plan')} />
            </Field>
          </div>
        </Section>

        {/* Descripción */}
        <Section title="Descripción">
          <Field label="Contexto">
            <textarea
              rows={3}
              placeholder="Situación actual y oportunidad identificada..."
              value={form.contexto}
              onChange={set('contexto')}
              className={`${inputClass} resize-none`}
            />
          </Field>
          <Field label="Objetivo">
            <textarea
              rows={2}
              placeholder="¿Qué se busca lograr con esta iniciativa?"
              value={form.objetivo}
              onChange={set('objetivo')}
              className={`${inputClass} resize-none`}
            />
          </Field>
          <Field label="Riesgos / Premisas">
            <textarea
              rows={2}
              placeholder="Riesgos identificados y premisas del análisis..."
              value={form.riesgos}
              onChange={set('riesgos')}
              className={`${inputClass} resize-none`}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha Próximo Gate">
              <Input type="date" value={form.fecha_proximo_gate} onChange={set('fecha_proximo_gate')} />
            </Field>
          </div>
          <Field label="Próximos Pasos">
            <textarea
              rows={2}
              placeholder="Acciones inmediatas y pendientes..."
              value={form.proximos_pasos}
              onChange={set('proximos_pasos')}
              className={`${inputClass} resize-none`}
            />
          </Field>
        </Section>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
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
            {loading ? 'Guardando...' : 'Crear Iniciativa'}
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
