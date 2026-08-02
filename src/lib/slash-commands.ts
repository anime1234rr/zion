import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, Ban, Clock, Eraser, Palette, Shield, UserCog, UserX, VolumeX } from 'lucide-react'

export type SlashCommandStep =
  | 'crear'
  | 'renombrar'
  | 'color'
  | 'asignar'
  | 'kick'
  | 'ban'
  | 'tempban'
  | 'mute'
  | 'warn'
  | 'clear'

export interface SlashCommandDef {
  step: SlashCommandStep
  comando: string
  label: string
  icon: LucideIcon
  permiso: string
}

export const SLASH_COMANDOS: SlashCommandDef[] = [
  { step: 'crear', comando: '/rol crear', label: 'Crear un rol nuevo', icon: Shield, permiso: 'gestionar_roles' },
  {
    step: 'renombrar',
    comando: '/rol renombrar',
    label: 'Cambiarle el nombre a un rol',
    icon: UserCog,
    permiso: 'gestionar_roles',
  },
  { step: 'color', comando: '/rol color', label: 'Cambiarle el color a un rol', icon: Palette, permiso: 'gestionar_roles' },
  {
    step: 'asignar',
    comando: '/rol asignar',
    label: 'Asignarle un rol a un miembro',
    icon: UserCog,
    permiso: 'gestionar_roles',
  },
  { step: 'kick', comando: '/expulsar', label: 'Expulsar a un miembro', icon: UserX, permiso: 'expulsar_miembros' },
  { step: 'ban', comando: '/banear', label: 'Banear a un miembro permanentemente', icon: Ban, permiso: 'banear_miembros' },
  {
    step: 'tempban',
    comando: '/banear_temporal',
    label: 'Banear a un miembro por tiempo limitado',
    icon: Clock,
    permiso: 'banear_miembros',
  },
  {
    step: 'mute',
    comando: '/silenciar',
    label: 'Silenciar a un miembro temporalmente',
    icon: VolumeX,
    permiso: 'silenciar_miembros',
  },
  { step: 'warn', comando: '/advertir', label: 'Advertir a un miembro', icon: AlertTriangle, permiso: 'advertir_miembros' },
  {
    step: 'clear',
    comando: '/limpiar',
    label: 'Borrar los últimos mensajes de este canal',
    icon: Eraser,
    permiso: 'borrar_mensajes_ajenos',
  },
]

export function tieneAlgunComandoDeSlash(isOwner: boolean, hasPermission: (permiso: string) => boolean): boolean {
  return isOwner || SLASH_COMANDOS.some((c) => hasPermission(c.permiso))
}

export const DURACIONES_MUTE = [
  { label: '10 minutos', minutos: 10 },
  { label: '1 hora', minutos: 60 },
  { label: '1 día', minutos: 60 * 24 },
  { label: '1 semana', minutos: 60 * 24 * 7 },
]

export const DURACIONES_TEMPBAN = [
  { label: '1 hora', minutos: 60 },
  { label: '1 día', minutos: 60 * 24 },
  { label: '3 días', minutos: 60 * 24 * 3 },
  { label: '1 semana', minutos: 60 * 24 * 7 },
  { label: '1 mes', minutos: 60 * 24 * 30 },
]
