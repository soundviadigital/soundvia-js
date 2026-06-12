# soundvia

JavaScript / TypeScript client for the [soundvia.eu](https://soundvia.eu) API.

## Installation

```bash
npm install soundvia
# or
yarn add soundvia
# or
pnpm add soundvia
```

Works in Node.js (18+) and any runtime with the native `fetch` API (Bun, Deno, modern browsers, Cloudflare Workers).

## Two clients

| Class | Token type | Use for |
|---|---|---|
| `SoundviaClient` | App token (`svapp_…`) | Public content — tracks, releases, artists, playlists, search |
| `OAuthClient` | User access token (`svtok_…`) | User-specific data — library, playlists, history, follows, notifications, comments |

---

## SoundviaClient — public API

Get an app token from [soundvia.eu/developer](https://soundvia.eu/developer).

```ts
import { SoundviaClient } from "soundvia";

const client = new SoundviaClient("svapp_...");
```

### Status

```ts
const status = await client.status();
console.log(status.app.name);
console.log(status.app.tier);                 // "app" | "approved_app"
console.log(status.app.verificationStatus);   // "none" | "pending" | "approved" | "declined"
console.log(status.app.limits.requestsPerMinute);
```

### Search

```ts
const results = await client.search("lofi beats");

for (const track of results.tracks) {
  console.log(track.title, track.artistName, track.streamCount);
}
for (const release of results.releases) {
  console.log(release.title, release.releaseType); // "single" | "ep" | "album"
}
for (const artist of results.artists) {
  console.log(artist.handle, artist.displayName);
}
```

### Tracks

```ts
const page = await client.listTracks({ q: "chill", limit: 10 });
for (const track of page.tracks) {
  console.log(track.title, track.genre, track.coverArt, track.streamCount);
}

const track = await client.getTrack("TRACK_ID");
console.log(track.artistName, track.artistHandle, track.releaseId);
```

### Releases

```ts
const page = await client.listReleases({ q: "ep", limit: 5 });
const release = await client.getRelease("RELEASE_ID");
console.log(release.releaseType);  // "album" | "ep" | "single"
console.log(release.trackIds);     // string[]
```

### Artists

```ts
const profile = await client.getArtist("rebzyyx");
console.log(profile.artist.displayName, profile.artist.bio, profile.artist.avatar);
for (const track of profile.tracks) console.log(track.title);
for (const release of profile.releases) console.log(release.title);
```

### Playlists

```ts
const page = await client.listPlaylists({ q: "vibes", limit: 20 });
const playlist = await client.getPlaylist("PLAYLIST_ID");
console.log(playlist.name, playlist.description, playlist.trackIds);
```

---

## OAuthClient — user API

### Step 1: build the authorization URL

```ts
import { buildAuthorizationUrl } from "soundvia";

const url = buildAuthorizationUrl({
  clientId: "svcli_...",
  redirectUri: "https://myapp.com/callback",
  scope: "user.read library.read playlists.write",
  state: "random_csrf_token",
});
// redirect the user's browser to `url`
```

**Available scopes:**

| Scope | Access |
|---|---|
| `user.read` | Username, display name, avatar, role |
| `user.email` | Email address |
| `library.read` | Saved releases, playlists, presaves |
| `library.write` | Save/remove library items |
| `playlists.read` | User's playlists |
| `playlists.write` | Create playlists, add/remove tracks |
| `listening.read` | Play history |
| `follows.read` | Following list |
| `follows.write` | Follow/unfollow users |
| `notifications.read` | Notification feed |
| `playback.control` | Control playback |
| `comments.write` | Post/delete comments |

### Step 2: exchange the code for a token

When the user approves, they're redirected to your `redirectUri` with a `code` param:

```ts
import { OAuthClient } from "soundvia";

const client = await OAuthClient.fromCode(request.query.code, {
  clientId: "svcli_...",
  clientSecret: "svsec_...",
  redirectUri: "https://myapp.com/callback",
});

// persist these for later use:
console.log(client.token.accessToken);
console.log(client.token.refreshToken);
console.log(client.token.expiresIn);
console.log(client.token.scope);
```

### Restore a saved token

```ts
const client = OAuthClient.fromToken("svtok_...", {
  refreshToken: "svref_...",
  clientId: "svcli_...",
  clientSecret: "svsec_...",
});
```

### Token lifecycle

```ts
// refresh an expired access token (rotates both tokens)
const newToken = await client.refresh();
console.log(newToken.accessToken, newToken.refreshToken);

// revoke the current token
await client.revoke();

// inspect the current token
const info = await client.tokenInfo();
```

### User profile

```ts
const me = await client.me(); // requires user.read
console.log(me.username, me.displayName, me.avatar, me.role);
// add user.email scope to also get:
console.log(me.email);
```

### Library

```ts
const library = await client.getLibrary(); // requires library.read
console.log(library.counts.total, library.counts.savedReleases);

for (const item of library.items) {
  console.log(item.itemType, item.name, item.trackCount);
  // itemType: "playlist" | "release" | "presave_release"
  console.log(item.isOwner, item.isCollaborator, item.visibility);
}

// save / remove — requires library.write
await client.saveToLibrary("release", "RELEASE_ID");
await client.saveToLibrary("playlist", "PLAYLIST_ID");
await client.removeFromLibrary("release", "RELEASE_ID");
```

### Playlists

```ts
const result = await client.getPlaylists(); // requires playlists.read
for (const pl of result.playlists) {
  console.log(pl.name, pl.trackCount, pl.isOwner, pl.visibility);
}

// create — requires playlists.write
const pl = await client.createPlaylist("Late Night Jams", "vibes only");
console.log(pl.id);

// add / remove tracks — requires playlists.write
await client.addTrackToPlaylist("PLAYLIST_ID", "TRACK_ID");
await client.removeTrackFromPlaylist("PLAYLIST_ID", "TRACK_ID");
```

### Listening history

```ts
const history = await client.getListeningHistory(); // requires listening.read
for (const entry of history.history) {
  console.log(entry.trackId, entry.playedAt);
}
```

### Follows

```ts
const follows = await client.getFollows(); // requires follows.read
console.log(follows.followingIds);

await client.follow("USER_ID");   // requires follows.write
await client.unfollow("USER_ID");
```

### Notifications

```ts
const notifs = await client.getNotifications(); // requires notifications.read
for (const n of notifs.notifications) {
  console.log(n.type, n.message, n.read, n.createdAt);
}
```

### Comments

```ts
const commentId = await client.postComment("TRACK_ID", "great track!"); // requires comments.write
```

---

## Error handling

```ts
import {
  AuthenticationError,
  NotFoundError,
  InsufficientScopeError,
  RateLimitError,
  APIError,
} from "soundvia";

try {
  const track = await client.getTrack("bad-id");
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log("track doesn't exist");
  } else if (err instanceof InsufficientScopeError) {
    console.log("token is missing a required scope");
  } else if (err instanceof RateLimitError) {
    console.log(`retry after ${err.retryAfter}s`);
  } else if (err instanceof AuthenticationError) {
    console.log("check your token");
  } else if (err instanceof APIError) {
    console.log(err.statusCode);
  }
}
```

All exceptions extend `SoundviaError`.

| Exception | HTTP status |
|---|---|
| `AuthenticationError` | 401 |
| `InsufficientScopeError` | 403 |
| `NotFoundError` | 404 |
| `RateLimitError` | 429 (after retries) |
| `APIError` | 5xx or network failure |

On 429 the client reads `Retry-After` and sleeps before retrying. On 5xx it backs off exponentially. Both give up after `maxRetries` attempts (default 3).

## Every response has a `.raw` field

```ts
const track = await client.getTrack("TRACK_ID");
console.log(track.raw); // original response object
```

## Client options

```ts
new SoundviaClient(token, {
  baseUrl: "https://soundvia.eu/api/v1",
  timeout: 15_000,
  maxRetries: 3,
});

OAuthClient.fromToken(accessToken, {
  clientId: "",
  clientSecret: "",
  refreshToken: "",
  baseUrl: "https://soundvia.eu",
  timeout: 15_000,
  maxRetries: 3,
});
```

## License

MIT
