# Secure Share

Zero-knowledge secret sharing at [share.sussition.com](https://share.sussition.com).

Paste a secret, get a link. Anyone with the link can read it once (or up to N times). The server never sees the plaintext.

## How it works

Encryption happens entirely in the browser using the Web Crypto API. When you create a secret, a random 256-bit AES-GCM key is generated locally, the plaintext is encrypted, and only the ciphertext is sent to the server. The key is appended to the share URL as a fragment (`#key=...`) which browsers never include in HTTP requests or server logs.

On the receiving end, the browser fetches the ciphertext and decrypts it locally using the key from the fragment. The server is a blind store: it holds base64-encoded ciphertext and knows nothing else.

## Stack

- **Runtime**: Cloudflare Workers
- **Storage**: Cloudflare KV (ciphertext + TTL + view count)
- **Crypto**: Web Crypto API, AES-256-GCM
- **Frontend**: Single HTML file, no dependencies, no external requests

## Self-hosting

```bash
npm install
wrangler kv namespace create SECRETS
# add the returned id to wrangler.toml
wrangler dev
```

## Security

| Layer | Detail |
|---|---|
| Encryption | AES-256-GCM, client-side only |
| Key transport | URL fragment, never reaches the server |
| ID entropy | 128 bits |
| Expiry | KV native TTL + view counter |
| Headers | CSP, HSTS, X-Frame-Options DENY, no-referrer |
| Rate limiting | 10 creates / 30 reads per IP per minute |

One known limitation: view counting uses KV which is not atomic. Two simultaneous reads on a 1-view secret could theoretically both succeed. For most use cases this is an acceptable tradeoff. A Durable Object would fix it.
