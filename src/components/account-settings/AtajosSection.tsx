interface Atajo {
  combinacion: string
  descripcion: string
}

const GRUPOS: { titulo: string; atajos: Atajo[] }[] = [
  {
    titulo: 'Mensajes',
    atajos: [
      { combinacion: 'Enter', descripcion: 'Enviar el mensaje (o guardar una edición en curso).' },
      { combinacion: 'Shift + Enter', descripcion: 'Insertar un salto de línea sin enviar.' },
      { combinacion: 'Escape', descripcion: 'Cancelar la edición de un mensaje.' },
    ],
  },
  {
    titulo: 'Ventanas y diálogos',
    atajos: [
      { combinacion: 'Escape', descripcion: 'Cerrar el visor de imágenes o el panel de configuración abierto.' },
    ],
  },
]

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded-md border border-border bg-muted px-2 py-1 font-mono text-xs text-foreground">
      {children}
    </kbd>
  )
}

export function AtajosSection() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Atajos de Teclado</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Atajos disponibles hoy en Zion. Todavía no se pueden personalizar.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {GRUPOS.map((grupo) => (
          <div key={grupo.titulo}>
            <h2 className="text-sm font-semibold text-foreground uppercase">{grupo.titulo}</h2>
            <div className="mt-2 flex flex-col gap-1.5">
              {grupo.atajos.map((atajo) => (
                <div
                  key={atajo.combinacion}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2.5"
                >
                  <span className="text-sm text-muted-foreground">{atajo.descripcion}</span>
                  <Kbd>{atajo.combinacion}</Kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
