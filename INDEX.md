# Codebase Index & Architecture Map

The master codebase index and architecture symbol map is maintained in [`.agents/INDEX.md`](file:///Users/zeospec/Dev/Code/RSAClubFinder/.agents/INDEX.md).

Please refer to [`.agents/INDEX.md`](file:///Users/zeospec/Dev/Code/RSAClubFinder/.agents/INDEX.md) for full details on:
- High-level architecture and request flows
- UI component hierarchy (`src/components/`)
- Core logic & libraries (`src/lib/`, `shared/`)
- Custom React hooks (`src/hooks/`)
- Type definitions (`src/types/`)
- Netlify Functions (`netlify/functions/`)
- Build, CSV data, and prerender scripts (`scripts/`)
- SEO hubs and static assets (`public/`)
- Architecture invariants and conventions

Run `npm run verify` to test codebase invariants and verify that the index is 100% in sync with the filesystem.
