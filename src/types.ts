export interface Env {
  SECRETS: KVNamespace;
  MAX_PAYLOAD_BYTES: string;
  MAX_TTL_SECONDS: string;
  MAX_VIEWS: string;
}

export interface StoredSecret {
  c: string;   // base64(iv || ciphertext)
  v: number;   // remaining views (-1 = unlimited)
  e: number;   // absolute expiry (unix seconds)
}

export interface CreateRequest {
  c: string;   // base64 ciphertext
  v: number;   // max views: 1-100 or -1
  ttl: number; // seconds: 300-604800
}

export interface StoredLink {
  u: string;   // target URL
  t: number;   // created at (unix seconds)
  c: number;   // click count
}

export interface CreateLinkRequest {
  url: string;       // target URL (required, must be http/https)
  slug?: string;     // custom slug (optional, 3-32 chars, alphanumeric + hyphens)
}

