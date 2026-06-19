# WIP — Wave 6, Ship 2 (NOT BUILT YET)

**Read `HANDOFF.md` first.** Wave 6 was split into two ships at the owner's request so it can be
continued across sessions. **Ship 1 is LIVE** (v=21 / sw v17): drag-to-pan + double-tap-to-walk +
pinch/`+`/`−` zoom, gentler needs (`NEEDS_DECAY_MULT`), infant interactions, and the ❓ How-to-Play
screen. **Ship 2 below is fully specified but NOT coded.** Build it on a branch `wave6-ship2` (off
`main`), test in the Claude Preview, then deploy as **v=22 / sw v18** and delete this file.

## Ship 2, part A — recurring hired services

A single **"Organization"** you contract from (pick a fun themed name, e.g. *Helping Hands Agency*).
Three roles, each with a job-themed look:

- 🍼 **Nanny** — watches the kids: keeps every kid's `happy` topped up and removes any kid-related
  need drag on you.
- 🍳 **Chef** — cooks: keeps `hunger` topped up / free home meals (and/or slows hunger decay).
- 🧹 **Maid** — cleans: slows `hygiene` decay / keeps things tidy (small hygiene top-ups).

**Pricing (owner-specified):** **$45/day each**, but hiring **all three = $105/day** (bundle, not
$135). Offer **prepay**: per-day, per-week (7 days, **−15%**), per-month (30 days, **−40%**). Single
days are allowed. So: week each = round(45·7·0.85)=**$268**; month each = round(45·30·0.60)=**$810**;
all-three week = round(105·7·0.85)=**$625**; all-three month = round(105·30·0.60)=**$1890**.

- Charge at **day-rollover**; when a prepaid term runs out it lapses (toast). Day-by-day hires that
  can't be afforded auto-cancel with a toast. Keep it forgiving, not punishing.
- **Workers appear ON SCREEN at home only while contracted/working**, in job-themed outfits with a
  role label + emoji badge. They are **NOT** town NPCs and never appear elsewhere. Render them like
  the existing `homies` (see `buildHomies`/`tickHomies`/`drawActors` home branch) but with a `kind:'staff'`
  and a themed `look` (chef whites + hat, maid apron, nanny). Ship 1 already left a hook for tapping
  them: in `handleTap` (home branch) re-add `best.kind==='staff'?showServiceWorker(best.svc):` to the
  homie-tap chain (it was removed from Ship 1 to keep that branch clean).
- **Hire UI:** open it from the home **`phone`** object (thematic "call the agency") — add a branch in
  `showObjectSheet` for `t==='phone'`. (A Shop tab is an acceptable alternative.)

## Ship 2, part B — hidden cheat menu

Two **hidden floor tiles next to each other, beside the bed**. The player **taps tile A then tile B,
three times** (A,B,A,B,A,B) to trigger the cheat menu. The tiles are **always active but invisible**.

**Reveal cost (owner-specified):**
- **Finding the spot is not free.** Completing the A,B×3 sequence opens the menu **but charges one
  work shift's pay each time you open it** — a coin toll, so knowing the secret still costs something.
  Use a shift-pay estimate (the player's current career pay per shift incl. perks, or a level-based
  fallback for unemployed/business). If they can't afford the toll, don't open (gentle toast).
- **Or buy a pass:** paying **40% of an estimated week's earnings** **reveals the tiles (they shimmer)
  AND makes opening the menu free for 1 week of game-time**. While the pass is active there's no
  per-open toll; once it lapses, the tiles go hidden again and the per-open shift toll returns.
- Estimates: shift pay ≈ career `pay` (160–280, see `CAREERS`) × perks, fallback ≈ `100 + level*8`;
  weekly ≈ shiftPay × ~5; reveal-pass price = `round(0.40 × weekly)`. Put the pass purchase somewhere
  discreet (e.g. a faint line in the ❓ Help screen, or offered the first time the menu is found).

- Define the two tiles **per home tier** in `data.js HOME_TIERS` as `cheat:[[c,r],[c,r]]`, two adjacent
  **walkable** floor tiles next to that tier's bed (`bed2` is at c1,r1 in tiers 0 & 1; read tier 2's
  map for its bed). Verify they're floor (`.`) and reachable.
- **CONTROLS INTEGRATION (important):** Ship 1 made empty-tile taps do nothing until a *double*-tap.
  The cheat tiles must be caught in `handleTap` **before** the walk logic — a single tap on a cheat
  tile advances the A/B sequence and returns (no move). Reset the sequence on a wrong tile or after a
  few seconds. Three correct A,B cycles → `openCheats()`.

**Cheat menu (`openCheats`)** — each option needs a short description shown under/after tapping:

1. 💰 **Instant Rich** — `addCoins(500000)`. "Half a million coins, just like that."
2. 💖 **Fulfill All Needs** — set all `S.needs` to 100, and refill every household member's needs +
   set all kids `happy=100`. "Everyone in the house, instantly content."
3. 🌟 **The Big Kahuna** — set `S.kahunaUntil = S.minutes + 3*1440` (3 game days). While active:
   player renders at **2× height** (the player `drawPerson(...)` call takes a scale arg — double it);
   **everything is free** (`spend(n)` returns true without deducting when active); **Work pays instantly
   without leaving** (in `quickWork`/work flow, if active grant a full shift's pay immediately, no away
   time); **+50% beneficial social**. "Three days as a giant: free everything, paid days off, beloved."
4. 🎮 **Game Got Em** — toggle `S.cheatSocial`; every beneficial social interaction is **+75%**.
   "Everyone suddenly loves talking to you."
   - Combine social multipliers: beneficial social gain × (kahuna active?1.5:1) × (`S.cheatSocial`?1.75:1).
     Apply in `npcSocial`/date/gift/family social paths.

## New save fields (add to `freshState` AND default in `normalize` for old saves)

- `S.services` — e.g. `{nanny:0, chef:0, maid:0}` where each value is the game-minute (or day) the
  contract expires (0 = not hired). Default `{nanny:0,chef:0,maid:0}`.
- `S.kahunaUntil` — number (game-minutes), default `0`.
- `S.cheatSocial` — bool, default `false`.
- `S.cheatRevealUntil` — number (game-minutes); the reveal pass is active while `S.minutes < this`.
  Default `0`. (Paying 40%·weekly sets it to `S.minutes + 7*1440`.)
Migration matters: **load a pre-Ship-2 save** (an existing profile) and confirm `normalize` defaults
these so nothing breaks.

## EXACT next steps for the new session

1. `cd ~/Developer/PocketLife && git checkout main && git pull && git checkout -b wave6-ship2`.
2. Build part A then part B (above). Bump assets `?v=22` (3 tags) + sw `pocket-life-v18`.
3. Test in the **Claude Preview** per the `pocket-life` skill (rAF freeze → `Game._dbg()`; cache trap →
   bump a temp `?v=` suffix; add temporary `_dbg` hooks for `showObjectSheet`/the cheat sequence/kahuna,
   then revert). **Verify the whole effect** (services charge daily, workers render only while hired,
   cheat sequence opens the menu, Kahuna's free-spend + instant-pay + 2× height + social mult, Game Got
   Em social mult, and existing-save migration). Strip temp hooks + `?v=` suffix before merging.
4. On owner go-ahead: `git checkout main && git merge wave6-ship2 && git push`; poll for `v=22`.
5. Update `README.md` + `HANDOFF.md` (versions → v=22/v18, what shipped), then **delete this file**.
6. If anything is badly broken, don't merge — `main` stays safe.
