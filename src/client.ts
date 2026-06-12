import {
  APIError,
  AuthenticationError,
  InsufficientScopeError,
  NotFoundError,
  RateLimitError,
} from "./errors.js";
import {
  OAuthToken,
  StatusResult,
  SearchResult,
  Track,
  TrackListResult,
  Release,
  ReleaseListResult,
  ArtistProfileResult,
  Playlist,
  PlaylistListResult,
  UserProfile,
  LibraryResult,
  LibraryItemType,
  UserPlaylist,
  UserPlaylistListResult,
  PlayHistoryResult,
  FollowsResult,
  NotificationsResult,
  parseStatusResult,
  parseSearchResult,
  parseTrack,
  parseTrackListResult,
  parseRelease,
  parseReleaseListResult,
  parseArtistProfileResult,
  parsePlaylist,
  parsePlaylistListResult,
  parseOAuthToken,
  parseUserProfile,
  parseLibraryResult,
  parseUserPlaylist,
  parseUserPlaylistListResult,
  parsePlayHistoryResult,
  parseFollowsResult,
  parseNotificationsResult,
} from "./models.js";

const BASE_URL = "https://soundvia.eu/api/v1";
const OAUTH_BASE_URL = "https://soundvia.eu";
const DEFAULT_TIMEOUT = 15_000;
const DEFAULT_LIMIT = 20;
const USER_AGENT = "soundvia-js/1.0.0";

type RawDict = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Sleep helper
// ---------------------------------------------------------------------------
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// HTTP mixin
// ---------------------------------------------------------------------------
abstract class HttpMixin {
  protected abstract _baseUrl: string;
  protected abstract _timeout: number;
  protected abstract _maxRetries: number;
  protected abstract _headers(): Record<string, string>;

