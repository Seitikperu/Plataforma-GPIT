import { createClient } from '@/lib/supabase/server'
import type { FiltrosIniciativas, Iniciativa, ResumenUnidad, FunnelGates } from '@/types'

// ─────────────────────────────────────────
// INICIATIVAS
// ─────────────────────────────────────────

export async function getIniciativas(filtros: FiltrosIniciativas = {}) {
  const supabase = await createClient()

  let query = supabase
    .from('iniciativas')
    .select(`
      *,
      unidad:unidades(id, nombre, codigo),
      area:areas(id, nombre, codigo),
      lider:perfiles!lider_id(id, nombre, apellido, email, cargo)
    `)
    .order('orden', { ascending: true })

  if (filtros.unidad_id) query = query.eq('unidad_id', filtros.unidad_id)
  if (filtros.area_id) query = query.eq('area_id', filtros.area_id)
  if (filtros.gate) query = query.eq('gate_actual', filtros.gate)
  if (filtros.estado) query = query.eq('estado', filtros.estado)
  if (filtros.origen) query = query.eq('origen', filtros.origen)
  if (filtros.tipo_iniciativa) query = query.eq('tipo_iniciativa', filtros.tipo_iniciativa)
  if (filtros.lider_id) query = query.eq('lider_id', filtros.lider_id)
  if (filtros.estatus_semaforo) query = query.eq('estatus_semaforo', filtros.estatus_semaforo)
  if (filtros.busqueda) {
    query = query.or(`titulo.ilike.%${filtros.busqueda}%,codigo.ilike.%${filtros.busqueda}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Iniciativa[]
}

export async function getIniciativaById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('iniciativas')
    .select(`
      *,
      unidad:unidades(id, nombre, codigo),
      area:areas(id, nombre, codigo),
      sub_proceso:sub_procesos(id, nombre),
      lider:perfiles!lider_id(id, nombre, apellido, email, cargo, avatar_url),
      sponsor:perfiles!sponsor_id(id, nombre, apellido, email),
      hitos(*, responsable:perfiles(id, nombre, apellido)),
      kpi_mensual(*),
      actualizaciones(*, autor:perfiles(id, nombre, apellido, avatar_url))
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Iniciativa
}

export async function getIniciativaByCode(codigo: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('iniciativas')
    .select(`*, unidad:unidades(id, nombre), area:areas(id, nombre), lider:perfiles!lider_id(id, nombre, apellido)`)
    .eq('codigo', codigo)
    .single()
  if (error) throw error
  return data as Iniciativa
}

export async function createIniciativa(payload: Partial<Iniciativa>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('iniciativas')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as Iniciativa
}

export async function updateIniciativa(id: string, payload: Partial<Iniciativa>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('iniciativas')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Iniciativa
}

export async function advanceGate(id: string, nuevoGate: string, autorId: string) {
  const supabase = await createClient()

  // Obtener gate actual
  const { data: ini } = await supabase
    .from('iniciativas')
    .select('gate_actual')
    .eq('id', id)
    .single()

  // Actualizar gate
  const { data, error } = await supabase
    .from('iniciativas')
    .update({ gate_actual: nuevoGate })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  // Registrar en bitácora
  await supabase.from('actualizaciones').insert({
    iniciativa_id: id,
    autor_id: autorId,
    tipo: 'cambio_gate',
    contenido: `Iniciativa avanzó de ${ini?.gate_actual} a ${nuevoGate}`,
    gate_anterior: ini?.gate_actual,
    gate_nuevo: nuevoGate,
  })

  return data as Iniciativa
}

// ─────────────────────────────────────────
// HITOS
// ─────────────────────────────────────────

export async function getHitosByIniciativa(iniciativaId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hitos')
    .select(`*, responsable:perfiles(id, nombre, apellido)`)
    .eq('iniciativa_id', iniciativaId)
    .order('numero', { ascending: true })
  if (error) throw error
  return data
}

export async function updateHito(id: string, payload: object) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hitos')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─────────────────────────────────────────
// KPI MENSUAL
// ─────────────────────────────────────────

export async function getKpiMensual(iniciativaId: string, anio: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('kpi_mensual')
    .select('*')
    .eq('iniciativa_id', iniciativaId)
    .eq('anio', anio)
    .order('mes', { ascending: true })
  if (error) throw error
  return data
}

export async function upsertKpiMensual(
  iniciativaId: string,
  anio: number,
  mes: number,
  valores: { kpi_plan?: number; kpi_real?: number; ebitda_plan_k?: number; ebitda_real_k?: number }
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('kpi_mensual')
    .upsert({ iniciativa_id: iniciativaId, anio, mes, ...valores }, { onConflict: 'iniciativa_id,anio,mes' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ─────────────────────────────────────────
// DASHBOARD / VISTAS
// ─────────────────────────────────────────

export async function getResumenUnidades() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('v_resumen_unidad').select('*')
  if (error) throw error
  return data as ResumenUnidad[]
}

export async function getFunnelGates(unidadId?: string) {
  const supabase = await createClient()
  let query = supabase.from('v_funnel_gates').select('*')
  if (unidadId) {
    // Filtrar por nombre de unidad (la vista no expone id directamente)
    const { data: unidad } = await supabase
      .from('unidades')
      .select('nombre')
      .eq('id', unidadId)
      .single()
    if (unidad) query = query.eq('unidad', unidad.nombre)
  }
  const { data, error } = await query
  if (error) throw error
  return data as FunnelGates[]
}

export async function getIniciativasPorSemaforo(unidadId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('iniciativas')
    .select('estatus_semaforo, gate_actual, codigo, titulo, lider:perfiles!lider_id(nombre, apellido)')
    .eq('estado', 'Activa')
  if (unidadId) query = query.eq('unidad_id', unidadId)
  const { data, error } = await query
  if (error) throw error
  return data
}

// ─────────────────────────────────────────
// ACTUALIZACIONES / BITÁCORA
// ─────────────────────────────────────────

export async function addActualizacion(
  iniciativaId: string,
  autorId: string,
  tipo: string,
  contenido: string,
  extras?: object
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('actualizaciones')
    .insert({ iniciativa_id: iniciativaId, autor_id: autorId, tipo, contenido, ...extras })
    .select()
    .single()
  if (error) throw error
  return data
}

// ─────────────────────────────────────────
// CATÁLOGOS
// ─────────────────────────────────────────

export async function getUnidades() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('unidades')
    .select('*, empresa:empresas(id, nombre, codigo)')
    .eq('activo', true)
    .order('nombre')
  if (error) throw error
  return data
}

export async function getAreas(unidadId?: string) {
  const supabase = await createClient()
  let query = supabase.from('areas').select('*').eq('activo', true).order('nombre')
  if (unidadId) query = query.eq('unidad_id', unidadId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getPerfiles(unidadId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('perfiles')
    .select('*')
    .eq('activo', true)
    .order('nombre')
  if (unidadId) {
    query = query.contains('unidades_acceso', [unidadId])
  }
  const { data, error } = await query
  if (error) throw error
  return data
}
