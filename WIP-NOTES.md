# WIP — Wave 5 refinements (UNTESTED, on branch `wave5-refinements`)

**Read `HANDOFF.md` first** for the full project map. This file covers only the in-progress work.

## Status
These four owner requests are **fully coded but NOT yet tested or deployed**. The code lives on the
branch **`wave5-refinements`** (pushed). The **live game (`main`, GitHub Pages) is UNCHANGED and still
works** at the last verified version (v=19). Nothing here is live yet.

Versions in this branch are bumped to **assets `?v=20`, sw `pocket-life-v16`** (ready to deploy once verified).

## What was changed (the 4 requests)
1. **Adults & children age at the same pace from birth** — confirmed the existing `ageEveryone(days)`
   already advances `S.age`, every `S.members[].age`, and every `S.kids[].age` by the same
   `AGE_PER_DAY*days`. **No code change** — just needs a verification pass. (If the owner still feels
   kids age faster, the only lever is `AGE_PER_DAY` in data.js, currently 2.)
2. **Family tree in the Life menu** — new `🌳 Tree` tab (4th tab in `lifeTabBar`). Lineage tracked in
   `S.tree` (array of `{tid,name,gen,parents:[tid],alive}`), `S.tid` = the node you're currently playing,
   `S._tnext` = id counter. Helpers: `treeAdd/treeNode/treeKill`. Wired into: `freshState`/`normalize`
   (seed founder), `propose` (spouse node), `tryBaby` (child node w/ parents [you, spouse]),
   grown-kid→member (carries `tid`), `switchTo` (swaps `tid`), `rebirth`/`checkDeaths` (`treeKill`).
   Rendered by `renderTree()` grouped by generation, with ⭐=you, 🕯️=passed.
3. **Name your child** — `tryBaby` now uses `prompt('Name your baby:', randomDefault)` (falls back to the
   random name if cancelled). Kids store their `tid` for the tree.
4. **Vacation flight + rental, priced by family** — `VACATIONS` now have `flight` + `rental` (both
   mandatory/prepaid) instead of `price`; `VACATION_KID_SURCHARGE = 0.30`. `vacationCost(v)` =
   `(flight+rental) × (1 + 0.30·minorKids)` where minorKids = `S.kids` under `ADULT_AGE` (grown/adult kids
   excluded — they aren't paid for or taken). `showTravelAgency` shows the ✈️/🏚️ breakdown + family ×mult;
   `flyTo` charges the total. Added a **rental place** (`OBJTYPES.rental`, a cabin on each vacation map,
   solid) you can tap to **Sleep / Freshen up / Relax**. The **family now comes along**: `buildHomies`,
   `tickHomies`, `drawActors`, `buildVacation` extended to render the spouse + minor kids near the rental
   on the vacation map.

## EXACT next steps for the new session
1. `cd ~/Developer/PocketLife && git checkout wave5-refinements`
2. **Syntax-check / smoke-test in the Claude_Preview MCP** (no `node` on this machine). Use the hard-reload
   pattern (unregister SW + clear caches + `location.href = origin+'/?cb='+Date.now()`, then
   `preview_resize` 393×852). Check `preview_console_logs` for errors first.
3. **Verify each feature synchronously** (preview rAF freezes when unfocused — use `Game._dbg()` hooks):
   - Tree: have a baby (naming prompt), confirm a node appears under the right generation; marry → spouse
     node; `Game._dbg().switchTo(mid)` then open 👪 Life › 🌳 Tree → "YOU" marker moves; `die()`→rebirth→
     deceased shows 🕯️.
   - Vacation pricing: `Game._dbg().S.kids=[{age:3},{age:3}]` then open the Travel Agency → total should be
     `(flight+rental)×1.6`. Book → coins deducted by that. Grown/adult kids must NOT add cost.
   - Rental + family on vacation: `Game._dbg().forceScene('vacation')` after setting `S.vacay`; screenshot —
     a rental cabin renders, and the spouse + minor kids appear near it; tap the rental → Sleep/Freshen/Relax.
   - Aging parity: `Game._dbg().ageUp(1)` and confirm `S.age` and `S.kids[].age` both went up by 2.
4. Fix any bugs (watch the recurring `item(icon,title,sub,right,attrs)` arg-order trap).
5. When clean: `git checkout main && git merge wave5-refinements && git push` (this deploys to live).
   Then poll GitHub Pages for `?v=20` like prior waves, update `README.md`/`HANDOFF.md`, delete this file.
6. If something is badly broken and can't be fixed quickly, just **don't merge to main** — the live game
   stays safe on its own.
