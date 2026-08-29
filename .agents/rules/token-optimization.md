# Token Optimization & Context Efficiency

## Context Preservation Guidelines
To prevent context saturation and minimize token usage during agent operations:

---

## 1. Use the Index First
* Always check [`.agents/INDEX.md`](file:///Users/zeospec/Dev/Code/RSAClubFinder/.agents/INDEX.md) to locate relevant components, functions, and scripts before executing broad filesystem searches or grep sweeps.

---

## 2. Targeted File Inspection
* Avoid reading entire large source files or dataset JSON blobs.
* Use `view_file` with explicit `StartLine` and `EndLine` parameters to examine targeted slices of code.
* Do not dump `public/data/clubs.json` (which contains 576+ clubs) into the context window. Use `data/sample-clubs.csv` for schema inspection.

---

## 3. Progressive Disclosure
* Skills in `.agents/skills/` are loaded on-demand. Reference them only when executing specialized tasks (e.g. data updates, geocoding debug, prerendering).

---

## 4. Concise Responses
* Keep agent explanations concise and direct. Link to created or modified files with clickable markdown links (`file:///...`).
