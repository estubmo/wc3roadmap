# ADR 003: Patch Registry Primitive

**Status:** Accepted
**Date:** 2026-06-28
**Phase:** 01-foundation-schema

---

## Context

Warcraft III: Reforged receives balance patches that change unit stats, upgrade
costs, and mechanics. A learning node may be accurate for patch 1.36.1 but
outdated after 1.36.2. This affects:

- **Node content** — prose, thresholds, and application notes may be
  patch-specific.
- **Mastery thresholds** — what constitutes "mastered" can change when game
  balance changes.
- **Progress records** — a player's mastery at patch X does not automatically
  transfer to patch Y.
- **Replay parsing (Phase 8)** — each patch may ship a new replay object-ID
  map; parsing relies on the correct map for the replay's patch.

Patch version is therefore a **cross-cutting concern** — it must be baked into
the data model from Phase 1, not bolted on later.

### Design constraints

- D-04: Patch version is a **curated, ordered registry** — a typed module
  listing known WC3 patches with stable metadata.
- D-05: All schemas store a `patchId` that **must reference a registry entry**;
  build-time validation enforces referential integrity.
- D-06: Staleness derives from the registry — `meta_volatile` +
  `last_reviewed` / `patch_context` compared against `CURRENT_PATCH` drives
  the Phase 9 staleness indicator.

---

## Decision

Patch version is modelled as a **curated, ordered TypeScript registry module**
(`src/lib/patches.ts`) — not a database table, not a content collection, not an
inline enum.

### Module interface (4 exports)

```typescript
// PATCHES — read-only view of the ordered registry
export const PATCHES: readonly PatchEntry[];

// CURRENT_PATCH — always the last entry; the active game version
export const CURRENT_PATCH: PatchEntry;

// PATCH_IDS — non-empty tuple accepted directly by z.enum() without a cast
export const PATCH_IDS: [string, ...string[]];

// getPatch — fail-fast lookup; throws if id is unknown
export function getPatch(id: string): PatchEntry;
```

Each `PatchEntry` carries:

```typescript
interface PatchEntry {
  readonly id: string;              // kebab-case: "patch-1.36.2"
  readonly order: number;           // strictly ascending integer
  readonly released: string;        // ISO 8601 date
  readonly objectIdMapVersion: number; // Phase 8 replay hook (do not use before Phase 8)
}
```

### Seeded entries (Phase 1)

```
patch-1.36.1  order=0  released=2022-11-16  objectIdMapVersion=1
patch-1.36.2  order=1  released=2024-03-15  objectIdMapVersion=1
```

### Deep-module analysis

- **Interface:** 4 exports. Callers never index `PATCHES` directly —
  they call `getPatch(id)` for a single entry, or use `PATCH_IDS` for
  `z.enum()`. The `_PATCHES` private const and the type assertions are
  implementation details hidden from callers.
- **Locality:** Adding a new patch means appending one object to `_PATCHES` in
  one file. All schemas, CI validation, staleness logic, and replay parsing
  pick up the new entry automatically via `PATCH_IDS` and `CURRENT_PATCH`.
- **Referential integrity at build time:** `z.enum(PATCH_IDS)` in every schema
  means an unknown `patchId` in a node MDX file fails `npm run build` with a
  Zod validation error — no runtime surprises.

### Fail-fast pattern

`getPatch(id)` throws `Error: Unknown patch id: "${id}"` if the id is not in
the registry. Callers discover invalid ids at the earliest possible moment
(schema validation or explicit lookup), not silently at render time.

### Phase 8 hook

`objectIdMapVersion` is a reserved field. Each WC3 patch may ship a new replay
object-ID map needed to parse `.w3g` replay files correctly. The field exists
now so the registry is the single place to version replay maps. It must not be
consumed before Phase 8.

---

## Consequences

**Positive:**
- One place to add a new patch — append to `_PATCHES`; the entire codebase
  updates automatically.
- Build-time referential integrity — unknown `patchId` values are caught before
  deployment.
- `PATCH_IDS` typed as `[string, ...string[]]` — `z.enum(PATCH_IDS)` compiles
  without a cast at every schema that uses it.
- Pure TypeScript module — importable by `content-collections.ts`, schema
  files, CI scripts, and test files with no special runner or build step.

**Negative / trade-offs:**
- Adding a new patch requires a code change and a deploy, not a DB insert.
  Acceptable for a developer-curated registry where patches are released
  infrequently (months apart).
- The `objectIdMapVersion` field adds forward coupling to Phase 8 at schema
  design time. This is intentional — Phase 8 cannot land without it.

---

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| Database table for patches | Requires DB to be available at build time for schema validation; patch data is developer-authored, not user-generated |
| Content collection (MDX/JSON files) | Adds content-collections dependency to CI validation of other content collections; circular dependency risk; unnecessary for developer-curated data |
| Inline `z.enum(["patch-1.36.1", "patch-1.36.2"])` in each schema | Violates DRY — adding a patch requires editing N schema files; no single source of truth |
| Semver string without registry | No `order` field for staleness comparison; no `objectIdMapVersion` hook; no CURRENT_PATCH pointer |

---

## Cross-references

- Implementation: `src/lib/patches.ts`
- Tests: `src/lib/patches.test.ts` (9 tests covering all 4 exports; TDD RED/GREEN in commits 785d6dd → fc5df26)
- Used by: `content-collections.ts` (generates `patchId` enum from `PATCH_IDS`), `src/schemas/node.ts`, `src/schemas/mastery.ts`, `src/schemas/progress.ts` (all Phase 1 schemas carry `patchId`)
