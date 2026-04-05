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

export interface CreateResponse {
  id: string;
  expires: number;
}

export interface RetrieveResponse {
  c: string;
  remaining: number;
}
