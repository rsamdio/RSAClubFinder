#!/usr/bin/env node

/**
 * RSAClubFinder Agent Harness Verification Engine
 * Automated self-test, invariant checker, and index drift detector.
 *
 * Checks:
 *   1. Zero Em Dashes Policy (scripts/lint-em-dashes.mjs)
 *   2. Codebase Index Synchronization (.agents/INDEX.md drift detection)
 *   3. Data Schema & CSV Validation
 *   4. Unit Test Suite (Vitest)
 *   5. Full Production Build & Prerender Pipeline
 */

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCsv } from './lib/csv.mjs'
import { validateClubRows } from './lib/validate-clubs.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

console.log('🚀 Running RSAClubFinder Agent Harness Verification...\n')

let hasErrors = false

// 1. Em-Dash Policy Verification
console.log('🔍 [1/5] Checking Zero Em Dashes Policy...')
try {
  execSync('node scripts/lint-em-dashes.mjs', { cwd: rootDir, stdio: 'inherit' })
  console.log('✅ Zero em dashes verified.\n')
} catch {
  console.error('❌ Em-dash violations found.')
  hasErrors = true
}

// 2. Index Drift Verification
console.log('🗺️  [2/5] Verifying .agents/INDEX.md consistency & file coverage...')
const indexFile = path.join(rootDir, '.agents/INDEX.md')
const rootIndexFile = path.join(rootDir, 'INDEX.md')

if (!fs.existsSync(indexFile) || fs.readFileSync(indexFile, 'utf8').length < 300) {
  console.error('❌ .agents/INDEX.md is missing or too small.')
  hasErrors = true
} else if (!fs.existsSync(rootIndexFile)) {
  console.error('❌ Root INDEX.md is missing.')
  hasErrors = true
} else {
  const indexContent = fs.readFileSync(indexFile, 'utf8')
  const scanDirs = ['src', 'scripts', 'shared', 'netlify']
  const missingFromIndex = []

  for (const relDir of scanDirs) {
    const dirPath = path.join(rootDir, relDir)
    if (!fs.existsSync(dirPath)) continue

    const files = fs.readdirSync(dirPath, { recursive: true })
    for (const f of files) {
      const full = path.join(dirPath, f)
      if (!fs.statSync(full).isFile()) continue
      const base = path.basename(f)
      // Only track code and script source files
      if (
        (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.mjs') || f.endsWith('.css')) &&
        !f.includes('.test.')
      ) {
        if (!indexContent.includes(base)) {
          missingFromIndex.push(path.join(relDir, f))
        }
      }
    }
  }

  if (missingFromIndex.length > 0) {
    console.error(`❌ Index drift detected! The following source files are missing from .agents/INDEX.md:`)
    for (const mf of missingFromIndex) {
      console.error(`  - ${mf}`)
    }
    hasErrors = true
  } else {
    console.log('✅ .agents/INDEX.md is present and 100% in sync with all source files.\n')
  }
}

// 3. Data Integrity & Invariants
console.log('📊 [3/5] Validating canonical CSV data integrity...')
try {
  const sampleCsv = fs.readFileSync(path.join(rootDir, 'data/sample-clubs.csv'), 'utf8')
  const sampleRows = parseCsv(sampleCsv)
  const sampleResult = validateClubRows(sampleRows)
  if (!sampleResult.report.valid) {
    console.error('❌ sample-clubs.csv validation failed:', sampleResult.report.errors)
    hasErrors = true
  }

  const clubsCsv = fs.readFileSync(path.join(rootDir, 'data/clubs.csv'), 'utf8')
  const clubsRows = parseCsv(clubsCsv)
  const clubsResult = validateClubRows(clubsRows)
  if (!clubsResult.report.valid) {
    console.error('❌ clubs.csv validation failed:', clubsResult.report.errors)
    hasErrors = true
  } else {
    console.log(`✅ CSV data validation passed (${clubsResult.clubs.length} clubs valid).\n`)
  }
} catch (err) {
  console.error('❌ Error validating CSV data:', err)
  hasErrors = true
}

// 4. Unit Test Suite
console.log('🧪 [4/5] Running Vitest test suite...')
try {
  execSync('npm test', { cwd: rootDir, stdio: 'inherit' })
  console.log('✅ Unit test suite passed.\n')
} catch {
  console.error('❌ Unit tests failed.')
  hasErrors = true
}

// 5. Production Build & Prerender
console.log('📦 [5/5] Verifying TypeScript build & static prerendering...')
try {
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' })
  console.log('✅ Build and prerendering passed.\n')
} catch {
  console.error('❌ Production build failed.')
  hasErrors = true
}

if (hasErrors) {
  console.error('💥 Harness verification FAILED with errors.')
  process.exit(1)
} else {
  console.log('🎉 ALL HARNESS CHECKS PASSED: Environment is 100% healthy, consistent, and clean!\n')
  process.exit(0)
}
