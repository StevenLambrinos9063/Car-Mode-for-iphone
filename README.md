# Car Mode for iPhone

A dark, landscape-friendly PWA that acts as a simple CarPlay replacement: Google Maps shortcuts, Spotify remote control, call/message/Siri Shortcut quick actions, and a clock.

No build step: serve the folder over HTTPS. See [docs/SETUP.md](docs/SETUP.md) for Spotify and hosting setup.

Local preview: `python3 -m http.server 8123`, then open <http://localhost:8123/>. Spotify login needs a registered HTTPS redirect URI, so test that part on the hosted site.
