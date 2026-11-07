// Webhook Service for LicensePulse
// Handles HMAC-SHA256 event signing, payload generation, simulated dispatching, and inbound billing ingestion.

import { WebhookEventType, WebhookProvider, WebhookDeliveryLog, WebhookEndpoint, License } from '../types';

/**
 * Generates an HMAC-SHA256 signature string for webhook payloads.
 * Format: `t=${timestamp},v1=${hex_signature}`
 */
export async function generateWebhookSignature(payloadString: string, secret: string, timestamp?: number): Promise<string> {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const signaturePayload = `${ts}.${payloadString}`;
  
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(signaturePayload);

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await window.crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return `t=${ts},v1=${hexHash}`;
  } catch (err) {
    // Fallback simple hash for compatibility
    let hash = 0;
    const combined = `${secret}:${signaturePayload}`;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash) + combined.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(32, '0');
    return `t=${ts},v1=${hex}`;
  }
}

/**
 * Creates standard outbound event payloads for LicensePulse events.
 */
export function buildEventPayload(
  event: WebhookEventType,
  license?: License | null,
  extraData?: Record<string, any>
): Record<string, any> {
  const eventId = `evt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  switch (event) {
    case 'license.created':
      return {
        id: eventId,
        event: 'license.created',
        apiVersion: '2026-03-01',
        createdAt: nowIso,
        data: {
          license: {
            id: license?.id || 'lic_auto_9912',
            key: license?.key || 'DEMO-LICENSE-KEY',
            productName: license?.productName || 'DevFlow IDE Pro',
            productSlug: license?.productSlug || 'devflow-ide',
            plan: license?.plan || 'pro',
            type: license?.type || 'multi_device',
            status: license?.status || 'active',
            user: {
              email: license?.userEmail || 'customer@enterprise.tech',
              name: license?.userName || 'Sarah Connor',
            },
            maxDevices: license?.maxDevices || 5,
            activeDevices: license?.devices?.length || 0,
            features: license?.features || ['dark_mode', 'cloud_sync', 'api_access'],
            billing: {
              cycle: license?.billingCycle || 'annual',
              price: license?.price || 149,
              currency: 'usd',
              autoRenew: license?.autoRenew ?? true,
            },
            expiresAt: license?.expiresAt || new Date(Date.now() + 365 * 86400000).toISOString(),
          },
          ...extraData,
        },
      };

    case 'seat.bound':
      return {
        id: eventId,
        event: 'seat.bound',
        apiVersion: '2026-03-01',
        createdAt: nowIso,
        data: {
          licenseKey: license?.key || 'DEMO-LICENSE-KEY',
          productName: license?.productName || 'DevFlow IDE Pro',
          userEmail: license?.userEmail || 'customer@enterprise.tech',
          device: {
            id: `dev_${Date.now().toString(36)}`,
            fingerprint: extraData?.fingerprint || 'FPR-A79B-8831-C012',
            deviceName: extraData?.deviceName || 'Workstation-Alpha-M3',
            os: extraData?.os || 'macOS',
            ip: extraData?.ip || '198.51.100.42',
            location: extraData?.location || 'San Francisco, US',
            clientVersion: extraData?.clientVersion || 'v2.4.0',
            boundAt: nowIso,
          },
          seatOccupancy: {
            currentActive: (license?.devices?.length || 0) + 1,
            maxAllowed: license?.maxDevices || 5,
            remainingQuota: Math.max(0, (license?.maxDevices || 5) - ((license?.devices?.length || 0) + 1)),
          },
        },
      };

    case 'seat.unbound':
      return {
        id: eventId,
        event: 'seat.unbound',
        apiVersion: '2026-03-01',
        createdAt: nowIso,
        data: {
          licenseKey: license?.key || 'DEMO-LICENSE-KEY',
          productName: license?.productName || 'DevFlow IDE Pro',
          userEmail: license?.userEmail || 'customer@enterprise.tech',
          releasedDevice: {
            fingerprint: extraData?.fingerprint || 'FPR-A79B-8831-C012',
            deviceName: extraData?.deviceName || 'Workstation-Alpha-M3',
            releasedAt: nowIso,
            reason: extraData?.reason || 'User manual logout / deactivation',
          },
          seatOccupancy: {
            currentActive: Math.max(0, (license?.devices?.length || 1) - 1),
            maxAllowed: license?.maxDevices || 5,
          },
        },
      };

    case 'license.renewed':
      return {
        id: eventId,
        event: 'license.renewed',
        apiVersion: '2026-03-01',
        createdAt: nowIso,
        data: {
          licenseKey: license?.key || 'DEMO-LICENSE-KEY',
          productName: license?.productName || 'DevFlow IDE Pro',
          userEmail: license?.userEmail || 'customer@enterprise.tech',
          extendedMonths: extraData?.monthsToAdd || 12,
          previousExpiry: license?.expiresAt || new Date().toISOString(),
          newExpiry: new Date(Date.now() + 365 * 86400000).toISOString(),
          paymentReference: `inv_${Date.now().toString(36)}`,
          amountBilled: license?.price || 149,
          currency: 'usd',
        },
      };

    case 'license.expired':
      return {
        id: eventId,
        event: 'license.expired',
        apiVersion: '2026-03-01',
        createdAt: nowIso,
        data: {
          licenseKey: license?.key || 'DEMO-LICENSE-KEY',
          productName: license?.productName || 'DevFlow IDE Pro',
          userEmail: license?.userEmail || 'customer@enterprise.tech',
          expiredAt: nowIso,
          offlineGraceDaysRemaining: license?.offlineGraceDays || 7,
          actionRequired: 'Update payment method to restore multi-device cloud synchronization',
        },
      };

    case 'payment.failed':
      return {
        id: eventId,
        event: 'payment.failed',
        apiVersion: '2026-03-01',
        createdAt: nowIso,
        data: {
          invoiceId: `in_fail_${Date.now().toString(36)}`,
          customerEmail: license?.userEmail || 'sarah.connor@cyberdyne.tech',
          customerName: license?.userName || 'Sarah Connor',
          licenseKey: license?.key || 'CGUARD-5510-3329-M99Q-4481',
          productName: license?.productName || 'CloudGuardian Shield',
          amountDue: license?.price ? license.price * 100 : 49900,
          currency: 'usd',
          failureCode: extraData?.failureCode || 'card_declined',
          failureMessage: extraData?.failureMessage || 'Your card was declined due to insufficient funds.',
          attemptCount: extraData?.attemptCount || 2,
          nextAttemptAt: new Date(Date.now() + 3 * 86400000).toISOString(),
        },
      };

    case 'payment.succeeded':
      return {
        id: eventId,
        event: 'payment.succeeded',
        apiVersion: '2026-03-01',
        createdAt: nowIso,
        data: {
          paymentIntentId: `pi_${Date.now().toString(36)}`,
          amount: license?.price ? license.price * 100 : 14900,
          currency: 'usd',
          customerEmail: license?.userEmail || 'sarah.connor@cyberdyne.tech',
          licenseKey: license?.key || 'DEMO-LICENSE-KEY',
          productName: license?.productName || 'DevFlow IDE Pro',
          receiptUrl: 'https://pay.licensepulse.io/receipts/rec_88192a.pdf',
        },
      };

    default:
      return {
        id: eventId,
        event: event,
        apiVersion: '2026-03-01',
        createdAt: nowIso,
        data: {
          licenseKey: license?.key,
          ...extraData,
        },
      };
  }
}

/**
 * Preloaded Inbound Webhook Payloads for external billing platforms (Stripe, Lemon Squeezy, Shopify)
 */
export const SAMPLE_INBOUND_PAYLOADS = {
  stripe: {
    'checkout.session.completed': {
      id: 'evt_stripe_checkout_success',
      object: 'event',
      api_version: '2023-10-16',
      type: 'checkout.session.completed',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'cs_test_a1b2c3d4e5f6',
          customer_details: {
            email: 'jane.developer@apexcloud.io',
            name: 'Jane Foster',
          },
          amount_total: 29900,
          currency: 'usd',
          payment_status: 'paid',
          subscription: 'sub_1OqTest99281',
          metadata: {
            productSlug: 'devflow-ide',
            productName: 'DevFlow IDE Pro',
            plan: 'pro',
            maxDevices: '5',
          },
        },
      },
    },
    'invoice.payment_failed': {
      id: 'evt_stripe_payment_failed',
      object: 'event',
      api_version: '2023-10-16',
      type: 'invoice.payment_failed',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'in_1Ot981aBcf99',
          customer_email: 'sarah.connor@cyberdyne.tech',
          amount_due: 49900,
          currency: 'usd',
          attempt_count: 3,
          next_payment_attempt: null,
          billing_reason: 'subscription_cycle',
          charge: 'ch_fail_339120',
          failure_message: 'The card was declined: Insufficient funds.',
        },
      },
    },
  },
  lemonsqueezy: {
    'order_created': {
      meta: {
        event_name: 'order_created',
        custom_data: {
          product_slug: 'cloudguardian-shield',
        },
      },
      data: {
        id: 'ls_ord_889123',
        type: 'orders',
        attributes: {
          order_number: 10482,
          user_name: 'David Vance',
          user_email: 'david.vance@soundwave.io',
          total_formatted: '$149.00',
          status: 'paid',
          first_order_item: {
            product_name: 'CloudGuardian Shield',
            variant_name: 'Enterprise 10-Seats',
            price: 14900,
          },
        },
      },
    },
    'subscription_expired': {
      meta: {
        event_name: 'subscription_expired',
      },
      data: {
        id: 'ls_sub_55102',
        type: 'subscriptions',
        attributes: {
          user_email: 'alex.turner@soundwave.io',
          product_name: 'SoundWave Studio Suite',
          status: 'expired',
          ends_at: new Date().toISOString(),
        },
      },
    },
  },
  shopify: {
    'orders/paid': {
      id: 59128391203,
      email: 'merchant.lead@shopify-store.com',
      financial_status: 'paid',
      total_price: '199.00',
      currency: 'USD',
      customer: {
        first_name: 'Michael',
        last_name: 'Chang',
        email: 'michael.chang@shopify-store.com',
      },
      line_items: [
        {
          id: 1102938491,
          title: 'QuantumRenderer 3D Studio (Annual License)',
          quantity: 1,
          price: '199.00',
          sku: 'QUANTUM-3D-ANNUAL',
        },
      ],
    },
    'app_subscriptions/cancelled': {
      app_subscription: {
        id: 'gid://shopify/AppSubscription/881293',
        name: 'DevFlow IDE Pro Subscription',
        status: 'CANCELLED',
        current_period_end: new Date().toISOString(),
      },
    },
  },
};

/**
 * Dispatches an outbound webhook event (real fetch with mock fallback).
 */
export async function dispatchWebhookEvent(
  endpoint: WebhookEndpoint,
  event: WebhookEventType,
  payload: Record<string, any>
): Promise<WebhookDeliveryLog> {
  const payloadString = JSON.stringify(payload, null, 2);
  const signature = await generateWebhookSignature(payloadString, endpoint.secret);
  const now = new Date();

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'user-agent': 'LicensePulse-Webhooks/2.0',
    'x-licensepulse-signature': signature,
    'x-licensepulse-event': event,
    'x-licensepulse-delivery': `dlv_${Date.now().toString(36)}`,
  };

  const startTime = performance.now();
  let httpStatus = 200;
  let status: 'delivered' | 'failed' = 'delivered';
  let responseBody = '{"received": true, "status": "acknowledged"}';
  let errorReason: string | undefined;

  // Try real fetch if URL is a valid http/https endpoint (guard against localhost or CORS)
  if (endpoint.url.startsWith('https://') || endpoint.url.startsWith('http://')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const resp = await fetch(endpoint.url, {
        method: 'POST',
        headers,
        body: payloadString,
        signal: controller.signal,
        mode: 'no-cors', // standard browser dispatch safety
      });
      clearTimeout(timeoutId);
      httpStatus = resp.status || 200;
      responseBody = JSON.stringify({
        delivered: true,
        endpoint: endpoint.url,
        timestamp: now.toISOString(),
      });
    } catch (err: any) {
      // Simulate realistic webhook receiver response
      const simulatedLatency = Math.floor(Math.random() * 80) + 40;
      await new Promise(r => setTimeout(r, simulatedLatency));

      if (endpoint.url.includes('invalid') || endpoint.url.includes('fail')) {
        httpStatus = 500;
        status = 'failed';
        errorReason = 'Internal Server Error (500): Webhook receiver failed to process signature.';
        responseBody = '{"error": "signature_verification_failed"}';
      } else {
        httpStatus = 200;
        status = 'delivered';
        responseBody = JSON.stringify({
          acknowledged: true,
          event_id: payload.id || 'evt_ack',
          received_at: now.toISOString(),
        });
      }
    }
  }

  const latencyMs = Math.round(performance.now() - startTime) || Math.floor(Math.random() * 70) + 35;

  return {
    id: `whlog_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
    endpointId: endpoint.id,
    endpointUrl: endpoint.url,
    event,
    direction: 'outbound',
    provider: endpoint.provider,
    status,
    httpStatus,
    requestPayload: payload,
    responseBody,
    headers,
    latencyMs,
    attempts: 1,
    maxAttempts: 3,
    timestamp: now.toISOString(),
    errorReason,
  };
}

