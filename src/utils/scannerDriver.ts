/**
 * Scanner driver integration for browser-based TWAIN/WIA scanning.
 *
 * Communicates with the Scanner Bridge sidecar app (scanner-bridge/) that runs
 * locally and exposes TWAIN/WIA/SANE scanners over HTTP + WebSocket.
 *
 * Architecture:
 *   [Browser/Dashboard] <--HTTP/WS--> [Scanner Bridge on localhost:18181] <--TWAIN/WIA/SANE--> [Scanner Hardware]
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

export type ScannerEventType = 'scan:start' | 'scan:complete' | 'scan:error' | 'scanners:refresh';

export interface ScannerEventListener {
  (event: ScannerEventType, data: unknown): void;
}

// Configurable endpoint for the local scanning service
const DEFAULT_SERVICE_URL = 'http://localhost:18181';

let serviceUrl = DEFAULT_SERVICE_URL;
let wsConnection: WebSocket | null = null;
const eventListeners = new Set<ScannerEventListener>();

export function configureScannerService(url: string) {
  serviceUrl = url;
}

/**
 * Check if the local Scanner Bridge sidecar is running.
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
 * Discover available scanners via the Scanner Bridge sidecar.
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
 * Returns one or more scanned page images as File objects.
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
    // The sidecar returns base64-encoded image data
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
 * Connect to the Scanner Bridge WebSocket for real-time scan events.
 * The sidecar broadcasts events like scan:start, scan:complete, scan:error.
 */
export function connectScannerWebSocket(): void {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) return;

  const wsUrl = serviceUrl.replace(/^http/, 'ws') + '/ws';

  try {
    wsConnection = new WebSocket(wsUrl);

    wsConnection.onmessage = (event) => {
      try {
        const { event: eventType, data } = JSON.parse(event.data);
        eventListeners.forEach(listener => listener(eventType, data));
      } catch {
        // Ignore malformed messages
      }
    };

    wsConnection.onclose = () => {
      wsConnection = null;
      // Auto-reconnect after 5s
      setTimeout(() => {
        if (eventListeners.size > 0) connectScannerWebSocket();
      }, 5000);
    };

    wsConnection.onerror = () => {
      wsConnection?.close();
    };
  } catch {
    // WebSocket connection failed — service may not be running
  }
}

export function addScannerEventListener(listener: ScannerEventListener): () => void {
  eventListeners.add(listener);
  connectScannerWebSocket();
  return () => {
    eventListeners.delete(listener);
    if (eventListeners.size === 0) {
      wsConnection?.close();
      wsConnection = null;
    }
  };
}

/**
 * Instructions for setting up the Scanner Bridge sidecar app.
 */
export const SCANNER_SETUP_INSTRUCTIONS = {
  title: 'Scanner Bridge Setup',
  steps: [
    'Navigate to the scanner-bridge/ folder in this project.',
    'Run "npm install" then "npm start" to launch the Scanner Bridge service.',
    'The service runs in the system tray and listens on localhost:18181.',
    'Once running, click "Detect Scanners" in the dashboard to discover available devices.',
    'Select your scanner and click "Scan" to acquire check images directly into the app.',
  ],
  requirements: [
    'Node.js 18+ installed on the workstation where the scanner is connected',
    'Windows: Scanner must have WIA drivers installed (most scanners do by default)',
    'Linux/macOS: SANE must be installed (sudo apt install sane-utils / brew install sane-backends)',
    'Scanner must be connected via USB or network',
    'The Scanner Bridge service must be running while scanning',
  ],
};
