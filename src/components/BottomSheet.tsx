import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react'

export type SheetSnap = 'peek' | 'half' | 'full'

interface BottomSheetProps {
  snap: SheetSnap
  onSnapChange: (snap: SheetSnap) => void
  children: ReactNode
  className?: string
}

const SNAP_ORDER: SheetSnap[] = ['peek', 'half', 'full']

export function BottomSheet({
  snap,
  onSnapChange,
  children,
  className = '',
}: BottomSheetProps) {
  const startY = useRef(0)
  const dragging = useRef(false)

  useEffect(() => {
    document.documentElement.style.setProperty('--sheet-snap', snap)
  }, [snap])

  function onPointerDown(e: PointerEvent<HTMLButtonElement>) {
    dragging.current = true
    startY.current = e.clientY
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function onPointerUp(e: PointerEvent<HTMLButtonElement>) {
    if (!dragging.current) return
    dragging.current = false
    const delta = e.clientY - startY.current
    const idx = SNAP_ORDER.indexOf(snap)

    // Tap the grip (in-card) to step the sheet; drag still works for larger moves.
    if (Math.abs(delta) < 12) {
      if (snap === 'full') onSnapChange('half')
      else onSnapChange(SNAP_ORDER[Math.min(idx + 1, SNAP_ORDER.length - 1)])
      return
    }

    if (delta < -40 && idx < SNAP_ORDER.length - 1) {
      onSnapChange(SNAP_ORDER[idx + 1])
    } else if (delta > 40 && idx > 0) {
      onSnapChange(SNAP_ORDER[idx - 1])
    }
  }

  return (
    <div
      className={`bottom-sheet bottom-sheet--${snap} ${className}`}
      role="region"
      aria-label="Club finder panel"
    >
      <button
        type="button"
        className="bottom-sheet__handle"
        aria-label="Drag or tap to resize panel"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragging.current = false
        }}
      >
        <span className="bottom-sheet__grip" />
      </button>
      <div className="bottom-sheet__body">{children}</div>
    </div>
  )
}
