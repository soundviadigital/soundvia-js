export class SoundviaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SoundviaError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class APIError extends SoundviaError {
  statusCode: number | null;
  constructor(message: string, statusCode: number | null = null) {
    super(message);
    this.name = "APIError";
    this.statusCode = statusCode;
  }
}

export class AuthenticationError extends SoundviaError {
  constructor(message = "Invalid or missing token. Check that you passed the correct token.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class InsufficientScopeError extends SoundviaError {
  constructor(message = "Insufficient scope.") {
    super(message);
    this.name = "InsufficientScopeError";
  }
}

export class NotFoundError extends SoundviaError {
  constructor(message = "Resource not found.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends SoundviaError {
  retryAfter: number;
  constructor(retryAfter = 60) {
    super(`Rate limit exceeded. Retry after ${retryAfter}s.`);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}
