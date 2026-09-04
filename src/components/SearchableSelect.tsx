import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'

interface SearchableSelectProps {
  label: string
  value: string
  options: string[]
  allLabel: string
  onChange: (value: string) => void
  disabled?: boolean
  /** Prefer typing to filter when there are many options. */
  searchable?: boolean
}

interface PopoverPos {
  top: number
  left: number
  width: number
  maxHeight: number
  openUp: boolean
}

/**
 * Lightweight combobox: type to filter long lists (city, state, district).
 * Menu portals to document.body so panel overflow cannot clip it.
 */
export function SearchableSelect({
  label,
  value,
  options,
  allLabel,
  onChange,
  disabled = false,
  searchable = true,
}: SearchableSelectProps) {
  const id = useId()
  const listId = `${id}-list`
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const [pos, setPos] = useState<PopoverPos | null>(null)

  const display = value || allLabel

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = [{ value: '', label: allLabel }, ...options.map((o) => ({ value: o, label: o }))]
    if (!searchable || !q) return rows
    return rows.filter((r) => r.label.toLowerCase().includes(q))
  }, [options, allLabel, query, searchable])

  function updatePosition() {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const gap = 6
    const pad = 12
    const spaceBelow = window.innerHeight - rect.bottom - pad
    const spaceAbove = rect.top - pad
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow
    const maxHeight = Math.max(160, Math.min(360, openUp ? spaceAbove - gap : spaceBelow - gap))
    setPos({
      top: openUp ? rect.top - gap : rect.bottom + gap,
      left: rect.left,
      width: rect.width,
      maxHeight,
      openUp,
    })
  }

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    updatePosition()
    let frameId: number | null = null
    function onReposition(e: Event) {
      if (
        e.type === 'scroll' &&
        popoverRef.current &&
        e.target instanceof Node &&
        popoverRef.current.contains(e.target)
      ) {
        return
      }
      if (frameId != null) return
      frameId = window.requestAnimationFrame(() => {
        frameId = null
        updatePosition()
      })
    }
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      if (frameId != null) window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (rootRef.current?.contains(t) || popoverRef.current?.contains(t)) return
      setOpen(false)
      setQuery('')
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (open) {
      setHighlight(0)
      window.setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  function pick(next: string) {
    onChange(next)
    setOpen(false)
    setQuery('')
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      setQuery('')
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const row = filtered[highlight]
      if (row) pick(row.value)
    }
  }

  const menu =
    open && pos
      ? createPortal(
          <div
            ref={popoverRef}
            className={`combo__popover combo__popover--portal ${pos.openUp ? 'is-up' : ''}`}
            role="presentation"
            style={{
              top: pos.openUp ? undefined : pos.top,
              bottom: pos.openUp ? window.innerHeight - pos.top : undefined,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
            }}
          >
            {searchable ? (
              <input
                ref={inputRef}
                type="search"
                className="combo__search"
                value={query}
                placeholder={`Search ${label.toLowerCase()}…`}
                aria-label={`Search ${label}`}
                autoComplete="off"
                onChange={(e) => {
                  setQuery(e.target.value)
                  setHighlight(0)
                }}
                onKeyDown={onKeyDown}
              />
            ) : null}
            <ul
              id={listId}
              className="combo__list"
              role="listbox"
              aria-labelledby={`${id}-label`}
              style={{ maxHeight: searchable ? `calc(${pos.maxHeight}px - 3rem)` : pos.maxHeight }}
            >
              {filtered.length === 0 ? (
                <li className="combo__empty">No matches</li>
              ) : (
                filtered.map((row, idx) => (
                  <li key={row.value || '__all__'} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={row.value === value}
                      className={`combo__option ${row.value === value ? 'is-selected' : ''} ${idx === highlight ? 'is-active' : ''}`}
                      onMouseEnter={() => setHighlight(idx)}
                      onClick={() => pick(row.value)}
                    >
                      {row.label}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body,
        )
      : null

  return (
    <div className="field" ref={rootRef}>
      <span className="field__label" id={`${id}-label`}>
        {label}
      </span>
      <div className={`combo ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}>
        <button
          ref={triggerRef}
          type="button"
          className="combo__trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={`${id}-label`}
          disabled={disabled}
          onClick={() => {
            if (disabled) return
            setOpen((v) => !v)
            setQuery('')
          }}
          onKeyDown={onKeyDown}
        >
          <span className={value ? 'combo__value' : 'combo__placeholder'}>{display}</span>
          <span className="combo__chevron" aria-hidden="true" />
        </button>
        {menu}
      </div>
    </div>
  )
}
