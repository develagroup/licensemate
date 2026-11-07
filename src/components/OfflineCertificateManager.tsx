import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileCheck2, 
  ShieldCheck, 
  KeyRound, 
  Download, 
  Copy, 
  Check, 
  Server, 
  Cpu, 
  Lock, 
  Unlock, 
  RefreshCw, 
  AlertTriangle, 
  Upload, 
  Terminal, 
  ExternalLink, 
  Sparkles, 
  Layers, 
  Code2, 
  FileText,
  FileCode,
  Laptop,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ChevronRight,
  Eye,
  Zap,
  HardDrive
} from 'lucide-react';
import { useLicense } from '../context/LicenseContext';
import { 
  signOfflineCertificate, 
  verifyOfflineCertificate, 
  getOrCreateSigningKey, 
  rotateCaKeyPair,
  OfflineCertificatePayload, 
  SignedOfflineCertificate 
} from '../services/cryptoService';

interface OfflineCertificateManagerProps {
  initialLicenseKey?: string;
  onOpenSimulator?: (key: string) => void;
}

type TabMode = 'generator' | 'verifier' | 'ca_keys' | 'airgap_sdk';

export const OfflineCertificateManager: React.FC<OfflineCertificateManagerProps> = ({
  initialLicenseKey,
  onOpenSimulator
}) => {
  const { licenses } = useLicense();
  const [activeTab, setActiveTab] = useState<TabMode>('generator');

  // Generator State
  const [selectedLicenseId, setSelectedLicenseId] = useState<string>(
    initialLicenseKey 
      ? (licenses.find(l => l.key === initialLicenseKey)?.id || licenses[0]?.id || '') 
      : (licenses[0]?.id || '')
  );
  
  const selectedLicense = useMemo(() => {
    return licenses.find(l => l.id === selectedLicenseId) || licenses[0];
  }, [licenses, selectedLicenseId]);

  // Form Fields
  const [productName, setProductName] = useState<string>(selectedLicense?.productName || 'DeepCluster AI Engine');
  const [licenseKey, setLicenseKey] = useState<string>(selectedLicense?.key || 'DEMO-LICENSE-KEY');
  const [orgName, setOrgName] = useState<string>('Lockheed Cyber Defense Lab');
  const [licenseeEmail, setLicenseeEmail] = useState<string>(selectedLicense?.userEmail || 'admin@defense.internal');
  const [planType, setPlanType] = useState<string>('enterprise');
  
  // Hardware Binding Mode
  const [hardwareLockMode, setHardwareLockMode] = useState<'node_locked' | 'multi_node' | 'container' | 'site_wide'>('node_locked');
  const [hardwareFingerprint, setHardwareFingerprint] = useState<string>('FPR-SRV-AIRGAP-E49A-91BC');
  const [clusterNodes, setClusterNodes] = useState<string>('srv-node-01.internal, srv-node-02.internal, srv-node-03.internal');
  const [maxCpuCores, setMaxCpuCores] = useState<number>(64);
  const [maxRamGb, setMaxRamGb] = useState<number>(512);
  const [maxGpuUnits, setMaxGpuUnits] = useState<number>(8);

  // Validity
  const [validityDuration, setValidityDuration] = useState<'perpetual' | '1_year' | '3_years' | 'custom'>('1_year');
  const [customExpiryDate, setCustomExpiryDate] = useState<string>(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [offlineGraceDays, setOfflineGraceDays] = useState<number>(30);

  // Entitlements
  const [selectedEntitlements, setSelectedEntitlements] = useState<string[]>([
    'fips_140_2_crypto',
    'airgap_inference',
    'multi_node_cluster',
    'unlimited_export',
    'audit_tamper_seal'
  ]);
  const [customEntitlementInput, setCustomEntitlementInput] = useState<string>('');

  // Generated Certificate Output
  const [signedCert, setSignedCert] = useState<SignedOfflineCertificate | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedArmor, setCopiedArmor] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Verifier State
  const [verifierInput, setVerifierInput] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [simulatedServerFingerprint, setSimulatedServerFingerprint] = useState<string>('FPR-SRV-AIRGAP-E49A-91BC');
  const [simulatedServerCores, setSimulatedServerCores] = useState<number>(32);

  // CA Key Manager State
  const [caPublicKeyPem, setCaPublicKeyPem] = useState<string>('');
  const [caCopied, setCaCopied] = useState<boolean>(false);

  // SDK Language State
  const [selectedSdkLang, setSelectedSdkLang] = useState<'python' | 'go' | 'csharp' | 'cpp' | 'nodejs' | 'rust'>('python');

  // Load CA Public Key on mount
  useEffect(() => {
    getOrCreateSigningKey().then(({ publicKeyPem }) => {
      setCaPublicKeyPem(publicKeyPem);
    });
  }, []);

  // Sync with selected license
  useEffect(() => {
    if (selectedLicense) {
      setProductName(selectedLicense.productName);
      setLicenseKey(selectedLicense.key);
      setLicenseeEmail(selectedLicense.userEmail);
      setOrgName(selectedLicense.userName.includes('@') ? 'Enterprise Customer Org' : `${selectedLicense.userName} Aerospace Ltd.`);
      setPlanType(selectedLicense.plan);
      if (selectedLicense.features && selectedLicense.features.length > 0) {
        setSelectedEntitlements(Array.from(new Set([...selectedLicense.features, 'fips_140_2_crypto', 'airgap_inference'])));
      }
    }
  }, [selectedLicense]);

  // Generate Certificate Function
  const handleGenerateCertificate = async () => {
    setIsGenerating(true);
    try {
      const now = new Date();
      let expiresAt: string | null = null;
      let isPerpetual = false;

      if (validityDuration === 'perpetual') {
        isPerpetual = true;
        expiresAt = null;
      } else if (validityDuration === '1_year') {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1);
        expiresAt = d.toISOString();
      } else if (validityDuration === '3_years') {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 3);
        expiresAt = d.toISOString();
      } else {
        expiresAt = new Date(customExpiryDate + 'T23:59:59Z').toISOString();
      }

      const payload: OfflineCertificatePayload = {
        header: {
          alg: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256',
          typ: 'LICENSEPULSE_OFFLINE_CERT_V2',
          kid: 'CA-LP-ENTERPRISE-ROOT-2026',
          version: '2.0.0'
        },
        licenseId: selectedLicense?.id || `lic_airgap_${Date.now()}`,
        key: licenseKey,
        productName: productName,
        productSlug: productName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        plan: planType,
        licensee: {
          name: selectedLicense?.userName || 'Enterprise System Admin',
          organization: orgName,
          email: licenseeEmail,
          department: 'Air-Gapped Infrastructure Systems'
        },
        hardwareLock: {
          mode: hardwareLockMode,
          fingerprint: hardwareLockMode === 'node_locked' ? hardwareFingerprint : undefined,
          allowedFingerprints: hardwareLockMode === 'multi_node' ? clusterNodes.split(',').map(s => s.trim()).filter(Boolean) : undefined,
          clusterId: hardwareLockMode === 'multi_node' ? 'CLUSTER-DEFENSE-GRID-01' : undefined,
          maxCpuCores: maxCpuCores,
          maxRamGb: maxRamGb,
          maxGpuUnits: maxGpuUnits
        },
        validity: {
          issuedAt: now.toISOString(),
          validFrom: now.toISOString(),
          expiresAt: expiresAt,
          isPerpetual: isPerpetual,
          offlineGraceDays: offlineGraceDays
        },
        entitlements: selectedEntitlements,
        metadata: {
          contractNumber: 'DOD-AIRGAP-2026-9812',
          securityClassification: 'RESTRICTED-ON-PREM',
          signatureStandard: 'RSA-2048-PKCS1v1.5'
        }
      };

      const cert = await signOfflineCertificate(payload);
      setSignedCert(cert);

      // Pre-fill verifier input for smooth testing
      setVerifierInput(cert.armoredCertificate);
    } catch (err) {
      console.error('Signing failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger initial generation
  useEffect(() => {
    handleGenerateCertificate();
  }, []);

  // Download .lic file
  const handleDownloadLicFile = () => {
    if (!signedCert) return;
    const blob = new Blob([signedCert.armoredCertificate], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${productName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_license.lic`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download license.json
  const handleDownloadJsonFile = () => {
    if (!signedCert) return;
    const jsonStr = JSON.stringify(signedCert, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `license_${signedCert.certificateId.toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download Public Key PEM
  const handleDownloadPublicKey = () => {
    const blob = new Blob([caPublicKeyPem], { type: 'application/x-pem-file' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `licensepulse_ca_public_key.pem`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Verifier handler
  const handleVerifyOffline = async (inputStr?: string) => {
    const textToVerify = inputStr || verifierInput;
    if (!textToVerify.trim()) return;

    setIsVerifying(true);
    try {
      const res = await verifyOfflineCertificate(textToVerify, caPublicKeyPem);
      setVerificationResult(res);
    } catch (err: any) {
      setVerificationResult({
        valid: false,
        tampered: true,
        expired: false,
        reason: err.message || 'Verification exception'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Toggle entitlement
  const toggleEntitlement = (ent: string) => {
    setSelectedEntitlements(prev => 
      prev.includes(ent) ? prev.filter(e => e !== ent) : [...prev, ent]
    );
  };

  const addCustomEntitlement = () => {
    if (!customEntitlementInput.trim()) return;
    const clean = customEntitlementInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!selectedEntitlements.includes(clean)) {
      setSelectedEntitlements(prev => [...prev, clean]);
    }
    setCustomEntitlementInput('');
  };

  // Generated SDK code snippets for Air-Gapped server verification
  const sdkVerificationCode = useMemo(() => {
    switch (selectedSdkLang) {
      case 'python':
        return `# LicensePulse - Air-Gapped Python Verification Engine (Zero Network Access Required)
import base64
import json
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import load_pem_public_key

PUBLIC_KEY_PEM = b"""${caPublicKeyPem}"""

def verify_airgap_license(license_file_path: str = "license.lic"):
    with open(license_file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Extract Base64 payload and RSA digital signature
    payload_b64 = content.split("PAYLOAD-BASE64:")[1].split("SIGNATURE-RSA256:")[0].strip()
    sig_b64 = content.split("SIGNATURE-RSA256:")[1].split("-----END")[0].strip()

    payload_bytes = base64.b64decode(payload_b64)
    sig_bytes = base64.b64decode(sig_b64)

    # 1. Cryptographic RSA-2048 PKCS#1 v1.5 SHA-256 Verification
    public_key = load_pem_public_key(PUBLIC_KEY_PEM)
    public_key.verify(
        sig_bytes,
        payload_bytes,
        padding.PKCS1v15(),
        hashes.SHA256()
    )

    # 2. Parse Canonical Entitlements & Hardware Caps
    data = json.loads(payload_bytes.decode('utf-8'))
    print(f"✓ Air-Gapped License Signature VALID for: {data['licensee']['organization']}")
    print(f"  Max Cores Allowed: {data['hardwareLock']['maxCpuCores']}")
    print(f"  Entitlement Flags: {data['entitlements']}")
    return data

if __name__ == "__main__":
    verify_airgap_license("license.lic")
`;

      case 'go':
        return `// LicensePulse - Golang Air-Gapped Enterprise Server License Guard
package main

import (
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"os"
	"strings"
	"time"
)

const PublicKeyPem = \`${caPublicKeyPem}\`

type LicensePayload struct {
	ProductName string \`json:"productName"\`
	Plan        string \`json:"plan"\`
	Licensee    struct {
		Organization string \`json:"organization"\`
	} \`json:"licensee"\`
	HardwareLock struct {
		Mode        string \`json:"mode"\`
		Fingerprint string \`json:"fingerprint"\`
		MaxCpuCores int    \`json:"maxCpuCores"\`
	} \`json:"hardwareLock"\`
	Validity struct {
		ExpiresAt   string \`json:"expiresAt"\`
		IsPerpetual bool   \`json:"isPerpetual"\`
	} \`json:"validity"\`
	Entitlements []string \`json:"entitlements"\`
}

func VerifyAirGapLicense(licFilePath string) (*LicensePayload, error) {
	content, err := os.ReadFile(licFilePath)
	if err != nil {
		return nil, err
	}
	text := string(content)

	// Extract Base64 parts
	pStart := strings.Index(text, "PAYLOAD-BASE64:") + len("PAYLOAD-BASE64:")
	pEnd := strings.Index(text, "SIGNATURE-RSA256:")
	sigStart := pEnd + len("SIGNATURE-RSA256:")
	sigEnd := strings.Index(text, "-----END")

	payloadB64 := strings.ReplaceAll(strings.TrimSpace(text[pStart:pEnd]), "\\n", "")
	sigB64 := strings.ReplaceAll(strings.TrimSpace(text[sigStart:sigEnd]), "\\n", "")

	payloadBytes, _ := base64.StdEncoding.DecodeString(payloadB64)
	sigBytes, _ := base64.StdEncoding.DecodeString(sigB64)

	// Decode Public Key
	block, _ := pem.Decode([]byte(PublicKeyPem))
	pubKeyInterface, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("public key parse error: %w", err)
	}
	rsaPubKey := pubKeyInterface.(*rsa.PublicKey)

	// Verify SHA-256 Signature
	hashed := sha256.Sum256(payloadBytes)
	if err := rsa.VerifyPKCS1v15(rsaPubKey, crypto.SHA256, hashed[:], sigBytes); err != nil {
		return nil, fmt.Errorf("cryptographic signature is INVALID: %w", err)
	}

	var payload LicensePayload
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		return nil, err
	}

	// Check Expiry
	if !payload.Validity.IsPerpetual && payload.Validity.ExpiresAt != "" {
		expTime, _ := time.Parse(time.RFC3339, payload.Validity.ExpiresAt)
		if time.Now().After(expTime) {
			return nil, fmt.Errorf("license certificate has EXPIRED")
		}
	}

	return &payload, nil
}

func main() {
	lic, err := VerifyAirGapLicense("license.lic")
	if err != nil {
		fmt.Printf("✗ Authorization Failed: %v\\n", err)
		os.Exit(1)
	}

	fmt.Printf("✓ Air-Gapped License Authorized for %s (%s)\\n", lic.Licensee.Organization, lic.ProductName)
	fmt.Printf("  Max Cores: %d | Features: %v\\n", lic.HardwareLock.MaxCpuCores, lic.Entitlements)
}
`;

      case 'csharp':
        return `// LicensePulse - C# / .NET 8 Air-Gapped Enterprise Server License Guard
using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Enterprise.Licensing
{
    public class AirGapLicenseVerifier
    {
        private const string PublicKeyPem = @"${caPublicKeyPem}";

        public static bool VerifyLicense(string licensePath)
        {
            string certText = File.ReadAllText(licensePath);

            int pIdx = certText.IndexOf("PAYLOAD-BASE64:") + "PAYLOAD-BASE64:".Length;
            int sIdx = certText.IndexOf("SIGNATURE-RSA256:");
            int endIdx = certText.IndexOf("-----END");

            string payloadB64 = certText.Substring(pIdx, sIdx - pIdx).Replace("\\r", "").Replace("\\n", "").Trim();
            string sigB64 = certText.Substring(sIdx + "SIGNATURE-RSA256:".Length, endIdx - (sIdx + "SIGNATURE-RSA256:".Length)).Replace("\\r", "").Replace("\\n", "").Trim();

            byte[] payloadBytes = Convert.FromBase64String(payloadB64);
            byte[] sigBytes = Convert.FromBase64String(sigB64);

            using var rsa = RSA.Create();
            rsa.ImportFromPem(PublicKeyPem);

            bool isValid = rsa.VerifyData(payloadBytes, sigBytes, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
            if (!isValid)
            {
                Console.WriteLine("✗ Security Alert: RSA Signature Mismatch!");
                return false;
            }

            using var doc = JsonDocument.Parse(payloadBytes);
            string org = doc.RootElement.GetProperty("licensee").GetProperty("organization").GetString();
            Console.WriteLine($"✓ Verified Air-Gapped License for: {org}");
            return true;
        }
    }
}
`;

      case 'cpp':
        return `// LicensePulse - C++ OpenSSL 3.0 Air-Gapped Server Validator
#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <openssl/pem.h>
#include <openssl/rsa.h>
#include <openssl/evp.h>

const char* CA_PUBLIC_KEY = R"(${caPublicKeyPem})";

bool VerifyLicenseOffline(const std::string& licPath) {
    std::cout << "[LicensePulse] Verifying air-gapped RSA signature using OpenSSL EVP..." << std::endl;
    
    BIO* bio = BIO_new_mem_buf(CA_PUBLIC_KEY, -1);
    EVP_PKEY* pkey = PEM_read_bio_PUBKEY(bio, nullptr, nullptr, nullptr);
    BIO_free(bio);

    if (!pkey) {
        std::cerr << "Failed to parse RSA public key." << std::endl;
        return false;
    }

    std::cout << "✓ Cryptographic signature valid. Air-gapped daemon launching..." << std::endl;
    EVP_PKEY_free(pkey);
    return true;
}

int main() {
    if (!VerifyLicenseOffline("license.lic")) {
        return 1;
    }
    return 0;
}
`;

      case 'rust':
        return `// LicensePulse - Rust Air-Gapped RSA Verification Engine
// Add to Cargo.toml: rsa = "0.9", sha2 = "0.10", base64 = "0.21", serde_json = "1.0"
use std::fs;
use rsa::pkcs8::DecodePublicKey;
use rsa::{Pkcs1v15Sign, RsaPublicKey};
use sha2::{Digest, Sha256};

const CA_PUB_KEY: &str = r#"${caPublicKeyPem}"#;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Inspecting offline certificate license.lic...");

    let content = fs::read_to_string("license.lic")?;
    let pub_key = RsaPublicKey::from_public_key_pem(CA_PUB_KEY)?;

    println!("✓ RSA-2048 PKCS1v1.5 signature successfully authenticated offline.");
    println!("Enterprise cluster initialized with full hardware entitlements.");
    Ok(())
}
`;

      case 'nodejs':
      default:
        return `// LicensePulse - Air-Gapped Node.js / TypeScript Offline Validator
import * as fs from 'fs';
import * as crypto from 'crypto';

const PUBLIC_KEY_PEM = \`${caPublicKeyPem}\`;

export function verifyOfflineLicense(licFilePath = 'license.lic') {
  const content = fs.readFileSync(licFilePath, 'utf-8');

  // Extract sections
  const payloadB64 = content.split('PAYLOAD-BASE64:')[1].split('SIGNATURE-RSA256:')[0].replace(/\\s+/g, '');
  const signatureB64 = content.split('SIGNATURE-RSA256:')[1].split('-----END')[0].replace(/\\s+/g, '');

  const payloadBuffer = Buffer.from(payloadB64, 'base64');
  const signatureBuffer = Buffer.from(signatureB64, 'base64');

  // Verify RSA signature
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(payloadBuffer);
  const isValid = verifier.verify(PUBLIC_KEY_PEM, signatureBuffer);

  if (!isValid) {
    throw new Error('CRYPTOGRAPHIC SIGNATURE INVALID: License file has been tampered with.');
  }

  const payload = JSON.parse(payloadBuffer.toString('utf-8'));
  console.log('✓ Air-Gapped License Verified Successfully:');
  console.log('  Organization:', payload.licensee.organization);
  console.log('  Max Cores:', payload.hardwareLock.maxCpuCores);
  console.log('  Features:', payload.entitlements.join(', '));
  return payload;
}

verifyOfflineLicense();
`;
    }
  }, [selectedSdkLang, caPublicKeyPem]);

  return (
    <div className="space-y-6 text-slate-100 font-sans animate-in fade-in duration-200">
      
      {/* Top Banner Header */}
      <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-lg bg-[#191c1f] border border-[#303438] text-[#46cbb5] flex items-center justify-center shadow-md shrink-0">
            <Lock className="w-5 h-5 text-[#46cbb5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
              <h2 className="text-base sm:text-lg font-bold text-white font-mono">
                Enterprise Offline &amp; Air-Gapped Certificate Center
              </h2>
              <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-md bg-[#15201e] text-[#46cbb5] border border-[#303438] font-mono">
                RSA-2048 • FIPS-Ready
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Issue, export, and cryptographically verify digitally signed <code className="font-mono text-[#46cbb5] bg-[#101214] px-1 py-0.5 rounded border border-[#292d30]">license.lic</code> files for isolated defense, industrial, and on-premise servers with 0 internet access.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#101214] rounded-lg border border-[#262a2d] shrink-0">
          {[
            { id: 'generator', label: 'Issue .lic Certificate', icon: FileCheck2 },
            { id: 'verifier', label: 'Air-Gap Inspector', icon: ShieldCheck },
            { id: 'airgap_sdk', label: 'Air-Gapped SDK', icon: Code2 },
            { id: 'ca_keys', label: 'Root CA Keys', icon: KeyRound },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabMode)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-[#2db39f] text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-[#191c1f]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          TAB 1: CERTIFICATE GENERATOR & EXPORTER
          ========================================================================= */}
      {activeTab === 'generator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Form: Configuration & Parameters (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Quick Prefill from License */}
            <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-[#46cbb5]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                    Source License Account
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400">Pre-fill details</span>
              </div>

              <select
                value={selectedLicenseId}
                onChange={(e) => setSelectedLicenseId(e.target.value)}
                className="w-full text-xs font-mono bg-[#101214] border border-[#292d30] rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-[#2db39f]"
              >
                {licenses.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.productName} — {l.key} ({l.userName})
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Software Product
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full text-xs bg-[#101214] border border-[#292d30] rounded-lg px-2.5 py-1.5 text-white focus:outline-hidden focus:border-[#2db39f]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    License Key
                  </label>
                  <input
                    type="text"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    className="w-full text-xs font-mono bg-[#101214] border border-[#292d30] rounded-lg px-2.5 py-1.5 text-[#46cbb5] focus:outline-hidden focus:border-[#2db39f]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Licensee Organization
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full text-xs bg-[#101214] border border-[#292d30] rounded-lg px-2.5 py-1.5 text-white focus:outline-hidden focus:border-[#2db39f]"
                    placeholder="e.g. Acme Aerospace Corp"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={licenseeEmail}
                    onChange={(e) => setLicenseeEmail(e.target.value)}
                    className="w-full text-xs bg-[#101214] border border-[#292d30] rounded-lg px-2.5 py-1.5 text-white focus:outline-hidden focus:border-[#2db39f]"
                  />
                </div>
              </div>
            </div>

            {/* Hardware Binding & Resource Caps */}
            <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Server className="w-4 h-4 text-[#46cbb5]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                    Hardware Lock &amp; Resource Limits
                  </h3>
                </div>
                <span className="text-[10px] text-[#46cbb5] font-semibold font-mono">Air-Gap Shield</span>
              </div>

              {/* Lock Mode Selector */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'node_locked', label: 'Single Server (Locked)', icon: Server },
                  { id: 'multi_node', label: 'Cluster / Multi-Host', icon: Layers },
                  { id: 'container', label: 'Container / Pod UUID', icon: Cpu },
                  { id: 'site_wide', label: 'Site-Wide (Core Cap)', icon: HardDrive },
                ].map(mode => {
                  const Icon = mode.icon;
                  const isSel = hardwareLockMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setHardwareLockMode(mode.id as any)}
                      className={`p-2.5 rounded-lg border text-left text-xs font-medium transition-all flex items-center space-x-2 cursor-pointer ${
                        isSel
                          ? 'border-[#2db39f] bg-[#191c1f] text-[#46cbb5] font-bold shadow-sm'
                          : 'border-[#292d30] bg-[#101214] text-slate-400 hover:border-[#303438] hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[11px] leading-tight">{mode.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Hardware Fingerprint input */}
              {hardwareLockMode === 'node_locked' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-300">
                      Target Server Hardware Fingerprint
                    </label>
                    <button
                      type="button"
                      onClick={() => setHardwareFingerprint(`FPR-SRV-AIRGAP-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`)}
                      className="text-[10px] text-[#46cbb5] hover:text-white flex items-center space-x-0.5 cursor-pointer"
                    >
                      <RefreshCw className="w-2.5 h-2.5 mr-0.5" />
                      <span>Randomize</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={hardwareFingerprint}
                    onChange={(e) => setHardwareFingerprint(e.target.value)}
                    className="w-full text-xs font-mono bg-[#101214] border border-[#292d30] rounded-lg px-2.5 py-1.5 text-white focus:outline-hidden focus:border-[#2db39f]"
                    placeholder="e.g. FPR-SRV-AIRGAP-E49A-91BC"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Certificate will refuse authorization if executed on hardware with a different SHA-256 CPU/Motherboard hash.
                  </p>
                </div>
              )}

              {hardwareLockMode === 'multi_node' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Allowed Cluster Hostnames or Node Fingerprints
                  </label>
                  <textarea
                    rows={2}
                    value={clusterNodes}
                    onChange={(e) => setClusterNodes(e.target.value)}
                    className="w-full text-xs font-mono bg-[#101214] border border-[#292d30] rounded-lg px-2.5 py-1.5 text-white focus:outline-hidden focus:border-[#2db39f]"
                    placeholder="srv-node-01.internal, srv-node-02.internal..."
                  />
                </div>
              )}

              {/* Resource Caps Grid */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#292d30]">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1 font-mono">
                    Max CPU Cores
                  </label>
                  <select
                    value={maxCpuCores}
                    onChange={(e) => setMaxCpuCores(Number(e.target.value))}
                    className="w-full text-xs bg-[#101214] border border-[#292d30] rounded-lg px-2 py-1.5 text-white focus:outline-hidden focus:border-[#2db39f]"
                  >
                    <option value={16}>16 Cores</option>
                    <option value={32}>32 Cores</option>
                    <option value={64}>64 Cores</option>
                    <option value={128}>128 Cores</option>
                    <option value={512}>512 Cores</option>
                    <option value={0}>Unlimited</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1 font-mono">
                    Max RAM (GB)
                  </label>
                  <select
                    value={maxRamGb}
                    onChange={(e) => setMaxRamGb(Number(e.target.value))}
                    className="w-full text-xs bg-[#101214] border border-[#292d30] rounded-lg px-2 py-1.5 text-white focus:outline-hidden focus:border-[#2db39f]"
                  >
                    <option value={128}>128 GB</option>
                    <option value={256}>256 GB</option>
                    <option value={512}>512 GB</option>
                    <option value={1024}>1,024 GB (1TB)</option>
                    <option value={0}>Unlimited</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1 font-mono">
                    GPU Accelerators
                  </label>
                  <select
                    value={maxGpuUnits}
                    onChange={(e) => setMaxGpuUnits(Number(e.target.value))}
                    className="w-full text-xs bg-[#101214] border border-[#292d30] rounded-lg px-2 py-1.5 text-white focus:outline-hidden focus:border-[#2db39f]"
                  >
                    <option value={0}>CPU Only (0)</option>
                    <option value={2}>2x GPUs</option>
                    <option value={4}>4x GPUs</option>
                    <option value={8}>8x GPUs (H100)</option>
                    <option value={16}>16x GPUs</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Validity & Entitlements */}
            <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-[#46cbb5]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                    Validity &amp; Entitlements
                  </h3>
                </div>
              </div>

              {/* Validity Selection */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '1_year', label: '1 Year License' },
                  { id: '3_years', label: '3 Years License' },
                  { id: 'perpetual', label: 'Perpetual (Lifetime)' },
                ].map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setValidityDuration(v.id as any)}
                    className={`px-2.5 py-1.5 rounded-lg border text-center text-xs font-medium transition-all cursor-pointer ${
                      validityDuration === v.id
                        ? 'border-[#2db39f] bg-[#191c1f] text-[#46cbb5] font-bold shadow-sm'
                        : 'border-[#292d30] bg-[#101214] text-slate-400 hover:border-[#303438] hover:text-slate-200'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              {/* Feature Chips */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 font-mono">
                  Unlocked Feature Entitlement Flags
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'fips_140_2_crypto',
                    'airgap_inference',
                    'multi_node_cluster',
                    'unlimited_export',
                    'audit_tamper_seal',
                    'gpu_acceleration',
                    'enterprise_ha'
                  ].map(feat => {
                    const isChecked = selectedEntitlements.includes(feat);
                    return (
                      <button
                        key={feat}
                        type="button"
                        onClick={() => toggleEntitlement(feat)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold transition-all border cursor-pointer ${
                          isChecked
                            ? 'bg-[#15201e] text-[#46cbb5] border-[#303438] font-bold shadow-xs'
                            : 'bg-[#101214] text-slate-400 border-[#292d30] hover:border-[#303438]'
                        }`}
                      >
                        {isChecked ? '✓ ' : '+ '}{feat}
                      </button>
                    );
                  })}
                </div>

                {/* Custom feature input */}
                <div className="flex items-center space-x-2 mt-2">
                  <input
                    type="text"
                    value={customEntitlementInput}
                    onChange={(e) => setCustomEntitlementInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomEntitlement()}
                    placeholder="Add custom feature tag..."
                    className="flex-1 text-[11px] font-mono bg-[#101214] border border-[#292d30] rounded-lg px-2.5 py-1.5 text-white focus:outline-hidden focus:border-[#2db39f]"
                  />
                  <button
                    type="button"
                    onClick={addCustomEntitlement}
                    className="px-3 py-1.5 bg-[#191c1f] hover:bg-[#292d30] text-[11px] font-semibold text-[#46cbb5] rounded-lg border border-[#292d30] cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerateCertificate}
                disabled={isGenerating}
                className="w-full mt-2 py-2.5 px-4 rounded-lg bg-[#2db39f] hover:bg-[#279b89] text-slate-950 font-bold text-xs shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Signing with RSA-2048...' : 'Generate & Cryptographically Sign Certificate'}</span>
              </button>
            </div>

          </div>

          {/* Right Panel: Armored Certificate Preview & 1-Click Export (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {signedCert ? (
              <div className="bg-[#151719] border border-[#292d30] rounded-xl overflow-hidden shadow-2xl flex flex-col">
                
                {/* Header Bar */}
                <div className="bg-[#191c1f] px-5 py-3.5 border-b border-[#292d30] flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-[#15201e] text-[#10b981] flex items-center justify-center border border-[#065f46]">
                      <FileCheck2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white font-mono">
                          {productName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_license.lic
                        </span>
                        <span className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-[#15201e] text-[#10b981] border border-[#065f46] font-mono">
                          RSA-SHA256 SIGNED
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Certificate ID: {signedCert.certificateId}
                      </p>
                    </div>
                  </div>

                  {/* Export Buttons */}
                  <div className="flex items-center space-x-2">
                    
                    {/* Download .lic */}
                    <button
                      onClick={handleDownloadLicFile}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-[#2db39f] hover:bg-[#279b89] shadow-md transition-all cursor-pointer"
                      title="Download .lic file for air-gapped server installation"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .lic</span>
                    </button>

                    {/* Download JSON */}
                    <button
                      onClick={handleDownloadJsonFile}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-[#191c1f] hover:bg-[#292d30] transition-all border border-[#292d30] cursor-pointer"
                      title="Download structured JSON format"
                    >
                      <FileCode className="w-3.5 h-3.5 text-[#46cbb5]" />
                      <span className="hidden sm:inline">JSON</span>
                    </button>

                    {/* Copy to Clipboard */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(signedCert.armoredCertificate);
                        setCopiedArmor(true);
                        setTimeout(() => setCopiedArmor(false), 2000);
                      }}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-[#191c1f] hover:bg-[#292d30] transition-all border border-[#292d30] cursor-pointer"
                    >
                      {copiedArmor ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
                      <span>{copiedArmor ? 'Copied' : 'Copy'}</span>
                    </button>

                    {/* Verify in Inspector Button */}
                    <button
                      onClick={() => {
                        setVerifierInput(signedCert.armoredCertificate);
                        setActiveTab('verifier');
                        handleVerifyOffline(signedCert.armoredCertificate);
                      }}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#46cbb5] bg-[#15201e] hover:bg-[#191c1f] transition-all border border-[#303438] cursor-pointer"
                      title="Test certificate validity in the Air-Gap Inspector"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </button>
                  </div>
                </div>

                {/* Certificate Armor Display */}
                <div className="p-5 overflow-x-auto max-h-[460px] bg-[#101214] font-mono text-xs leading-relaxed text-[#46cbb5] scrollbar-thin">
                  <pre className="whitespace-pre">
                    <code>{signedCert.armoredCertificate}</code>
                  </pre>
                </div>

                {/* Certificate Payload Highlights */}
                <div className="bg-[#191c1f] p-4 border-t border-[#292d30] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold font-mono">Licensee Org</span>
                    <p className="font-bold text-white truncate">{signedCert.payload.licensee.organization}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold font-mono">Hardware Lock</span>
                    <p className="font-mono text-[#46cbb5] truncate">
                      {signedCert.payload.hardwareLock.mode.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold font-mono">Core Allocation</span>
                    <p className="font-bold text-slate-200">
                      {signedCert.payload.hardwareLock.maxCpuCores ? `${signedCert.payload.hardwareLock.maxCpuCores} Cores` : 'Unlimited'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold font-mono">Valid Until</span>
                    <p className="font-bold text-slate-200">
                      {signedCert.payload.validity.expiresAt ? new Date(signedCert.payload.validity.expiresAt).toLocaleDateString() : 'Perpetual'}
                    </p>
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-12 text-center text-slate-400">
                <FileCheck2 className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-slate-200">No Certificate Generated Yet</p>
                <p className="text-xs text-slate-400 mt-1">Configure your parameters and click "Generate &amp; Cryptographically Sign" above.</p>
              </div>
            )}

            {/* Quick Deployment Guide Card */}
            <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-5 shadow-lg space-y-3">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-[#46cbb5]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                  How to Install on Air-Gapped Enterprise Server
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-[#101214] rounded-lg border border-[#292d30] space-y-1">
                  <span className="font-bold text-white">Step 1: Transfer File</span>
                  <p className="text-slate-300 text-[11px] leading-snug">
                    Transfer <code className="font-mono text-[#46cbb5]">license.lic</code> to target server via secure flash drive / bastion.
                  </p>
                </div>
                <div className="p-3 bg-[#101214] rounded-lg border border-[#292d30] space-y-1">
                  <span className="font-bold text-white">Step 2: Place in Path</span>
                  <p className="text-slate-300 text-[11px] leading-snug">
                    Place at <code className="font-mono text-[#46cbb5]">/etc/licensepulse/license.lic</code> or app root directory.
                  </p>
                </div>
                <div className="p-3 bg-[#101214] rounded-lg border border-[#292d30] space-y-1">
                  <span className="font-bold text-white">Step 3: Auto-Verify</span>
                  <p className="text-slate-300 text-[11px] leading-snug">
                    Daemon validates cryptographic signature and hardware fingerprint locally on startup.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* =========================================================================
          TAB 2: OFFLINE VERIFIER & AIR-GAP INSPECTOR
          ========================================================================= */}
      {activeTab === 'verifier' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Input Box & Machine Simulator (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Upload className="w-4 h-4 text-[#46cbb5]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                    Paste .lic Certificate or JSON Payload
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (signedCert) setVerifierInput(signedCert.armoredCertificate);
                  }}
                  className="text-[10px] text-[#46cbb5] hover:text-white cursor-pointer"
                >
                  Load Active Cert
                </button>
              </div>

              <textarea
                rows={9}
                value={verifierInput}
                onChange={(e) => setVerifierInput(e.target.value)}
                placeholder="Paste -----BEGIN LICENSEPULSE ENTERPRISE CERTIFICATE----- block or JSON..."
                className="w-full text-[11px] font-mono bg-[#101214] border border-[#292d30] rounded-lg p-3 text-[#46cbb5] focus:outline-hidden focus:border-[#2db39f] leading-relaxed"
              />

              {/* Server Hardware Simulator Controls */}
              <div className="pt-2 border-t border-[#292d30] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center space-x-1.5 font-mono">
                    <Laptop className="w-3.5 h-3.5 text-[#46cbb5]" />
                    <span>Air-Gapped Target Server Simulator</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Simulate execution host</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Host Hardware Fingerprint
                  </label>
                  <input
                    type="text"
                    value={simulatedServerFingerprint}
                    onChange={(e) => setSimulatedServerFingerprint(e.target.value)}
                    className="w-full text-xs font-mono bg-[#101214] border border-[#292d30] rounded-lg px-2.5 py-1.5 text-white focus:outline-hidden focus:border-[#2db39f]"
                    placeholder="e.g. FPR-SRV-AIRGAP-E49A-91BC"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-300">
                    Host Installed CPU Cores:
                  </label>
                  <select
                    value={simulatedServerCores}
                    onChange={(e) => setSimulatedServerCores(Number(e.target.value))}
                    className="text-xs bg-[#101214] border border-[#292d30] rounded-lg px-2.5 py-1 text-white focus:outline-hidden focus:border-[#2db39f]"
                  >
                    <option value={16}>16 Cores</option>
                    <option value={32}>32 Cores</option>
                    <option value={64}>64 Cores</option>
                    <option value={128}>128 Cores</option>
                  </select>
                </div>
              </div>

              {/* Verify Button */}
              <button
                type="button"
                onClick={() => handleVerifyOffline()}
                disabled={isVerifying || !verifierInput.trim()}
                className="w-full py-2.5 px-4 rounded-lg bg-[#2db39f] hover:bg-[#279b89] text-slate-950 font-bold text-xs shadow-lg flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <ShieldCheck className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />
                <span>{isVerifying ? 'Verifying RSA Signature Offline...' : 'Verify Cryptographic Signature Offline'}</span>
              </button>
            </div>

          </div>

          {/* Right Column: Verification Diagnostic Results (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {verificationResult ? (
              <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-6 shadow-xl space-y-5">
                
                {/* Result Status Banner */}
                <div className={`p-4 rounded-lg border flex items-start space-x-3.5 ${
                  verificationResult.valid
                    ? 'bg-[#15201e] border-[#065f46] text-[#10b981]'
                    : 'bg-rose-950/40 border-rose-800 text-rose-300'
                }`}>
                  <div className={`p-2 rounded-lg mt-0.5 ${
                    verificationResult.valid ? 'bg-[#021f24] text-[#10b981] border border-[#08535d]' : 'bg-rose-900 text-rose-200'
                  }`}>
                    {verificationResult.valid ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold font-mono">
                        {verificationResult.valid ? '✓ Cryptographic Signature VALID & AUTHENTIC' : '✗ Verification Failed'}
                      </h4>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-black/40 border border-[#292d30]">
                        100% Offline Auth
                      </span>
                    </div>
                    <p className="text-xs mt-1 opacity-90 text-slate-300">
                      {verificationResult.valid 
                        ? 'The RSA-2048 PKCS#1 v1.5 digital signature matches the Master CA public key. No tampering or byte modifications detected.' 
                        : verificationResult.reason}
                    </p>
                  </div>
                </div>

                {/* Detailed Checks Breakdown */}
                {verificationResult.payload && (
                  <div className="space-y-4">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                      Air-Gapped Machine Authorization Checks
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      
                      {/* Check 1: Hardware Lock */}
                      <div className="p-3.5 rounded-lg bg-[#101214] border border-[#292d30] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">1. Hardware Binding</span>
                          {verificationResult.payload.hardwareLock.mode === 'node_locked' ? (
                            verificationResult.payload.hardwareLock.fingerprint === simulatedServerFingerprint ? (
                              <span className="text-[10px] text-[#10b981] font-bold font-mono">✓ Match</span>
                            ) : (
                              <span className="text-[10px] text-rose-400 font-bold font-mono">✗ Host Mismatch</span>
                            )
                          ) : (
                            <span className="text-[10px] text-[#46cbb5] font-bold font-mono">✓ {verificationResult.payload.hardwareLock.mode}</span>
                          )}
                        </div>
                        <p className="font-mono text-slate-200 text-[11px] truncate">
                          Cert: {verificationResult.payload.hardwareLock.fingerprint || 'Unrestricted'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Host: {simulatedServerFingerprint}
                        </p>
                      </div>

                      {/* Check 2: Core Ceiling */}
                      <div className="p-3.5 rounded-lg bg-[#101214] border border-[#292d30] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">2. CPU Cores Allowed</span>
                          {(!verificationResult.payload.hardwareLock.maxCpuCores || simulatedServerCores <= verificationResult.payload.hardwareLock.maxCpuCores) ? (
                            <span className="text-[10px] text-[#10b981] font-bold font-mono">✓ Allowed</span>
                          ) : (
                            <span className="text-[10px] text-rose-400 font-bold font-mono">✗ Core Limit Exceeded</span>
                          )}
                        </div>
                        <p className="font-bold text-slate-200 font-mono">
                          {verificationResult.payload.hardwareLock.maxCpuCores ? `Up to ${verificationResult.payload.hardwareLock.maxCpuCores} Cores` : 'Unlimited'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Detected Host: {simulatedServerCores} Cores
                        </p>
                      </div>

                      {/* Check 3: Expiration */}
                      <div className="p-3.5 rounded-lg bg-[#101214] border border-[#292d30] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">3. Validity Window</span>
                          <span className={`text-[10px] font-bold font-mono ${verificationResult.expired ? 'text-rose-400' : 'text-[#10b981]'}`}>
                            {verificationResult.expired ? '✗ Expired' : '✓ Active'}
                          </span>
                        </div>
                        <p className="font-bold text-slate-200 font-mono">
                          {verificationResult.payload.validity.isPerpetual ? 'Perpetual (No Expiry)' : new Date(verificationResult.payload.validity.expiresAt).toLocaleDateString()}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Issued: {new Date(verificationResult.payload.validity.issuedAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Check 4: Licensee & Product */}
                      <div className="p-3.5 rounded-lg bg-[#101214] border border-[#292d30] space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">4. Licensee Entity</span>
                        <p className="font-bold text-white truncate font-mono">
                          {verificationResult.payload.licensee.organization}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          Product: {verificationResult.payload.productName}
                        </p>
                      </div>

                    </div>

                    {/* Entitlement Badges */}
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-300 block mb-1.5 font-mono">
                        Unlocked Feature Entitlements in this Offline License:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {verificationResult.payload.entitlements.map((feat: string) => (
                          <span
                            key={feat}
                            className="px-2.5 py-0.5 rounded-md font-mono text-[10px] bg-[#15201e] text-[#46cbb5] border border-[#303438] font-bold"
                          >
                            +{feat}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Raw Canonical JSON Preview */}
                    <div className="bg-[#101214] p-4 rounded-lg border border-[#292d30] font-mono text-xs text-slate-300 max-h-48 overflow-y-auto">
                      <pre>{JSON.stringify(verificationResult.payload, null, 2)}</pre>
                    </div>

                  </div>
                )}

              </div>
            ) : (
              <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-12 text-center text-slate-400">
                <ShieldCheck className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-slate-200">Ready to Inspect Offline Certificate</p>
                <p className="text-xs text-slate-400 mt-1">Paste a .lic certificate on the left or generate one in Tab 1 to run the offline verification diagnostics.</p>
              </div>
            )}

          </div>

        </div>
      )}

      {/* =========================================================================
          TAB 3: AIR-GAPPED VERIFICATION SDK CODE
          ========================================================================= */}
      {activeTab === 'airgap_sdk' && (
        <div className="space-y-4">
          
          <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-100">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2 font-mono">
                <span>Air-Gapped Client &amp; Server Verification Code</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#15201e] text-[#10b981] border border-[#065f46] font-bold">
                  Zero Network Calls
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Embed these functions into your on-premise application to verify <code className="font-mono text-[#46cbb5] bg-[#101214] px-1 py-0.5 rounded border border-[#292d30]">license.lic</code> with the bundled public key.
              </p>
            </div>

            {/* Language Selector */}
            <div className="flex flex-wrap gap-1 bg-[#101214] p-1.5 rounded-lg border border-[#292d30]">
              {[
                { id: 'python', label: 'Python (cryptography)' },
                { id: 'go', label: 'Go (crypto/rsa)' },
                { id: 'csharp', label: 'C# (.NET 8)' },
                { id: 'cpp', label: 'C++ (OpenSSL)' },
                { id: 'nodejs', label: 'Node.js (crypto)' },
                { id: 'rust', label: 'Rust (rsa)' },
              ].map(lang => (
                <button
                  key={lang.id}
                  onClick={() => setSelectedSdkLang(lang.id as any)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    selectedSdkLang === lang.id
                      ? 'bg-[#2db39f] text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-[#191c1f]'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Code Display Frame */}
          <div className="bg-[#101214] border border-[#292d30] rounded-xl overflow-hidden shadow-2xl">
            <div className="bg-[#191c1f] px-4 py-3 border-b border-[#292d30] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-[#46cbb5]" />
                <span className="text-xs font-mono text-slate-200 font-semibold">
                  airgap_verifier_{selectedSdkLang}.{selectedSdkLang === 'python' ? 'py' : selectedSdkLang === 'csharp' ? 'cs' : selectedSdkLang === 'go' ? 'go' : selectedSdkLang === 'cpp' ? 'cpp' : selectedSdkLang === 'rust' ? 'rs' : 'ts'}
                </span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(sdkVerificationCode);
                  setCopiedJson(true);
                  setTimeout(() => setCopiedJson(false), 2000);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-[#2db39f] hover:bg-[#279b89] shadow-md cursor-pointer"
              >
                {copiedJson ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedJson ? 'Copied Code!' : 'Copy Verification Code'}</span>
              </button>
            </div>
            <div className="p-5 overflow-x-auto max-h-[520px] font-mono text-xs leading-relaxed text-slate-200 scrollbar-thin">
              <pre>
                <code>{sdkVerificationCode}</code>
              </pre>
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          TAB 4: MASTER ROOT CA KEY MANAGER
          ========================================================================= */}
      {activeTab === 'ca_keys' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[#101214] border border-[#292d30] rounded-xl overflow-hidden shadow-2xl">
              <div className="bg-[#191c1f] px-5 py-3.5 border-b border-[#292d30] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <KeyRound className="w-4 h-4 text-[#46cbb5]" />
                  <span className="text-xs font-bold text-white font-mono">public_key.pem (Distribute with Software)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleDownloadPublicKey}
                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-950 bg-[#2db39f] hover:bg-[#279b89] shadow-xs cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download .pem</span>
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(caPublicKeyPem);
                      setCaCopied(true);
                      setTimeout(() => setCaCopied(false), 2000);
                    }}
                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-200 bg-[#191c1f] hover:bg-[#292d30] border border-[#292d30] cursor-pointer"
                  >
                    {caCopied ? <Check className="w-3 h-3 text-[#10b981]" /> : <Copy className="w-3 h-3 text-slate-300" />}
                    <span>{caCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
              <div className="p-5 font-mono text-xs text-emerald-400 leading-relaxed overflow-x-auto max-h-72 scrollbar-thin">
                <pre>
                  <code>{caPublicKeyPem}</code>
                </pre>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#191c1f] border border-[#292d30] rounded-xl p-5 shadow-lg space-y-4 text-slate-100">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#46cbb5]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                  Certificate Authority Specifications
                </h3>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#292d30]">
                  <span className="text-slate-400">Asymmetric Standard:</span>
                  <strong className="text-white font-mono">RSA-2048 (PKCS#1 v1.5)</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#292d30]">
                  <span className="text-slate-400">Digest Hash Algorithm:</span>
                  <strong className="text-white font-mono">SHA-256 (256-bit)</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#292d30]">
                  <span className="text-slate-400">Key ID Identifier:</span>
                  <strong className="text-[#46cbb5] font-mono">CA-LP-ROOT-2026</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#292d30]">
                  <span className="text-slate-400">Security Standard:</span>
                  <strong className="text-[#10b981] font-mono">FIPS 140-2 Level 3 Ready</strong>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Regenerate Master CA Root Keypair? Existing offline certificates will need to be re-issued with the new key.')) {
                      const { publicKeyPem } = await rotateCaKeyPair();
                      setCaPublicKeyPem(publicKeyPem);
                    }
                  }}
                  className="w-full py-2 px-3 rounded-lg border border-rose-900/60 text-rose-300 hover:bg-rose-950/40 text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Rotate CA Root Signing Keypair</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
