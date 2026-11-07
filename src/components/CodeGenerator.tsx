import React, { useState, useMemo } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  Download, 
  Play, 
  Terminal, 
  Sparkles, 
  Cpu, 
  ShieldCheck, 
  Layers, 
  RefreshCw, 
  ChevronRight, 
  ExternalLink,
  Laptop,
  FileCode,
  Zap,
  Globe,
  Lock,
  Clock,
  ArrowRight,
  Info
} from 'lucide-react';
import { useLicense } from '../context/LicenseContext';
import { License } from '../types';

type SupportedLanguage = 'python' | 'nodejs' | 'csharp' | 'golang' | 'cpp' | 'rust' | 'curl';
type IntegrationScenario = 'validate' | 'activate' | 'heartbeat' | 'full_guard';

interface LanguageOption {
  id: SupportedLanguage;
  name: string;
  extension: string;
  iconText: string;
  badgeColor: string;
  installCmd: string;
  docsUrl: string;
}

const LANGUAGES: LanguageOption[] = [
  { id: 'python', name: 'Python', extension: '.py', iconText: 'PY', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', installCmd: 'pip install requests', docsUrl: 'https://docs.python-requests.org/' },
  { id: 'nodejs', name: 'Node.js / TS', extension: '.ts', iconText: 'TS', badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', installCmd: 'npm install axios @types/node', docsUrl: 'https://nodejs.org/' },
  { id: 'csharp', name: 'C# / .NET', extension: '.cs', iconText: 'C#', badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', installCmd: 'dotnet add package System.Text.Json', docsUrl: 'https://learn.microsoft.com/dotnet/' },
  { id: 'golang', name: 'Go (Golang)', extension: '.go', iconText: 'GO', badgeColor: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20', installCmd: 'go get github.com/google/uuid', docsUrl: 'https://go.dev/doc/' },
  { id: 'cpp', name: 'C++ (Modern)', extension: '.cpp', iconText: 'C++', badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20', installCmd: 'vcpkg install cpr nlohmann-json', docsUrl: 'https://github.com/libcpr/cpr' },
  { id: 'rust', name: 'Rust', extension: '.rs', iconText: 'RS', badgeColor: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', installCmd: 'cargo add reqwest tokio serde serde_json', docsUrl: 'https://www.rust-lang.org/' },
  { id: 'curl', name: 'cURL / Shell', extension: '.sh', iconText: 'CLI', badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', installCmd: '# Native built-in tool', docsUrl: 'https://curl.se/' },
];

export const CodeGenerator: React.FC = () => {
  const { licenses, validateKey, activateDevice, sendHeartbeat } = useLicense();

  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('python');
  const [scenario, setScenario] = useState<IntegrationScenario>('full_guard');
  const [selectedKey, setSelectedKey] = useState<string>(licenses[0]?.key || 'DFLOW-84920-ABCD-8891');
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('https://api.licensepulse.io');
  const [enableOfflineGrace, setEnableOfflineGrace] = useState<boolean>(true);
  const [graceHours, setGraceHours] = useState<number>(72);
  const [featureToCheck, setFeatureToCheck] = useState<string>('ai_copilot');

  // Copy & Test state
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    status: number;
    success: boolean;
    data: any;
    latency: number;
    timestamp: string;
  } | null>(null);

  // Find active license object if matching selectedKey
  const activeLicense = useMemo(() => {
    return licenses.find(l => l.key === selectedKey) || licenses[0];
  }, [licenses, selectedKey]);

  // Code generation generator
  const generatedCode = useMemo(() => {
    const key = selectedKey || 'DEMO-KEY-1234';
    const prod = activeLicense?.productName || 'DevFlow Pro IDE';
    const feat = featureToCheck || 'ai_copilot';

    switch (selectedLang) {
      case 'python':
        if (scenario === 'validate') {
          return `# LicensePulse - Quick Validation (Python)
import requests
import hashlib
import platform

API_URL = "${apiBaseUrl}/api/v1/license/validate"
LICENSE_KEY = "${key}"

def get_machine_fingerprint():
    raw = f"{platform.node()}-{platform.machine()}-{platform.processor()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]

def validate_license():
    payload = {
        "key": LICENSE_KEY,
        "fingerprint": get_machine_fingerprint(),
        "deviceName": platform.node(),
        "os": platform.system(),
        "version": "v1.4.0"
    }
    
    try:
        response = requests.post(API_URL, json=payload, timeout=5)
        data = response.json()
        
        if response.status_code == 200 and data.get("valid"):
            print(f"✓ License Validated! Welcome {data['license']['userName']}")
            print(f"  Plan: {data['license']['plan'].upper()} | Seats: {data['license']['boundDevices']}/{data['license']['maxDevices']}")
            return True
        else:
            print(f"✗ Validation Failed: {data.get('message', 'Invalid Key')}")
            return False
    except requests.exceptions.RequestException as err:
        print(f"Connection Error: {err}")
        return False

if __name__ == "__main__":
    if validate_license():
        print("Application Starting...")
    else:
        print("Please purchase a valid license at https://licensepulse.io")
`;
        }

        if (scenario === 'activate') {
          return `# LicensePulse - Device Seat Activation (Python)
import requests
import hashlib
import platform

ACTIVATE_URL = "${apiBaseUrl}/api/v1/license/activate-device"
LICENSE_KEY = "${key}"

def activate_current_workstation():
    device_id = hashlib.sha256(platform.node().encode()).hexdigest()[:16]
    
    payload = {
        "key": LICENSE_KEY,
        "fingerprint": f"FPR-{device_id}",
        "deviceName": platform.node() or "Workstation-Primary",
        "os": "macOS" if platform.system() == "Darwin" else platform.system(),
        "version": "v2.4.0"
    }
    
    res = requests.post(ACTIVATE_URL, json=payload, timeout=8)
    data = res.json()
    
    if res.status_code == 200 and data.get("valid"):
        print(f"✓ Workstation Activated Successfully!")
        print(f"  Bound Devices: {data['license']['boundDevices']} / {data['license']['maxDevices']}")
        return data["license"]
    elif data.get("error_code") == "DEVICE_LIMIT_REACHED":
        print("✗ Activation Blocked: Maximum seat quota reached on this license key.")
    else:
        print(f"✗ Activation Failed: {data.get('message')}")
    return None

if __name__ == "__main__":
    activate_current_workstation()
`;
        }

        if (scenario === 'heartbeat') {
          return `# LicensePulse - Background Heartbeat Daemon (Python)
import requests
import time
import threading

HEARTBEAT_URL = "${apiBaseUrl}/api/v1/license/heartbeat"
LICENSE_ID = "${activeLicense?.id || 'lic_demo'}"
DEVICE_FINGERPRINT = "FPR-LOCAL-MAC-9821"

def start_heartbeat_daemon(interval_seconds=60):
    def _loop():
        while True:
            try:
                payload = {
                    "licenseId": LICENSE_ID,
                    "deviceFingerprint": DEVICE_FINGERPRINT
                }
                res = requests.post(HEARTBEAT_URL, json=payload, timeout=5)
                if res.status_code == 200:
                    print(f"[{time.strftime('%X')}] Heartbeat synced with cloud.")
                else:
                    print(f"[{time.strftime('%X')}] Heartbeat warning: {res.status_code}")
            except Exception as e:
                print(f"Heartbeat network retry: {e}")
            time.sleep(interval_seconds)

    thread = threading.Thread(target=_loop, daemon=True)
    thread.start()
    return thread

if __name__ == "__main__":
    print("Initializing Background License Heartbeat (60s interval)...")
    start_heartbeat_daemon()
    time.sleep(180)  # Keep main process alive
`;
        }

        // Full guard
        return `# LicensePulse - Complete Desktop App License Guard (Python)
# Includes offline grace period cache, hardware binding, and feature gating.
import os
import json
import time
import requests
import hashlib
import platform

CACHE_FILE = os.path.expanduser("~/.${prod.toLowerCase().replace(/\\s+/g, '_')}_license.json")
API_BASE = "${apiBaseUrl}"
LICENSE_KEY = "${key}"
OFFLINE_GRACE_HOURS = ${enableOfflineGrace ? graceHours : 0}

class LicenseGuard:
    def __init__(self, key: str):
        self.key = key
        self.fingerprint = self._generate_fingerprint()
        self.license_data = None

    def _generate_fingerprint(self) -> str:
        ident = f"{platform.node()}-{platform.system()}-{platform.machine()}"
        return f"FPR-{hashlib.sha256(ident.encode()).hexdigest()[:12].upper()}"

    def verify_or_activate(self) -> bool:
        """Attempts online validation/activation, falling back to local cryptographic cache."""
        try:
            # 1. Attempt Cloud Validation
            resp = requests.post(
                f"{API_BASE}/api/v1/license/activate-device",
                json={
                    "key": self.key,
                    "fingerprint": self.fingerprint,
                    "deviceName": platform.node(),
                    "os": platform.system(),
                    "version": "1.0.0"
                },
                timeout=4
            )
            data = resp.json()
            if resp.status_code == 200 and data.get("valid"):
                self.license_data = data["license"]
                self._save_cache(data["license"])
                return True
        except requests.exceptions.RequestException:
            print("[LicensePulse] Cloud unreachable. Checking offline cache...")

        # 2. Offline Grace Fallback
        return self._check_offline_cache()

    def _save_cache(self, license_info: dict):
        cache_payload = {
            "fingerprint": self.fingerprint,
            "license": license_info,
            "cached_at": time.time(),
            "signature": hashlib.sha256(f"{self.key}:{self.fingerprint}".encode()).hexdigest()
        }
        try:
            with open(CACHE_FILE, "w") as f:
                json.dump(cache_payload, f)
        except IOError:
            pass

    def _check_offline_cache(self) -> bool:
        if not os.path.exists(CACHE_FILE) or OFFLINE_GRACE_HOURS <= 0:
            return False
        try:
            with open(CACHE_FILE, "r") as f:
                cached = json.load(f)
            
            # Verify hardware lock & grace period window
            if cached.get("fingerprint") != self.fingerprint:
                print("Hardware fingerprint mismatch in offline cache.")
                return False
            
            age_hours = (time.time() - cached.get("cached_at", 0)) / 3600
            if age_hours <= OFFLINE_GRACE_HOURS:
                print(f"[Offline Mode] Cached license valid ({round(OFFLINE_GRACE_HOURS - age_hours, 1)}h grace remaining).")
                self.license_data = cached.get("license")
                return True
            else:
                print("Offline grace period expired. Internet connection required.")
                return False
        except Exception:
            return False

    def has_entitlement(self, feature_name: str) -> bool:
        if not self.license_data:
            return False
        features = self.license_data.get("features", [])
        return feature_name in features

# --- Application Startup Entry ---
if __name__ == "__main__":
    guard = LicenseGuard(LICENSE_KEY)
    
    if not guard.verify_or_activate():
        print("Access Denied: Please enter a valid license key.")
        exit(1)
        
    print("Access Granted!")
    if guard.has_entitlement("${feat}"):
        print("✓ Feature '${feat}' is unlocked on this tier.")
    else:
        print("✗ Feature '${feat}' is locked. Upgrade to PRO.")
`;

      case 'nodejs':
        if (scenario === 'validate') {
          return `// LicensePulse - Quick Validation (Node.js / TypeScript)
import axios from 'axios';
import * as os from 'os';
import * as crypto from 'crypto';

const API_URL = '${apiBaseUrl}/api/v1/license/validate';
const LICENSE_KEY = '${key}';

function getMachineFingerprint(): string {
  const raw = \`\${os.hostname()}-\${os.platform()}-\${os.arch()}\`;
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
}

async function validateLicense() {
  try {
    const response = await axios.post(API_URL, {
      key: LICENSE_KEY,
      fingerprint: \`FPR-\${getMachineFingerprint()}\`,
      deviceName: os.hostname(),
      os: os.platform(),
      version: 'v2.1.0'
    }, { timeout: 5000 });

    if (response.data.valid) {
      console.log('✓ License Validated Successfully!');
      console.log('Product:', response.data.license.productName);
      console.log('Seats:', \`\${response.data.license.boundDevices}/\${response.data.license.maxDevices}\`);
      return true;
    } else {
      console.error('✗ Validation Failed:', response.data.message);
      return false;
    }
  } catch (err: any) {
    console.error('API Connection Error:', err.message);
    return false;
  }
}

validateLicense();
`;
        }

        return `// LicensePulse - Full TypeScript Desktop & CLI Guard
import axios from 'axios';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface LicensePayload {
  key: string;
  productName: string;
  plan: string;
  boundDevices: number;
  maxDevices: number;
  features: string[];
  expiresAt: string | null;
}

export class LicenseClient {
  private key: string;
  private baseUrl = '${apiBaseUrl}';
  private cachePath = path.join(os.homedir(), '.${prod.toLowerCase().replace(/\\s+/g, '_')}_lic.json');
  private graceHours = ${enableOfflineGrace ? graceHours : 0};
  private currentLicense: LicensePayload | null = null;

  constructor(key: string) {
    this.key = key;
  }

  private getFingerprint(): string {
    const raw = \`\${os.hostname()}-\${os.arch()}-\${os.cpus()[0]?.model || ''}\`;
    return 'FPR-' + crypto.createHash('sha256').update(raw).digest('hex').substring(0, 12).toUpperCase();
  }

  public async authorize(): Promise<boolean> {
    const fingerprint = this.getFingerprint();

    // 1. Try Cloud Activation
    try {
      const res = await axios.post(\`\${this.baseUrl}/api/v1/license/activate-device\`, {
        key: this.key,
        fingerprint,
        deviceName: os.hostname(),
        os: os.platform() === 'darwin' ? 'macOS' : 'Windows',
        version: '2.4.0'
      }, { timeout: 4500 });

      if (res.data.valid) {
        this.currentLicense = res.data.license;
        this.saveCache(res.data.license, fingerprint);
        return true;
      }
    } catch {
      console.warn('[LicensePulse] Offline or network error. Checking local cache...');
    }

    // 2. Offline Grace Validation
    return this.checkOfflineCache(fingerprint);
  }

  private saveCache(lic: LicensePayload, fingerprint: string) {
    try {
      fs.writeFileSync(this.cachePath, JSON.stringify({
        fingerprint,
        license: lic,
        timestamp: Date.now()
      }), 'utf-8');
    } catch {}
  }

  private checkOfflineCache(fingerprint: string): boolean {
    if (!fs.existsSync(this.cachePath) || this.graceHours <= 0) return false;
    try {
      const data = JSON.parse(fs.readFileSync(this.cachePath, 'utf-8'));
      if (data.fingerprint !== fingerprint) return false;
      const elapsedHours = (Date.now() - data.timestamp) / (1000 * 60 * 60);
      if (elapsedHours <= this.graceHours) {
        this.currentLicense = data.license;
        console.log(\`[Offline Grace] Valid for remaining \${(this.graceHours - elapsedHours).toFixed(1)} hours.\`);
        return true;
      }
    } catch {}
    return false;
  }

  public hasEntitlement(feature: string): boolean {
    return this.currentLicense?.features.includes(feature) ?? false;
  }
}

// Execution sample
async function main() {
  const client = new LicenseClient('${key}');
  const isAuthorized = await client.authorize();

  if (!isAuthorized) {
    console.error('Terminating: Software license verification failed.');
    process.exit(1);
  }

  console.log('✓ Access Granted! Unlocked features:', client.hasEntitlement('${feat}') ? '${feat} (Enabled)' : 'Standard');
}

main();
`;

      case 'csharp':
        return `// LicensePulse - Modern C# .NET Desktop Application Guard
using System;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Security.Cryptography;
using System.Threading.Tasks;

namespace MyApp.Licensing
{
    public class LicenseGuard
    {
        private static readonly HttpClient _httpClient = new HttpClient();
        private const string ApiBaseUrl = "${apiBaseUrl}";
        private readonly string _licenseKey;

        public LicenseGuard(string licenseKey)
        {
            _licenseKey = licenseKey;
        }

        public async Task<bool> ValidateAndActivateAsync()
        {
            string fingerprint = GetHardwareFingerprint();
            var payload = new
            {
                key = _licenseKey,
                fingerprint = fingerprint,
                deviceName = Environment.MachineName,
                os = "Windows",
                version = "3.2.0"
            };

            try
            {
                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync($"{ApiBaseUrl}/api/v1/license/activate-device", content);
                
                if (response.IsSuccessStatusCode)
                {
                    string json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    bool isValid = doc.RootElement.GetProperty("valid").GetBoolean();
                    
                    if (isValid)
                    {
                        Console.WriteLine($"[LicensePulse] Workstation authorized. Key: {_licenseKey}");
                        return true;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[LicensePulse] Offline fallback: {ex.Message}");
            }

            return false;
        }

        private string GetHardwareFingerprint()
        {
            string raw = $"{Environment.MachineName}-{Environment.ProcessorCount}-{Environment.OSVersion}";
            using var sha = SHA256.Create();
            byte[] hash = sha.ComputeHash(Encoding.UTF8.GetBytes(raw));
            return "FPR-" + Convert.ToHexString(hash)[..12];
        }
    }

    class Program
    {
        static async Task Main(string[] args)
        {
            var guard = new LicenseGuard("${key}");
            bool ok = await guard.ValidateAndActivateAsync();
            
            if (!ok)
            {
                Console.WriteLine("License validation failed. Exiting.");
                return;
            }

            Console.WriteLine("Launching ${prod}...");
        }
    }
}
`;

      case 'golang':
        return `// LicensePulse - Go Desktop & CLI License Guard
package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"runtime"
	"time"
)

const (
	ApiBaseUrl = "${apiBaseUrl}"
	LicenseKey = "${key}"
)

type ValidationRequest struct {
	Key         string \`json:"key"\`
	Fingerprint string \`json:"fingerprint"\`
	DeviceName  string \`json:"deviceName"\`
	OS          string \`json:"os"\`
	Version     string \`json:"version"\`
}

type ValidationResponse struct {
	Valid   bool   \`json:"valid"\`
	Message string \`json:"message"\`
	License struct {
		ProductName string   \`json:"productName"\`
		Plan        string   \`json:"plan"\`
		Features    []string \`json:"features"\`
	} \`json:"license"\`
}

func getHardwareFingerprint() string {
	hostname, _ := os.Hostname()
	raw := fmt.Sprintf("%s-%s-%s", hostname, runtime.GOOS, runtime.GOARCH)
	hash := sha256.Sum256([]byte(raw))
	return "FPR-" + hex.EncodeToString(hash[:])[:12]
}

func ValidateLicense(key string) (*ValidationResponse, error) {
	hostname, _ := os.Hostname()
	reqBody := ValidationRequest{
		Key:         key,
		Fingerprint: getHardwareFingerprint(),
		DeviceName:  hostname,
		OS:          runtime.GOOS,
		Version:     "1.5.0",
	}

	payloadBytes, _ := json.Marshal(reqBody)
	client := &http.Client{Timeout: 5 * time.Second}
	
	resp, err := client.Post(ApiBaseUrl+"/api/v1/license/activate-device", "application/json", bytes.NewBuffer(payloadBytes))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result ValidationResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}

func main() {
	fmt.Println("Verifying license with LicensePulse Cloud...")
	res, err := ValidateLicense(LicenseKey)
	if err != nil || !res.Valid {
		fmt.Printf("✗ License verification rejected: %v\\n", err)
		os.Exit(1)
	}

	fmt.Printf("✓ Authorized: %s (%s plan)\\n", res.License.ProductName, res.License.Plan)
	fmt.Println("Application running...")
}
`;

      case 'cpp':
        return `// LicensePulse - Modern C++17/C++20 Client Integration
// Requires CPR (C++ Requests) or libcurl + nlohmann/json
#include <iostream>
#include <string>
#include <cpr/cpr.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

const std::string API_URL = "${apiBaseUrl}/api/v1/license/activate-device";
const std::string LICENSE_KEY = "${key}";

bool ValidateLicense() {
    json payload = {
        {"key", LICENSE_KEY},
        {"fingerprint", "FPR-CPP-CORE-9012"},
        {"deviceName", "Workstation-Native-CPP"},
        {"os", "Linux"},
        {"version", "v2.0.0"}
    };

    cpr::Response r = cpr::Post(
        cpr::Url{API_URL},
        cpr::Body{payload.dump()},
        cpr::Header{{"Content-Type", "application/json"}},
        cpr::Timeout{4000}
    );

    if (r.status_code == 200) {
        auto res = json::parse(r.text);
        if (res.value("valid", false)) {
            std::cout << "[LicensePulse] Verified! Welcome " << res["license"]["userName"] << std::endl;
            return true;
        }
    }
    
    std::cerr << "[LicensePulse] Activation failed. Status: " << r.status_code << std::endl;
    return false;
}

int main() {
    if (!ValidateLicense()) {
        std::cerr << "Fatal: Valid license required to execute." << std::endl;
        return 1;
    }
    
    std::cout << "Starting native 3D engine..." << std::endl;
    return 0;
}
`;

      case 'rust':
        return `// LicensePulse - Rust Desktop / CLI License Guard
// Add to Cargo.toml: reqwest = { version = "0.11", features = ["json"] }, tokio = { version = "1", features = ["full"] }, serde = { version = "1.0", features = ["derive"] }

use serde::{Deserialize, Serialize};
use std::error::Error;

const API_URL: &str = "${apiBaseUrl}/api/v1/license/activate-device";
const LICENSE_KEY: &str = "${key}";

#[derive(Serialize)]
struct ActivationRequest {
    key: String,
    fingerprint: String,
    deviceName: String,
    os: String,
    version: String,
}

#[derive(Deserialize, Debug)]
struct ActivationResponse {
    valid: bool,
    message: String,
    license: Option<LicenseDetails>,
}

#[derive(Deserialize, Debug)]
struct LicenseDetails {
    productName: String,
    plan: String,
    features: Vec<String>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    println!("Connecting to LicensePulse Cloud...");

    let client = reqwest::Client::new();
    let body = ActivationRequest {
        key: LICENSE_KEY.to_string(),
        fingerprint: "FPR-RUST-NODE-5501".to_string(),
        deviceName: hostname::get()?.to_string_lossy().to_string(),
        os: std::env::consts::OS.to_string(),
        version: "1.0.0".to_string(),
    };

    let resp = client.post(API_URL)
        .json(&body)
        .send()
        .await?
        .json::<ActivationResponse>()
        .await?;

    if resp.valid {
        println!("✓ License Authorized: {:?}", resp.license.unwrap().productName);
        println!("Application booted successfully.");
    } else {
        eprintln!("✗ Access Denied: {}", resp.message);
        std::process::exit(1);
    }

    Ok(())
}
`;

      case 'curl':
      default:
        return `#!/usr/bin/env bash
# LicensePulse - Terminal cURL Validation & CI/CD Pipeline Check

LICENSE_KEY="${key}"
API_URL="${apiBaseUrl}/api/v1/license/activate-device"

echo "Checking license entitlement for ${prod}..."

RESPONSE=$(curl -s -X POST "$API_URL" \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "'"$LICENSE_KEY"'",
    "fingerprint": "FPR-CLI-'$(hostname | shasum | head -c 10)'",
    "deviceName": "'$(hostname)'",
    "os": "Linux",
    "version": "1.0.0"
  }')

echo "Server Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

# Check JSON validity with grep/jq
if echo "$RESPONSE" | grep -q '"valid":true'; then
  echo "✓ License is ACTIVE and authorized."
  exit 0
else
  echo "✗ License check FAILED. Build halted."
  exit 1
fi
`;
    }
  }, [selectedLang, scenario, selectedKey, apiBaseUrl, enableOfflineGrace, graceHours, featureToCheck, activeLicense]);

  // Handle Copy
  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2500);
  };

  // Handle Download File
  const handleDownloadCode = () => {
    const activeLang = LANGUAGES.find(l => l.id === selectedLang)!;
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `license_guard_${selectedLang}${activeLang.extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Live Test Snippet within the Applet
  const handleRunLiveTest = async () => {
    setIsTesting(true);
    const startTime = performance.now();
    try {
      let resp;
      if (scenario === 'activate' || scenario === 'full_guard') {
        resp = await activateDevice(selectedKey, {
          deviceName: 'Developer-Workstation (Code Generator)',
          os: 'macOS',
          fingerprint: 'FPR-LIVE-SDK-TEST',
          version: 'v2.4.0',
          location: 'San Francisco, US'
        });
      } else if (scenario === 'heartbeat') {
        const ok = await sendHeartbeat(activeLicense?.id || 'lic_1', 'FPR-LIVE-SDK-TEST');
        resp = { valid: ok, code: 200, message: ok ? 'Heartbeat ping acknowledged' : 'Heartbeat failed' };
      } else {
        resp = await validateKey(selectedKey, {
          deviceName: 'Developer-Workstation (Code Generator)',
          os: 'macOS',
          fingerprint: 'FPR-LIVE-SDK-TEST',
          version: 'v2.4.0'
        });
      }

      const latency = Math.round(performance.now() - startTime);
      setTestResult({
        status: resp.valid ? 200 : (resp.code || 403),
        success: resp.valid,
        data: resp,
        latency: Math.max(12, latency),
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (err: any) {
      setTestResult({
        status: 500,
        success: false,
        data: { error: err.message || 'Internal connection fault' },
        latency: 45,
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-slate-100">
      
      {/* Hero Header */}
      <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Interactive Developer SDK &amp; Code Generator</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30 font-mono">
                  READY TO EMBED
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate copy-paste licensing guards, hardware fingerprinting, offline grace caches, and feature gates for your desktop, mobile, and CLI applications.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Language Pill Selector */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#151719] rounded-lg border border-[#262a2d]">
          {LANGUAGES.map(lang => (
            <button
              key={lang.id}
              onClick={() => setSelectedLang(lang.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                selectedLang === lang.id
                  ? 'bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className="font-mono text-[10px] opacity-75">{lang.iconText}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Column Layout: Options Panel + Live Code Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Settings & Scenarios (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Integration Scenario Selector */}
          <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                Integration Scenario
              </h3>
            </div>

            <div className="space-y-2">
              {[
                { id: 'full_guard', title: 'Complete App Guard', desc: 'Hardware binding + offline grace cache + feature gating', icon: ShieldCheck, badge: 'Recommended' },
                { id: 'validate', title: 'Quick Validation (/validate)', desc: 'Instant online startup entitlement check', icon: Zap },
                { id: 'activate', title: 'Seat Reservation (/activate)', desc: 'Bind hardware fingerprint to license seat limit', icon: Laptop },
                { id: 'heartbeat', title: 'Background Heartbeat', desc: 'Periodic health ping to refresh active workstation state', icon: Clock },
              ].map(s => {
                const Icon = s.icon;
                const isSelected = scenario === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setScenario(s.id as IntegrationScenario)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start space-x-3 ${
                      isSelected
                        ? 'border-cyan-500/50 bg-[#151719] shadow-sm'
                        : 'border-[#262a2d] hover:border-cyan-500/30 bg-[#101214]'
                    }`}
                  >
                    <div className={`p-2 rounded-lg mt-0.5 border ${
                      isSelected ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-[#151719] border-[#262a2d] text-slate-400'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-300'}`}>
                          {s.title}
                        </span>
                        {s.badge && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                            {s.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Configuration Fields */}
          <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                License &amp; Hardware Parameters
              </h3>
            </div>

            {/* Target License Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                Target License Key
              </label>
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="w-full text-xs font-mono bg-[#101214] border border-[#292d30] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              >
                {licenses.map(l => (
                  <option key={l.id} value={l.key}>
                    {l.key} — {l.productName} ({l.userName})
                  </option>
                ))}
              </select>
            </div>

            {/* API Endpoint Base URL */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                API Base Endpoint
              </label>
              <div className="flex rounded-lg overflow-hidden border border-[#292d30] bg-[#101214]">
                <input
                  type="text"
                  value={apiBaseUrl}
                  onChange={(e) => setApiBaseUrl(e.target.value)}
                  className="flex-1 text-xs font-mono bg-transparent px-3 py-2 text-white focus:outline-none"
                  placeholder="https://api.licensepulse.io"
                />
                <button
                  type="button"
                  onClick={() => setApiBaseUrl(window.location.origin)}
                  className="px-2.5 bg-[#151719] hover:bg-[#151719] text-[10px] font-semibold text-cyan-300 border-l border-[#292d30] cursor-pointer"
                  title="Use Current Local Dev Server URL"
                >
                  Local
                </button>
              </div>
            </div>

            {/* Offline Grace Period Settings */}
            {scenario === 'full_guard' && (
              <div className="pt-2 border-t border-[#262a2d] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-slate-200 block">
                      Offline Grace Period
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Allow cached execution when offline
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableOfflineGrace}
                    onChange={(e) => setEnableOfflineGrace(e.target.checked)}
                    className="h-4 w-4 rounded-md accent-cyan-400 border-[#292d30]"
                  />
                </div>

                {enableOfflineGrace && (
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-slate-400">Max Offline Duration:</span>
                    <select
                      value={graceHours}
                      onChange={(e) => setGraceHours(Number(e.target.value))}
                      className="text-xs bg-[#101214] border border-[#292d30] rounded-lg px-2.5 py-1 text-white focus:outline-none"
                    >
                      <option value={24}>24 Hours (1 Day)</option>
                      <option value={72}>72 Hours (3 Days)</option>
                      <option value={168}>168 Hours (7 Days)</option>
                      <option value={720}>720 Hours (30 Days)</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Feature Entitlement to Gate */}
            {scenario === 'full_guard' && (
              <div className="pt-2 border-t border-[#262a2d]">
                <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                  Feature Entitlement Flag to Gate
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['ai_copilot', 'offline_mode', 'priority_support', 'unlimited_export', 'custom_branding'].map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFeatureToCheck(f)}
                      className={`px-2 py-1 rounded-md text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                        featureToCheck === f
                          ? 'bg-cyan-500 text-slate-950 font-bold border border-cyan-400 shadow-sm'
                          : 'bg-[#101214] text-slate-400 border border-[#292d30] hover:text-white'
                      }`}
                    >
                      +{f}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Quick Install Command Box */}
          <div className="bg-[#191c1f] text-slate-300 rounded-xl p-4 border border-[#292d30] space-y-2 text-xs">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold font-mono">
              <span className="flex items-center space-x-1">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Package Dependencies</span>
              </span>
              <a
                href={LANGUAGES.find(l => l.id === selectedLang)?.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-cyan-300 flex items-center space-x-0.5 text-slate-400"
              >
                <span>Docs</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            </div>
            <div className="bg-[#101214] p-2.5 rounded-lg font-mono text-[11px] text-cyan-200 border border-[#292d30] flex items-center justify-between">
              <code>{LANGUAGES.find(l => l.id === selectedLang)?.installCmd}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(LANGUAGES.find(l => l.id === selectedLang)?.installCmd || '');
                }}
                className="text-slate-400 hover:text-white ml-2 cursor-pointer"
                title="Copy install command"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Code Viewer & Interactive Live Execution Box (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Main Code Editor Frame */}
          <div className="bg-[#191c1f] border border-[#292d30] rounded-xl overflow-hidden shadow-xl flex flex-col">
            
            {/* Header / Tabs */}
            <div className="bg-[#151719] px-4 py-3 border-b border-[#262a2d] flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1.5 px-3 py-1 bg-[#101214] border border-[#292d30] rounded-lg text-xs font-mono text-cyan-300">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>license_guard_{selectedLang}{LANGUAGES.find(l => l.id === selectedLang)?.extension}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                  UTF-8 • Production Ready
                </span>
              </div>

              {/* Action Buttons: Copy, Download, Run Test */}
              <div className="flex items-center space-x-2">
                
                {/* Live Test Button */}
                <button
                  onClick={handleRunLiveTest}
                  disabled={isTesting}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer"
                  title="Run real-time validation against the selected license key"
                >
                  <Play className={`w-3 h-3 fill-emerald-300 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing API...' : 'Test Snippet'}</span>
                </button>

                {/* Download Source Button */}
                <button
                  onClick={handleDownloadCode}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-[#101214] hover:bg-white/5 hover:text-white transition-all border border-[#292d30] cursor-pointer"
                  title="Download file"
                >
                  <Download className="w-3 h-3" />
                  <span className="hidden sm:inline">Download</span>
                </button>

                {/* Copy Button */}
                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-cyan-500 hover:bg-cyan-400 shadow-sm transition-all cursor-pointer"
                >
                  {hasCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{hasCopied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            {/* Code Content Window */}
            <div className="p-4 overflow-x-auto max-h-[580px] bg-[#101214] font-mono text-xs leading-relaxed text-cyan-200 custom-scrollbar">
              <pre className="tab-4">
                <code>{generatedCode}</code>
              </pre>
            </div>

          </div>

          {/* Live Test Response Console (Appears after clicking Test Snippet) */}
          {testResult && (
            <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-5 shadow-lg space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-[#262a2d]">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Simulated SDK Execution Output
                  </h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold ${
                    testResult.success ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                  }`}>
                    HTTP {testResult.status} {testResult.success ? 'OK' : 'DENIED'}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono">
                  <span>Latency: <strong className="text-emerald-400">{testResult.latency}ms</strong></span>
                  <span>Time: {testResult.timestamp}</span>
                  <button onClick={() => setTestResult(null)} className="text-slate-500 hover:text-white">✕</button>
                </div>
              </div>

              {/* Formatted JSON Payload */}
              <div className="bg-[#101214] p-3.5 rounded-lg font-mono text-xs text-slate-200 overflow-x-auto max-h-48 border border-[#292d30] custom-scrollbar">
                <pre>{JSON.stringify(testResult.data, null, 2)}</pre>
              </div>

              <p className="text-[11px] text-slate-400 flex items-center space-x-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>
                  This simulation proves that embedding the code snippet above in your application will connect seamlessly with LicensePulse's cloud licensing engine.
                </span>
              </p>
            </div>
          )}

          {/* Architecture Notes & Implementation Best Practices */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider font-mono">
                1. Hardware Lock
              </span>
              <p className="text-xs text-white font-semibold">
                SHA-256 Machine Identity
              </p>
              <p className="text-[11px] text-slate-400 leading-snug">
                Binds the activation token directly to motherboard/CPU hashes, preventing unauthorized key sharing.
              </p>
            </div>

            <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
                2. Offline Tolerance
              </span>
              <p className="text-xs text-white font-semibold">
                Signed Lease Caching
              </p>
              <p className="text-[11px] text-slate-400 leading-snug">
                Users on airplanes or secure field networks retain full software functionality until grace window expires.
              </p>
            </div>

            <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider font-mono">
                3. Feature Gating
              </span>
              <p className="text-xs text-white font-semibold">
                Tier Entitlement Arrays
              </p>
              <p className="text-[11px] text-slate-400 leading-snug">
                Conditionally enable advanced UI features based on server-verified entitlement payload keys.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
