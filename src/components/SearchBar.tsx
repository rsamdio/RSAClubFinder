import { useEffect, useRef, useState } from 'react'

interface SearchBarProps {
  /** Initial value from URL / shared link (only applied on mount). */
  initialValue?: string
  /** Fires on Enter or Clear - not while typing. */
  onCommit: (query: string) => void
  placeholder?: string
}

/**
 * Self-contained search field.
 * Typing never depends on parent/URL state, which avoids focus loss and flicker.
 * Search runs only when the user presses Enter or clears the field.
 */
export function SearchBar({
  initialValue = '',
  onCommit,
  placeholder = 'City, area, or club name',
}: SearchBarProps) {
  const [text, setText] = useState(initialValue)
  const onCommitRef = useRef(onCommit)

  useEffect(() => {
    onCommitRef.current = onCommit
  }, [onCommit])

  function commitNow(next: string) {
    setText(next)
    onCommitRef.current(next)
  }

  return (
    <form
      className="search-bar"
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        commitNow(text)
      }}
    >
      <div className="search-bar__field">
        <span className="search-bar__icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path
              d="M20 20l-3.5-3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <input
          type="text"
          inputMode="search"
          enterKeyHint="search"
          className="search-bar__input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          type="button"
          className="search-bar__clear"
          aria-label="Clear search"
          tabIndex={text ? 0 : -1}
          style={{ visibility: text ? 'visible' : 'hidden' }}
          onClick={() => commitNow('')}
        >
          ×
        </button>
      </div>
    </form>
  )
}
