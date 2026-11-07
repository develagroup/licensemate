# Phase 0 browser data reconciliation

**Review date:** 2026-11-07  
**Decision:** Do not import browser records into PostgreSQL. Keep the protected export until the user confirms the separate trial-policy and integration-settings disposition.

## Source and handling

- Reviewed the local Phase 0 export at `/Users/juanvela/Downloads/licensepulse-phase0-backup-2026-11-07.json`.
- The export is 64,900 bytes and has filesystem mode `0600`.
- The export contains 13 LicensePulse storage groups. This report does not include customer details, license keys, webhook URLs, secret values, or raw audit payloads.
- No export content was copied into the application repository or PostgreSQL.

## Reconciliation results

| Export group | Rows | Comparison result | Disposition |
|---|---:|---|---|
| Licenses | 7 | All IDs and complete rows match bundled demo fixtures; all seven keys match bundled demo keys | Do not import |
| Orders | 4 | All IDs and complete rows match bundled demo fixtures | Do not import |
| Products | 5 | All IDs and complete rows match bundled demo fixtures | Do not import |
| Audit events | 12 | All IDs and complete rows match bundled demo fixtures | Do not import; sample telemetry is not historical evidence |
| Notification rules | 5 | All IDs and complete rows match bundled demo fixtures | Do not import |
| Email notifications | 4 | All IDs and complete rows match bundled demo fixtures | Do not import |
| Webhook endpoints | 4 | All IDs and complete rows match bundled demo fixtures | Do not import; rotate credentials before any real integration |
| Webhook delivery logs | 3 | All IDs and complete rows match bundled demo fixtures | Do not import |
| Product versions | 9 | All IDs and complete rows match bundled demo fixtures | Do not import |
| Product features | 16 | All IDs and complete rows match bundled demo fixtures | Do not import |
| Trial policies | 5 | All IDs match; one row exactly matches its fixture, four differ from defaults | Preserve export; review as local settings, not customer/license data |
| Customer portal configuration | 1 object | Exact bundled default match | Do not import |
| Theme preference | 1 value | UI preference; no customer or license data | Optional to set again manually |

The trial-policy differences are limited to policy/configuration fields (`productId`, trial duration and grace period, activation limits, email-verification setting, restricted features, watermark/throttle, auto-conversion, and custom notes). Their values are intentionally omitted from this report. Treat these four records as potentially user-customized until reviewed.

The export contains four non-empty webhook `secret` fields. They match the bundled prototype endpoint records. Their values are not reproduced here. Do not enable these endpoints or copy their values into server configuration; provision and rotate real integration credentials separately if that feature is later approved.

## Import decision

- **License/customer/order import:** none. The exported seven licenses and four orders are the bundled samples, not production customer records.
- **Audit import:** none. The records are bundled sample telemetry and must not be presented as actual administrative history.
- **Product/config import:** none for RC1. The current RC1 issuance presets are application-managed; trial policy and portal settings are outside the license database scope.
- **Export retention:** preserve the mode-`0600` original until the four changed trial policies and webhook settings are reviewed. Do not clear browser storage as part of this reconciliation.

## Phase 0 gate

The browser data has been compared with the bundled fixtures and an explicit no-import decision is recorded for license, order, audit, product, and integration sample records. The four changed trial policies remain preserved in the protected export for user review; they do not block creation of an empty RC1 license database. No production records should be seeded from this export.
