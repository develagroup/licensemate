# Phase 0 browser data reconciliation

**Review date:** 2026-11-07  
**Decision:** Do not import browser records into PostgreSQL. The four custom trial-policy rows were reviewed and will remain only in the protected export because trial policies are outside the approved online-license RC1 scope. The export remains mode `0600`; it is not committed or copied into the application/database.

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
| Trial policies | 5 | All IDs match; one row exactly matches its fixture, four differ from defaults | Reviewed; preserve protected export; exclude from RC1 |
| Customer portal configuration | 1 object | Exact bundled default match | Do not import |
| Theme preference | 1 value | UI preference; no customer or license data | Optional to set again manually |

The trial-policy export was compared with all five bundled fixture rows on 2026-11-07. All five IDs match. Row 1 matches its fixture; rows 2–5 have local changes in configuration fields. Changed field names by row are recorded without values:

| Export row | Changed fields (names only) |
|---:|---|
| 2 | `autoConvertRule`, `customTrialNotes`, `gracePeriodDays`, `maxActivationsPerHardware`, `productId`, `restrictedFeatures`, `watermarkOrThrottle` |
| 3 | `autoConvertRule`, `customTrialNotes`, `gracePeriodDays`, `productId`, `requireEmailVerification`, `restrictedFeatures`, `trialDurationDays`, `watermarkOrThrottle` |
| 4 | `customTrialNotes`, `gracePeriodDays`, `productId`, `restrictedFeatures` |
| 5 | `autoConvertRule`, `customTrialNotes`, `productId`, `restrictedFeatures` |

These values are not read by the server-backed license lifecycle and trial policy administration is outside RC1. Do not apply them to issued licenses or PostgreSQL. Preserve the protected original for possible future product-policy work; no customer or license data is imported.

The export contains four non-empty webhook `secret` fields. They match the bundled prototype endpoint records. Their values are not reproduced here. Do not enable these endpoints or copy their values into server configuration; provision and rotate real integration credentials separately if that feature is later approved.

## Import decision

- **License/customer/order import:** none. The exported seven licenses and four orders are the bundled samples, not production customer records.
- **Audit import:** none. The records are bundled sample telemetry and must not be presented as actual administrative history.
- **Product/config import:** none for RC1. The current RC1 issuance presets are application-managed; trial policy and portal settings are outside the license database scope.
- **Export retention:** preserve the mode-`0600` original for possible future policy review. Do not clear browser storage as part of this reconciliation.

## Phase 0 gate

The browser data has been compared with bundled fixtures; sample license/order/audit/product/integration records are excluded, and the four custom trial-policy rows have been reviewed and explicitly excluded from RC1 while preserved in the protected export. They do not block creation of an empty RC1 license database. No production records should be seeded from this export.
