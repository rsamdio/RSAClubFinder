const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_RE = /^https?:\/\/.+/i
const PHONE_HEADER_RE = /^(phone|mobile|tel|telephone|whatsapp|whatsapp_number|contact_phone)$/i
const NAME_PREFIX = 'Rotaract Club of '
const NAME_PREFIX_RE = /^rotaract\s+club\s+of\s+/i

function empty(v) {
  return v == null || String(v).trim() === ''
}

function parseCoord(value, kind) {
  if (empty(value)) return { value: null, error: null }
  const n = Number(value)
  if (!Number.isFinite(n)) return { value: null, error: `invalid ${kind}` }
  if (kind === 'latitude' && (n < -90 || n > 90)) {
    return { value: null, error: 'latitude out of range' }
  }
  if (kind === 'longitude' && (n < -180 || n > 180)) {
    return { value: null, error: 'longitude out of range' }
  }
  return { value: n, error: null }
}

function normalizeClubType(raw, line, warnings) {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (value === 'community' || value === 'university') return value
  if (value === 'institution') {
    warnings.push(`L${line}: club_type "institution" mapped to "university" (RI tag)`)
    return 'university'
  }
  return value
}

function displayClubName(rawName) {
  const name = String(rawName ?? '').trim()
  if (!name) return name
  if (NAME_PREFIX_RE.test(name)) return name.replace(NAME_PREFIX_RE, NAME_PREFIX)
  return `${NAME_PREFIX}${name}`
}

function formatZone(raw, line, errors) {
  const value = String(raw ?? '').trim()
  if (!value) {
    errors.push(`L${line}: missing zone`)
    return ''
  }
  const digitMatch = value.match(/^(\d{1,2})$/)
  if (digitMatch) return `Zone ${digitMatch[1]}`
  const labeled = value.match(/^zone\s*(\d{1,2})$/i)
  if (labeled) return `Zone ${labeled[1]}`
  errors.push(`L${line}: zone must be a digit (e.g. 4), got "${value}"`)
  return value
}

function urlOrNull(row, field, line, errors) {
  if (empty(row[field])) return null
  const value = String(row[field]).trim()
  if (!URL_RE.test(value)) {
    errors.push(`L${line}: invalid ${field} (must start with http/https)`)
    return null
  }
  return value
}

/**
 * Validate raw CSV rows and return normalised Club objects + report.
 * CSV uses short club names and zone digits; JSON gets display transforms.
 */
export function validateClubRows(rows) {
  const errors = []
  const warnings = []
  const clubs = []
  const ids = new Set()
  const nameKeys = new Set()

  if (rows.length) {
    for (const key of Object.keys(rows[0])) {
      if (PHONE_HEADER_RE.test(key)) {
        errors.push(
          `Forbidden column "${key}" — phone numbers must not appear in public club data`,
        )
      }
    }
  }

  rows.forEach((row, index) => {
    const line = index + 2 // header is line 1
    const clubId = String(row.club_id ?? '').trim()
    const rawName = String(row.club_name ?? '').trim()
    const clubName = displayClubName(rawName)
    const clubType = normalizeClubType(row.club_type, line, warnings)
    const district = String(row.district ?? '').trim()
    const zone = formatZone(row.zone, line, errors)
    const country = String(row.country ?? '').trim()
    const city = String(row.city ?? '').trim()
    const lastUpdated = String(row.last_updated ?? '').trim()

    if (!clubId) errors.push(`L${line}: missing club_id`)
    if (!rawName) errors.push(`L${line}: missing club_name`)
    if (!['community', 'university'].includes(clubType)) {
      errors.push(`L${line}: club_type must be community|university`)
    }
    if (!district) errors.push(`L${line}: missing district`)
    if (!country) errors.push(`L${line}: missing country`)
    if (!city) errors.push(`L${line}: missing city`)
    if (!lastUpdated) errors.push(`L${line}: missing last_updated`)

    if (clubId) {
      if (ids.has(clubId)) errors.push(`L${line}: duplicate club_id "${clubId}"`)
      ids.add(clubId)
    }

    const nameKey = `${clubName}|${city}|${country}`.toLowerCase()
    if (rawName && nameKeys.has(nameKey)) {
      warnings.push(`L${line}: possible duplicate club "${rawName}" in ${city}`)
    }
    nameKeys.add(nameKey)

    let status = empty(row.status) ? 'unknown' : String(row.status).trim().toLowerCase()
    if (!['active', 'inactive', 'unknown'].includes(status)) {
      warnings.push(`L${line}: unknown status "${row.status}" → unknown`)
      status = 'unknown'
    }

    const lat = parseCoord(row.latitude, 'latitude')
    const lng = parseCoord(row.longitude, 'longitude')
    if (lat.error) errors.push(`L${line}: ${lat.error}`)
    if (lng.error) errors.push(`L${line}: ${lng.error}`)
    if ((lat.value == null) !== (lng.value == null)) {
      warnings.push(`L${line}: only one of latitude/longitude provided — both cleared`)
    }

    const email = empty(row.public_email) ? null : String(row.public_email).trim()
    if (email && !EMAIL_RE.test(email)) errors.push(`L${line}: invalid public_email`)

    clubs.push({
      club_id: clubId,
      club_name: clubName,
      club_type: clubType,
      district,
      zone,
      country,
      state: empty(row.state) ? null : String(row.state).trim(),
      city,
      latitude: lat.value != null && lng.value != null ? lat.value : null,
      longitude: lat.value != null && lng.value != null ? lng.value : null,
      charter_date: empty(row.charter_date) ? null : String(row.charter_date).trim(),
      status,
      meeting_location: empty(row.meeting_location)
        ? null
        : String(row.meeting_location).trim(),
      meeting_day: empty(row.meeting_day) ? null : String(row.meeting_day).trim(),
      meeting_time: empty(row.meeting_time) ? null : String(row.meeting_time).trim(),
      public_email: email,
      website: urlOrNull(row, 'website', line, errors),
      instagram: urlOrNull(row, 'instagram', line, errors),
      facebook: urlOrNull(row, 'facebook', line, errors),
      linkedin: urlOrNull(row, 'linkedin', line, errors),
      youtube: urlOrNull(row, 'youtube', line, errors),
      description: empty(row.description) ? null : String(row.description).trim(),
      last_updated: lastUpdated,
    })
  })

  return {
    clubs,
    report: {
      total: rows.length,
      valid: errors.length === 0,
      errors,
      warnings,
      withCoordinates: clubs.filter((c) => c.latitude != null).length,
      missingCoordinates: clubs.filter((c) => c.latitude == null).length,
    },
  }
}
