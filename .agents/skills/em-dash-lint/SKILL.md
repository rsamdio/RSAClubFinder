---
name: em-dash-lint
description: >-
  Use this skill to check for, fix, and enforce zero em-dash violations across the codebase,
  data files, copy, and documentation.
---

# Em-Dash Linting & Sanitization Skill

This skill documents the automated tools for enforcing the Zero Em Dashes Policy.

## Commands

```bash
# Scan codebase for em dashes (exits with code 1 if found)
npm run lint:em-dashes

# Automatically sanitize discovered em dashes across all files
npm run lint:em-dashes:fix
```

## Policy Summary

* Unicode em dashes (`\u2014`) are strictly forbidden.
* Replace with periods, commas, colons, hyphens, or parentheses as appropriate for context.
