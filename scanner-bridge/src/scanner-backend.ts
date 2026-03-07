import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// ---- Types ----

export interface ScannerDevice {
  id: string;
  name: string;
  type: 'twain' | 'wia' | 'sane';
  isDefault: boolean;
}

export interface ScanOptions {
  resolution?: number;
  colorMode?: 'color' | 'grayscale' | 'bw';
  format?: 'png' | 'jpeg' | 'pdf';
  duplex?: boolean;
  feeder?: boolean;
}

export interface ScannedPage {
  data: string; // base64-encoded image
  width: number;
  height: number;
}

// ---- Platform detection ----

type Platform = 'windows' | 'linux' | 'macos';

function getPlatform(): Platform {
  switch (os.platform()) {
    case 'win32': return 'windows';
    case 'darwin': return 'macos';
    default: return 'linux';
  }
}

// ---- Scanner Backend Interface ----

interface ScannerBackend {
  listDevices(): Promise<ScannerDevice[]>;
  scan(deviceId: string, options: ScanOptions): Promise<ScannedPage[]>;
}

// ---- Windows WIA Backend ----
// Uses PowerShell to access Windows Image Acquisition (WIA) COM objects

class WiaBackend implements ScannerBackend {
  async listDevices(): Promise<ScannerDevice[]> {
    const psScript = `
      Add-Type -AssemblyName System.Runtime.InteropServices
      $deviceManager = New-Object -ComObject WIA.DeviceManager
      $devices = @()
      foreach ($deviceInfo in $deviceManager.DeviceInfos) {
        if ($deviceInfo.Type -eq 1) {  # Scanner type
          $devices += @{
            Id = $deviceInfo.DeviceID
            Name = $deviceInfo.Properties("Name").Value
          }
        }
      }
      $devices | ConvertTo-Json -Compress
    `;

    try {
      const { stdout } = await execAsync(
        `powershell -NoProfile -NonInteractive -Command "${psScript.replace(/"/g, '\\"')}"`,
        { timeout: 10000 }
      );

      const parsed = JSON.parse(stdout.trim() || '[]');
      const deviceArray = Array.isArray(parsed) ? parsed : [parsed];

      return deviceArray
        .filter((d: { Id?: string; Name?: string }) => d && d.Id)
        .map((d: { Id: string; Name: string }, i: number) => ({
          id: d.Id,
          name: d.Name || `Scanner ${i + 1}`,
          type: 'wia' as const,
          isDefault: i === 0,
        }));
    } catch (err) {
      console.error('WIA device enumeration failed:', err);
      return [];
    }
  }

  async scan(deviceId: string, options: ScanOptions): Promise<ScannedPage[]> {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-bridge-'));
    const outputFile = path.join(tempDir, `scan.${options.format || 'png'}`);

    const resolution = options.resolution || 300;
    const colorIntent = options.colorMode === 'color' ? 1 : options.colorMode === 'bw' ? 4 : 2;

    // WIA format GUIDs
    const formatGuid = options.format === 'jpeg'
      ? '{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}'
      : '{B96B3CAF-0728-11D3-9D7B-0000F81EF32E}'; // PNG

    const psScript = `
      $deviceManager = New-Object -ComObject WIA.DeviceManager
      $device = $null
      foreach ($deviceInfo in $deviceManager.DeviceInfos) {
        if ($deviceInfo.DeviceID -eq '${deviceId.replace(/'/g, "''")}') {
          $device = $deviceInfo.Connect()
          break
        }
      }
      if (-not $device) { throw "Scanner not found" }

      $item = $device.Items[1]

      # Set scan properties
      $item.Properties("6146").Value = ${colorIntent}
      $item.Properties("6147").Value = ${resolution}
      $item.Properties("6148").Value = ${resolution}

      $imageProcess = New-Object -ComObject WIA.ImageProcess
      $imageProcess.Filters.Add($imageProcess.FilterInfos("Convert").FilterID)
      $imageProcess.Filters[1].Properties("FormatID").Value = "${formatGuid}"

      $image = $item.Transfer()
      $image = $imageProcess.Apply($image)
      $image.SaveFile("${outputFile.replace(/\\/g, '\\\\')}")

      Write-Output "OK"
    `;

    try {
      await execAsync(
        `powershell -NoProfile -NonInteractive -Command "${psScript.replace(/"/g, '\\"')}"`,
        { timeout: 60000 }
      );

      const imageBuffer = fs.readFileSync(outputFile);
      const base64 = imageBuffer.toString('base64');

      // Clean up temp files
      fs.rmSync(tempDir, { recursive: true, force: true });

      return [{
        data: base64,
        width: 0,  // WIA doesn't easily report dimensions inline
        height: 0,
      }];
    } catch (err) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      throw new Error(`WIA scan failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

// ---- Linux/macOS SANE Backend ----
// Uses the `scanimage` CLI tool from the SANE project

class SaneBackend implements ScannerBackend {
  async listDevices(): Promise<ScannerDevice[]> {
    try {
      const { stdout } = await execFileAsync('scanimage', ['-L'], { timeout: 10000 });

      // Output format: device `epson2:libusb:001:004' is a Epson GT-S50 flatbed scanner
      const deviceRegex = /device `([^']+)' is a (.+)/g;
      const devices: ScannerDevice[] = [];
      let match;

      while ((match = deviceRegex.exec(stdout)) !== null) {
        devices.push({
          id: match[1],
          name: match[2].trim(),
          type: 'sane',
          isDefault: devices.length === 0,
        });
      }

      return devices;
    } catch (err) {
      console.error('SANE device enumeration failed:', err);
      return [];
    }
  }

  async scan(deviceId: string, options: ScanOptions): Promise<ScannedPage[]> {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-bridge-'));
    const format = options.format === 'jpeg' ? 'jpeg' : 'png';
    const outputFile = path.join(tempDir, `scan.${format}`);

    const args = [
      '-d', deviceId,
      '--format', format === 'jpeg' ? 'jpeg' : 'png',
      '--resolution', String(options.resolution || 300),
      '--mode', options.colorMode === 'color' ? 'Color'
        : options.colorMode === 'bw' ? 'Lineart'
        : 'Gray',
      '-o', outputFile,
    ];

    if (options.feeder) {
      args.push('--source', 'ADF');
    }

    try {
      await execFileAsync('scanimage', args, { timeout: 60000 });

      const imageBuffer = fs.readFileSync(outputFile);
      const base64 = imageBuffer.toString('base64');

      fs.rmSync(tempDir, { recursive: true, force: true });

      return [{
        data: base64,
        width: 0,
        height: 0,
      }];
    } catch (err) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      throw new Error(`SANE scan failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

// ---- Factory ----

export function createScannerBackend(): ScannerBackend {
  const platform = getPlatform();
  console.log(`[Scanner Bridge] Platform: ${platform}`);

  switch (platform) {
    case 'windows':
      console.log('[Scanner Bridge] Using WIA backend (PowerShell)');
      return new WiaBackend();
    case 'linux':
    case 'macos':
      console.log('[Scanner Bridge] Using SANE backend (scanimage)');
      return new SaneBackend();
  }
}
