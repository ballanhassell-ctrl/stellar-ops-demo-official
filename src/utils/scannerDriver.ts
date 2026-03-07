/**
 * Scanner driver integration for browser-based TWAIN/WIA scanning.
 *
 * TWAIN is a native protocol — browsers cannot directly talk to TWAIN drivers.
 * There are two practical approaches to integrate scanners in a web app:
 *
 * 1. **Local scanning service** (recommended for production):
 *    Install a lightweight companion app / service on the user's workstation
 *    that exposes TWAIN scanner access over a local HTTP/WebSocket endpoint.
 *    The web app communicates with this local service to discover scanners,
 *    trigger scans, and receive scanned images.
 *
 *    Popular solutions:
 *    - Dynamic Web TWAIN (Dynamsoft) — commercial, mature, cross-platform
 *    - asprise.com Web Scan SDK
 *    - Scanner.js
 *
 * 2. **WebUSB API** (experimental, limited):
 *    Some modern scanners can be accessed via WebUSB in Chrome/Edge, but
 *    driver support is very limited and not production-ready.
 *
 * This module provides an abstraction layer that works with a local scanning
 * service. It defaults to a configurable localhost endpoint and falls back
 * gracefully when no service is detected.
 */

export interface ScannerDevice {
  id: string;
  name: string;
  type: 'twain' | 'wia' | 'sane';
  isDefault: boolean;
}

export interface ScanOptions {
  resolution?: number; // DPI, default 300
  colorMode?: 'color' | 'grayscale' | 'bw';
  format?: 'png' | 'jpeg' | 'pdf';
  duplex?: boolean;
  feeder?: boolean; // use document feeder if available
}

export interface ScanResult {
  imageBlob: Blob;
  file: File;
  width: number;
  height: number;
  pageIndex: number;
}

export type ScannerServiceStatus = 'connected' | 'disconnected' | 'checking';

// Configurable endpoint for the local scanning service
const DEFAULT_SERVICE_URL = 'http://localhost:18181';

let serviceUrl = DEFAULT_SERVICE_URL;

export function configureScannerService(url: string) {
  serviceUrl = url;
}

/**
 * Check if the local scanning service is running.
 */
export async function checkScannerService(): Promise<ScannerServiceStatus> {
  try {
    const response = await fetch(`${serviceUrl}/api/status`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) return 'connected';
    return 'disconnected';
  } catch {
    return 'disconnected';
  }
}

/**
 * Discover available scanners via the local scanning service.
 */
export async function discoverScanners(): Promise<ScannerDevice[]> {
  try {
    const response = await fetch(`${serviceUrl}/api/scanners`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.scanners ?? [];
  } catch {
    return [];
  }
}

/**
 * Acquire a scan from the specified scanner.
 * Returns one or more scanned page images.
 */
export async function acquireScan(
  scannerId: string,
  options: ScanOptions = {}
): Promise<ScanResult[]> {
  const scanConfig = {
    scannerId,
    resolution: options.resolution ?? 300,
    colorMode: options.colorMode ?? 'grayscale',
    format: options.format ?? 'png',
    duplex: options.duplex ?? false,
    feeder: options.feeder ?? false,
  };

  const response = await fetch(`${serviceUrl}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scanConfig),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => 'Scan failed');
    throw new Error(`Scanner error: ${error}`);
  }

  const data = await response.json();
  const results: ScanResult[] = [];

  for (let i = 0; i < data.pages.length; i++) {
    const page = data.pages[i];
    // The service returns base64-encoded image data
    const byteString = atob(page.data);
    const bytes = new Uint8Array(byteString.length);
    for (let j = 0; j < byteString.length; j++) {
      bytes[j] = byteString.charCodeAt(j);
    }
    const mimeType = scanConfig.format === 'jpeg' ? 'image/jpeg'
      : scanConfig.format === 'pdf' ? 'application/pdf'
      : 'image/png';
    const blob = new Blob([bytes], { type: mimeType });
    const file = new File([blob], `scan_${Date.now()}_page${i + 1}.${scanConfig.format}`, { type: mimeType });

    results.push({
      imageBlob: blob,
      file,
      width: page.width ?? 0,
      height: page.height ?? 0,
      pageIndex: i,
    });
  }

  return results;
}

/**
 * Instructions for setting up the local scanning service companion app.
 */
export const SCANNER_SETUP_INSTRUCTIONS = {
  title: 'Scanner Service Setup',
  steps: [
    'Download the Scanner Bridge companion app for your operating system.',
    'Install and run the Scanner Bridge service — it runs in the system tray.',
    'The service listens on localhost:18181 and exposes your TWAIN/WIA scanners to the web app.',
    'Once running, click "Detect Scanners" in the app to discover available devices.',
    'Select your scanner and click "Scan" to acquire check images directly.',
  ],
  requirements: [
    'Windows 7+ or macOS 10.13+ (TWAIN/WIA drivers must be installed for your scanner)',
    'Scanner must be connected via USB or network and have drivers installed',
    'The Scanner Bridge companion app must be running while scanning',
  ],
};
