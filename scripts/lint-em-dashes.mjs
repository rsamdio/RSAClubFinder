#!/usr/bin/env node

/**
 * Em-Dash Linter & Sanitizer for RSAClubFinder
 * Scans codebase for Unicode em dashes (\u2014) and enforces the rule:
 * "No em dashes in user-facing copy, comments, data, or documentation.
 *  Use periods, commas, colons, hyphens, or parentheses."
 *
 * Usage:
 *   node scripts/lint-em-dashes.mjs        # Check mode (exits 1 if found)
 *   node scripts/lint-em-dashes.mjs --fix  # Fix mode (replaces with standard punctuation)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const isFixMode = process.argv.includes('--fix')

const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.netlify',
])

const IGNORED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.pmtiles',
  '.svg',
  '.zip',
  '.gz',
  '.pdf',
])

const IGNORED_FILES = new Set([
  'package-lock.json',
  '.DS_Store',
])

const EM_DASH = '\u2014'

function shouldScanFile(filePath) {
  const base = path.basename(filePath)
  if (IGNORED_FILES.has(base)) return false
  const ext = path.extname(filePath).toLowerCase()
  if (IGNORED_EXTENSIONS.has(ext)) return false
  return true
}

function collectFiles(dir) {
  const results = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        results.push(...collectFiles(fullPath))
      }
    } else if (entry.isFile()) {
      if (shouldScanFile(fullPath)) {
        results.push(fullPath)
      }
    }
  }
  return results
}

function checkAndFixFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  if (!content.includes(EM_DASH)) {
    return { violations: [] }
  }

  const lines = content.split('\n')
  const violations = []

  lines.forEach((line, idx) => {
    if (line.includes(EM_DASH)) {
      violations.push({
        lineNum: idx + 1,
        content: line.trim(),
      })
    }
  })

  if (isFixMode && violations.length > 0) {
    let fixed = content
    fixed = fixed.replace(/\u2014+/g, '-')
    fs.writeFileSync(filePath, fixed, 'utf8')
  }

  return { violations }
}

function main() {
  const allFiles = collectFiles(rootDir)
  let totalViolations = 0
  const reportedFiles = []

  for (const file of allFiles) {
    const relPath = path.relative(rootDir, file)
    const { violations } = checkAndFixFile(file)
    if (violations.length > 0) {
      totalViolations += violations.length
      reportedFiles.push({ file: relPath, violations })
    }
  }

  if (reportedFiles.length > 0) {
    if (isFixMode) {
      console.log(`\x1b[33m[em-dash-lint]\x1b[0m Fixed ${totalViolations} em-dash instance(s) across ${reportedFiles.length} file(s):`)
      for (const { file } of reportedFiles) {
        console.log(`  - ${file}`)
      }
    } else {
      console.error(`\x1b[31m[em-dash-lint]\x1b[0m Found ${totalViolations} em-dash violation(s) across ${reportedFiles.length} file(s):`)
      for (const { file, violations } of reportedFiles) {
        console.error(`\n  File: \x1b[36m${file}\x1b[0m`)
        for (const v of violations) {
          console.error(`    L${v.lineNum}: ${v.content}`)
        }
      }
      console.error('\n\x1b[33mTip: Run `npm run lint:em-dashes:fix` or replace with periods, commas, colons, or parentheses.\x1b[0m\n')
      process.exit(1)
    }
  } else {
    console.log('\x1b[32m[em-dash-lint]\x1b[0m Zero em dashes found across codebase. Clean!')
  }
}

main()
