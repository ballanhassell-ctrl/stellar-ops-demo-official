import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { createScannerBackend, type ScanOptions } from './scanner-backend';

const backend = createScannerBackend();

export function createServer(port: number) {
  const app = express();
  app.use(cors({ origin: '*' }));
  app.use(express.json());

  const server = http.createServer(app);

  // ---- WebSocket for real-time scan events ----

  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`[WS] Client connected (${clients.size} total)`);
    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[WS] Client disconnected (${clients.size} total)`);
    });
  });

  function broadcast(event: string, data: unknown) {
    const message = JSON.stringify({ event, data });
    clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  // ---- REST API ----

  // Health check / status
  app.get('/api/status', (_req, res) => {
    res.json({
      status: 'running',
      version: '1.0.0',
      platform: process.platform,
      uptime: process.uptime(),
    });
  });

  // List available scanners
  app.get('/api/scanners', async (_req, res) => {
    try {
      const scanners = await backend.listDevices();
      res.json({ scanners });
    } catch (err) {
      console.error('[API] Scanner enumeration error:', err);
      res.status(500).json({
        error: 'Failed to enumerate scanners',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Acquire a scan
  app.post('/api/scan', async (req, res) => {
    const { scannerId, resolution, colorMode, format, duplex, feeder } = req.body;

    if (!scannerId) {
      res.status(400).json({ error: 'scannerId is required' });
      return;
    }

    const options: ScanOptions = {
      resolution: resolution || 300,
      colorMode: colorMode || 'grayscale',
      format: format || 'png',
      duplex: duplex || false,
      feeder: feeder || false,
    };

    console.log(`[API] Scan requested: device=${scannerId}, resolution=${options.resolution}, mode=${options.colorMode}`);
    broadcast('scan:start', { scannerId });

    try {
      const pages = await backend.scan(scannerId, options);
      console.log(`[API] Scan complete: ${pages.length} page(s)`);
      broadcast('scan:complete', { scannerId, pageCount: pages.length });
      res.json({ pages });
    } catch (err) {
      console.error('[API] Scan error:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      broadcast('scan:error', { scannerId, error: errorMsg });
      res.status(500).json({ error: errorMsg });
    }
  });

  // Start listening
  function start(): Promise<void> {
    return new Promise((resolve) => {
      server.listen(port, '127.0.0.1', () => {
        console.log(`[Scanner Bridge] HTTP server listening on http://127.0.0.1:${port}`);
        console.log(`[Scanner Bridge] WebSocket available at ws://127.0.0.1:${port}/ws`);
        resolve();
      });
    });
  }

  function stop(): Promise<void> {
    return new Promise((resolve) => {
      wss.close();
      server.close(() => resolve());
    });
  }

  return { app, server, start, stop, broadcast };
}
