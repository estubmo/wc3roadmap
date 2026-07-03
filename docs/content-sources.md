<!--
SPDX-License-Identifier: GPL-3.0-or-later
Content-authoring aid for the Phase 9 launch content gate (CONT-04 / SC3, CONT-05 / SC4).
Not code. Maps each node to an existing science source + community source so nodes can be
distilled from published work rather than authored from scratch. Every citation must still
support a specific claim and pair with a concrete drill (SC4 audit).
-->

# Content Source Matrix

How to use: for each node, pull one **science** citation (`kind: science`) from the reference
library below and one **community** citation (`kind: creator`) from the linked Warcraft Gym /
Liquipedia page. Write a one-sentence `applicationNote` bridge for each (paraphrase, no invented
quotes) and one "how to apply" drill. That closes the node — curation, not authoring.

The launch gate needs **≥25 `launch_ready` nodes**, each with a non-empty `auditNote`. We have 20
node topics today (3 already `launch_ready`); the 5 **proposed** rows at the bottom take us to 25.

---

## Science reference library (short keys)

| Key | Full reference | Best for |
|-----|----------------|----------|
| `ericsson-1993` | Ericsson, Krampe & Tesch-Römer (1993). The Role of Deliberate Practice in the Acquisition of Expert Performance. *Psychological Review* 100(3), 363–406. | practice structure, review, improvement |
| `peak-2016` | Ericsson & Pool (2016). *Peak: Secrets from the New Science of Expertise*. | accessible deliberate-practice framing |
| `schmidt-lee` | Schmidt & Lee. *Motor Control and Learning: A Behavioral Emphasis*. | motor skills: hotkeys, micro, routing |
| `fitts-posner-1967` | Fitts & Posner (1967). *Human Performance* — three stages of motor learning. | automaticity, hotkey drilling |
| `cepeda-2006` | Cepeda, Pashler, Vul, Wixted & Rohrer (2006). Distributed Practice in Verbal Recall Tasks. *Psychological Bulletin* 132(3), 354–380. | spaced practice, scheduling |
| `chase-simon-1973` | Chase & Simon (1973). Perception in Chess. *Cognitive Psychology* 4(1), 55–81. | pattern recognition, reading the game, comp |
| `miller-1956` | Miller (1956). The Magical Number Seven, Plus or Minus Two. *Psychological Review* 63(2). | working memory, control groups, attention |
| `green-bavelier-2003` | Green & Bavelier (2003). Action video game modifies visual selective attention. *Nature* 423, 534–537. | attention/APM, scouting, multitask |
| `wulf-2013` | Wulf (2013). Attentional focus and motor learning: a review. *Int. Review of Sport & Exercise Psych.* | external-focus cues for micro/aiming |
| `weinberg-gould` | Weinberg & Gould. *Foundations of Sport and Exercise Psychology*. | arousal regulation, imagery, goal-setting |
| `beilock-2010` | Beilock (2010). *Choke*. | choking / nerves under pressure |
| `locke-latham` | Locke & Latham — goal-setting theory. | goal-setting, practice plans |
| `pedraza-2020` | Pedraza-Ramirez et al. (2020). Setting the scientific stage for esports psychology: a systematic review. | esports-specific umbrella citation |
| `macnamara-2014` | Macnamara, Hambrick & Oswald (2014). Deliberate practice and performance (meta-analysis). *Psych. Science*. | honest limits of "just practice more" |

## Community source base pages

