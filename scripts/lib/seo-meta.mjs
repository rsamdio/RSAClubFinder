/**
 * Locked SEO / GEO title and description helpers for Club Finder.
 * Suffix is always: | Rotaract South Asia MDIO
 */

export const SITE_ORIGIN = 'https://clubs.rsamdio.org'
export const ORG_NAME = 'Rotaract South Asia MDIO'
export const ORG_SHORT = 'RSAMDIO'
export const PRODUCT_NAME = 'Club Finder'
export const OG_SITE_NAME = 'Club Finder | Rotaract South Asia MDIO'
export const AFFILIATION = 'Club Finder by Rotaract South Asia MDIO (RSAMDIO)'

export const HOME_TITLE =
  'Club Finder - Find Rotaract Clubs Across South Asia | Rotaract South Asia MDIO'

export const HOME_DESCRIPTION =
  'Find Rotaract clubs across South Asia by city, district, or near you. Club Finder by Rotaract South Asia MDIO (RSAMDIO).'

export const NOT_FOUND_TITLE =
  'Club Not Found | Club Finder | Rotaract South Asia MDIO'

export const NOT_FOUND_DESCRIPTION =
  'This club link is missing or outdated. Open Club Finder by Rotaract South Asia MDIO (RSAMDIO) to browse Rotaract clubs across South Asia.'

export function hubTitle(topic) {
  return `${topic} | Club Finder | Rotaract South Asia MDIO`
}

export function clubPageTitle(club) {
  const city = club.city ? String(club.city).trim() : ''
  const name = String(club.club_name ?? '').trim()
  if (city) return `${name} · ${city} | Club Finder | Rotaract South Asia MDIO`
  return `${name} | Club Finder | Rotaract South Asia MDIO`
}

export function clubPageDescription(club) {
  const custom = club.description?.trim()
  if (custom) return custom

  const city = club.city ? String(club.city).trim() : ''
  const country = club.country ? String(club.country).trim() : ''
  const place = [city, country].filter(Boolean).join(', ')
  const district = club.district ? String(club.district).trim() : ''
  const zone = club.zone ? String(club.zone).trim() : ''
  const parts = [`${String(club.club_name ?? '').trim()} in ${place || 'South Asia'}.`]
  if (district || zone) {
    parts.push(
      [district ? `District ${district}` : null, zone || null]
        .filter(Boolean)
        .join(', ') + '.',
    )
  }
  parts.push(
    'Find location and public contact details on Club Finder by Rotaract South Asia MDIO (RSAMDIO).',
  )
  return parts.join(' ')
}

export function clubPageUrl(clubId) {
  return `${SITE_ORIGIN}/club/${encodeURIComponent(clubId)}`
}

export function clubJsonLd(club) {
  const url = clubPageUrl(club.club_id)
  const address = {
    '@type': 'PostalAddress',
    addressLocality: club.city || undefined,
    addressRegion: club.state || undefined,
    addressCountry: club.country || undefined,
  }
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${url}#organization`,
    name: club.club_name,
    url,
    parentOrganization: {
      '@id': 'https://rsamdio.org/#organization',
      name: ORG_NAME,
      alternateName: ORG_SHORT,
    },
    address,
    areaServed: club.city
      ? { '@type': 'City', name: club.city }
      : { '@type': 'Place', name: 'South Asia' },
  }
  if (club.public_email) org.email = club.public_email
  if (club.website) org.sameAs = [club.website]
  const socials = [club.instagram, club.facebook, club.linkedin, club.youtube].filter(
    Boolean,
  )
  if (socials.length) {
    org.sameAs = [...(org.sameAs ?? []), ...socials]
  }
  if (club.latitude != null && club.longitude != null) {
    org.geo = {
      '@type': 'GeoCoordinates',
      latitude: club.latitude,
      longitude: club.longitude,
    }
  }
  return org
}
