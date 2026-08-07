import { useEffect, useId, useRef } from 'react'

interface LocationPromptProps {
  open: boolean
  busy?: boolean
  onAllow: () => void
  onDismiss: () => void
}

export function LocationPrompt({
  open,
  busy = false,
  onAllow,
  onDismiss,
}: LocationPromptProps) {
  const titleId = useId()
  const descId = useId()
  const allowRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    allowRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) {
        e.preventDefault()
        onDismiss()
        return
      }
      if (e.key !== 'Tab') return
      const root = document.querySelector('.location-prompt__card')
      if (!root) return
      const focusable = [
        ...root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused.current?.focus?.()
    }
  }, [open, busy, onDismiss])

  if (!open) return null

  return (
    <div
      className="location-prompt"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <div
        className="location-prompt__backdrop"
        onClick={() => {
          if (!busy) onDismiss()
        }}
      />
      <div className="location-prompt__card">
        <p className="location-prompt__eyebrow">Welcome</p>
        <h2 id={titleId} className="location-prompt__title">
          Find clubs near you?
        </h2>
        <p id={descId} className="location-prompt__body">
          Share your location and we will show Rotaract clubs closest to where you
          are. You can always search by city or club name instead.
        </p>
        <div className="location-prompt__actions">
          <button
            ref={allowRef}
            type="button"
            className="btn btn--near"
            onClick={onAllow}
            disabled={busy}
          >
            {busy ? 'Getting location…' : 'Near me'}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onDismiss}
            disabled={busy}
          >
            Not now
          </button>
        </div>
        <p className="location-prompt__note muted">
          Your location stays on this device and is only used to sort nearby clubs.
        </p>
      </div>
    </div>
  )
}
