# Index Maintenance & Drift Invariant

## Invariant Rule
The codebase index in [`.agents/INDEX.md`](file:///Users/zeospec/Dev/Code/RSAClubFinder/.agents/INDEX.md) and [`INDEX.md`](file:///Users/zeospec/Dev/Code/RSAClubFinder/INDEX.md) must **always** remain 100% synchronized with the active codebase.

---

## When to Update the Index
Whenever you:
1. **Create a new file** (component, utility, script, hook, test, type, or config).
2. **Delete or rename a file**.
3. **Add or change public exports/interfaces** in core libraries (`places.ts`, `search.ts`, `mapboxGeocode.ts`, `seoMeta.mjs`).
4. **Introduce new endpoints or routes** (`netlify/functions/`, `/club/{club_id}`, SEO hubs).
5. **Add new npm scripts or CLI tools**.

You MUST update [`.agents/INDEX.md`](file:///Users/zeospec/Dev/Code/RSAClubFinder/.agents/INDEX.md) in the **same turn/commit** before completing your task.

---

## Verification
Run `npm run verify` to test that all source files are tracked in [`.agents/INDEX.md`](file:///Users/zeospec/Dev/Code/RSAClubFinder/.agents/INDEX.md) without file drift.
