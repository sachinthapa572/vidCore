/**
 * An object containing standard HTTP status codes.
 * Each property key corresponds to a standard HTTP status code name,
 * and its value is the associated numeric code.
 *
 * @remarks
 * This object is intended to provide numeric codes for use in
 * logging, error handling, and HTTP response generation.
 *
 * @example
 * ```typescript
 * import { HttpStatusCode } from './http-status-codes';
 *
 * console.log(HttpStatusCode.NOT_FOUND); // 404
 * ```
 */
export const HttpStatusCode = {
  ACCEPTED: 202,
  BAD_GATEWAY: 502,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  CONTINUE: 100,
  CREATED: 201,
  EXPECTATION_FAILED: 417,
  FAILED_DEPENDENCY: 424,
  FORBIDDEN: 403,
  GATEWAY_TIMEOUT: 504,
  GONE: 410,
  HTTP_VERSION_NOT_SUPPORTED: 505,
  IM_A_TEAPOT: 418,
  INSUFFICIENT_SPACE_ON_RESOURCE: 419,
  INSUFFICIENT_STORAGE: 507,
  INTERNAL_SERVER_ERROR: 500,
  LENGTH_REQUIRED: 411,
  LOCKED: 423,
  METHOD_FAILURE: 420,
  METHOD_NOT_ALLOWED: 405,
  MOVED_PERMANENTLY: 301,
  MOVED_TEMPORARILY: 302,
  MULTI_STATUS: 207,
  MULTIPLE_CHOICES: 300,
  NETWORK_AUTHENTICATION_REQUIRED: 511,
  NO_CONTENT: 204,
  NON_AUTHORITATIVE_INFORMATION: 203,
  NOT_ACCEPTABLE: 406,
  NOT_FOUND: 404,
  NOT_IMPLEMENTED: 501,
  NOT_MODIFIED: 304,
  OK: 200,
  PARTIAL_CONTENT: 206,
  PAYMENT_REQUIRED: 402,
  PERMANENT_REDIRECT: 308,
  PRECONDITION_FAILED: 412,
  PRECONDITION_REQUIRED: 428,
  PROCESSING: 102,
  EARLY_HINTS: 103,
  UPGRADE_REQUIRED: 426,
  PROXY_AUTHENTICATION_REQUIRED: 407,
  REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
  REQUEST_TIMEOUT: 408,
  REQUEST_TOO_LONG: 413,
  REQUEST_URI_TOO_LONG: 414,
  REQUESTED_RANGE_NOT_SATISFIABLE: 416,
  RESET_CONTENT: 205,
  SEE_OTHER: 303,
  SERVICE_UNAVAILABLE: 503,
  SWITCHING_PROTOCOLS: 101,
  TEMPORARY_REDIRECT: 307,
  TOO_MANY_REQUESTS: 429,
  UNAUTHORIZED: 401,
  UNAVAILABLE_FOR_LEGAL_REASONS: 451,
  UNPROCESSABLE_ENTITY: 422,
  UNSUPPORTED_MEDIA_TYPE: 415,
  USE_PROXY: 305,
  MISDIRECTED_REQUEST: 421,
} as const;

/**
 * An object containing human-readable phrases for HTTP status codes.
 * Each property key corresponds to a standard HTTP status code name,
 * and its value is the associated phrase as used in HTTP responses.
 *
 * @remarks
 * This object is intended to provide descriptive phrases for use in
 * logging, error handling, and HTTP response generation.
 *
 * @example
 * ```typescript
 * import { HttpStatusPhrase } from './http-status-codes';
 *
 * console.log(HttpStatusPhrase.NOT_FOUND); // "not found"
 * ```
 */
export const HttpStatusPhrase = {
  ACCEPTED: "accepted",
  BAD_GATEWAY: "bad gateway",
  BAD_REQUEST: "bad request",
  CONFLICT: "conflict",
  CONTINUE: "continue",
  CREATED: "created",
  EXPECTATION_FAILED: "expectation failed",
  FAILED_DEPENDENCY: "failed dependency",
  FORBIDDEN: "forbidden",
  GATEWAY_TIMEOUT: "gateway timeout",
  GONE: "gone",
  HTTP_VERSION_NOT_SUPPORTED: "http version not supported",
  IM_A_TEAPOT: "I'm a teapot",
  INSUFFICIENT_SPACE_ON_RESOURCE: "insufficient space on resource",
  INSUFFICIENT_STORAGE: "insufficient storage",
  INTERNAL_SERVER_ERROR: "internal server error",
  LENGTH_REQUIRED: "length required",
  LOCKED: "locked",
  METHOD_FAILURE: "method failure",
  METHOD_NOT_ALLOWED: "method not allowed",
  MOVED_PERMANENTLY: "moved permanently",
  MOVED_TEMPORARILY: "moved temporarily",
  MULTI_STATUS: "multi status",
  MULTIPLE_CHOICES: "multiple choices",
  NETWORK_AUTHENTICATION_REQUIRED: "network authentication required",
  NO_CONTENT: "no content",
  NON_AUTHORITATIVE_INFORMATION: "non-authoritative information",
  NOT_ACCEPTABLE: "not acceptable",
  NOT_FOUND: "not found",
  NOT_IMPLEMENTED: "not implemented",
  NOT_MODIFIED: "not modified",
  OK: "ok",
  PARTIAL_CONTENT: "partial content",
  PAYMENT_REQUIRED: "payment required",
  PERMANENT_REDIRECT: "permanent redirect",
  PRECONDITION_FAILED: "precondition failed",
  PRECONDITION_REQUIRED: "precondition required",
  PROCESSING: "processing",
  EARLY_HINTS: "early hints",
  UPGRADE_REQUIRED: "upgrade required",
  PROXY_AUTHENTICATION_REQUIRED: "proxy authentication required",
  REQUEST_HEADER_FIELDS_TOO_LARGE: "request header fields too large",
  REQUEST_TIMEOUT: "request timeout",
  REQUEST_TOO_LONG: "request too long",
  REQUEST_URI_TOO_LONG: "request uri too long",
  REQUESTED_RANGE_NOT_SATISFIABLE: "requested range not satisfiable",
  RESET_CONTENT: "reset content",
  SEE_OTHER: "see other",
  SERVICE_UNAVAILABLE: "service unavailable",
  SWITCHING_PROTOCOLS: "switching protocols",
  TEMPORARY_REDIRECT: "temporary redirect",
  TOO_MANY_REQUESTS: "too many requests",
  UNAUTHORIZED: "unauthorized",
  UNAVAILABLE_FOR_LEGAL_REASONS: "unavailable for legal reasons",
  UNPROCESSABLE_ENTITY: "unprocessable entity",
  UNSUPPORTED_MEDIA_TYPE: "unsupported media type",
  USE_PROXY: "use proxy",
  MISDIRECTED_REQUEST: "misdirected request",
} as const;

export type HttpStatusCode = keyof typeof HttpStatusCode;
export type HttpStatusCodePhrase = keyof typeof HttpStatusPhrase;
