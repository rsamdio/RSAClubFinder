---
name: data-pipeline
description: >-
  Use this skill when importing, validating, or updating Rotaract club data from CSV to JSON,
  regenerating dummy datasets, or troubleshooting data validation errors.
---

# Club Data Pipeline Skill

This skill provides step-by-step procedures for managing, validating, and compiling the Rotaract club dataset.

## Procedures

### 1. Recompile Canonical JSON from CSV
To transform `data/clubs.csv` into `public/data/clubs.json`:

```bash
npm run data:from-csv -- data/clubs.csv
```

### 2. Generate Sample & Dummy Data
To regenerate the local test dummy dataset and seed data:

```bash
npm run data:dummy
```

### 3. CSV Column Schema Reference
Refer to [`data/sample-clubs.csv`](file:///Users/zeospec/Dev/Code/RSAClubFinder/data/sample-clubs.csv) for canonical header structure.

* **Required**: `club_id`, `club_name`, `club_type`, `district`, `zone`, `country`, `city`, `last_updated`.
* **Club Name**: Short name only (e.g. `NIT Bengaluru`). The parser prepends `Rotaract Club of ` automatically.
* **Club Type**: `Community` or `University` (mapped to lowercase in JSON).
* **Zone**: Digit only (e.g. `4`); output becomes `Zone 4`.
* **Coordinates**: `latitude`, `longitude` (both must be present, or both cleared).
* **Forbidden**: Phone and mobile columns are strictly rejected by the validator.

### 4. Running Validation Unit Tests
```bash
npm test scripts/validate-clubs.test.mjs
```
