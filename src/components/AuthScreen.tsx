import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { cn, getErrorMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Mode = 'signin' | 'signup'

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [nombreUsuario, setNombreUsuario] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      } else {
        const nombreUsuarioTrim = nombreUsuario.trim()
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: nombreUsuarioTrim ? { nombre_usuario: nombreUsuarioTrim } : undefined,
          },
        })
        if (error) throw error
        if (!data.session) {
          setConfirmationSent(true)
        }
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-lg font-semibold">
          {mode === 'signin' ? 'Iniciar sesión en Zion' : 'Crear cuenta en Zion'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === 'signin'
            ? 'Entrá con tu correo y contraseña.'
            : 'Registrate para empezar a crear servidores.'}
        </p>

        {confirmationSent ? (
          <div className="mt-6 rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">
            Te enviamos un correo de confirmación a <strong>{email}</strong>.
            Confirmá tu cuenta y después iniciá sesión.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {mode === 'signup' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nombre_usuario">Nombre de usuario</Label>
                <Input
                  id="nombre_usuario"
                  value={nombreUsuario}
                  onChange={(event) => setNombreUsuario(event.target.value)}
                  placeholder="opcional"
                  autoComplete="username"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={
                    mode === 'signin' ? 'current-password' : 'new-password'
                  }
                  className="pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                  tabIndex={-1}
                  className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading
                ? 'Cargando…'
                : mode === 'signin'
                  ? 'Iniciar sesión'
                  : 'Crear cuenta'}
            </Button>
          </form>
        )}

        <button
          type="button"
          onClick={() => {
            setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'))
            setError(null)
            setConfirmationSent(false)
          }}
          className={cn(
            'mt-4 text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:underline'
          )}
        >
          {mode === 'signin'
            ? '¿No tenés cuenta? Creá una'
            : '¿Ya tenés cuenta? Iniciá sesión'}
        </button>
      </div>
    </div>
  )
}
