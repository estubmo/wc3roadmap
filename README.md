# WC3 Learning Roadmap

A free, open-source interactive node graph of Warcraft III / RTS learning concepts, structured around science-backed pedagogy and the distilled wisdom of the most recognized WC3 players and content creators. Race-agnostic fundamentals form the core of the graph, with race-specific branches layered on top. Every node carries visible per-node citations drawn from motor learning, deliberate practice, and competitive-psychology research. Players sign in with their Battle.net / w3champions identity and the app auto-detects skill mastery from real w3champions ladder data to track progress as they learn.

**Live:** _pending first Vercel deploy_

## License

GPL-3.0-or-later — see [LICENSE](./LICENSE). The project is free and open source; the strong copyleft license applies because the project forks and integrates [wc3v](https://github.com/jblanchette/wc3v), which is GPL-3.0.

## Development

```bash
# Install dependencies (uses committed lockfile)
npm ci

# Start dev server (http://localhost:3000)
npm run dev

# Production build (nitro output — Vercel zero-config detectable)
npm run build

# Validate content schemas
npm run validate

# Run tests
npm test
```

## Stack

- **Framework:** TanStack Start (React 19, SSR, server functions)
- **Router:** TanStack Router (file-based, type-safe)
- **Graph:** @xyflow/react v12 (interactive node graph)
- **Auth:** better-auth (Battle.net OAuth)
- **Database:** Drizzle ORM + Neon PostgreSQL
- **Content:** @content-collections (MDX, Zod-validated)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Deploy:** Vercel (zero-config via nitro adapter)
