# Pocket Life 🏡 (v2)

A cozy Sims-style life sim that runs as a web app on iPhone (16 and newer — works on older iPhones too). Game Boy Color/Pokémon-style town to explore, a family to raise, and a steady drip of small wins.

## ▶️ Play it now

**https://artlikeus.github.io/pocket-life/** — works on any phone or computer, any browser. Share that link with anyone! On a phone, tap **Share → Add to Home Screen** for a real app icon.

### Updating the live site later

This folder is a git repo connected to GitHub. After you change the game, republish with:
```sh
cd ~/Developer/PocketLife
git add -A && git commit -m "update" && git push
```
GitHub Pages rebuilds automatically in ~1 minute. (Tip: bump the `?v=` number in `index.html` so phones grab the new version.)

## Play on your iPhone (local, no internet host)

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
- **Controls** — **drag** to pan around the map, **double-tap** a tile to walk there, and **tap** furniture or people to interact. Zoom in & out with the **+/−** between your needs (or pinch). New here? Tap **❓ How to Play** up top for a quick rundown.
- **Two scenes** — your home, and a scrolling Pokémon-style town.
- **Needs sim** — hunger/energy/hygiene/bladder/fun/social, each bar labeled by name, with a Sims-style mood plumbob over your head. Needs drain at a gentle, low-stress pace. Coming back after time away always grants a "rested up" boost. **But** if energy bottoms out (or 3+ needs hit zero) your sim collapses and is rushed to the Town Hospital — and the bill is 80% of your money. Keep the bars out of the red!
- **Clear affordances** — every usable object has a soft pulsing halo (decorations don't), and every building in town has a name banner ("Sunny Diner", "Town Hospital", "Maple Mall"…) so it's obvious what everything is.
- **Detailed interactions** — every object opens an action sheet with named choices: the fridge has six meals at different prices/fill values, the TV has family movie night, the computer has browse/gig/video-call, beds have sleep vs nap, etc. The diner and gym in town have their own menus.
- **Homes** — Cozy Studio → Family House (2,500💰, unlocks kids) → Grand Villa (8,000💰: bathtub, treadmill, espresso bar).
- **Vehicles** — Bike (300) / Car (1,500) / Limousine (5,000): faster town travel with visible ride sprites; the limo pays +10% at work.
- **Careers** — six jobs picked at the Office career board (Barista, Chef, Trainer, Programmer, Artist, Doctor), each with a real cross-game perk (e.g. Doctor slows all need decay, Chef makes home meals tastier, Programmer doubles gig pay). Each shift offers a quick **mini-game** (2 per job, random) — win for +25% pay or skip it. Good-mood shifts earn promotions: Trainee → Junior → Senior → Lead → Legend, with rising pay *and* longer hours.
- **College & business** — **Maple University**: enroll, attend classes, earn a degree (careers pay +20% & cost less energy). Or skip the 9-5 and **start a business** from the Office: blue-collar (Daycare, Diner, Printing, Construction) or "cool" high-risk gigs (Influencer, Celebrity Photographer, Movie Star, and the hardest of all — Famous Singer). Business income swings day to day (you can take a loss), cool gigs can go viral for a huge payout, and you invest to grow the ceiling.
- **School for kids** — once children are old enough they attend **Town School**, which runs like a job, advancing grade by grade until they graduate.
- **Clothing store & salon** — Mall "Style" tab: six outfits with life perks (Sharp Suit +5% pay, Track Kit walks faster, Sunset Dress +❤ from socializing…), plus paid hair color/style changes.
- **Tiered home upgrades** — Mall "Home+" tab: Bed, TV, Kitchen, Decor, and Bathroom each upgrade through three tiers with growing benefits and visible changes (golden King Bed blanket, bigger TV picture, fancier fridge).
- **A living town** — a big scrolling map with 14 buildings, plus things to do that just pass the time and keep it fun: **Starlight Cinema** 🎬, **Pixel Arcade** 🕹️, **Town Library** 📚, **Cozy Cafe** ☕, and a park with a fountain, benches, and picnic tables.
- **Townsfolk with jobs & perks** — every resident has an occupation (Mechanic, Stylist, Diner Chef, Shopkeeper, Gardener, Nurse). Get close to one (50❤) and their perk kicks in for real: discounts on rides, outfits, meals, gifts, home upgrades, or halved hospital bills.
- **People come and go** — over time residents move away (for jobs, love, a fresh start…) and new faces move to town, so the place always feels alive.
- **Relationships & family** — chat/joke/gift/flirt/date progression. At 75❤ + a ring: propose. Your partner moves into your house; try for a baby (needs the Family House) and **name them yourself**. Babies sleep in the crib — tap it to play **Peekaboo**, **Tickle**, sing a **Lullaby** or **Feed** them, and watch them giggle. They grow into children (play/homework/high-five), then teens.
- **WooHoo 🌹** — partners can WooHoo at the bed; the scene is fully censored Sims-style (shimmering pixel mosaic, floating hearts, "Do not disturb" sign) and boosts fun, social, and the relationship.
- **Generations** — everyone ages in years over time (you start at 22) and the whole household ages at the same pace. Kids grow baby → child → teen → adult. You can **switch control** between family members (👪 Life › Family) to live each one's life, each with their own age, career, and level. A **🌳 Family Tree** tab (👪 Life › Tree) charts your lineage across generations — who married in, who's a child of whom, who you're playing (⭐), and who has passed (🕯️). When your sim's time comes, choose to **live on through your lineage** (take over an heir and keep the family going) or **pass on** and watch a generated **100-year family legacy story** that reflects how you played (wealth, career/business, partner, kids, friends) — then begin a fresh life.
- **Vacations** — book a trip at the town **Travel Agency ✈️**: Sunny Beach, Jungle Trek, Luxury Resort, or Mountain Lodge. The price is a **flight + a rental**, and the **whole family comes along** — each child adds 30% to the total (grown kids who've moved out don't). Each trip is its own explorable map — your spouse and kids hang out by **your rental cabin** (tap it to Sleep / Freshen up / Relax), while you **dig up hidden treasures** (coins, gems, souvenirs) and **book excursions** (snorkeling, ziplines, spa days, sunset sails…). Fly home rested, with a relaxation bonus that grows the more you found and did.
- **Hired help** — call the **Helping Hands Agency** from your home phone 🛎️ to contract a **Nanny** 🍼 (keeps the kids happy), a **Chef** 🍳 (keeps everyone fed) or a **Maid** 🧹 (keeps things clean). $45/day each, or $105/day for the full staff — and you can prepay a week (−15%) or a month (−40%). They show up at home in their work outfits and clock out when the contract ends. A real treat once the coins are flowing.
- **Dopamine loop** — quests with claimable rewards (badge dot on the Life button), XP levels with confetti and job titles, coin bursts, sparkle/heart particles, tiny synth sound effects, daily pacing that favors small frequent wins.
- **Secrets 🤫** — the town keeps a few hidden surprises for the curious. Poke around your own home…

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
