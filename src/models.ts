// ---------------------------------------------------------------------------
// App / Status
// ---------------------------------------------------------------------------

export interface AppLimits {
  requestsPerMinute: number;
  responseBytesPerMinute: number;
  raw: Record<string, unknown>;
}

export interface AppInfo {
  id: string;
  name: string;
  tier: string;
  verificationStatus: string;
  limits: AppLimits;
  raw: Record<string, unknown>;
}

export interface StatusResult {
  ok: boolean;
  api: string;
  app: AppInfo;
  raw: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Track
// ---------------------------------------------------------------------------

export interface Track {
  id: string;
  title: string;
  artistId: string | null;
  artistName: string | null;
  artistHandle: string | null;
  genre: string | null;
  coverArt: string | null;
  streamCount: number;
  releaseId: string | null;
  createdAt: string | null;
  raw: Record<string, unknown>;
}

export interface TrackListResult {
  tracks: Track[];
  raw: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Release
// ---------------------------------------------------------------------------

export interface Release {
  id: string;
  title: string;
  releaseType: string | null;
  artistId: string | null;
  artistName: string | null;
  artistHandle: string | null;
  genre: string | null;
  coverArt: string | null;
  trackIds: string[];
  createdAt: string | null;
  raw: Record<string, unknown>;
}

export interface ReleaseListResult {
  releases: Release[];
  raw: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Artist
// ---------------------------------------------------------------------------

export interface Artist {
  id: string;
  handle: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  createdAt: string | null;
  raw: Record<string, unknown>;
}

export interface ArtistProfileResult {
  artist: Artist;
  tracks: Track[];
  releases: Release[];
  raw: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Playlist
// ---------------------------------------------------------------------------

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  coverArt: string | null;
  trackIds: string[];
  createdAt: string | null;
  raw: Record<string, unknown>;
}

export interface PlaylistListResult {
  playlists: Playlist[];
  raw: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface SearchResult {
  query: string;
  tracks: Track[];
  releases: Release[];
  artists: Artist[];
  raw: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// OAuth – Token
// ---------------------------------------------------------------------------

export interface OAuthToken {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
  scope: string;
  raw: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// OAuth – User Profile
// ---------------------------------------------------------------------------

export interface UserProfile {
  id: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  role: string | null;
  email: string | null;
  raw: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// OAuth – Library
// ---------------------------------------------------------------------------

export type LibraryItemType = "playlist" | "release" | "presave_release";

export interface LibraryItem {
  libraryKey: string;
  itemType: LibraryItemType;
  itemId: string;
  name: string;
  description: string | null;
  coverArt: string | null;
  href: string | null;
  trackCount: number;
  isSavedItem: boolean;
  isOwner: boolean | null;
  isCollaborator: boolean | null;
  visibility: string | null;
  createdAt: string | null;
  raw: Record<string, unknown>;
}

export interface LibraryCounts {
  total: number;
  savedReleases: number;
  savedPlaylists: number;
  presavedReleases: number;
}

export interface LibraryResult {
  items: LibraryItem[];
  counts: LibraryCounts;
  raw: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// OAuth – User Playlists
// ---------------------------------------------------------------------------

export interface UserPlaylist {
  id: string;
  name: string;
  description: string | null;
  coverArt: string | null;
  trackCount: number;
  isOwner: boolean;
  visibility: string | null;
  raw: Record<string, unknown>;
}

export interface UserPlaylistListResult {
  playlists: UserPlaylist[];
  raw: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// OAuth – Listening History
// ---------------------------------------------------------------------------

export interface PlayHistoryEntry {
  trackId: string;
  playedAt: string | null;
  raw: Record<string, unknown>;
}

export interface PlayHistoryResult {
  history: PlayHistoryEntry[];
  raw: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// OAuth – Follows
// ---------------------------------------------------------------------------

export interface FollowsResult {
  followingIds: string[];
  raw: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// OAuth – Notifications
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  type: string | null;
  message: string | null;
  read: boolean;
  createdAt: string | null;
  raw: Record<string, unknown>;
}

export interface NotificationsResult {
  notifications: Notification[];
  raw: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Parsers (raw API dict → typed model)
// ---------------------------------------------------------------------------

type RawDict = Record<string, unknown>;

function str(v: unknown): string { return typeof v === "string" ? v : String(v ?? ""); }
function strOrNull(v: unknown): string | null { return v != null && v !== "" ? str(v) : null; }
function num(v: unknown): number { return v != null ? Number(v) || 0 : 0; }
function bool(v: unknown): boolean { return Boolean(v); }
function boolOrNull(v: unknown): boolean | null { return v == null ? null : bool(v); }
function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String) : [];
}

export function parseAppLimits(d: RawDict): AppLimits {
  return {
    requestsPerMinute: num(d.requests_per_minute),
    responseBytesPerMinute: num(d.response_bytes_per_minute),
    raw: d,
  };
}

export function parseAppInfo(d: RawDict): AppInfo {
  return {
    id: str(d.id),
    name: str(d.name),
    tier: str(d.tier),
    verificationStatus: str(d.verification_status),
    limits: parseAppLimits((d.limits as RawDict) ?? {}),
    raw: d,
  };
}

export function parseStatusResult(d: RawDict): StatusResult {
  return {
    ok: bool(d.ok),
    api: str(d.api),
    app: parseAppInfo((d.app as RawDict) ?? {}),
    raw: d,
  };
}

export function parseTrack(d: RawDict): Track {
  return {
    id: str(d.id),
    title: str(d.title),
    artistId: strOrNull(d.artist_id),
    artistName: strOrNull(d.artist_name),
    artistHandle: strOrNull(d.artist_handle),
    genre: strOrNull(d.genre),
    coverArt: strOrNull(d.cover_art),
    streamCount: num(d.stream_count),
    releaseId: strOrNull(d.release_id),
    createdAt: strOrNull(d.created_at),
    raw: d,
  };
}

export function parseTrackListResult(d: RawDict): TrackListResult {
  return {
    tracks: ((d.tracks as RawDict[]) ?? []).map(parseTrack),
    raw: d,
  };
}

export function parseRelease(d: RawDict): Release {
  return {
    id: str(d.id),
    title: str(d.title),
    releaseType: strOrNull(d.release_type ?? d.type),
    artistId: strOrNull(d.artist_id),
    artistName: strOrNull(d.artist_name),
    artistHandle: strOrNull(d.artist_handle),
    genre: strOrNull(d.genre),
    coverArt: strOrNull(d.cover_art),
    trackIds: strList(d.track_ids ?? d.tracks),
    createdAt: strOrNull(d.created_at),
    raw: d,
  };
}

export function parseReleaseListResult(d: RawDict): ReleaseListResult {
  return {
    releases: ((d.releases as RawDict[]) ?? []).map(parseRelease),
    raw: d,
  };
}

export function parseArtist(d: RawDict): Artist {
  return {
    id: str(d.id),
    handle: str(d.handle),
    displayName: strOrNull(d.display_name),
    avatar: strOrNull(d.avatar),
    bio: strOrNull(d.bio),
    createdAt: strOrNull(d.created_at),
    raw: d,
  };
}

export function parseArtistProfileResult(d: RawDict): ArtistProfileResult {
  return {
    artist: parseArtist((d.artist as RawDict) ?? {}),
    tracks: ((d.tracks as RawDict[]) ?? []).map(parseTrack),
    releases: ((d.releases as RawDict[]) ?? []).map(parseRelease),
    raw: d,
  };
}

export function parsePlaylist(d: RawDict): Playlist {
  return {
    id: str(d.id),
    name: str(d.name ?? d.title),
    description: strOrNull(d.description),
    coverArt: strOrNull(d.cover_art),
    trackIds: strList(d.track_ids ?? d.tracks),
    createdAt: strOrNull(d.created_at),
    raw: d,
  };
}

export function parsePlaylistListResult(d: RawDict): PlaylistListResult {
  return {
    playlists: ((d.playlists as RawDict[]) ?? []).map(parsePlaylist),
    raw: d,
  };
}

export function parseSearchResult(d: RawDict): SearchResult {
  return {
    query: str(d.query),
    tracks: ((d.tracks as RawDict[]) ?? []).map(parseTrack),
    releases: ((d.releases as RawDict[]) ?? []).map(parseRelease),
    artists: ((d.artists as RawDict[]) ?? []).map(parseArtist),
    raw: d,
  };
}

export function parseOAuthToken(d: RawDict): OAuthToken {
  return {
    accessToken: str(d.access_token),
    tokenType: str(d.token_type ?? "Bearer"),
    expiresIn: num(d.expires_in ?? 3600),
    refreshToken: str(d.refresh_token),
    scope: str(d.scope),
    raw: d,
  };
}

export function parseUserProfile(d: RawDict): UserProfile {
  return {
    id: str(d.id),
    username: strOrNull(d.username),
    displayName: strOrNull(d.display_name),
    avatar: strOrNull(d.avatar),
    role: strOrNull(d.role),
    email: strOrNull(d.email),
    raw: d,
  };
}

export function parseLibraryItem(d: RawDict): LibraryItem {
  return {
    libraryKey: str(d.library_key),
    itemType: str(d.item_type) as LibraryItemType,
    itemId: str(d.item_id),
    name: str(d.name),
    description: strOrNull(d.description),
    coverArt: strOrNull(d.cover_art),
    href: strOrNull(d.href),
    trackCount: num(d.track_count),
    isSavedItem: bool(d.is_saved_item),
    isOwner: boolOrNull(d.is_owner),
    isCollaborator: boolOrNull(d.is_collaborator),
    visibility: strOrNull(d.visibility),
    createdAt: strOrNull(d.created_at),
    raw: d,
  };
}

export function parseLibraryResult(d: RawDict): LibraryResult {
  const itemsData = (d.library ?? d.items) as RawDict[] ?? [];
  const counts = (d.counts as RawDict) ?? {};
  return {
    items: itemsData.map(parseLibraryItem),
    counts: {
      total: num(counts.total),
      savedReleases: num(counts.saved_releases),
      savedPlaylists: num(counts.saved_playlists),
      presavedReleases: num(counts.presaved_releases),
    },
    raw: d,
  };
}

export function parseUserPlaylist(d: RawDict): UserPlaylist {
  return {
    id: str(d.id),
    name: str(d.name),
    description: strOrNull(d.description),
    coverArt: strOrNull(d.cover_art),
    trackCount: num(d.track_count),
    isOwner: bool(d.is_owner),
    visibility: strOrNull(d.visibility),
    raw: d,
  };
}

export function parseUserPlaylistListResult(d: RawDict): UserPlaylistListResult {
  return {
    playlists: ((d.playlists as RawDict[]) ?? []).map(parseUserPlaylist),
    raw: d,
  };
}

export function parsePlayHistoryResult(d: RawDict): PlayHistoryResult {
  return {
    history: ((d.history as RawDict[]) ?? []).map((e) => ({
      trackId: str(e.track_id),
      playedAt: strOrNull(e.played_at),
      raw: e,
    })),
    raw: d,
  };
}

export function parseFollowsResult(d: RawDict): FollowsResult {
  return {
    followingIds: strList(d.following_ids),
    raw: d,
  };
}

export function parseNotificationsResult(d: RawDict): NotificationsResult {
  return {
    notifications: ((d.notifications as RawDict[]) ?? []).map((n) => ({
      id: str(n.id),
      type: strOrNull(n.type),
      message: strOrNull(n.message),
      read: bool(n.read),
      createdAt: strOrNull(n.created_at),
      raw: n,
    })),
    raw: d,
  };
}
