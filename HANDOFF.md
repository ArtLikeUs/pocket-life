# Pocket Life — Session Handoff (for continuing at Wave 5)

This doc is everything a fresh Claude Code session (or another dev) needs to pick up
**Pocket Life** and build **Wave 5 — Vacations** without re-deriving context.

---

## 1. What this is
A Sims-style life-sim **PWA** (single static web app, no backend) played mainly on the
owner's iPhone. Built in waves. **It is live and shareable:**

- **Play / share:** https://artlikeus.github.io/pocket-life/
- **Repo (public):** https://github.com/ArtLikeUs/pocket-life  (owner GitHub: `ArtLikeUs`, `gh` is authed)
- **Local path:** `~/Developer/PocketLife`

## 2. Files (the whole game)
- `index.html` — shell + profile/login + creator UI + button wiring. **Bump `?v=N` on the 3 asset tags every edit.**
- `data.js` — all data/config (town map generator, buildings, NPCs, foods, careers, businesses, college, school, town activities, stimulants, aging constants, legacy flavor, quests, furniture defs).
- `engine.js` — *everything else*: render (procedural GBC-style), pathfinding, sim tick, NPC AI, family/aging/death, shops, quests, audio, profiles. ~2200 lines, all inside one `Game = (()=>{ … })()` IIFE.
- `style.css` — UI (sheets, modals, overlays, HUD).
- `sw.js` — service worker (network-first). **Bump `CACHE = 'pocket-life-vN'` every edit.**
- `manifest.webmanifest`, `icon-*.png`, `gen_icons.py` — PWA install bits.
- `README.md` — player-facing feature list. `HOSTING.md` — how it's hosted.

## 3. Deploy loop (do this after each change)
```sh
cd ~/Developer/PocketLife
# 1) bump versions: ?v=N in index.html (style.css/data.js/engine.js) AND CACHE in sw.js
git add -A && git commit -m "…" && git push        # GitHub Pages auto-rebuilds ~1-2 min
```
Verify live: `curl -s https://artlikeus.github.io/pocket-life/index.html | grep 'v=N'`.
Current versions: **assets `?v=17`, sw `pocket-life-v13`** (next edit → v=18 / v14).

## 4. CRITICAL gotchas (these bit us repeatedly)
- **Cache-busting is mandatory.** The browser memory-caches JS even after SW unregister.
  ALWAYS bump `?v=N` on the script/style tags + the SW `CACHE` name, or changes won't load.
- **`item()` arg order** = `item(icon, title, sub, right, attrs)`. For an action button do
  `item('🎬','Go',null,'data-a="go"')` then `sheetActions.go=fn`. Passing the id as `right`
  (4th arg) silently breaks the button — this bug recurred 3×.
- **Preview testing:** use the `Claude_Preview` MCP. The headless preview's
  `requestAnimationFrame` **freezes when the page loses focus**, which stalls the whole game
  loop (time/transitions/animations/timer-minigames). Workarounds: test *synchronous* logic
  (menus, state, math) directly; the engine exposes `Game._dbg()` debug hooks
  (`ageUp, die, switchTo, passOn, enter, uni, biz, school, bizDay, endStudy, stepSim, pathLen, pending, rebuild`).
  Hard-reload pattern used in tests: unregister SW + clear caches + `location.href = origin + '/?cb=' + Date.now()`,
  then `preview_resize` 393×852 + dispatch a `resize` event. On a real phone rAF runs at 60fps — none of this is a real bug.
- Save data lives in browser `localStorage`: `pl-profiles`, `pl-save-<id>`, `pl-last`.
  `Game._dbg().S` is the live save object. `normalize(s)` migrates old saves — add defaults there for any new field.

