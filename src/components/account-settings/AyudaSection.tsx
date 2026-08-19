import {
  Activity,
  AlertTriangle,
  Bug,
  ChevronDown,
  ExternalLink,
  FolderGit2,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { openExternal } from '@/lib/electron-bridge'

const REPO_URL = 'https://github.com/anime1234rr/zion'
const STATUS_URL = 'https://zion.betteruptime.com/'

interface EnlaceItem {
  icon: LucideIcon
  label: string
  description: string
  url: string
  accent: string
}

const ESTADO: EnlaceItem[] = [
  {
    icon: Activity,
    label: 'Estado del servicio',
    description: 'Disponibilidad en vivo de Zion.',
    url: STATUS_URL,
    accent: 'bg-online/10 text-online',
  },
  {
    icon: Wrench,
    label: 'Mantenimientos programados',
    description: 'Ventanas de mantenimiento planificadas.',
    url: `${STATUS_URL}maintenance`,
    accent: 'bg-idle/10 text-idle',
  },
  {
    icon: AlertTriangle,
    label: 'Historial de incidentes',
    description: 'Interrupciones e incidentes pasados del servicio.',
    url: `${STATUS_URL}incidents`,
    accent: 'bg-dnd/10 text-dnd',
  },
]

const COMUNIDAD: EnlaceItem[] = [
  {
    icon: FolderGit2,
    label: 'Repositorio y documentación',
    description: 'Código fuente, README y guías del proyecto.',
    url: REPO_URL,
    accent: 'bg-primary/10 text-primary',
  },
  {
    icon: Bug,
    label: 'Reportar un error',
    description: 'Abrí un issue en GitHub describiendo el problema.',
    url: `${REPO_URL}/issues/new`,
    accent: 'bg-primary/10 text-primary',
  },
]

function EnlaceRow({ enlace }: { enlace: EnlaceItem }) {
  return (
    <button
      type="button"
      onClick={() => openExternal(enlace.url)}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card/50 p-3.5 text-left outline-none transition-all hover:border-primary/30 hover:bg-muted/50 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', enlace.accent)}>
        <enlace.icon className="size-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{enlace.label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{enlace.description}</p>
      </div>
      <ExternalLink className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}

interface FaqItem {
  pregunta: string
  respuesta: React.ReactNode
}

interface FaqCategoria {
  titulo: string
  items: FaqItem[]
}

const FAQ: FaqCategoria[] = [
  {
    titulo: 'Chats y mensajería',
    items: [
      {
        pregunta: '¿Qué puedo enviar en un chat?',
        respuesta:
          'Texto con formato enriquecido, fragmentos de código, notas de voz, adjuntos de imagen o video, stickers y emojis propios del servidor (Expresiones), reacciones y menciones con autocompletado.',
      },
      {
        pregunta: '¿Puedo responder, reenviar o fijar mensajes?',
        respuesta:
          'Sí. Podés responder citando el mensaje original, reenviarlo a otro canal o conversación, fijarlo para que quede accesible desde el panel de mensajes fijados, y buscar mensajes anteriores con el buscador integrado del canal o servidor.',
      },
      {
        pregunta: '¿Puedo editar o eliminar lo que envié?',
        respuesta:
          'Sí, tus propios mensajes se pueden editar (queda marcado como "editado") o eliminar. La moderación del servidor también puede eliminar mensajes de otros según los niveles configurados.',
      },
      {
        pregunta: '¿Qué son los hilos y los comandos slash?',
        respuesta:
          'Los hilos permiten desprender una conversación puntual de un canal de texto, o publicar y responder dentro de un canal de foro organizado por etiquetas. Los comandos slash ("/") se ejecutan directamente en el cuadro de escritura del chat.',
      },
      {
        pregunta: 'Me mencionaron pero no encuentro el mensaje, ¿cómo llego?',
        respuesta:
          'Al hacer clic en la notificación de mención (toast, notificación nativa de Windows o el historial de la campana) la app te lleva directo al servidor, canal y mensaje exacto donde te mencionaron, resaltándolo un momento.',
      },
    ],
  },
  {
    titulo: 'Comunidades y servidores',
    items: [
      {
        pregunta: '¿Cómo se organiza un servidor?',
        respuesta:
          'Con categorías que agrupan canales de texto, voz y foro. Podés reordenar categorías y canales arrastrándolos, crear canales heredando la configuración de su categoría, y usar plantillas para replicar una estructura ya armada en un servidor nuevo.',
      },
      {
        pregunta: '¿Cómo funcionan los roles y permisos?',
        respuesta:
          'Cada rol tiene color propio y un conjunto de permisos generales, con overrides específicos por canal o categoría y jerarquía estricta entre roles. La vista "Ver como rol" te muestra en vivo exactamente qué puede ver y hacer cada rol antes de guardar cambios.',
      },
      {
        pregunta: '¿Qué herramientas de moderación hay?',
        respuesta:
          'Gestión de miembros y apodos, expulsión y baneo, niveles de moderación configurables por servidor, un registro de auditoría de las acciones realizadas, y una "zona de peligro" para transferir la titularidad o eliminar el servidor.',
      },
      {
        pregunta: '¿Se pueden agregar bots o integraciones externas?',
        respuesta:
          'Sí, de dos formas: Webhooks atados a un canal fijo para integraciones simples, o Apps con token propio que crean un bot con identidad real (miembro del servidor, insignia "BOT", nombre y avatar personalizables) limitado exactamente a los permisos de su rol. La sección de Apps incluye una guía con ejemplos listos para implementar.',
      },
      {
        pregunta: '¿Los canales de voz tienen video?',
        respuesta:
          'Sí, los canales de voz permiten cámara, compartir pantalla, silenciar/ensordecer y ajustar el audio de entrada y salida.',
      },
    ],
  },
  {
    titulo: 'Perfil, avatar y banner',
    items: [
      {
        pregunta: '¿Qué puedo personalizar en mi perfil?',
        respuesta:
          'Avatar, banner, biografía con formato, color de acento, un fondo animado para la app (en Apariencia) y tu estado de presencia (en línea, ausente, ocupado, desconectado).',
      },
      {
        pregunta: '¿Qué formato y peso acepta el avatar?',
        respuesta:
          'PNG, JPEG o GIF, hasta 5 MB. Si subís una imagen más pesada (y no es GIF animado) la app la redimensiona y comprime automáticamente antes de subirla; si aun así no entra en el límite, te pide otra imagen.',
      },
      {
        pregunta: '¿Y el banner de mi perfil?',
        respuesta:
          'PNG, JPEG o GIF, hasta 5 MB. Se muestra en la parte superior de tu tarjeta de perfil, detrás del avatar.',
      },
      {
        pregunta: '¿Puedo poner un ícono y un banner distintos para cada servidor?',
        respuesta:
          'Sí, desde Ajustes del servidor → General. Tanto el ícono como el banner del servidor aceptan PNG, JPEG o GIF, hasta 5 MB cada uno.',
      },
    ],
  },
  {
    titulo: 'Archivos adjuntos y límites de subida',
    items: [
      {
        pregunta: '¿Cuánto pesa como máximo un adjunto en el chat?',
        respuesta:
          'Imágenes y videos adjuntos en mensajes admiten hasta 15 MB, en formato JPEG, PNG, WEBP o GIF para imagen, y MP4 o WEBM para video. Las notas de voz grabadas desde el chat también admiten hasta 15 MB.',
      },
      {
        pregunta: '¿Puedo poner un fondo animado en la app?',
        respuesta:
          'Sí, desde Apariencia. Acepta imagen (JPEG, PNG, WEBP o GIF) o video (MP4 o WEBM) de hasta 10 MB.',
      },
      {
        pregunta: '¿Qué pasa si el archivo no cumple el límite o el formato?',
        respuesta:
          'La app lo rechaza antes de subirlo y te indica el motivo (peso o tipo de archivo no soportado). Estos límites no dependen solo de la app: también están configurados directamente en el almacenamiento del servidor, así que se validan igual aunque el pedido no venga de la app oficial.',
      },
      {
        pregunta: 'Resumen de límites por tipo de contenido',
        respuesta: (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-1.5 pr-3 font-medium">Contenido</th>
                  <th className="py-1.5 pr-3 font-medium">Límite</th>
                  <th className="py-1.5 font-medium">Formatos</th>
                </tr>
              </thead>
              <tbody className="text-foreground/90">
                <tr className="border-b border-border/60">
                  <td className="py-1.5 pr-3">Avatar</td>
                  <td className="py-1.5 pr-3">5 MB</td>
                  <td className="py-1.5">PNG, JPEG, GIF</td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-1.5 pr-3">Banner de perfil</td>
                  <td className="py-1.5 pr-3">5 MB</td>
                  <td className="py-1.5">PNG, JPEG, GIF</td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-1.5 pr-3">Ícono y banner de servidor</td>
                  <td className="py-1.5 pr-3">5 MB</td>
                  <td className="py-1.5">PNG, JPEG, GIF</td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-1.5 pr-3">Fondo animado de la app</td>
                  <td className="py-1.5 pr-3">10 MB</td>
                  <td className="py-1.5">JPEG, PNG, WEBP, GIF, MP4, WEBM</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3">Adjuntos de chat y notas de voz</td>
                  <td className="py-1.5 pr-3">15 MB</td>
                  <td className="py-1.5">JPEG, PNG, WEBP, GIF, MP4, WEBM, audio</td>
                </tr>
              </tbody>
            </table>
          </div>
        ),
      },
    ],
  },
]

function FaqItemRow({ pregunta, respuesta }: FaqItem) {
  return (
    <details className="group rounded-xl border border-border bg-card/50 open:bg-muted/30">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3.5 text-sm font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        {pregunta}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-3.5 pb-3.5 text-sm text-muted-foreground">{respuesta}</div>
    </details>
  )
}

export function AyudaSection() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Ayuda y Soporte</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        ¿Tenés dudas o encontraste un problema? Estos son los canales disponibles hoy.
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <div>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Estado del servicio
          </h2>
          <div className="flex flex-col gap-2">
            {ESTADO.map((enlace) => (
              <EnlaceRow key={enlace.url} enlace={enlace} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Comunidad y desarrollo
          </h2>
          <div className="flex flex-col gap-2">
            {COMUNIDAD.map((enlace) => (
              <EnlaceRow key={enlace.url} enlace={enlace} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Preguntas frecuentes
          </h2>
          <p className="mb-2 text-xs text-muted-foreground">
            Un repaso general de lo que incluye Zion hoy.
          </p>
          <div className="flex flex-col gap-4">
            {FAQ.map((categoria) => (
              <div key={categoria.titulo}>
                <h3 className="mb-2 text-sm font-semibold text-foreground">{categoria.titulo}</h3>
                <div className="flex flex-col gap-2">
                  {categoria.items.map((item) => (
                    <FaqItemRow key={item.pregunta} {...item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
