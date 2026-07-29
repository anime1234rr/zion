import { supabase } from '@/lib/supabase'

export interface PlantillaServidor {
  id: string
  nombre: string
  descripcion: string | null
}

export interface PlantillaCanalPreview {
  nombre: string
  tipo: string
}

export interface PlantillaRolPreview {
  nombre: string
  esRolBase: boolean
  permisos: Record<string, boolean>
}

export interface PlantillaServidorDetalle extends PlantillaServidor {
  canales: PlantillaCanalPreview[]
  roles: PlantillaRolPreview[]
}

interface PlantillaRow {
  id: string
  nombre_plantilla: string
  descripcion: string | null
}

interface PlantillaDetalleRow extends PlantillaRow {
  canales_iniciales: PlantillaCanalPreview[]
  roles_iniciales: { nombre: string; es_rol_base?: boolean; permisos?: Record<string, boolean> }[]
}

export async function listarPlantillas(): Promise<PlantillaServidor[]> {
  const { data, error } = await supabase
    .from('plantillas_servidor')
    .select('id, nombre_plantilla, descripcion')
    .order('creado_at', { ascending: true })
    .returns<PlantillaRow[]>()

  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre_plantilla,
    descripcion: row.descripcion,
  }))
}

export async function listarPlantillasConDetalle(): Promise<
  PlantillaServidorDetalle[]
> {
  const { data, error } = await supabase
    .from('plantillas_servidor')
    .select('id, nombre_plantilla, descripcion, canales_iniciales, roles_iniciales')
    .order('creado_at', { ascending: true })
    .returns<PlantillaDetalleRow[]>()

  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre_plantilla,
    descripcion: row.descripcion,
    canales: row.canales_iniciales ?? [],
    roles: (row.roles_iniciales ?? []).map((rol) => ({
      nombre: rol.nombre,
      esRolBase: rol.es_rol_base ?? false,
      permisos: rol.permisos ?? {},
    })),
  }))
}
