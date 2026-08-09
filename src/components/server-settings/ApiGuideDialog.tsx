import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

import { writeClipboard } from '@/lib/electron-bridge'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ApiGuideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  functionUrl: string
  anonKey: string
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="relative rounded-md border border-border bg-muted/30">
      <button
        type="button"
        onClick={async () => {
          await writeClipboard(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
        className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded-md border border-border bg-popover px-1.5 py-1 text-[10px] font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
      <pre className="overflow-x-auto p-3 pr-16 text-xs leading-relaxed text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {n}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="mt-1 text-sm text-muted-foreground">{children}</div>
      </div>
    </li>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground">{children}</h3>
}

export function ApiGuideDialog({ open, onOpenChange, functionUrl, anonKey }: ApiGuideDialogProps) {
  const [tab, setTab] = useState<'apps' | 'webhooks'>('apps')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Guía de Apps y Webhooks</DialogTitle>
          <DialogDescription>
            Paso a paso, desde crearlos hasta dejarlos funcionando en tu servidor.
          </DialogDescription>
        </DialogHeader>

        <div className="flex w-fit shrink-0 gap-1 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setTab('apps')}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              tab === 'apps' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Apps
          </button>
          <button
            type="button"
            onClick={() => setTab('webhooks')}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              tab === 'webhooks' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Webhooks
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {tab === 'apps' ? (
            <div className="flex flex-col gap-6 py-1">
              <p className="text-sm text-muted-foreground">
                Una app es un bot con identidad propia: al crear el token, Zion genera un miembro
                real del servidor (con insignia "BOT") atado a un rol. El bot solo puede hacer lo
                que ese rol le permita, canal por canal, igual que cualquier miembro.
              </p>

              <div>
                <SectionTitle>Desde cero: armá el proyecto en VS Code</SectionTitle>
                <ol className="mt-3 flex flex-col gap-4">
                  <Step n={1} title="Creá la carpeta del bot">
                    Elegí dónde vas a guardarlo (por ejemplo{' '}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">mi-bot-zion</code>) y abrila
                    en VS Code: <code className="rounded bg-muted px-1 py-0.5 text-xs">code mi-bot-zion</code>{' '}
                    desde la terminal, o <strong>Archivo → Abrir carpeta</strong>.
                  </Step>
                  <Step n={2} title="Abrí la terminal integrada">
                    <strong>Ver → Terminal</strong> (o Ctrl+ñ / Ctrl+`). Todo lo que sigue se corre ahí
                    adentro.
                  </Step>
                  <Step n={3} title="Creá un entorno virtual e instalá la dependencia">
                    <div className="mt-2">
                      <CodeBlock
                        code={`python -m venv venv\nvenv\\Scripts\\activate\npip install requests`}
                      />
                    </div>
                    (En Mac/Linux activalo con{' '}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">source venv/bin/activate</code>.)
                  </Step>
                  <Step n={4} title="Creá el archivo bot.py">
                    Nuevo archivo en la raíz de la carpeta, y pegá esta base — ya andando en cuanto le
                    pongas tus datos:
                    <div className="mt-2">
                      <CodeBlock
                        code={`import requests\n\nZION_FUNCTION_URL = "${functionUrl}"\nZION_ANON_KEY = "${anonKey}"\nZION_APP_TOKEN = "zion_app_..."  # el que copiás en el paso siguiente\n\ndef send_message(channel_id, content):\n    response = requests.post(\n        ZION_FUNCTION_URL,\n        headers={"apikey": ZION_ANON_KEY, "Content-Type": "application/json"},\n        json={\n            "token": ZION_APP_TOKEN,\n            "action": "send_message",\n            "channelId": channel_id,\n            "content": content,\n        },\n    )\n    response.raise_for_status()\n    return response.json()\n\nif __name__ == "__main__":\n    print(send_message("ID_DEL_CANAL", "Hola desde mi bot"))`}
                      />
                    </div>
                  </Step>
                </ol>
              </div>

              <div>
                <SectionTitle>Conseguí el token del bot</SectionTitle>
                <ol className="mt-3 flex flex-col gap-4">
                  <Step n={1} title="Andá a Apps y Webhooks">
                    Configuración del servidor (ícono de engranaje) → <strong>Apps</strong> en el menú
                    lateral → pestaña <strong>Apps</strong>.
                  </Step>
                  <Step n={2} title="Creá el token">
                    Tocá <strong>Crear token de app</strong>, poné un nombre (va a ser el nombre visible
                    del bot) y elegí el rol cuyos permisos va a usar. Confirmá con{' '}
                    <strong>Crear token</strong>.
                  </Step>
                  <Step n={3} title="Copiá el token ya mismo">
                    Se muestra una sola vez, con el formato{' '}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">zion_app_...</code>. Pegalo
                    en <code className="rounded bg-muted px-1 py-0.5 text-xs">bot.py</code>, en{' '}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">ZION_APP_TOKEN</code>. Si
                    cerrás el diálogo sin copiarlo, tenés que revocarlo y crear uno nuevo.
                  </Step>
                  <Step n={4} title="Verificalo en el servidor">
                    El bot aparece de inmediato en la lista de miembros con la insignia{' '}
                    <strong>BOT</strong> — es un miembro real, no solo un token suelto.
                  </Step>
                </ol>
              </div>

              <div>
                <SectionTitle>Corré el bot y confirmá que funciona</SectionTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Cambiá <code className="rounded bg-muted px-1 py-0.5 text-xs">ID_DEL_CANAL</code> por
                  el ID real del canal (click derecho sobre el canal en Zion → Copiar ID) y corré:
                </p>
                <div className="mt-2">
                  <CodeBlock code={`python bot.py`} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Si todo está bien conectado, el mensaje aparece al toque en ese canal, publicado por
                  tu bot. Si algo falla, la terminal va a mostrar el error que devuelve Zion (token
                  inválido, sin permiso en ese canal, etc).
                </p>
              </div>

              <div>
                <SectionTitle>Personalizar el bot</SectionTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  En la lista de Apps, tocá el lápiz junto al bot para cambiarle el nombre o subirle un
                  avatar. Se actualiza al instante en todos los mensajes que mande de ahí en adelante
                  (los mensajes ya enviados no cambian).
                </p>
              </div>

              <div>
                <SectionTitle>Implementarlo: endpoint y headers</SectionTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Desde tu script o servicio, todas las acciones se hacen con un{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">POST</code> a esta URL:
                </p>
                <div className="mt-2">
                  <CodeBlock code={functionUrl} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Headers en cada llamada:</p>
                <div className="mt-2">
                  <CodeBlock code={`apikey: ${anonKey}\nContent-Type: application/json`} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  El token va siempre dentro del cuerpo (no en los headers), en el campo{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">token</code>, junto con la
                  acción que quieras ejecutar.
                </p>
              </div>

              <div>
                <SectionTitle>Enviar un mensaje</SectionTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  El bot necesita el permiso "Enviar mensajes" en ese canal, según su rol:
                </p>
                <div className="mt-2">
                  <CodeBlock
                    code={`{\n  "token": "zion_app_...",\n  "action": "send_message",\n  "channelId": "ID_DEL_CANAL",\n  "content": "Hola desde mi bot"\n}`}
                  />
                </div>

                <div className="mt-4">
                  <SectionTitle>Ejemplo con curl</SectionTitle>
                  <div className="mt-2">
                    <CodeBlock
                      code={`curl -X POST "${functionUrl}" \\\n  -H "apikey: ${anonKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"token":"zion_app_...","action":"send_message","channelId":"ID_DEL_CANAL","content":"Hola"}'`}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <SectionTitle>Ejemplo con Python</SectionTitle>
                  <div className="mt-2">
                    <CodeBlock
                      code={`import requests\n\nrequests.post(\n    "${functionUrl}",\n    headers={\n        "apikey": "${anonKey}",\n        "Content-Type": "application/json",\n    },\n    json={\n        "token": "zion_app_...",\n        "action": "send_message",\n        "channelId": "ID_DEL_CANAL",\n        "content": "Hola desde mi bot",\n    },\n)`}
                    />
                  </div>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">
                  Respuesta exitosa:{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">{'{"ok": true, "messageId": "..."}'}</code>.
                  Si falla, devuelve un código HTTP de error y{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">{'{"error": "..."}'}</code> con el
                  motivo (token revocado, sin permiso en ese canal, faltan datos, etc).
                </p>
              </div>

              <div>
                <SectionTitle>Mensajes enriquecidos (embed)</SectionTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  En vez de (o además de){' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">content</code>, podés mandar un{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">embed</code> con título,
                  descripción, color, imagen, pie de página y campos. Todos los campos son opcionales.
                </p>
                <div className="mt-2">
                  <CodeBlock
                    code={`{\n  "token": "zion_app_...",\n  "action": "send_message",\n  "channelId": "ID_DEL_CANAL",\n  "embed": {\n    "title": "Título",\n    "description": "Descripción del embed",\n    "color": "#6366f1",\n    "url": "https://...",\n    "imageUrl": "https://...",\n    "footer": "Pie de página",\n    "fields": [\n      { "name": "Campo", "value": "Valor" }\n    ]\n  }\n}`}
                  />
                </div>
              </div>

              <div>
                <SectionTitle>Recibir mensajes (sondeo)</SectionTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  No existe todavía un canal en tiempo real para bots — para que el bot "escuche" hay
                  que preguntarle a Zion cada tanto con <code className="rounded bg-muted px-1 py-0.5 text-xs">get_updates</code>,
                  que devuelve los mensajes nuevos filtrados a los canales donde el rol del token puede
                  ver.
                </p>
                <div className="mt-2">
                  <CodeBlock
                    code={`{\n  "token": "zion_app_...",\n  "action": "get_updates",\n  "since": "2026-08-09T12:00:00.000Z"\n}`}
                  />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Devuelve{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">{'{"ok": true, "messages": [...], "cursor": "..."}'}</code>.
                  Guardá el <code className="rounded bg-muted px-1 py-0.5 text-xs">cursor</code> de la
                  respuesta y mandalo como <code className="rounded bg-muted px-1 py-0.5 text-xs">since</code>{' '}
                  en la próxima llamada para no recibir mensajes repetidos. Si tu bot corre en un loop,
                  esperá unos segundos entre cada llamada para no saturar el servidor.
                </p>
              </div>

              <div>
                <SectionTitle>Revocar el token</SectionTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Desde la lista de Apps, tocá el tacho de basura junto al token. Deja de funcionar al
                  instante y el bot se va del servidor (los mensajes que ya mandó quedan como están).
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 py-1">
              <p className="text-sm text-muted-foreground">
                Un webhook es más simple que una app: el token queda atado a un único canal fijo y no
                requiere elegir un rol. Cualquiera que tenga el token puede publicar en ese canal, sin
                más control de permisos — no crea un miembro del servidor, es solo una identidad visual
                para los mensajes.
              </p>

              <div>
                <SectionTitle>Desde cero: armá el proyecto en VS Code</SectionTitle>
                <ol className="mt-3 flex flex-col gap-4">
                  <Step n={1} title="Creá la carpeta y abrila en VS Code">
                    Por ejemplo <code className="rounded bg-muted px-1 py-0.5 text-xs">mi-webhook-zion</code>{' '}
                    → <code className="rounded bg-muted px-1 py-0.5 text-xs">code mi-webhook-zion</code>{' '}
                    desde la terminal, o <strong>Archivo → Abrir carpeta</strong> en VS Code.
                  </Step>
                  <Step n={2} title="Abrí la terminal integrada e instalá la dependencia">
                    <div className="mt-2">
                      <CodeBlock code={`python -m venv venv\nvenv\\Scripts\\activate\npip install requests`} />
                    </div>
                  </Step>
                  <Step n={3} title="Creá el archivo notificar.py">
                    Con esta base, lista para pegarle el token del paso siguiente:
                    <div className="mt-2">
                      <CodeBlock
                        code={`import requests\n\nZION_FUNCTION_URL = "${functionUrl}"\nZION_ANON_KEY = "${anonKey}"\nZION_WEBHOOK_TOKEN = "..."  # el que copiás en el paso siguiente\n\ndef enviar(content):\n    response = requests.post(\n        ZION_FUNCTION_URL,\n        headers={"apikey": ZION_ANON_KEY, "Content-Type": "application/json"},\n        json={\n            "token": ZION_WEBHOOK_TOKEN,\n            "action": "send_message",\n            "content": content,\n        },\n    )\n    response.raise_for_status()\n    return response.json()\n\nif __name__ == "__main__":\n    print(enviar("Notificación desde mi servicio"))`}
                      />
                    </div>
                  </Step>
                </ol>
              </div>

              <div>
                <SectionTitle>Conseguí el token del webhook</SectionTitle>
                <ol className="mt-3 flex flex-col gap-4">
                  <Step n={1} title="Andá a Apps y Webhooks">
                    Configuración del servidor → <strong>Apps</strong> en el menú lateral → pestaña{' '}
                    <strong>Webhooks</strong>.
                  </Step>
                  <Step n={2} title="Creá el webhook">
                    Tocá <strong>Crear webhook</strong>, poné un nombre y elegí el canal donde va a
                    publicar. Confirmá con <strong>Crear webhook</strong>.
                  </Step>
                  <Step n={3} title="Copiá el token">
                    Aparece en la fila del webhook con el botón <strong>Copiar token</strong>. Pegalo en{' '}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">notificar.py</code>, en{' '}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">ZION_WEBHOOK_TOKEN</code>. A
                    diferencia de las apps, podés volver a copiarlo cuando quieras — no se oculta.
                  </Step>
                </ol>
              </div>

              <div>
                <SectionTitle>Corré el script y confirmá que funciona</SectionTitle>
                <div className="mt-2">
                  <CodeBlock code={`python notificar.py`} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  El mensaje aparece al toque en el canal fijado al crear el webhook, con el nombre y
                  avatar que le hayas puesto (siguiente paso).
                </p>
              </div>

              <div>
                <SectionTitle>Personalizarlo</SectionTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tocá el lápiz junto al webhook para cambiarle el nombre o subirle un avatar. Los
                  mensajes se publican con ese nombre y esa imagen, no con los de tu cuenta.
                </p>
              </div>

              <div>
                <SectionTitle>Implementarlo: enviar un mensaje</SectionTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Mismo endpoint y headers que las apps, pero sin{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">channelId</code> — el canal ya
                  está fijado al crear el webhook.
                </p>
                <div className="mt-2">
                  <CodeBlock code={functionUrl} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Headers:</p>
                <div className="mt-2">
                  <CodeBlock code={`apikey: ${anonKey}\nContent-Type: application/json`} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Cuerpo de la llamada:</p>
                <div className="mt-2">
                  <CodeBlock
                    code={`{\n  "token": "TOKEN_DEL_WEBHOOK",\n  "action": "send_message",\n  "content": "Notificación desde mi servicio"\n}`}
                  />
                </div>

                <div className="mt-4">
                  <SectionTitle>Ejemplo con curl</SectionTitle>
                  <div className="mt-2">
                    <CodeBlock
                      code={`curl -X POST "${functionUrl}" \\\n  -H "apikey: ${anonKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"token":"TOKEN_DEL_WEBHOOK","action":"send_message","content":"Notificación"}'`}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <SectionTitle>Ejemplo con Python</SectionTitle>
                  <div className="mt-2">
                    <CodeBlock
                      code={`import requests\n\nrequests.post(\n    "${functionUrl}",\n    headers={\n        "apikey": "${anonKey}",\n        "Content-Type": "application/json",\n    },\n    json={\n        "token": "TOKEN_DEL_WEBHOOK",\n        "action": "send_message",\n        "content": "Notificación desde mi servicio",\n    },\n)`}
                    />
                  </div>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">
                  También acepta <code className="rounded bg-muted px-1 py-0.5 text-xs">embed</code>{' '}
                  con el mismo formato que las apps (título, descripción, color, imagen, campos), y
                  responde igual: <code className="rounded bg-muted px-1 py-0.5 text-xs">{'{"ok": true, "messageId": "..."}'}</code>{' '}
                  o <code className="rounded bg-muted px-1 py-0.5 text-xs">{'{"error": "..."}'}</code>.
                </p>
              </div>

              <div>
                <SectionTitle>Eliminarlo</SectionTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Desde la lista de Webhooks, tocá el tacho de basura. El token deja de funcionar de
                  inmediato para cualquiera que lo tenga.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
