import type { Club, ClubFilters, ClubType } from '../types/club'
import { uniqueSorted } from '../lib/search'
import { SearchableSelect } from './SearchableSelect'

interface FilterPanelProps {
  clubs: Club[]
  filters: ClubFilters
  onChange: (next: ClubFilters) => void
  compact?: boolean
  resultCount?: number
  onDone?: () => void
  doneLabel?: string
  onCopyLink?: () => void
}

export function FilterPanel({
  clubs,
  filters,
  onChange,
  compact = false,
  resultCount,
  onDone,
  doneLabel = 'Show results',
  onCopyLink,
}: FilterPanelProps) {
  const scoped = clubs.filter((c) => {
    if (filters.country && c.country !== filters.country) return false
    if (filters.state && c.state !== filters.state) return false
    return true
  })

  const countries = uniqueSorted(clubs.map((c) => c.country))
  const states = uniqueSorted(
    clubs
      .filter((c) => !filters.country || c.country === filters.country)
      .map((c) => c.state),
  )
  const cities = uniqueSorted(scoped.map((c) => c.city))
  const districts = uniqueSorted(scoped.map((c) => c.district))
  const zones = uniqueSorted(clubs.map((c) => c.zone))

  function set<K extends keyof ClubFilters>(key: K, value: ClubFilters[K]) {
    const next = { ...filters, [key]: value }
    if (key === 'country') {
      next.state = ''
      next.city = ''
      next.district = ''
    }
    if (key === 'state') {
      next.city = ''
      next.district = ''
    }
    onChange(next)
  }

  function clearFilters() {
    onChange({
      ...filters,
      country: '',
      state: '',
      city: '',
      district: '',
      zone: '',
      type: '',
      nearMe: false,
    })
  }

  const hasFilters =
    filters.country ||
    filters.state ||
    filters.city ||
    filters.district ||
    filters.zone ||
    filters.type

  return (
    <div className={`filter-panel ${compact ? 'filter-panel--compact' : ''}`}>
      <div className="filter-panel__toolbar">
        <p className="panel__count" aria-live="polite">
          {typeof resultCount === 'number'
            ? `${resultCount.toLocaleString()} clubs match`
            : 'Filters'}
        </p>
        <div className="filter-panel__actions">
          {hasFilters ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={clearFilters}>
              Clear
            </button>
          ) : null}
          {onCopyLink ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onCopyLink}>
              Copy link
            </button>
          ) : null}
        </div>
      </div>

      <div className="filter-panel__grid">
        <SearchableSelect
          label="Country"
          value={filters.country}
          options={countries}
          allLabel="All countries"
          onChange={(v) => set('country', v)}
        />
        <SearchableSelect
          label="State / Province"
          value={filters.state}
          options={states}
          allLabel="All"
          onChange={(v) => set('state', v)}
          disabled={!states.length}
        />
        <SearchableSelect
          label="City"
          value={filters.city}
          options={cities}
          allLabel="All cities"
          onChange={(v) => set('city', v)}
        />
        <SearchableSelect
          label="District"
          value={filters.district}
          options={districts}
          allLabel="All districts"
          onChange={(v) => set('district', v)}
        />
        <SearchableSelect
          label="Zone"
          value={filters.zone}
          options={zones}
          allLabel="All zones"
          onChange={(v) => set('zone', v)}
        />
      </div>

      <div className="field field--span">
        <span className="field__label">Club type</span>
        <div className="segmented" role="radiogroup" aria-label="Club type">
          {(
            [
              { value: '', label: 'All' },
              { value: 'community', label: 'Community' },
              { value: 'university', label: 'University' },
            ] as const
          ).map((opt) => {
            const selected = filters.type === opt.value
            return (
              <button
                key={opt.label}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`segmented__btn ${selected ? 'is-selected' : ''}`}
                onClick={() => set('type', opt.value as '' | ClubType)}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {onDone ? (
        <button type="button" className="btn btn--primary filter-panel__done" onClick={onDone}>
          {doneLabel}
        </button>
      ) : null}
    </div>
  )
}