- Warcraft Gym Learning Center: https://warcraft-gym.com/learn
  - Creep routes: https://warcraft-gym.com/learn-warcraft-3/warcraft-3-creep-routes/
  - Game mechanics: https://warcraft-gym.com/learn-warcraft-3/game-mechanics/
  - Race hubs: [Night Elf](https://warcraft-gym.com/learn-warcraft-3/learn-night-elf/) · [Orc](https://warcraft-gym.com/learn-warcraft-3/learn-orc/) · [Undead](https://warcraft-gym.com/learn-warcraft-3/learn-undead/) · Human guides linked per-row below
- Liquipedia Warcraft: https://liquipedia.net/warcraft/
  - [Common build orders](https://liquipedia.net/warcraft/Common_build_orders) · [Definitions](https://liquipedia.net/warcraft/Definitions) · [Expansion](https://liquipedia.net/warcraft/Expansion) · [Buildings](https://liquipedia.net/warcraft/Buildings)

---

## Matrix — existing 20 nodes

| Node | skillType | Science | Warcraft Gym | Liquipedia |
|------|-----------|---------|--------------|------------|
| `build-order-human` | macro | `peak-2016` / `ericsson-1993` | [Human base building](https://warcraft-gym.com/human-base-building-guide/), [Archmage 1-creep→expo](https://warcraft-gym.com/archmage-first-one-creep-camp-into-expansion/) | [Human Fast Altar BO](https://liquipedia.net/warcraft/Human_Fast_Altar_Build_Order) |
| `build-order-orc` | macro | `peak-2016` / `ericsson-1993` | [Learn Orc](https://warcraft-gym.com/learn-warcraft-3/learn-orc/) | [Orc Fast Altar BO](https://liquipedia.net/warcraft/Orc_Fast_Altar_Build_Order), [Headhunter BO](https://liquipedia.net/warcraft/Orc_Headhunter_Build_Order) |
| `build-order-undead` | macro | `peak-2016` / `ericsson-1993` | [Learn Undead](https://warcraft-gym.com/learn-warcraft-3/learn-undead/) | [Undead Ghoul BO](https://liquipedia.net/warcraft/Undead_Ghoul_Build_Order), [Fiend BO](https://liquipedia.net/warcraft/Undead_Fiend_Build_Order) |
| `build-order-nightelf` | macro | `peak-2016` / `ericsson-1993` | [Learn Night Elf](https://warcraft-gym.com/learn-warcraft-3/learn-night-elf/) | [NE Fast Altar BO](https://liquipedia.net/warcraft/Night_elf_fast_altar_build_order), [Fast Huntress BO](https://liquipedia.net/warcraft/Night_Elf_Fast_Huntress_Build_Order) |
| `creep-routing` ✔ | macro | `schmidt-lee` | [Creep routes](https://warcraft-gym.com/learn-warcraft-3/warcraft-3-creep-routes/) | [Common build orders](https://liquipedia.net/warcraft/Common_build_orders) |
| `supply-management` | macro | `fitts-posner-1967` | [Game mechanics](https://warcraft-gym.com/learn-warcraft-3/game-mechanics/) | [Buildings](https://liquipedia.net/warcraft/Buildings) |
| `map-control` | macro | `chase-simon-1973` | [Game mechanics](https://warcraft-gym.com/learn-warcraft-3/game-mechanics/) | [Definitions](https://liquipedia.net/warcraft/Definitions) |
| `hero-leveling` | macro | `ericsson-1993` | [Creep routes](https://warcraft-gym.com/learn-warcraft-3/warcraft-3-creep-routes/) | [Common build orders](https://liquipedia.net/warcraft/Common_build_orders) |
| `resource-banking` | mental | `miller-1956` | [Game mechanics](https://warcraft-gym.com/learn-warcraft-3/game-mechanics/) | [Definitions](https://liquipedia.net/warcraft/Definitions) |
| `base-defense` | macro | `chase-simon-1973` | [Human base building](https://warcraft-gym.com/human-base-building-guide/) | [Buildings](https://liquipedia.net/warcraft/Buildings) |
| `expansion-timing` | mental | `macnamara-2014` | [Archmage 1-creep→expo](https://warcraft-gym.com/archmage-first-one-creep-camp-into-expansion/) | [Expansion](https://liquipedia.net/warcraft/Expansion) |
| `tech-timing` | mental | `chase-simon-1973` | [Game mechanics](https://warcraft-gym.com/learn-warcraft-3/game-mechanics/) | [Common build orders](https://liquipedia.net/warcraft/Common_build_orders) |
| `scouting` | mental | `green-bavelier-2003` | [Game mechanics](https://warcraft-gym.com/learn-warcraft-3/game-mechanics/) | [Human Fast Altar BO](https://liquipedia.net/warcraft/Human_Fast_Altar_Build_Order) (scouting section) |
| `hotkey-discipline` | micro | `fitts-posner-1967` | [Game mechanics](https://warcraft-gym.com/learn-warcraft-3/game-mechanics/) | [Definitions](https://liquipedia.net/warcraft/Definitions) |
| `army-positioning` | micro | `wulf-2013` | [Game mechanics](https://warcraft-gym.com/learn-warcraft-3/game-mechanics/) | [Definitions](https://liquipedia.net/warcraft/Definitions) |
| `micro-focus-fire` | micro | `wulf-2013` | [Game mechanics](https://warcraft-gym.com/learn-warcraft-3/game-mechanics/) | [Definitions](https://liquipedia.net/warcraft/Definitions) |
| `harassment` | micro | `green-bavelier-2003` | Race hubs ([Orc](https://warcraft-gym.com/learn-warcraft-3/learn-orc/)) | [Common build orders](https://liquipedia.net/warcraft/Common_build_orders) |
| `replay-review` ✔ | mental | `ericsson-1993` | Back2Warcraft VODs | — |
| `spaced-practice` ✔ | mental | `cepeda-2006` | Grubby routine | — |
| `reading-the-game` ✔ | mental | `chase-simon-1973` | Lyn VODs | — |

✔ = already `launch_ready` (has real citations + auditNote).

## Proposed 5 new nodes → reach 25

| Node (proposed) | nodeType / skillType | Science | Community |
|-----------------|----------------------|---------|-----------|
| `worker-production` | MECHANIC / macro | `fitts-posner-1967` | [Human base building](https://warcraft-gym.com/human-base-building-guide/) · [Common build orders](https://liquipedia.net/warcraft/Common_build_orders) |
| `unit-composition` | CONCEPTUAL / mental | `chase-simon-1973` | [Game mechanics](https://warcraft-gym.com/learn-warcraft-3/game-mechanics/) · [Buildings](https://liquipedia.net/warcraft/Buildings) |
| `attention-and-apm` | MECHANIC / micro | `miller-1956` + `green-bavelier-2003` | [Game mechanics](https://warcraft-gym.com/learn-warcraft-3/game-mechanics/) |
| `goal-setting` | CONCEPTUAL / mental | `locke-latham` + `weinberg-gould` | Warcraft Gym Learn hub |
| `tilt-and-nerves` | CONCEPTUAL / mental | `beilock-2010` + `pedraza-2020` | Back2Warcraft analysis |

---

## Notes

- **Licensing:** citing free public pages (Warcraft Gym, Liquipedia CC-BY-SA) by URL with paraphrased application notes is fine for a GPL-3.0 project. Do not paste verbatim guide text into node bodies — distill and attribute.
- **Audit (SC4):** each `launch_ready` node's `auditNote` should state that the science citation supports the specific claim and the community citation pairs it with a real drill. See the 3 completed nodes for the pattern.
- **Currency:** Liquipedia build-order slugs are stable; Warcraft Gym article slugs may change — re-verify a link before flipping a node to `launch_ready`.
