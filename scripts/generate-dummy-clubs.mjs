/**
 * Generates dummy Rotaract club CSV data for South Asia (short names, zone digits).
 * Run: npm run data:dummy
 */

import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CLUB_CSV_HEADERS, toCsv } from './lib/csv.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sampleCsvPath = join(__dirname, '../data/sample-clubs.csv')
const fullCsvPath = join(__dirname, '../data/dummy-clubs.csv')
const clubsCsvPath = join(__dirname, '../data/clubs.csv')

const hubs = [
  { city: 'Bengaluru', state: 'Karnataka', country: 'India', district: '3192', zone: '4', lat: 12.9716, lng: 77.5946, n: 45 },
  { city: 'Mumbai', state: 'Maharashtra', country: 'India', district: '3141', zone: '3', lat: 19.076, lng: 72.8777, n: 40 },
  { city: 'Delhi', state: 'Delhi', country: 'India', district: '3011', zone: '2', lat: 28.6139, lng: 77.209, n: 35 },
  { city: 'Chennai', state: 'Tamil Nadu', country: 'India', district: '3232', zone: '5', lat: 13.0827, lng: 80.2707, n: 30 },
  { city: 'Hyderabad', state: 'Telangana', country: 'India', district: '3150', zone: '4', lat: 17.385, lng: 78.4867, n: 28 },
  { city: 'Kolkata', state: 'West Bengal', country: 'India', district: '3291', zone: '6', lat: 22.5726, lng: 88.3639, n: 25 },
  { city: 'Pune', state: 'Maharashtra', country: 'India', district: '3131', zone: '3', lat: 18.5204, lng: 73.8567, n: 25 },
  { city: 'Ahmedabad', state: 'Gujarat', country: 'India', district: '3051', zone: '2', lat: 23.0225, lng: 72.5714, n: 18 },
  { city: 'Jaipur', state: 'Rajasthan', country: 'India', district: '3052', zone: '2', lat: 26.9124, lng: 75.7873, n: 15 },
  { city: 'Kochi', state: 'Kerala', country: 'India', district: '3201', zone: '5', lat: 9.9312, lng: 76.2673, n: 16 },
  { city: 'Lucknow', state: 'Uttar Pradesh', country: 'India', district: '3110', zone: '1', lat: 26.8467, lng: 80.9462, n: 14 },
  { city: 'Chandigarh', state: 'Chandigarh', country: 'India', district: '3080', zone: '1', lat: 30.7333, lng: 76.7794, n: 12 },
  { city: 'Colombo', state: 'Western Province', country: 'Sri Lanka', district: '3220', zone: '7', lat: 6.9271, lng: 79.8612, n: 22 },
  { city: 'Kandy', state: 'Central Province', country: 'Sri Lanka', district: '3220', zone: '7', lat: 7.2906, lng: 80.6337, n: 10 },
  { city: 'Kathmandu', state: 'Bagmati', country: 'Nepal', district: '3292', zone: '8', lat: 27.7172, lng: 85.324, n: 20 },
  { city: 'Pokhara', state: 'Gandaki', country: 'Nepal', district: '3292', zone: '8', lat: 28.2096, lng: 83.9856, n: 8 },
  { city: 'Dhaka', state: 'Dhaka Division', country: 'Bangladesh', district: '3282', zone: '9', lat: 23.8103, lng: 90.4125, n: 24 },
  { city: 'Chittagong', state: 'Chittagong Division', country: 'Bangladesh', district: '3282', zone: '9', lat: 22.3569, lng: 91.7832, n: 10 },
  { city: 'Karachi', state: 'Sindh', country: 'Pakistan', district: '3271', zone: '10', lat: 24.8607, lng: 67.0011, n: 18 },
  { city: 'Lahore', state: 'Punjab', country: 'Pakistan', district: '3272', zone: '10', lat: 31.5497, lng: 74.3436, n: 16 },
  { city: 'Islamabad', state: 'Islamabad Capital Territory', country: 'Pakistan', district: '3272', zone: '10', lat: 33.6844, lng: 73.0479, n: 10 },
  { city: 'Thimphu', state: 'Thimphu', country: 'Bhutan', district: '3290', zone: '8', lat: 27.4728, lng: 89.639, n: 4 },
  { city: 'Malé', state: 'Kaafu Atoll', country: 'Maldives', district: '3220', zone: '7', lat: 4.1755, lng: 73.5093, n: 4 },
]

const institutions = [
  'Christ University',
  "St. Joseph's College",
  'IIT',
  'NIT',
  'University of',
  'Presidency College',
  'Loyola College',
  'Manipal Academy',
  'Amrita Vishwa Vidyapeetham',
  'Symbiosis',
  'BITS',
  'Jawaharlal Nehru University',
  'University of Colombo',
  'Tribhuvan University',
  'University of Dhaka',
  'LUMS',
  'NUST',
]