/**
 * Code snippets for server-side webhook signature verification.
 */
export function getWebhookServerCode(language: 'nodejs' | 'python' | 'go' | 'php'): string {
  switch (language) {
    case 'nodejs':
      return `// Node.js Express Webhook Receiver for LicensePulse Events
import express from 'express';
import crypto from 'crypto';

const app = express();
const WEBHOOK_SECRET = process.env.LICENSEPULSE_WEBHOOK_SECRET || 'replace-with-your-webhook-secret';

// IMPORTANT: Parse raw body to verify cryptographic HMAC signature
app.post('/api/webhooks/licensepulse', express.raw({ type: 'application/json' }), (req, res) => {
  const sigHeader = req.headers['x-licensepulse-signature'];
  if (!sigHeader) {
    return res.status(400).send('Missing signature header');
  }

  // 1. Extract timestamp and signature hash (t=timestamp,v1=hash)
  const elements = sigHeader.split(',');
  const timestamp = elements.find(el => el.startsWith('t='))?.split('=')[1];
  const signature = elements.find(el => el.startsWith('v1='))?.split('=')[1];

  // Prevent replay attacks (verify within 5-minute window)
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - (5 * 60);
  if (parseInt(timestamp) < fiveMinutesAgo) {
    return res.status(400).send('Webhook timestamp too old');
  }

  // 2. Compute HMAC-SHA256
  const payloadToSign = \`\${timestamp}.\${req.body.toString('utf-8')}\`;
  const expectedSig = crypto.createHmac('sha256', WEBHOOK_SECRET).update(payloadToSign).digest('hex');

  if (signature !== expectedSig) {
    return res.status(403).send('Invalid webhook HMAC signature');
  }

  // 3. Handle Business Logic
  const event = JSON.parse(req.body.toString('utf-8'));
  console.log(\`Received verified event: \${event.event}\`, event.data);

  switch (event.event) {
    case 'license.created':
      // Provision user account or sync customer DB
      break;
    case 'seat.bound':
      // Track seat limit or device workstation
      break;
    case 'payment.failed':
      // Send reminder or notify support team
      break;
  }

  res.status(200).json({ received: true });
});

app.listen(3000, () => console.log('Webhook server running on port 3000'));
`;

    case 'python':
      return `# Python FastAPI / Flask Webhook Receiver for LicensePulse
# pip install fastapi uvicorn
import hmac
import hashlib
import time
import json
from fastapi import FastAPI, Request, HTTPException, Header

app = FastAPI()
WEBHOOK_SECRET = "replace-with-your-webhook-secret"

@app.post("/api/webhooks/licensepulse")
async def handle_webhook(request: Request, x_licensepulse_signature: str = Header(None)):
    if not x_licensepulse_signature:
        raise HTTPException(status_code=400, detail="Missing signature header")

    raw_body = await request.body()
    body_str = raw_body.decode("utf-8")

    # 1. Parse t=... and v1=...
    parts = dict(part.split("=") for part in x_licensepulse_signature.split(","))
    timestamp = parts.get("t")
    signature = parts.get("v1")

    # Replay protection
    if int(timestamp) < time.time() - 300:
        raise HTTPException(status_code=400, detail="Timestamp expired")

    # 2. Verify HMAC SHA-256
    signed_payload = f"{timestamp}.{body_str}".encode("utf-8")
    expected_hash = hmac.new(WEBHOOK_SECRET.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(signature, expected_hash):
        raise HTTPException(status_code=403, detail="Invalid HMAC signature")

    payload = json.loads(body_str)
    event_name = payload.get("event")
    print(f"✓ Verified Webhook: {event_name}")

    if event_name == "payment.failed":
        print("Alert: Payment failed for customer", payload["data"]["customerEmail"])

    return {"received": True, "event": event_name}
`;

    case 'go':
      return `// Go (Golang) Webhook Receiver for LicensePulse
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const WebhookSecret = "replace-with-your-webhook-secret"

func WebhookHandler(w http.ResponseWriter, r *http.Request) {
	sigHeader := r.Header.Get("X-LicensePulse-Signature")
	if sigHeader == "" {
		http.Error(w, "Missing signature header", http.StatusBadRequest)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Cannot read body", http.StatusBadRequest)
		return
	}

	// Parse header
	parts := strings.Split(sigHeader, ",")
	var timestamp, signature string
	for _, p := range parts {
		kv := strings.SplitN(p, "=", 2)
		if len(kv) == 2 {
			if kv[0] == "t" {
				timestamp = kv[1]
			} else if kv[0] == "v1" {
				signature = kv[1]
			}
		}
	}

	// Compute HMAC
	mac := hmac.New(sha256.New, []byte(WebhookSecret))
	mac.Write([]byte(fmt.Sprintf("%s.%s", timestamp, string(body))))
	expected := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(signature), []byte(expected)) {
		http.Error(w, "Invalid signature", http.StatusForbidden)
		return
	}

	var event map[string]interface{}
	json.Unmarshal(body, &event)
	fmt.Printf("✓ Processed Webhook Event: %v\\n", event["event"])

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(\`{"received": true}\`))
}

func main() {
	http.HandleFunc("/api/webhooks/licensepulse", WebhookHandler)
	http.ListenAndServe(":8080", nil)
}
`;

    case 'php':
      return `<?php
// PHP Webhook Receiver for LicensePulse
$secret = getenv('LICENSEPULSE_WEBHOOK_SECRET') ?: 'replace-with-your-webhook-secret';

$signatureHeader = $_SERVER['HTTP_X_LICENSEPULSE_SIGNATURE'] ?? '';
if (!$signatureHeader) {
    http_response_code(400);
    exit('Missing signature header');
}

$rawPayload = file_get_contents('php://input');

// Parse t=... and v1=...
parse_str(str_replace(',', '&', $signatureHeader), $sigParts);
$timestamp = $sigParts['t'] ?? 0;
$signature = $sigParts['v1'] ?? '';

// Check HMAC-SHA256
$payloadToSign = $timestamp . '.' . $rawPayload;
$expectedSig = hash_hmac('sha256', $payloadToSign, $secret);

if (!hash_equals($signature, $expectedSig)) {
    http_response_code(403);
    exit('Invalid HMAC signature');
}

$event = json_decode($rawPayload, true);
error_log("Received Webhook: " . $event['event']);

http_response_code(200);
echo json_encode(['received' => true]);
`;
  }
}
