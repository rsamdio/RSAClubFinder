/** Minimal CSV parse/serialize for Club Finder data scripts. */

export function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i += 1
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else if (ch === '\r') {
      // ignore CR (handles CRLF)
    } else {
      cell += ch
    }
  }

  if (cell.length || row.length) {
    row.push(cell)
    rows.push(row)
  }

  if (!rows.length) return []

  const headers = rows[0].map((h) => h.trim())
  return rows
    .slice(1)
    .filter((r) => r.some((c) => String(c).trim() !== ''))
    .map((r) => {
      const obj = {}
      headers.forEach((h, idx) => {
        obj[h] = r[idx] == null ? '' : String(r[idx]).trim()
      })
      return obj
    })
}

export function toCsv(headers, records) {
  const escape = (value) => {
    const s = value == null ? '' : String(value)
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [headers.join(',')]
  for (const record of records) {
    lines.push(headers.map((h) => escape(record[h])).join(','))
  }
  return `${lines.join('\n')}\n`
}

/** Canonical CSV headers (master format for data/sample-clubs.csv). */
export const CLUB_CSV_HEADERS = [
  'club_id',
  'club_name',
  'club_type',
  'district',
  'zone',
  'country',
  'state',
  'city',
  'latitude',
  'longitude',
  'charter_date',
  'status',
  'meeting_location',
  'meeting_day',
  'meeting_time',
  'public_email',
  'website',
  'instagram',
  'facebook',
  'linkedin',
  'youtube',
  'description',
  'last_updated',
]
