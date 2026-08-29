# Zero Em Dashes Policy

## Invariant Rule
Unicode em dashes (`\u2014`) are **strictly forbidden** across the entire repository.

This policy applies to:
1. User-facing copy and UI text.
2. Code comments, JSDoc tags, and CSS section dividers.
3. Club descriptions in CSV/JSON data.
4. Markdown documentation (`README.md`, `AGENTS.md`, rules, skills, etc.).
5. Error messages, logs, and exception strings.

---

## Preferred Alternatives
Instead of an em dash, use standard punctuation depending on context:
* **Period (`.`)**: For separating independent clauses or full thoughts.
* **Comma (`,`)**: For natural sentence pauses or parenthetical phrases.
* **Colon (`:`)**: For definitions, headers, notes, or explanatory suffixes.
* **Hyphen (`-`)**: For ranges, compound words, or bullet points.
* **Parentheses (`(...)`)**: For incidental context or clarifying remarks.

---

## Enforcement
* Run `npm run lint:em-dashes` to check for violations.
* Run `npm run lint:em-dashes:fix` to automatically sanitize discovered em dashes.
* Em dash validation is integrated into `npm run lint` and `npm run verify`.
