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

> **Claude Code skill:** a personal skill named **`pocket-life`** (at `~/.claude/skills/pocket-life/`,
> not in this repo) captures the dev/test/deploy workflow — the Claude-Preview testing methodology,
> the verify-the-whole-effect discipline, and the deploy-and-poll loop. It auto-loads when you ask
> Claude to work on Pocket Life. This `HANDOFF.md` stays the source of truth for facts (file map,
> architecture, gotchas); the skill adds *how to test and verify*.

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
Current versions: **assets `?v=22`, sw `pocket-life-v18`** (next edit → v=23 / v19).

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
5. **Vacations:** Travel Agency books trips; 4 procedurally-generated themed maps (beach/jungle/resort/mountain) with hidden treasures (tap to dig up) and excursions; fly home with a relaxation bonus.

## 7. Status: the original 5-wave roadmap is COMPLETE ✅
All five waves the owner asked for are built, tested, and live. There is **no Wave 6 planned** —
future work is polish/balance/new content, not a scheduled wave. If the owner asks for more,
treat it as a fresh feature request.

**Wave 5 refinements (shipped, v=20 / sw v16):** (1) confirmed everyone ages at the same pace
(`AGE_PER_DAY`); (2) **🌳 Family Tree** tab in 👪 Life — lineage in `S.tree`
(`{tid,name,gen,parents,alive}`), `S.tid` = node you're playing; `treeAdd/treeNode/treeKill`;
wired into freshState/normalize (seeds founder + **back-fills pre-tree spouses/kids so old saves
aren't empty**), propose/tryBaby/grown-kid/switchTo/rebirth/checkDeaths; (3) **name your baby**
via `prompt()` in `tryBaby` (note: `prompt()` throws in the headless Claude_Preview but works on
real devices, same as the transfer-code prompt — stub `window.prompt` to test in preview);
(4) **vacations priced as flight + rental** with a +30%/minor-kid surcharge (`vacationCost`),
a tappable **rental cabin** (`OBJTYPES.rental`, Sleep/Freshen/Relax), and the **family rendered on
the vacation map** (`buildHomies` vacation branch).

**Wave 6 is in two ships.** Ship 1 is LIVE (v=21 / sw v17): new controls — **drag to pan** a free
camera (`camFree`), **double-tap a tile to walk** (the pointer handler is now pointerdown/move/up with
drag + double-tap + 2-finger pinch; `#cv` is `touch-action:none`), **zoom** (`zoom`, `BASE_VW/BASE_VH`,
`setZoom`, `clampCam`; +/− control built in `buildNeedsUI`); **gentler needs** (`NEEDS_DECAY_MULT` in
data.js); **infant interactions** (`babyPlay`, the crib sheet + giggle reaction, `babyGiggle`); and a
**❓ How to Play** screen (`openHelp`, header button).

Ship 2 is also LIVE (v=22 / sw v18): **recurring services** — one agency (`SERVICE_ORG`, `SERVICES`,
`SERVICE_TERMS` in data.js) hired from the home `phone` (`showServices`/`showServiceHire`/`hireService`,
`serviceCost`); $45/day each or $105/day all three; prepay day/week(−15%)/month(−40%); term stored as a
game-minute expiry in `S.services`; `svc(id)` = active check. Chef/Maid slow hunger/hygiene decay, Nanny
keeps kids happy (in `tick`). Workers render at home only while hired as `kind:'staff'` homies (themed
look, gold label), tappable → `showServiceWorker`. **Hidden cheat menu** — two tiles by the bed
(`HOME_TIERS[].cheat`); tap A-B×3 (`cheatTileTap` in `handleTap`, before the walk logic) → `openCheats`.
Opening costs one `shiftPay()` unless a reveal pass is active (`revealActive`); paying 40%·weekly sets
`S.cheatRevealUntil` (free + shimmering tiles for a game-week, `drawCheatHint`). `renderCheats`: Instant
Rich, Fulfill All Needs, **Big Kahuna** (`S.kahunaUntil`: `spend()` free, `quickWork` instant pay, 2×
player draw scale, social ×1.5), **Game Got Em** (`S.cheatSocial`, social ×1.75) — combined in
`socialMult()` applied to `rel()` gains in npcSocial/date/gift. **The whole Wave-6 roadmap is shipped.**

Vacation internals (Wave 5), for reference: `VACATIONS` data; `buildVacation()` generates terrain by
`theme` and carves walkable tiles under furniture/spawn; `scene.type==='vacation'` is handled in
`gotoScene`/`rebuildAll`/`drawTerrain`(`drawVacTile`)/`drawFurn`; `flyTo`/`flyHome`/`collectTreasure`/`doExcursion`;
trip state in `S.vacay = {id, found[], excursions[]}` (null when home). Debug: `Game._dbg().fly('beach')`,
`.forceScene('vacation')` (use forceScene because preview rAF freezes the scene transition).

## 8. Owner preferences (important)
- **Dopamine-first, low-stress, fun — not a chore.** Avoid harsh fail states; "welcome-back" refills needs on login; collapses send you to hospital rather than game-over.
- **Ship each wave LIVE as a playable checkpoint, then PAUSE** and wait for "continue" before the next wave. (Owner watches usage limits.)
- Keep it intuitive for one-handed iPhone play.
- Time pacing the owner chose: **15 real minutes per in-game day at 1×.** (`dt*1.6` in tick.)
