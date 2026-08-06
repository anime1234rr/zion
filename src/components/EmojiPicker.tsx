import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

interface EmojiCategory {
  label: string
  emojis: { char: string; keywords: string }[]
}

const CATEGORIES: EmojiCategory[] = [
  {
    label: 'Caritas y emociones',
    emojis: [
      { char: '😀', keywords: 'sonrisa feliz contento' },
      { char: '😁', keywords: 'sonrisa feliz risa' },
      { char: '😂', keywords: 'risa llorar gracioso jaja' },
      { char: '🤣', keywords: 'risa piso jaja' },
      { char: '😃', keywords: 'sonrisa feliz' },
      { char: '😄', keywords: 'sonrisa feliz ojos' },
      { char: '😅', keywords: 'risa nervioso sudor' },
      { char: '😊', keywords: 'sonrisa timido feliz' },
      { char: '🙂', keywords: 'sonrisa leve' },
      { char: '🙃', keywords: 'al reves sonrisa' },
      { char: '😉', keywords: 'guiño' },
      { char: '😍', keywords: 'enamorado corazon ojos' },
      { char: '🥰', keywords: 'enamorado corazones cariño' },
      { char: '😘', keywords: 'beso corazon' },
      { char: '😗', keywords: 'beso' },
      { char: '😋', keywords: 'rico sabroso lengua' },
      { char: '😛', keywords: 'lengua broma' },
      { char: '😜', keywords: 'guiño lengua broma' },
      { char: '🤪', keywords: 'loco broma' },
      { char: '🤔', keywords: 'pensando duda' },
      { char: '🤨', keywords: 'ceja duda sospecha' },
      { char: '😐', keywords: 'neutral serio' },
      { char: '😑', keywords: 'sin expresion' },
      { char: '😶', keywords: 'silencio sin boca' },
      { char: '🙄', keywords: 'ojos en blanco fastidio' },
      { char: '😏', keywords: 'sonrisa picara' },
      { char: '😒', keywords: 'fastidio meh' },
      { char: '😞', keywords: 'triste decepcion' },
      { char: '😔', keywords: 'triste pensativo' },
      { char: '😢', keywords: 'triste llorar lagrima' },
      { char: '😭', keywords: 'llorar fuerte triste' },
      { char: '😤', keywords: 'enojo frustracion' },
      { char: '😠', keywords: 'enojado' },
      { char: '😡', keywords: 'furioso rojo enojo' },
      { char: '🤬', keywords: 'enojo groseria' },
      { char: '😳', keywords: 'sonrojado sorpresa' },
      { char: '🥵', keywords: 'calor sudor' },
      { char: '🥶', keywords: 'frio' },
      { char: '😱', keywords: 'miedo susto grito' },
      { char: '😨', keywords: 'miedo susto' },
      { char: '😰', keywords: 'nervioso ansioso' },
      { char: '😥', keywords: 'triste aliviado' },
      { char: '😓', keywords: 'sudor cansado' },
      { char: '🤗', keywords: 'abrazo' },
      { char: '🤫', keywords: 'silencio shh' },
      { char: '🤭', keywords: 'risa tapar boca' },
      { char: '🥱', keywords: 'bostezo cansado sueño' },
      { char: '😴', keywords: 'dormir sueño' },
      { char: '🤤', keywords: 'baba dormir' },
      { char: '😷', keywords: 'enfermo mascarilla' },
      { char: '🤒', keywords: 'enfermo fiebre' },
      { char: '🤕', keywords: 'herido vendaje' },
      { char: '🤢', keywords: 'asco nausea' },
      { char: '🤮', keywords: 'vomito asco' },
      { char: '🥴', keywords: 'mareado' },
      { char: '😵', keywords: 'mareado noqueado' },
      { char: '🤯', keywords: 'mente explota sorpresa' },
      { char: '🥳', keywords: 'fiesta celebracion' },
      { char: '😎', keywords: 'lentes cool genial' },
      { char: '🤓', keywords: 'nerd lentes' },
      { char: '🧐', keywords: 'monoculo curioso' },
      { char: '😇', keywords: 'angel santo' },
      { char: '🥺', keywords: 'ojitos suplica tierno' },
      { char: '😬', keywords: 'incomodo mueca' },
      { char: '🙁', keywords: 'triste' },
      { char: '😯', keywords: 'sorpresa' },
      { char: '😲', keywords: 'asombro sorpresa' },
      { char: '😦', keywords: 'sorpresa preocupado' },
      { char: '😧', keywords: 'angustia' },
      { char: '👻', keywords: 'fantasma halloween' },
      { char: '💀', keywords: 'calavera muerte' },
      { char: '🤡', keywords: 'payaso' },
      { char: '👽', keywords: 'alien extraterrestre' },
      { char: '🤖', keywords: 'robot' },
      { char: '💩', keywords: 'caca' },
    ],
  },
  {
    label: 'Gestos y personas',
    emojis: [
      { char: '👍', keywords: 'bien like aprobar pulgar' },
      { char: '👎', keywords: 'mal dislike pulgar' },
      { char: '👌', keywords: 'ok perfecto' },
      { char: '✌️', keywords: 'paz victoria' },
      { char: '🤞', keywords: 'dedos cruzados suerte' },
      { char: '🤟', keywords: 'te amo señal' },
      { char: '🤘', keywords: 'rock' },
      { char: '👏', keywords: 'aplauso felicitaciones' },
      { char: '🙌', keywords: 'manos arriba celebrar' },
      { char: '🙏', keywords: 'gracias por favor rezar' },
      { char: '🤝', keywords: 'trato acuerdo saludo' },
      { char: '💪', keywords: 'fuerza musculo' },
      { char: '👋', keywords: 'hola chau saludo' },
      { char: '🤙', keywords: 'llamame' },
      { char: '👊', keywords: 'puño choque' },
      { char: '✊', keywords: 'puño resistencia' },
      { char: '🫶', keywords: 'corazon manos' },
      { char: '👀', keywords: 'ojos mirar' },
      { char: '🧠', keywords: 'cerebro pensar' },
      { char: '👤', keywords: 'persona' },
      { char: '🗣️', keywords: 'hablar' },
      { char: '👶', keywords: 'bebe' },
      { char: '🧑', keywords: 'persona' },
      { char: '🧑‍💻', keywords: 'programador computadora' },
      { char: '🕺', keywords: 'bailar' },
      { char: '💃', keywords: 'bailar' },
    ],
  },
  {
    label: 'Corazones',
    emojis: [
      { char: '❤️', keywords: 'corazon amor rojo' },
      { char: '🧡', keywords: 'corazon naranja' },
      { char: '💛', keywords: 'corazon amarillo' },
      { char: '💚', keywords: 'corazon verde' },
      { char: '💙', keywords: 'corazon azul' },
      { char: '💜', keywords: 'corazon morado' },
      { char: '🖤', keywords: 'corazon negro' },
      { char: '🤍', keywords: 'corazon blanco' },
      { char: '🤎', keywords: 'corazon marron' },
      { char: '💔', keywords: 'corazon roto triste' },
      { char: '❣️', keywords: 'corazon exclamacion' },
      { char: '💕', keywords: 'corazones amor' },
      { char: '💞', keywords: 'corazones giro' },
      { char: '💓', keywords: 'corazon latido' },
      { char: '💗', keywords: 'corazon creciendo' },
      { char: '💖', keywords: 'corazon brillante' },
      { char: '💘', keywords: 'corazon flecha cupido' },
      { char: '💝', keywords: 'corazon regalo' },
    ],
  },
  {
    label: 'Animales y naturaleza',
    emojis: [
      { char: '🐶', keywords: 'perro' },
      { char: '🐱', keywords: 'gato' },
      { char: '🐭', keywords: 'raton' },
      { char: '🐹', keywords: 'hamster' },
      { char: '🐰', keywords: 'conejo' },
      { char: '🦊', keywords: 'zorro' },
      { char: '🐻', keywords: 'oso' },
      { char: '🐼', keywords: 'panda' },
      { char: '🐨', keywords: 'koala' },
      { char: '🐯', keywords: 'tigre' },
      { char: '🦁', keywords: 'leon' },
      { char: '🐮', keywords: 'vaca' },
      { char: '🐷', keywords: 'cerdo' },
      { char: '🐸', keywords: 'rana' },
      { char: '🐵', keywords: 'mono' },
      { char: '🐔', keywords: 'gallina pollo' },
      { char: '🐧', keywords: 'pinguino' },
      { char: '🐦', keywords: 'pajaro' },
      { char: '🦄', keywords: 'unicornio' },
      { char: '🐴', keywords: 'caballo' },
      { char: '🐝', keywords: 'abeja' },
      { char: '🐢', keywords: 'tortuga' },
      { char: '🐍', keywords: 'serpiente' },
      { char: '🐙', keywords: 'pulpo' },
      { char: '🦋', keywords: 'mariposa' },
      { char: '🌸', keywords: 'flor cerezo' },
      { char: '🌹', keywords: 'rosa flor' },
      { char: '🌻', keywords: 'girasol' },
      { char: '🌵', keywords: 'cactus' },
      { char: '🌴', keywords: 'palmera' },
      { char: '🌈', keywords: 'arcoiris' },
      { char: '☀️', keywords: 'sol' },
      { char: '⭐', keywords: 'estrella' },
      { char: '🌙', keywords: 'luna' },
      { char: '⚡', keywords: 'rayo' },
      { char: '🔥', keywords: 'fuego fuego llama genial' },
      { char: '❄️', keywords: 'nieve frio' },
      { char: '💧', keywords: 'gota agua' },
    ],
  },
  {
    label: 'Comida y bebida',
    emojis: [
      { char: '🍎', keywords: 'manzana' },
      { char: '🍌', keywords: 'banana' },
      { char: '🍇', keywords: 'uvas' },
      { char: '🍓', keywords: 'frutilla fresa' },
      { char: '🍉', keywords: 'sandia' },
      { char: '🍕', keywords: 'pizza' },
      { char: '🍔', keywords: 'hamburguesa' },
      { char: '🍟', keywords: 'papas fritas' },
      { char: '🌭', keywords: 'pancho hotdog' },
      { char: '🌮', keywords: 'taco' },
      { char: '🍝', keywords: 'pasta fideos' },
      { char: '🍣', keywords: 'sushi' },
      { char: '🍦', keywords: 'helado' },
      { char: '🍩', keywords: 'donut' },
      { char: '🍰', keywords: 'torta' },
      { char: '🎂', keywords: 'torta cumpleaños' },
      { char: '🍪', keywords: 'galleta' },
      { char: '🍫', keywords: 'chocolate' },
      { char: '🍿', keywords: 'pochoclo palomitas' },
      { char: '☕', keywords: 'cafe' },
      { char: '🍺', keywords: 'cerveza' },
      { char: '🍷', keywords: 'vino' },
      { char: '🥤', keywords: 'bebida gaseosa' },
      { char: '🍾', keywords: 'champagne brindis' },
    ],
  },
  {
    label: 'Actividades y objetos',
    emojis: [
      { char: '🎉', keywords: 'fiesta celebracion confeti' },
      { char: '🎊', keywords: 'confeti fiesta' },
      { char: '🎁', keywords: 'regalo' },
      { char: '🏆', keywords: 'trofeo ganar' },
      { char: '🥇', keywords: 'medalla oro primer lugar' },
      { char: '⚽', keywords: 'futbol pelota' },
      { char: '🏀', keywords: 'basquet' },
      { char: '🎮', keywords: 'videojuego control' },
      { char: '🎲', keywords: 'dado juego' },
      { char: '🎸', keywords: 'guitarra musica' },
      { char: '🎧', keywords: 'auriculares musica' },
      { char: '🎵', keywords: 'nota musical' },
      { char: '🎶', keywords: 'musica notas' },
      { char: '📱', keywords: 'celular telefono' },
      { char: '💻', keywords: 'computadora laptop' },
      { char: '⌨️', keywords: 'teclado' },
      { char: '🖥️', keywords: 'computadora escritorio' },
      { char: '📷', keywords: 'camara foto' },
      { char: '🔋', keywords: 'bateria' },
      { char: '💡', keywords: 'idea foco' },
      { char: '🔒', keywords: 'candado seguro' },
      { char: '🔑', keywords: 'llave' },
      { char: '💰', keywords: 'dinero plata' },
      { char: '💎', keywords: 'diamante gema' },
      { char: '⏰', keywords: 'reloj alarma' },
      { char: '📌', keywords: 'chinche fijar' },
      { char: '📎', keywords: 'clip' },
      { char: '✏️', keywords: 'lapiz escribir' },
      { char: '📝', keywords: 'nota escribir' },
      { char: '📅', keywords: 'calendario fecha' },
      { char: '🚀', keywords: 'cohete rapido lanzamiento' },
      { char: '✈️', keywords: 'avion viaje' },
      { char: '🚗', keywords: 'auto carro' },
      { char: '🏠', keywords: 'casa' },
    ],
  },
  {
    label: 'Símbolos',
    emojis: [
      { char: '✅', keywords: 'check listo correcto' },
      { char: '❌', keywords: 'equis error cancelar' },
      { char: '❓', keywords: 'pregunta duda' },
      { char: '❗', keywords: 'exclamacion importante' },
      { char: '⚠️', keywords: 'advertencia cuidado' },
      { char: '♻️', keywords: 'reciclar' },
      { char: '🔴', keywords: 'circulo rojo' },
      { char: '🟠', keywords: 'circulo naranja' },
      { char: '🟡', keywords: 'circulo amarillo' },
      { char: '🟢', keywords: 'circulo verde online' },
      { char: '🔵', keywords: 'circulo azul' },
      { char: '🟣', keywords: 'circulo morado' },
      { char: '⚪', keywords: 'circulo blanco' },
      { char: '⚫', keywords: 'circulo negro offline' },
      { char: '💯', keywords: 'cien puntos perfecto' },
      { char: '🔞', keywords: 'mayores dieciocho' },
      { char: '🆕', keywords: 'nuevo' },
      { char: '🔊', keywords: 'sonido volumen alto' },
      { char: '🔇', keywords: 'silencio mudo' },
      { char: '➕', keywords: 'mas sumar' },
      { char: '➖', keywords: 'menos restar' },
      { char: '♾️', keywords: 'infinito' },
    ],
  },
]

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  className?: string
  customEmojis?: { nombre: string; url: string }[]
}

