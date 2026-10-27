# Setup: Spotify app + free hosting

Car Mode is a static site (no server, no build step). You need two things: somewhere to host it over **HTTPS**, and a Spotify developer app.

## 1. Host it (GitHub Pages, free)

1. Push this repo to GitHub.
2. Repo → **Settings → Pages** → Source: *Deploy from a branch* → branch `main`, folder `/ (root)` → Save.
3. After a minute your site is at `https://<your-username>.github.io/<repo-name>/`.
   Note the exact URL, **including the trailing slash**. You need it for step 2.

(Vercel also works: import the repo, framework preset "Other", no build command. Your URL will be `https://<project>.vercel.app/`.)

## 2. Create the Spotify app

1. Go to <https://developer.spotify.com/dashboard> and log in (accept the developer terms the first time).
2. **Create app**
   - Name / description: anything (e.g. "Car Mode")
   - **Redirect URI**: your site URL from step 1, exactly, e.g. `https://yourname.github.io/Car-Mode-for-iphone/`
     (click **Add**; it is case-sensitive and the trailing slash matters.
     The same string is shown in the app under Settings ⚙︎, so you can copy it from there.)
   - APIs used: tick **Web API**
3. Save, then open the app → **Settings** → copy the **Client ID**. (No secret is needed for PKCE; ignore "Client secret".)
4. In development mode, Spotify only lets users you list under **User Management** log in. Add the name and email of your Spotify account there if it isn't the owner account. Spotify has been tightening developer-mode rules, so if login is refused, check the dashboard for current limits.
5. Controlling playback through the Web API requires **Spotify Premium**.

## 3. Install on the iPhone

1. Open your site URL in **Safari**, tap Share → **Add to Home Screen**.
2. Open Car Mode **from the home screen icon** (not Safari). Safari and the home screen app keep separate storage, so log in from the icon.
3. Tap ⚙︎ → paste the Client ID → Save. (Or paste it into `js/config.js` and redeploy.)
4. Tap **Log in with Spotify** and approve. You land back in the app.

After deploying changes, bump `VERSION` in `sw.js` so phones pick up the new files.

## 4. Using it

- **Drive tab** (home): live map following your GPS, speed, your nav destinations and now playing, CarPlay style. Allow Location when iOS asks (Settings → Privacy → Location Services → Safari Websites / Car Mode if it was refused). The map only updates while Car Mode is open in the foreground.

- **Navigate tab** (and the "Go to" strip on the Drive tab): tap Home / Work to start Google Maps driving directions. Google Maps takes over the screen while navigating; switch back to Car Mode when you want the dashboard. Tap ✎ to edit tiles, then a tile (or ＋) to set an address.
- **Quick tab**: call favourites (`tel:`), Messages (`sms:`), Siri Shortcuts (`shortcuts://run-shortcut?name=…`, use the exact shortcut name) or any URL.
- **Playlists tab**: tap a tile to play. If Spotify isn't active, Car Mode opens the Spotify app and retries playback when you switch back.
- Audio is played by the Spotify app and goes to the RCD-510 over Bluetooth as normal. Car Mode is just the remote.

## Notes / troubleshooting

- Set up tiles and log in while parked.
- **Maps opens in the browser instead of the app?** Install Google Maps, or Settings → "Open navigation with" → *Google Maps app scheme*.
- **Siri Shortcut does nothing?** The name must match exactly. iOS asks to confirm the first time per shortcut.
- **"Invalid redirect URI" at Spotify**: the dashboard value must match Settings → Redirect URI character for character.
- **Screen stays on** via the Wake Lock API (iOS 16.4+). Auto-Lock settings still apply otherwise.
