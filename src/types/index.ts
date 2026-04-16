// ============================================================
// GPIT Platform - Tipos TypeScript
// ============================================================

export type Gate = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5'
export type EstadoIniciativa = 'Activa' | 'Descartada' | 'Completada' | 'En Pausa'
export type EstatusSemaforo = 1 | 2 | 3 // 1=Verde, 2=Amarillo, 3=Rojo
export type RolUsuario = 'admin' | 'lider' | 'ejecutor' | 'viewer'
export type TipoIniciativa = 'Generación de Valor' | 'Gestión' | 'Sostenibilidad' | 'Quick Win'
export type OrigenIniciativa = 'Cliente' | 'Corporativo' | 'Proyecto' | 'Interno'
export type DimensionAspiracion = 'Generación de Valor' | 'Gestión' | 'Sostenibilidad'
export type EstatusHito = 'Pendiente' | 'En Ejecución' | 'Completado' | 'Fuera de Fecha' | 'En Riesgo'
export type TipoActualizacion = 'comentario' | 'cambio_gate' | 'cambio_estado' | 'alerta' | 'avance'

// ============================================================
// ENTIDADES BASE
// ============================================================

export interface Empresa {
  id: string
  nombre: string
  codigo: string
  descripcion?: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Unidad {
  id: string
  empresa_id: string
  nombre: string
  codigo: string
  descripcion?: string
  activo: boolean
  created_at: string
  updated_at: string
  empresa?: Empresa
}

export interface Area {
  id: string
  unidad_id: string
  nombre: string
  codigo: string
  activo: boolean
  created_at: string
  unidad?: Unidad
}

export interface SubProceso {
  id: string
  area_id: string
  nombre: string
  activo: boolean
  created_at: string
  area?: Area
}

export interface Perfil {
  id: string
  empresa_id?: string
  nombre: string
  apellido: string
  email: string
  rol: RolUsuario
  cargo?: string
  unidades_acceso: string[]
  activo: boolean
  avatar_url?: string
  created_at: string
  updated_at: string
  empresa?: Empresa
  nombre_completo?: string // virtual
}

// ============================================================
// INICIATIVA
// ============================================================

export interface Iniciativa {
  id: string
  codigo: string
  orden?: number
  titulo: string
  descripcion?: string
  contexto?: string
  objetivo?: string

  // Clasificación
  unidad_id: string
  area_id?: string
  sub_proceso_id?: string

  // Gate y estado
  gate_actual: Gate
  estado: EstadoIniciativa
  estatus_semaforo: EstatusSemaforo

  // Tipo y categoría
  tipo_iniciativa?: TipoIniciativa
  categoria_general?: string
  categoria_1?: string
  categoria_2?: string
  categoria_3?: string
  origen?: OrigenIniciativa

  // Palanca estratégica
  enfoque_estrategico?: string
  enfoque_nivel_1?: string
  enfoque_nivel_2?: string
  dimension_aspiracion?: DimensionAspiracion

  // Impacto financiero
  incluido_presupuesto: boolean
  plan_anual_m: number
  plan_acumulado_m: number
  real_acumulado_m: number

  // KPI Principal
  kpi_unidad?: string
  kpi_base?: number
  kpi_plan?: number

  // Responsables
  lider_id?: string
  sponsor_id?: string
  promotor_id?: string
  ejecutor_id?: string
  lider_texto?: string

  // Evaluación económica
  npv_k?: number
  tir_pct?: number
  payback_anios?: number
  costo_implementacion_k?: number
  ebitda_anio_actual_k?: number
  ebitda_anualizado_k?: number

  // Riesgos
  riesgos?: string
  premisas?: string

  // Avance
  avance_plan_pct: number
  avance_real_pct: number
  spi?: number
  proximos_pasos?: string
  solicitud_apoyo?: string

  // Fechas
  fecha_proximo_gate?: string
  fecha_l0?: string
  fecha_l1?: string
  fecha_l2?: string
  fecha_l3?: string
  fecha_l4?: string
  fecha_l5?: string
  fecha_creacion: string

  // Auditoría
  created_by?: string
  updated_by?: string
  created_at: string
  updated_at: string

