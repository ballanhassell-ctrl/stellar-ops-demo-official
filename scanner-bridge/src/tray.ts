import SysTray from 'systray2';

interface TrayCallbacks {
  onQuit: () => void;
  onOpenDashboard: () => void;
  onRescanDevices: () => void;
}

// Minimal 16x16 scanner icon as base64 ICO
// (a simple monochrome icon — replace with a real icon file in production)
const TRAY_ICON_BASE64 =
  'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACZmZkKmZmZR5mZmYOZmZmtmZmZw5mZmbOZmZmDmZmZRwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJmZmRmZmZmfmZmZ75mZmf+ZmZn/mZmZ/5mZmf+ZmZn/mZmZ75mZmZ8AAAAKAAAAAAAAAAAAAAAAmZmZCpmZmZ+ZmZn/mZmZ/5mZmf+ZmZn/mZmZ/5mZmf+ZmZn/mZmZ/5mZmZ+ZmZkZAAAAAAAAAAAAAAAAmZmZR5mZme+ZmZn/mZmZ/5mZmf+ZmZn/mZmZ/5mZmf+ZmZn/mZmZ/5mZme+ZmZlHAAAAAAAAAACZmZkKmZmZn5mZmf+ZmZn/AAAA/wAAAP8AAAD/AAAA/5mZmf+ZmZn/mZmZ/5mZmf+ZmZmfmZmZCgAAAACZmZkZmZmZ/5mZmf+ZmZn/AAAA/wAAAP8AAAD/AAAA/5mZmf+ZmZn/mZmZ/5mZmf+ZmZn/mZmZGQAAAACZmZlHmZmZ/5mZmf+ZmZn/AAAA/wAAAP8AAAD/AAAA/5mZmf+ZmZn/mZmZ/5mZmf+ZmZn/mZmZRwAAAACZmZmDmZmZ/5mZmf+ZmZn/mZmZ/5mZmf+ZmZn/mZmZ/5mZmf+ZmZn/mZmZ/5mZmf+ZmZn/mZmZgwAAAACZmZmtmZmZ/5mZmf+ZmZn/mZmZ/5mZmf+ZmZn/mZmZ/5mZmf+ZmZn/mZmZ/5mZmf+ZmZn/mZmZrQAAAACZmZnDmZmZ/5mZmf+ZmZn/AAAA/wAAAP8AAAD/AAAA/5mZmf+ZmZn/mZmZ/5mZmf+ZmZn/mZmZwwAAAACZmZmzmZmZ/5mZmf+ZmZn/AAAA/wAAAP8AAAD/AAAA/5mZmf+ZmZn/mZmZ/5mZmf+ZmZn/mZmZswAAAACZmZmDmZmZ/5mZmf+ZmZn/AAAA/wAAAP8AAAD/AAAA/5mZmf+ZmZn/mZmZ/5mZmf+ZmZn/mZmZgwAAAACZmZlHmZmZ75mZmf+ZmZn/mZmZ/5mZmf+ZmZn/mZmZ/5mZmf+ZmZn/mZmZ/5mZmf+ZmZnvmZmZRwAAAAAAAAAAmZmZn5mZmf+ZmZn/mZmZ/5mZmf+ZmZn/mZmZ/5mZmf+ZmZn/mZmZ/5mZmf+ZmZmfAAAAAAAAAAAAAAAKmZmZR5mZme+ZmZn/mZmZ/5mZmf+ZmZn/mZmZ/5mZmf+ZmZn/mZmZ75mZmUcAAAAKAAAAAAAAAAAAAAAAmZmZGZmZmZ+ZmZn/mZmZ/5mZmf+ZmZn/mZmZ/5mZmf+ZmZmfmZmZGQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACZmZkKmZmZR5mZmYOZmZmtmZmZw5mZmbOZmZmDmZmZRwAAAAoAAAAAAAAAAAAAAAAAAAAA';

export function createTray(callbacks: TrayCallbacks): SysTray {
  const systray = new SysTray({
    menu: {
      icon: TRAY_ICON_BASE64,
      title: 'Scanner Bridge',
      tooltip: 'Stellar OPS Scanner Bridge',
      items: [
        {
          title: 'Scanner Bridge v1.0',
          tooltip: 'Running',
          enabled: false,
          checked: false,
        },
        SysTray.separator,
        {
          title: 'Open Dashboard',
          tooltip: 'Open Stellar OPS in browser',
          checked: false,
          enabled: true,
        },
        {
          title: 'Rescan Devices',
          tooltip: 'Re-detect connected scanners',
          checked: false,
          enabled: true,
        },
        SysTray.separator,
        {
          title: 'Quit',
          tooltip: 'Stop Scanner Bridge',
          checked: false,
          enabled: true,
        },
      ],
    },
    debug: false,
    copyDir: true,
  });

  systray.onClick((action) => {
    switch (action.item.title) {
      case 'Open Dashboard':
        callbacks.onOpenDashboard();
        break;
      case 'Rescan Devices':
        callbacks.onRescanDevices();
        break;
      case 'Quit':
        callbacks.onQuit();
        break;
    }
  });

  return systray;
}
