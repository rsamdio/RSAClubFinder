---
name: harness-verify
description: >-
  Use this skill to run full agent harness verification, check for index drift,
  enforce em-dash invariants, and validate repository health before completing tasks.
---

# Harness Verification Skill

This skill documents how to execute the comprehensive agent harness test suite.

## Verification Checklist

1. **Zero Em Dashes**: Enforces that no Unicode em dashes exist across the repo.
2. **Index Synchronization**: Ensures every `.ts`, `.tsx`, `.mjs`, `.css`, and `.csv` source file is tracked in `.agents/INDEX.md`.
3. **Data Integrity**: Validates `data/sample-clubs.csv` and `data/clubs.csv` against the schema.
4. **Unit Test Suite**: Executes all Vitest unit tests.
5. **Production Build**: Compiles TypeScript, bundles with Vite, and prerenders club pages.

## Running Verification

```bash
# Run full verification suite
npm run verify

# Run linter
npm run lint

# Run unit tests
npm test

# Run build
npm run build
```
