# Pocket Life 🏡 (v2)

A cozy Sims-style life sim that runs as a web app on iPhone (16 and newer — works on older iPhones too). Game Boy Color/Pokémon-style town to explore, a family to raise, and a steady drip of small wins.

## Play on your iPhone

### Option A — same Wi-Fi as your Mac (quickest)

1. On the Mac, run:
   ```sh
   cd ~/Developer/PocketLife
   python3 -m http.server 8080 --bind 0.0.0.0
   ```
2. On your iPhone (same Wi-Fi), open Safari → **http://192.168.1.151:8080**
   (If your Mac's IP changed: `ipconfig getifaddr en0`.)
3. Share button → **Add to Home Screen** → launches fullscreen like a native app.

### Option B — host it free (play anywhere + offline)

Drag this folder onto [Netlify Drop](https://app.netlify.com/drop) or push to GitHub Pages. HTTPS unlocks the full PWA (offline play, proper install).

## What's in the game

- **Profiles ("logins")** — multiple named sims per device, each with its own save; long-press a profile card to delete. Transfer codes (Life → Save) move a sim to another device.
- **Two scenes** — your home, and a scrolling Pokémon-style town (camera follows you).
- **Needs sim** — hunger/energy/hygiene/bladder/fun/social, each bar labeled by name, with a Sims-style mood plumbob over your head. Coming back after time away always grants a "rested up" boost. **But** if energy bottoms out (or 3+ needs hit zero) your sim collapses and is rushed to the Town Hospital — and the bill is 80% of your money. Keep the bars out of the red!
- **Clear affordances** — every usable object has a soft pulsing halo (decorations don't), and every building in town has a name banner ("Sunny Diner", "Town Hospital", "Maple Mall"…) so it's obvious what everything is.
- **Detailed interactions** — every object opens an action sheet with named choices: the fridge has six meals at different prices/fill values, the TV has family movie night, the computer has browse/gig/video-call, beds have sleep vs nap, etc. The diner and gym in town have their own menus.
- **Homes** — Cozy Studio → Family House (2,500💰, unlocks kids) → Grand Villa (8,000💰: bathtub, treadmill, espresso bar).
- **Vehicles** — Bike (300) / Car (1,500) / Limousine (5,000): faster town travel with visible ride sprites; the limo pays +10% at work.
- **Careers** — six jobs picked at the Office career board (Barista, Chef, Trainer, Programmer, Artist, Doctor), each with a real cross-game perk (e.g. Doctor slows all need decay, Chef makes home meals tastier, Programmer doubles gig pay). Good-mood shifts earn promotions: Trainee → Junior → Senior → Lead → Legend, with rising pay.
- **Clothing store & salon** — Mall "Style" tab: six outfits with life perks (Sharp Suit +5% pay, Track Kit walks faster, Sunset Dress +❤ from socializing…), plus paid hair color/style changes.
- **Tiered home upgrades** — Mall "Home+" tab: Bed, TV, Kitchen, Decor, and Bathroom each upgrade through three tiers with growing benefits and visible changes (golden King Bed blanket, bigger TV picture, fancier fridge).
- **Relationships & family** — 6 townsfolk with chat/joke/gift/flirt/date progression. At 75❤ + a ring: propose. Your partner moves into your house; try for a baby (needs the Family House), babies sleep in the crib, grow into children (tap to play/homework/high-five), then teens.
- **WooHoo 🌹** — partners can WooHoo at the bed; the scene is fully censored Sims-style (shimmering pixel mosaic, floating hearts, "Do not disturb" sign) and boosts fun, social, and the relationship.
- **Dopamine loop** — quests with claimable rewards (badge dot on the Life button), XP levels with confetti and job titles, coin bursts, sparkle/heart particles, tiny synth sound effects, daily pacing that favors small frequent wins.

## Transfer codes (moving a save between devices)

Your game saves to the device it's played on (browser local storage). The **transfer code** under 👪 Life → Save is how you carry that sim to a *different* device — there's no cloud account, so this is the manual sync:

1. On the device that has your sim: 👪 Life → **Save** → **Copy code** (a long text blob = your whole save).
2. On the new device (or a friend's phone): open the game → on the profile screen tap **"Have a transfer code? Load it"** (or 👪 Life → Save → paste into **Load a code**).
3. Your sim — coins, home, family, career, everything — appears there.

It's also a backup: paste the code into a note, and you can restore even if the browser data is cleared. (A true auto-syncing login would need the game hosted on a server with accounts — see Option B above to host it; happy to add real accounts if you go that route.)

## Files

- `index.html` — shell + profile/login UI
- `data.js` — world data: home tiers, town map, buildings, NPCs, foods, vehicles, gifts, quests
- `engine.js` — renderer (procedural GBC-style tiles/sprites), pathfinding, needs sim, NPC AI, family system, quests, audio
- `style.css` — UI (sheets, modals, quest cards, HUD)
- `manifest.webmanifest`, `sw.js`, `icon-*.png` — PWA install + offline (network-first so updates land immediately)
- `gen_icons.py` — regenerates icons (stdlib only)