export function EmojiPicker({ onSelect, className, customEmojis }: EmojiPickerProps) {
  const [query, setQuery] = useState('')

  const customCategory: EmojiCategory | null = customEmojis?.length
    ? {
        label: 'Este servidor',
        emojis: customEmojis.map((e) => ({ char: `:${e.nombre}:`, keywords: e.nombre })),
      }
    : null

  const customUrlPorChar = useMemo(() => {
    const map = new Map<string, string>()
    for (const emoji of customEmojis ?? []) map.set(`:${emoji.nombre}:`, emoji.url)
    return map
  }, [customEmojis])

  const filteredCategories = useMemo(() => {
    const categories = customCategory ? [customCategory, ...CATEGORIES] : CATEGORIES
    const q = query.trim().toLowerCase()
    if (!q) return categories
    return categories
      .map((category) => ({
        ...category,
        emojis: category.emojis.filter(
          (emoji) => emoji.keywords.includes(q) || emoji.char === q
        ),
      }))
      .filter((category) => category.emojis.length > 0)
  }, [query, customCategory])

  return (
    <div className={cn('flex h-80 w-72 flex-col', className)}>
      <div className="shrink-0 border-b border-border p-2">
        <div className="flex items-center gap-1.5 rounded-md border border-input bg-muted/40 px-2 py-1">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar emoji…"
            autoFocus
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredCategories.length === 0 && (
            <p className="px-1 py-6 text-center text-xs text-muted-foreground">
              No se encontraron emojis.
            </p>
          )}
          {filteredCategories.map((category) => (
            <div key={category.label} className="mb-2">
              <p className="mb-1 px-1 text-[11px] font-semibold text-muted-foreground">
                {category.label}
              </p>
              <div className="grid grid-cols-8 gap-0.5">
                {category.emojis.map((emoji) => {
                  const customUrl = customUrlPorChar.get(emoji.char)
                  return (
                    <button
                      key={emoji.char}
                      type="button"
                      title={customUrl ? emoji.char : undefined}
                      onClick={() => onSelect(emoji.char)}
                      className="flex size-8 items-center justify-center rounded-md text-lg outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      {customUrl ? (
                        <img src={customUrl} alt={emoji.char} className="size-5 object-contain" />
                      ) : (
                        emoji.char
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
