// You can paste your Spotify Client ID here, or enter it in the app's Settings (gear icon).
// A client ID is public by design (PKCE has no secret), so committing it is fine.
export const DEFAULT_CLIENT_ID = '';

export const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-read-collaborative',
];

export const BUILD = 'v5';
