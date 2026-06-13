# Putting Pocket Life online (so anyone can play)

The `http://192.168.1.151:8080` link only works on **your home Wi-Fi while your Mac is on** —
that's why your mom and friend couldn't open it. To share with anyone, put the game on a free
web host. The game is just static files, so this takes about a minute.

Everything you need is in the **`deploy/`** folder (or the **`PocketLife-web.zip`** file) next to this guide.

---

## Easiest: Netlify Drop (no coding, ~1 minute)

1. On your Mac, open **https://app.netlify.com/drop** in a browser.
2. Drag the **`deploy`** folder (from `~/Developer/PocketLife/`) onto the page.
   - (You can drag the `PocketLife-web.zip` instead — it accepts zips too.)
3. Wait a few seconds. You'll get a public link like **`https://sunny-otter-1234.netlify.app`**.
4. Send THAT link to anyone — it works on any phone, any browser (Safari, Edge, Chrome), on any
   network, even when your Mac is off.

⚠️ Without an account the link is temporary (expires in ~1 hour). To keep it forever and give it a
nicer name, click **"Sign up"** (free — you can use a Google/GitHub/email login), then your site
stays live and you can rename it in Site settings → Change site name.

On your friends' phones, they can tap **Share → Add to Home Screen** to install it like an app.

---

## Permanent & free: GitHub Pages

If you have (or make) a free GitHub account:

1. Create a new repository (e.g. `pocket-life`).
2. Upload the **contents of the `deploy/` folder** (drag the files into the repo's web uploader).
3. Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / root → Save**.
4. After a minute your link is **`https://YOUR-USERNAME.github.io/pocket-life/`**.

This link is permanent and doesn't need your Mac running.

---

## Also fine

- **Cloudflare Pages** or **Vercel** — same idea as Netlify (drag/connect a folder, get an HTTPS link).
- **itch.io** — if you want it listed as a game: create a project, set it to "HTML", and upload
  `PocketLife-web.zip` with "This file will be played in the browser" checked.

---

## Notes

- Once it's on any of these (all use **https**), the game also works **offline** after the first load,
  and "Add to Home Screen" gives a real app icon.
- Saves live on each player's own phone, so everyone gets their own game. To move a save between your
  own devices, use the **transfer code** under 👪 Life → Save.
- When you change the game later, re-export the `deploy/` folder and re-drop / re-upload it.
