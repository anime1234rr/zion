interface AppBackgroundLayerProps {
  url?: string
  type?: 'imagen' | 'video'
}

export function AppBackgroundLayer({ url, type }: AppBackgroundLayerProps) {
  if (!url) return null

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {type === 'video' ? (
        <video src={url} className="size-full object-cover" autoPlay loop muted playsInline />
      ) : (
        <img src={url} alt="" className="size-full object-cover" />
      )}
      <div className="absolute inset-0 bg-black/85" />
    </div>
  )
}
