/**
 * Convert a clubs CSV into production JSON.
 *
 * Usage:
 *   npm run data:from-csv
 *   npm run data:from-csv -- data/clubs.csv
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCsv } from './lib/csv.mjs'
import { validateClubRows } from './lib/validate-clubs.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const inputPath = resolve(process.argv[2] || join(root, 'data/clubs.csv'))
const outPath = join(root, 'public/data/clubs.json')

const text = readFileSync(inputPath, 'utf8')
const rows = parseCsv(text)
if (!rows.length) {
  console.error(`No data rows found in ${inputPath}`)
  process.exit(1)
}

const { clubs, report } = validateClubRows(rows)

console.log(`Source: ${inputPath}`)
console.log(`Rows: ${report.total}`)
console.log(`With coordinates: ${report.withCoordinates}`)
console.log(`Missing coordinates: ${report.missingCoordinates}`)

if (report.warnings.length) {
  console.log(`\nWarnings (${report.warnings.length}):`)
  for (const w of report.warnings.slice(0, 40)) console.log(`  - ${w}`)
  if (report.warnings.length > 40) console.log(`  … +${report.warnings.length - 40} more`)
}

if (report.errors.length) {
  console.error(`\nValidation failed (${report.errors.length} errors):`)
  for (const e of report.errors.slice(0, 60)) console.error(`  - ${e}`)
  if (report.errors.length > 60) console.error(`  … +${report.errors.length - 60} more`)
  process.exit(1)
}

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(
  outPath,
  JSON.stringify(
    {
      version: 2,
      generated_at: new Date().toISOString(),
      source: basename(inputPath),
      clubs,
    },
    null,
    0,
  ),
)

console.log(`\nWrote ${clubs.length} clubs → ${outPath}`)