## 5. Architecture quick map (engine.js)
- **`S`** = the active save (current controlled sim + shared household + world). `profileId` ties it to a profile.
- **Scenes:** `'home'` (per `S.homeTier`) and `'town'` (generated 34×30). `gotoScene()` does a fade transition. Camera scrolls/clamps. Tiles drawn only in viewport.
- **Movement:** **tap a tile to aim** (drops a marker via `pendingMove`), **tap that same tile again to walk** (no timing window — this avoids iOS double-tap-zoom). Object/NPC/door taps are single-tap. `goToObj`/`goNextTo` path to a tile adjacent to a footprint.
- **Sim tick:** needs decay, actions, `S.atWork/studying/hospital` (fast-forward states), day-rollover → `ageEveryone` + `townDayEvents`. **Time rate:** `dtMin = dt*1.6*speed*mult` → **15-min day at 1×, 5-min at 3×** (`mult` 6 at work/study/hospital, 5 sleeping).
- **UI:** bottom `#sheet` (contextual, `openSheet`/`sheetActions`/`bindSheet`), `#genModal` (`openModal`/`genActions`/`bindGen` — Shop/Quests/People/Save), `#levelOverlay` (level-ups + the death/legacy screens), `#mgOverlay` (job minigames). Opening any of these sets `paused=true`.
- **People model (Wave 3/4):** base `NPCS` + `ARRIVAL_NAMES`; `S.present` (ids in town), `S.movedAway`; `npcDef(id)`, `npcPresent(id)`, `hasPerk(effectId)` (relationship perks/discounts). Household: `S.members[]` (inactive sims, full personal-state), `S.kids[]` (minors), `switchTo(mid)` swaps `PERSONAL[]` fields. Aging via `S.age`/`S.lifespan`; death → `endOfLife()` → `rebirth()` or `passOn()`/`legacyStory()`.

## 6. Waves already shipped (all live)
1. Core sim, home, GBC town, profiles + transfer codes, needs, jobs, family (propose→baby→kids), WooHoo (censored), quests/XP, food menus, homes, vehicles, hospital/pass-out (80% bill), building name labels, usable-object halos, need labels.
2. **Careers & Education:** 6 careers + job mini-games (+25% pay) + promotions; College (degree); Businesses (blue-collar + "cool" incl. Famous Singer, viral breakthroughs, losses); School for kids.
3. **Living Town:** bigger 34×30 map; Cinema/Arcade/Library/Cafe + park activities; NPC occupations + relationship-perk discounts; residents move away/in over time.
4. **Generations:** aging/lifespans, switch control between family members, death → rebirth-into-lineage OR 100-year legacy story.

## 7. NEXT: Wave 5 — Vacations (not started)
What the owner asked for (verbatim intent): *"buy vacations to beaches, jungles, resorts & other places. Buy the trip, then buy additional excursions and benefits that increase the trip's benefits. Maps built for each vacation spot with rewards hidden for exploration & doing the added benefits."*

Suggested implementation sketch (consistent with current architecture):
- **Data (`data.js`):** a `VACATIONS` array — each `{id, name, icon, price, scene-map (generated or authed terrain like the town), excursions:[{name, price, benefit}], hiddenRewards:[{tile, reward}]}`. Beaches/jungle/resort/etc.
- **A travel hub:** add a building (e.g., "Airport ✈️" or a Travel Agency in town, or a Shop tab) to buy a trip; gate by coins.
- **Vacation scene:** reuse the scene system — add `scene.type==='vacation'` with its own generated map (same tile vocabulary: grass/path/water/tree/flowers + new ones like sand). Camera/pathfinding already generic. Player explores; **hidden rewards** = special tiles that grant coins/XP/items when first stepped on or tapped (track found ones in `S.vacationProgress`).
- **Excursions/benefits:** buyable per-trip add-ons (like business "invest") that boost the trip's need/fun/relationship payoff and may unlock more map/rewards.
- **Return home** when the trip's days are spent (mirror `S.atWork` fast-forward or a "days left" counter), applying accumulated benefits.
- Add Wave-5 quests to `QUEST_POOL` (e.g., "Take a vacation", "Find a hidden treasure", "Book an excursion") with conditions in `eligibleQuest`.
- Remember: bump versions, test the *sheet/menu/state* logic synchronously via `_dbg`, deploy, then **pause** (owner wants a playable checkpoint after each wave).

## 8. Owner preferences (important)
- **Dopamine-first, low-stress, fun — not a chore.** Avoid harsh fail states; "welcome-back" refills needs on login; collapses send you to hospital rather than game-over.
- **Ship each wave LIVE as a playable checkpoint, then PAUSE** and wait for "continue" before the next wave. (Owner watches usage limits.)
- Keep it intuitive for one-handed iPhone play.
- Time pacing the owner chose: **15 real minutes per in-game day at 1×.** (`dt*1.6` in tick.)