  protected _buildUrl(base: string, path: string, params?: Record<string, string | number | null | undefined>): string {
    const url = `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
    if (!params) return url;
    const filtered = Object.entries(params)
      .filter(([, v]) => v != null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    return filtered.length ? `${url}?${filtered.join("&")}` : url;
  }

  protected async _request(method: string, url: string, body?: RawDict): Promise<RawDict> {
    const headers: Record<string, string> = {
      ...this._headers(),
      ...(body ? { "Content-Type": "application/json" } : {}),
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this._timeout);

    let attempt = 0;
    while (true) {
      attempt++;
      try {
        const res = await fetch(url, {
          method: method.toUpperCase(),
          headers,
          body: body != null ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        if (res.ok) {
          clearTimeout(timer);
          const text = await res.text();
          return text.trim() ? (JSON.parse(text) as RawDict) : {};
        }

        const rawText = await res.text().catch(() => "");
        let errMsg = "";
        let errData: RawDict = {};
        try { errData = JSON.parse(rawText) as RawDict; } catch { /**/ }
        errMsg = String((errData.error_description ?? errData.error ?? rawText) || res.statusText);

        if (res.status === 401) {
          clearTimeout(timer);
          throw new AuthenticationError();
        }
        if (res.status === 403) {
          clearTimeout(timer);
          throw new InsufficientScopeError(errMsg || "Insufficient scope.");
        }
        if (res.status === 404) {
          clearTimeout(timer);
          throw new NotFoundError(errMsg || "Resource not found.");
        }
        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get("Retry-After") ?? "60", 10) || 60;
          if (attempt <= this._maxRetries) {
            await sleep(retryAfter * 1000);
            continue;
          }
          clearTimeout(timer);
          throw new RateLimitError(retryAfter);
        }
        if (res.status >= 500 && attempt <= this._maxRetries) {
          await sleep(Math.pow(2, attempt) * 1000);
          continue;
        }
        clearTimeout(timer);
        throw new APIError(errMsg || `HTTP ${res.status}`, res.status);

      } catch (err) {
        if (err instanceof AuthenticationError || err instanceof InsufficientScopeError ||
            err instanceof NotFoundError || err instanceof RateLimitError ||
            err instanceof APIError) {
          throw err;
        }
        // Network / abort error
        if (attempt <= this._maxRetries) {
          await sleep(Math.pow(2, attempt) * 1000);
          continue;
        }
        clearTimeout(timer);
        throw new APIError(`Network error: ${(err as Error).message}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// SoundviaClient — public API (app token)
// ---------------------------------------------------------------------------

export interface SoundviaClientOptions {
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export class SoundviaClient extends HttpMixin {
  protected _baseUrl: string;
  protected _timeout: number;
  protected _maxRetries: number;
  private _token: string;

  constructor(token: string, options: SoundviaClientOptions = {}) {
    super();
    if (!token) throw new Error("A non-empty API token is required.");
    this._token = token;
    this._baseUrl = (options.baseUrl ?? BASE_URL).replace(/\/$/, "");
    this._timeout = (options.timeout ?? DEFAULT_TIMEOUT);
    this._maxRetries = options.maxRetries ?? 3;
  }

  protected _headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this._token}`,
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    };
  }

  private async _get(path: string, params?: Record<string, string | number | null | undefined>): Promise<RawDict> {
    return this._request("GET", this._buildUrl(this._baseUrl, path, params));
  }

  /** Return app identity, tier, and current rate-limit config. */
  async status(): Promise<StatusResult> {
    return parseStatusResult(await this._get("/status"));
  }

  /** Search tracks, releases, and artists with a single query. */
  async search(query: string, limit = DEFAULT_LIMIT): Promise<SearchResult> {
    return parseSearchResult(await this._get("/search", { q: query, limit }));
  }

  /** List public tracks, optionally filtered by `q`. */
  async listTracks(options: { q?: string; limit?: number } = {}): Promise<TrackListResult> {
    return parseTrackListResult(await this._get("/tracks", { q: options.q, limit: options.limit ?? DEFAULT_LIMIT }));
  }

  /** Return a single public track by ID. */
  async getTrack(trackId: string): Promise<Track> {
    const data = await this._get(`/tracks/${trackId}`);
    return parseTrack((data.track ?? data) as RawDict);
  }

  /** List public releases, optionally filtered by `q`. */
  async listReleases(options: { q?: string; limit?: number } = {}): Promise<ReleaseListResult> {
    return parseReleaseListResult(await this._get("/releases", { q: options.q, limit: options.limit ?? DEFAULT_LIMIT }));
  }

  /** Return a single public release by ID. */
  async getRelease(releaseId: string): Promise<Release> {
    const data = await this._get(`/releases/${releaseId}`);
    return parseRelease((data.release ?? data) as RawDict);
  }

  /** Return an artist's profile plus their latest tracks and releases. */
  async getArtist(handle: string): Promise<ArtistProfileResult> {
    return parseArtistProfileResult(await this._get(`/artists/${handle}`));
  }

  /** List public playlists, optionally filtered by `q`. */
  async listPlaylists(options: { q?: string; limit?: number } = {}): Promise<PlaylistListResult> {
    return parsePlaylistListResult(await this._get("/playlists", { q: options.q, limit: options.limit ?? DEFAULT_LIMIT }));
  }

  /** Return a single public playlist by ID. */
  async getPlaylist(playlistId: string): Promise<Playlist> {
    const data = await this._get(`/playlists/${playlistId}`);
    return parsePlaylist((data.playlist ?? data) as RawDict);
  }

  toString(): string {
    const masked = `${this._token.slice(0, 8)}${"*".repeat(Math.max(0, this._token.length - 8))}`;
    return `SoundviaClient(token="${masked}", baseUrl="${this._baseUrl}")`;
  }
}

// ---------------------------------------------------------------------------
// buildAuthorizationUrl
// ---------------------------------------------------------------------------

export interface BuildAuthorizationUrlOptions {
  clientId: string;
  redirectUri: string;
  scope: string;
  state?: string;
  baseUrl?: string;
}

/**
 * Return the URL to redirect users to for OAuth authorization.
 *
 * Available scopes: user.read, user.email, library.read, library.write,
 * playlists.read, playlists.write, listening.read, follows.read, follows.write,
 * notifications.read, playback.control, comments.write
 */
export function buildAuthorizationUrl(options: BuildAuthorizationUrlOptions): string {
  const base = (options.baseUrl ?? OAUTH_BASE_URL).replace(/\/$/, "");
  const params = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    response_type: "code",
    scope: options.scope,
  });
  if (options.state) params.set("state", options.state);
  return `${base}/oauth/authorize?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// OAuthClient — user API (user access token)
// ---------------------------------------------------------------------------

export interface OAuthClientOptions {
  clientId?: string;
  clientSecret?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface FromCodeOptions extends OAuthClientOptions {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface FromTokenOptions extends OAuthClientOptions {
  refreshToken?: string;
}

export class OAuthClient extends HttpMixin {
  protected _baseUrl: string;
  protected _timeout: number;
  protected _maxRetries: number;
  private _tokenObj: OAuthToken | null;
  private _clientId: string;
  private _clientSecret: string;

  private constructor(
    tokenObj: OAuthToken | null,
    options: OAuthClientOptions = {},
  ) {
    super();
    this._tokenObj = tokenObj;
    this._clientId = options.clientId ?? "";
    this._clientSecret = options.clientSecret ?? "";
    this._baseUrl = (options.baseUrl ?? OAUTH_BASE_URL).replace(/\/$/, "");
    this._timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this._maxRetries = options.maxRetries ?? 3;
  }

  /** Exchange an authorization code for an access token. */
  static async fromCode(code: string, options: FromCodeOptions): Promise<OAuthClient> {
    const instance = new OAuthClient(null, options);
    instance._tokenObj = await instance._exchangeCode(code, options.redirectUri);
    return instance;
  }

  /** Create a client from an already-obtained access token string. */
  static fromToken(accessToken: string, options: FromTokenOptions = {}): OAuthClient {
    const tokenObj: OAuthToken = {
      accessToken,
      tokenType: "Bearer",
      expiresIn: 3600,
      refreshToken: options.refreshToken ?? "",
      scope: "",
      raw: {},
    };
    return new OAuthClient(tokenObj, options);
  }

  /** The current OAuthToken, or null if not yet set. */
  get token(): OAuthToken | null {
    return this._tokenObj;
  }

  protected _headers(): Record<string, string> {
    if (!this._tokenObj?.accessToken) {
      throw new AuthenticationError("No access token set on OAuthClient.");
    }
    return {
      Authorization: `Bearer ${this._tokenObj.accessToken}`,
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    };
  }

  private _tokenEndpointHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    };
  }

  private async _exchangeCode(code: string, redirectUri: string): Promise<OAuthToken> {
    const url = `${this._baseUrl}/oauth/token`;
    const res = await fetch(url, {
      method: "POST",
      headers: this._tokenEndpointHeaders(),
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: this._clientId,
        client_secret: this._clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let msg = "";
      try { msg = String((JSON.parse(text) as RawDict).error_description ?? (JSON.parse(text) as RawDict).error ?? text); } catch { msg = text; }
      throw new APIError(msg || `HTTP ${res.status}`, res.status);
    }
    return parseOAuthToken(await res.json() as RawDict);
  }

  /**
   * Use the stored refresh token to obtain a new access token.
   * The client's internal token is updated in place and also returned.
   */
  async refresh(): Promise<OAuthToken> {
    if (!this._tokenObj?.refreshToken) {
      throw new APIError("No refresh token available.");
    }
    const url = `${this._baseUrl}/oauth/token`;
    const res = await fetch(url, {
      method: "POST",
      headers: this._tokenEndpointHeaders(),
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: this._clientId,
        client_secret: this._clientSecret,
        refresh_token: this._tokenObj.refreshToken,
      }),
    });
    if (!res.ok) {
      throw new APIError(`HTTP ${res.status}`, res.status);
    }
    this._tokenObj = parseOAuthToken(await res.json() as RawDict);
    return this._tokenObj;
  }

  /** Revoke the current access (and refresh) token. Returns true on success. */
  async revoke(): Promise<boolean> {
    if (!this._tokenObj) return false;
    try {
      const res = await fetch(`${this._baseUrl}/oauth/revoke`, {
        method: "POST",
        headers: this._tokenEndpointHeaders(),
        body: JSON.stringify({ token: this._tokenObj.accessToken }),
      });
      const data = await res.json() as RawDict;
      return Boolean(data.revoked);
    } catch {
      return false;
    }
  }

  /** Return raw token metadata from /oauth/tokeninfo. */
  async tokenInfo(): Promise<RawDict> {
    return this._getOAuth("/oauth/tokeninfo");
  }

  private async _getOAuth(path: string, params?: Record<string, string | number | null | undefined>): Promise<RawDict> {
    return this._request("GET", this._buildUrl(this._baseUrl, path, params));
  }

  private async _postOAuth(path: string, body?: RawDict): Promise<RawDict> {
    return this._request("POST", this._buildUrl(this._baseUrl, path), body);
  }

  private async _deleteOAuth(path: string, body?: RawDict): Promise<RawDict> {
    return this._request("DELETE", this._buildUrl(this._baseUrl, path), body);
  }

  // --- User API ---

  /** Requires scope: user.read */
  async me(): Promise<UserProfile> {
    const data = await this._getOAuth("/oauth/api/me");
    return parseUserProfile((data.user ?? data) as RawDict);
  }

  /** Requires scope: library.read */
  async getLibrary(): Promise<LibraryResult> {
    return parseLibraryResult(await this._getOAuth("/oauth/api/library"));
  }

  /** Requires scope: library.write */
  async saveToLibrary(itemType: LibraryItemType, itemId: string): Promise<boolean> {
    const data = await this._postOAuth("/oauth/api/library/save", { type: itemType, id: itemId });
    return Boolean(data.saved);
  }

  /** Requires scope: library.write */
  async removeFromLibrary(itemType: LibraryItemType, itemId: string): Promise<boolean> {
    const data = await this._postOAuth("/oauth/api/library/remove", { type: itemType, id: itemId });
    return Boolean(data.removed);
  }

  /** Requires scope: playlists.read */
  async getPlaylists(): Promise<UserPlaylistListResult> {
    return parseUserPlaylistListResult(await this._getOAuth("/oauth/api/playlists"));
  }

  /** Requires scope: playlists.write */
  async createPlaylist(name: string, description = ""): Promise<UserPlaylist> {
    const body: RawDict = { name };
    if (description) body.description = description;
    const data = await this._postOAuth("/oauth/api/playlists", body);
    return parseUserPlaylist((data.playlist ?? data) as RawDict);
  }

  /** Requires scope: playlists.write */
  async addTrackToPlaylist(playlistId: string, trackId: string): Promise<boolean> {
    const data = await this._postOAuth(`/oauth/api/playlists/${playlistId}/tracks`, { track_id: trackId });
    return Boolean(data.added);
  }

  /** Requires scope: playlists.write */
  async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<boolean> {
    const data = await this._deleteOAuth(`/oauth/api/playlists/${playlistId}/tracks`, { track_id: trackId });
    return Boolean(data.removed);
  }

  /** Requires scope: listening.read */
  async getListeningHistory(): Promise<PlayHistoryResult> {
    return parsePlayHistoryResult(await this._getOAuth("/oauth/api/history"));
  }

  /** Requires scope: follows.read */
  async getFollows(): Promise<FollowsResult> {
    return parseFollowsResult(await this._getOAuth("/oauth/api/follows"));
  }

  /** Requires scope: follows.write */
  async follow(userId: string): Promise<boolean> {
    const data = await this._postOAuth("/oauth/api/follows", { user_id: userId });
    return Boolean(data.followed);
  }

  /** Requires scope: follows.write */
  async unfollow(userId: string): Promise<boolean> {
    const data = await this._deleteOAuth("/oauth/api/follows", { user_id: userId });
    return Boolean(data.unfollowed);
  }

  /** Requires scope: notifications.read */
  async getNotifications(): Promise<NotificationsResult> {
    return parseNotificationsResult(await this._getOAuth("/oauth/api/notifications"));
  }

  /** Post a comment on a track. Returns the new comment ID. Requires scope: comments.write */
  async postComment(trackId: string, text: string): Promise<string> {
    const data = await this._postOAuth("/oauth/api/comments", { track_id: trackId, text });
    return String(data.comment_id ?? "");
  }

  toString(): string {
    const tok = this._tokenObj?.accessToken ?? "";
    const masked = tok ? `${tok.slice(0, 10)}***` : "(no token)";
    return `OAuthClient(token="${masked}", baseUrl="${this._baseUrl}")`;
  }
}
