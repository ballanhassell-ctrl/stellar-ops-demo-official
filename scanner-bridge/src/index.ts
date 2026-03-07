import { createServer } from './server';
import { createTray } from './tray';
import { exec } from 'child_process';

const PORT = parseInt(process.env.SCANNER_BRIDGE_PORT || '18181', 10);
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:5173';

async function main() {
  console.log('============================================');
  console.log('  Stellar OPS — Scanner Bridge v1.0');
  console.log('============================================');
  console.log('');

  // Start HTTP + WebSocket server
  const { start, stop, broadcast } = createServer(PORT);
  await start();

  // Start system tray icon
  let tray: ReturnType<typeof createTray> | null = null;

  try {
    tray = createTray({
      onQuit: async () => {
        console.log('[Scanner Bridge] Shutting down...');
        await stop();
        tray?.kill(false);
        process.exit(0);
      },
      onOpenDashboard: () => {
        // Open dashboard in default browser
        const cmd = process.platform === 'win32' ? 'start'
          : process.platform === 'darwin' ? 'open'
          : 'xdg-open';
        exec(`${cmd} ${DASHBOARD_URL}`);
      },
      onRescanDevices: () => {
        console.log('[Scanner Bridge] Manual device rescan triggered');
        broadcast('scanners:refresh', {});
      },
    });

    console.log('[Scanner Bridge] System tray icon active');
  } catch (err) {
    // System tray may not be available (headless server, SSH session, etc.)
    console.warn('[Scanner Bridge] System tray unavailable — running in headless mode');
    console.warn('[Scanner Bridge] Press Ctrl+C to stop');
  }

  // Graceful shutdown on signals
  const shutdown = async () => {
    console.log('\n[Scanner Bridge] Received shutdown signal');
    await stop();
    tray?.kill(false);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[Scanner Bridge] Fatal error:', err);
  process.exit(1);
});
