# Partner REST API v1

Read-only machine API for CRM / n8n / ERP to **pull current state**.  
Webhook (`quote.requested`) still **pushes** new RFQs. This API does not replace it.

Auth is **API key**, not `/ops` session cookies.

## Enable

Pick one:

1. Env bootstrap (local / first partner)

```
PARTNER_API_KEY=<at-least-32-random-chars>
PARTNER_API_SCOPES=quotes:read,orders:read
PARTNER_API_RATE_LIMIT_MAX=120
```

2. Hashed key in SQLite (preferred after migrate)

```bash
npm run db:migrate
npm run partner:key -- --name n8n
```

The script prints `Authorization: Bearer sgp_<keyId>.<secret>` once.

## Endpoints

All require `Authorization: Bearer …`. No CORS — server-to-server only.

| Method | Path | Scope |
|--------|------|--------|
| GET | `/api/partner/v1` | any read scope (catalog) |
| GET | `/api/partner/v1/quotes?updated_since=&cursor=&limit=` | `quotes:read` |
| GET | `/api/partner/v1/quotes/{requestId}` | `quotes:read` |
| GET | `/api/partner/v1/orders?updated_since=&cursor=&limit=` | `orders:read` |
| GET | `/api/partner/v1/orders/{orderId}` | `orders:read` |

List pages are oldest-first (`updated_at ASC`). Follow `nextCursor` until it is `null`.  
`limit` default 50, max 100.

## Never returned

`accessToken`, `ipHash`, `userAgent`, `rawPayload`, `salesNotes`, `qrPayload`, factory CNY / 1688 cost.

## Status

| HTTP | Meaning |
|------|---------|
| 401 | missing / bad key |
| 403 | key valid, scope missing |
| 404 | unknown id |
| 429 | rate limited |
| 503 | no `PARTNER_API_KEY` and no enabled DB keys |