  // Relaciones (joins)
  unidad?: Unidad
  area?: Area
  sub_proceso?: SubProceso
  lider?: Perfil
  hitos?: Hito[]
  kpi_mensual?: KpiMensual[]
  actualizaciones?: Actualizacion[]
}

// ============================================================
// HITO
// ============================================================

export interface Hito {
  id: string
  iniciativa_id: string
  numero: number
  gate: Gate
  descripcion: string
  responsable_id?: string
  responsable_texto?: string
  fecha_inicio_plan?: string
  fecha_fin_plan?: string
  fecha_inicio_real?: string
  fecha_fin_real?: string
  estatus: EstatusHito
  completado: boolean
  en_riesgo: boolean
  es_money_step: boolean
  avance_pct: number
  causa_semaforo?: string
  accion_semana?: string
  created_at: string
  updated_at: string
  responsable?: Perfil
}

// ============================================================
// KPI MENSUAL
// ============================================================

export interface KpiMensual {
  id: string
  iniciativa_id: string
  anio: number
  mes: number
  kpi_plan?: number
  kpi_real?: number
  ebitda_plan_k?: number
  ebitda_real_k?: number
  created_at: string
  updated_at: string
}

// ============================================================
// ACTUALIZACIÓN / BITÁCORA
// ============================================================

export interface Actualizacion {
  id: string
  iniciativa_id: string
  autor_id?: string
  tipo: TipoActualizacion
  contenido: string
  gate_anterior?: Gate
  gate_nuevo?: Gate
  estado_anterior?: EstadoIniciativa
  estado_nuevo?: EstadoIniciativa
  created_at: string
  autor?: Perfil
}

// ============================================================
// SESIÓN GPIT
// ============================================================

export interface SesionGpit {
  id: string
  unidad_id: string
  titulo: string
  fecha: string
  tipo: 'Semanal' | 'Quincenal' | 'Mensual' | 'Especial'
  facilitador_id?: string
  participantes?: string[]
  notas?: string
  created_at: string
  unidad?: Unidad
  facilitador?: Perfil
}

// ============================================================
// VISTAS / TIPOS DE DASHBOARD
// ============================================================

export interface ResumenUnidad {
  unidad: string
  iniciativas_activas: number
  en_captura_valor: number
  completadas: number
  descartadas: number
  semaforo_rojo: number
  semaforo_amarillo: number
  semaforo_verde: number
  plan_total_m: number
  real_total_m: number
}

export interface FunnelGates {
  unidad: string
  gate_actual: Gate
  cantidad: number
  impacto_total_m: number
}

// ============================================================
// FILTROS
// ============================================================

export interface FiltrosIniciativas {
  unidad_id?: string
  area_id?: string
  gate?: Gate | ''
  estado?: EstadoIniciativa | ''
  origen?: OrigenIniciativa | ''
  tipo_iniciativa?: TipoIniciativa | ''
  lider_id?: string
  estatus_semaforo?: EstatusSemaforo | ''
  busqueda?: string
  anio?: number
}

// ============================================================
// CONSTANTES DE DISPLAY
// ============================================================

export const GATE_LABELS: Record<Gate, string> = {
  L0: 'L0 - Idea',
  L1: 'L1 - Ficha',
  L2: 'L2 - Caso de Negocio',
  L3: 'L3 - Plan Master',
  L4: 'L4 - Captura de Valor',
  L5: 'L5 - Impacto Sostenido',
}

export const GATE_COLORS: Record<Gate, string> = {
  L0: 'bg-slate-100 text-slate-700',
  L1: 'bg-blue-100 text-blue-700',
  L2: 'bg-indigo-100 text-indigo-700',
  L3: 'bg-amber-100 text-amber-700',
  L4: 'bg-emerald-100 text-emerald-700',
  L5: 'bg-green-100 text-green-800',
}

export const SEMAFORO_COLORS: Record<EstatusSemaforo, string> = {
  1: 'text-emerald-500',
  2: 'text-amber-500',
  3: 'text-red-500',
}

export const SEMAFORO_LABELS: Record<EstatusSemaforo, string> = {
  1: 'Verde',
  2: 'Amarillo',
  3: 'Rojo',
}

export const ROL_LABELS: Record<RolUsuario, string> = {
  admin: 'Administrador',
  lider: 'Líder de Iniciativa',
  ejecutor: 'Ejecutor',
  viewer: 'Solo lectura',
}

export const GATES_ORDER: Gate[] = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5']