const communityNames = [
  'Downtown', 'Central', 'Metropolitan', 'Garden City', 'Heritage',
  'Sunrise', 'Horizon', 'Unity', 'Crescent', 'Pearl',
  'Lakeview', 'Riverside', 'Capitol', 'Gateway', 'Summit',
  'Oasis', 'Beacon', 'Harmony', 'Frontier', 'Phoenix',
]

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function jitter(base, spread = 0.08) {
  return base + (Math.random() - 0.5) * spread
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

const clubs = []
let seq = 1

for (const hub of hubs) {
  for (let i = 0; i < hub.n; i++) {
    const isUniversity = Math.random() < 0.45
    let shortName
    let clubType

    if (isUniversity) {
      clubType = 'university'
      const base = pick(institutions)
      if (base === 'University of') shortName = `University of ${hub.city}`
      else if (base === 'IIT') shortName = `IIT ${hub.city}`
      else if (base === 'NIT') shortName = `NIT ${hub.city}`
      else if (base === 'BITS') shortName = `BITS ${hub.city}`
      else shortName = `${base} ${hub.city}`
    } else {
      clubType = 'community'
      shortName = i === 0 ? hub.city : `${hub.city} ${pick(communityNames)}`
    }

    if (clubs.some((c) => c.club_name === shortName && c.city === hub.city)) {
      shortName = `${shortName} ${i + 1}`
    }

    const hasCoords = Math.random() > 0.04
    const id = `RC${String(seq).padStart(5, '0')}`
    seq += 1
    const handle = slugify(shortName).slice(0, 24)

    clubs.push({
      club_id: id,
      club_name: shortName,
      club_type: clubType,
      district: hub.district,
      zone: hub.zone,
      country: hub.country,
      state: hub.state,
      city: hub.city,
      latitude: hasCoords ? Number(jitter(hub.lat).toFixed(6)) : null,
      longitude: hasCoords ? Number(jitter(hub.lng).toFixed(6)) : null,
      charter_date: Math.random() > 0.3 ? `${2005 + Math.floor(Math.random() * 20)}-07-01` : null,
      meeting_location: Math.random() > 0.4 ? `${hub.city} Community Hall` : null,
      meeting_day: Math.random() > 0.4 ? pick(['Saturday', 'Sunday', 'Friday', 'Wednesday']) : null,
      meeting_time: Math.random() > 0.4 ? pick(['10:00', '17:00', '18:30', '19:00']) : null,
      public_email: Math.random() > 0.35 ? `${handle}@example.org` : null,
      website: Math.random() > 0.7 ? `https://example.org/${handle}` : null,
      instagram: Math.random() > 0.5 ? `https://instagram.com/${handle.replace(/-/g, '')}` : null,
      facebook: Math.random() > 0.6 ? `https://facebook.com/${handle}` : null,
      linkedin: Math.random() > 0.85 ? `https://linkedin.com/company/${handle}` : null,
      youtube: Math.random() > 0.9 ? `https://youtube.com/@${handle.replace(/-/g, '')}` : null,
      description: Math.random() > 0.5
        ? `A ${clubType === 'university' ? 'university' : 'community'}-based Rotaract club serving ${hub.city}, ${hub.country}.`
        : null,
      last_updated: '2026-08-01',
    })
  }
}

mkdirSync(dirname(sampleCsvPath), { recursive: true })

writeFileSync(fullCsvPath, toCsv(CLUB_CSV_HEADERS, clubs))

const sample = []
const seenCities = new Set()
for (const club of clubs) {
  if (!seenCities.has(club.city)) {
    seenCities.add(club.city)
    sample.push(club)
  }
  if (sample.length >= 12) break
}
// Ensure at least one row with a full contact set for the format reference
if (sample[0]) {
  sample[0] = {
    ...sample[0],
    public_email: sample[0].public_email || 'club@example.org',
    website: sample[0].website || 'https://example.org/club',
    instagram: sample[0].instagram || 'https://instagram.com/exampleclub',
    facebook: sample[0].facebook || 'https://facebook.com/exampleclub',
    linkedin: sample[0].linkedin || 'https://linkedin.com/company/exampleclub',
    youtube: sample[0].youtube || 'https://youtube.com/@exampleclub',
  }
}

writeFileSync(sampleCsvPath, toCsv(CLUB_CSV_HEADERS, sample))
copyFileSync(fullCsvPath, clubsCsvPath)

console.log(`Wrote ${clubs.length} clubs → ${fullCsvPath}`)
console.log(`Wrote ${sample.length} sample rows → ${sampleCsvPath}`)
console.log(`Seeded canonical → ${clubsCsvPath}`)
console.log('Next: npm run data:from-csv')
