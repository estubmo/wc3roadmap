# ADR 004: GPL-3.0 Licensing and SPDX Variant

**Status:** Accepted
**Date:** 2026-06-28
**Phase:** 01-foundation-schema

---

## Context

WC3 Roadmap is a free, open-source project. Before Phase 1 began, the user
committed to **GPL-3.0** specifically because the project forks / integrates
[wc3v](https://github.com/jblanchette/wc3v), which carries GPL-3.0. GPL-3.0
is a strong-copyleft license; any derivative of a GPL-3.0 codebase must
itself be distributed under GPL-3.0 (or a compatible later version when the
upstream uses the "-or-later" variant).

### wc3v license suffix ambiguity (RESEARCH Open Question 2 / Assumption A5)

The `wc3v` repository header text and the RESEARCH artifact both treat its
license as **GPL-3.0-or-later** (the permissive, forward-compatible reading).
However, the exact suffix in the wc3v `LICENSE` file was not independently
confirmed at the time Phase 1 was planned. RESEARCH therefore flagged this as
Open Question 2 and treated "-or-later" as a working assumption (A5).

The two options are:

| Variant | SPDX id | Meaning |
|---------|---------|---------|
| GPL-3.0-or-later | `GPL-3.0-or-later` | Recipients may redistribute under GPL v3 **or any later GPL version** |
| GPL-3.0-only | `GPL-3.0-only` | Recipients must redistribute under GPL v3 exactly; future GPL versions not granted |

Using **GPL-3.0-or-later** matches RESEARCH's reading of wc3v and is the
more permissive, forward-compatible choice. Using **GPL-3.0-only** would
require sweeping every source file's SPDX header and revisiting compatibility
if the FSF releases GPL v4 or later.

### Human decision (blocking checkpoint)

Plan 01-04 contained a `checkpoint:decision` gate that required an explicit
human choice before the `LICENSE` file was committed. This existed because
committing the wrong variant would require a legal amendment across the entire
repository history.

---

## Decision

**License: GPL-3.0-or-later**

The user confirmed **GPL-3.0-or-later** before the LICENSE was committed. The
reasoning:

1. **wc3v compatibility** — GPL-3.0-or-later is consistent with RESEARCH
   Assumption A5 (wc3v treated as GPL-3.0-or-later). No sweep of existing
   source headers is required.
2. **Forward compatibility** — If the FSF releases GPL v4, downstream users
   can distribute under it without waiting for this project to re-license.
3. **No existing source header conflicts** — All Phase 1 source files already
   carry `// SPDX-License-Identifier: GPL-3.0-or-later` on line 1 (added
   during plans 01-02 and 01-03). No sweep needed.

The `LICENSE` file at the repository root contains the full, verbatim
GPL-3.0 text (674 lines, canonical FSF text). The SPDX identifier in
`package.json` is `GPL-3.0-or-later`.

### Files affected

| File | Change |
|------|--------|
| `LICENSE` | Full GPL-3.0 text (canonical FSF, 674 lines) |
| `package.json` | `"license": "GPL-3.0-or-later"` |
| `docs/spdx-header-convention.md` | Documents the per-file header convention |
| All `src/**` source files | `// SPDX-License-Identifier: GPL-3.0-or-later` on line 1 (already present) |

---

## Consequences

**Positive:**

- The project's license is unambiguous and legally binding from Phase 1
  onward.
- GPL-3.0-or-later is forward-compatible: if the FSF publishes a later
  GPL version, contributors and forks can upgrade without a re-licensing
  event.
- Consistent with RESEARCH's reading of wc3v — no compatibility gap.
- SPDX headers are machine-readable: automated license-compliance tools
  (REUSE, licensee, FOSSA) can audit the repo without manual tagging.
- All Phase 1 source files already carry the correct header (no sweep
  required for the -or-later choice).

**Negative / trade-offs:**

- GPL-3.0-or-later implicitly grants recipients the right to redistribute
  under a future GPL version the original author has not reviewed. This is
  the standard trade-off of any "-or-later" grant.
- If wc3v turns out to be GPL-3.0-only (not GPL-3.0-or-later), this
  project's "-or-later" grant would be technically inconsistent with the
  upstream. **Mitigation:** verify wc3v's exact suffix before any
  distribution event; if it is GPL-3.0-only, amend this project to
  GPL-3.0-only and sweep headers accordingly. The SPDX convention makes
  that sweep a mechanical grep-and-replace.
- Strong copyleft means any project that incorporates WC3 Roadmap code
  must also be distributed under GPL-3.0-or-later. This is intentional
  (the user accepted it when choosing GPL-3.0 for wc3v compatibility).

---

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| GPL-3.0-only | Requires sweeping existing `-or-later` headers; less forward-compatible; would need re-litigation if wc3v is itself "-or-later" |
| MIT / Apache-2.0 | Incompatible with GPL-3.0 wc3v integration (weak-copyleft / permissive licenses cannot include GPL-3.0 code) |
| AGPL-3.0-or-later | Stronger network-copyleft than needed; wc3v is GPL-3.0, not AGPL; would constrain server-side use unnecessarily |
