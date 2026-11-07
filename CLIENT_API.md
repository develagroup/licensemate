# LicensePulse client API v1

The online license API is mounted at `/api/v1/license`. It is separate from the OTP-protected administrator API and is intended for native desktop/server clients. A browser client hosted on a different origin is not supported until an explicit CORS allow-list is designed.

## Request format

All routes accept JSON `POST` requests with these fields:

```json
{
  "key": "PRODUCT-ABCD-EFGH-JKLM-NPQR",
  "productSlug": "product-slug",
  "fingerprint": "stable-client-generated-device-identifier",
  "deviceName": "Workstation name",
  "platform": "macOS",
  "clientVersion": "1.2.3"
}
```

`platform` is a short client-provided string (for example `macOS`, `Windows`, `Linux`, or `Server`). The server validates field length and key shape. It hashes the key for lookup, hashes the fingerprint before storing it, and never returns either value. A fingerprint should be stable for a device but must not contain a serial number or other directly identifying value. Hashing reduces direct exposure; it does not make the identifier anonymous.

## Routes

| Route | Purpose | State change |
|---|---|---|
| `POST /validate` | Check product binding, key state and expiry; return entitlements and seat count | Updates last validated time and audit history |
| `POST /activate-device` | Bind or reactivate a device after validating the license | Enforces the seat limit in a transaction; retains deactivated records |
| `POST /heartbeat` | Verify that this fingerprint is still actively bound | Updates device last heartbeat and license validation time |
| `POST /deactivate` | Release the seat for this fingerprint | Marks the existing device record deactivated; repeated release succeeds idempotently |

Success responses use HTTP 200 and include `valid`, `license`, `activeDevices`, `maxDevices`, `entitlements`, and a timestamp as applicable. The response does not include customer email or the full key. Denied requests include an HTTP status, stable `error_code`, message, timestamp, and request ID.

## Error codes

| HTTP | `error_code` | Meaning |
|---:|---|---|
| 400 | `INVALID_REQUEST` | Missing or malformed required fields |
| 403 | `LICENSE_INACTIVE` | License is not active |
| 403 | `LICENSE_SUSPENDED` | License is suspended |
| 403 | `LICENSE_REVOKED` | License was permanently revoked |
| 403 | `LICENSE_EXPIRED` | License expiry is in the past |
| 403 | `PRODUCT_MISMATCH` | Key is not issued for the requested product slug |
| 403 | `PRODUCT_INACTIVE` | Product is disabled |
| 404 | `LICENSE_NOT_FOUND` | No matching, non-archived key exists |
| 404 | `DEVICE_NOT_ACTIVATED` | Fingerprint has no retained device record for this license |
| 409 | `DEVICE_LIMIT_REACHED` | All seats are occupied by active devices |
| 409 | `DEVICE_DEACTIVATED` | Heartbeat was sent by a device whose seat was released |
| 429 | `RATE_LIMITED` | Per-process per-IP/key-hash limit exceeded; retry delay is in `Retry-After` |
| 503 | `SERVICE_UNAVAILABLE` | Storage/API is unavailable |

## Operational boundaries before RC1

- Validate and activate require an online request. Client behavior while offline is not supplied by this API; RC1 clients must not claim a grace period unless a separate signed offline design is implemented and reviewed.
- Revocation and suspension are enforced on each subsequent API request. A client that stays offline cannot receive a new server decision until reconnecting.
- The current limiter applies independent 60-per-minute IP and key-hash buckets. It is in memory, process-local, and resets on restart, so it is not a distributed rate quota. Express trusts forwarded headers from loopback only to support the loopback-bound app behind the local reverse proxy; verify that exact topology and source-IP handling in staging.
- Audit history records successful validation, activation, and deactivation events, plus recognized license/product/device rejections without the raw key or fingerprint. Heartbeat time is stored on the device row rather than creating an audit event for every ping. Malformed requests and rate-limit responses are not stored as audit events.
- The simulator targets the same-origin local app endpoint. Separate-machine TLS/reverse-proxy acceptance remains a staging gate.
