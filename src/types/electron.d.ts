export interface ElectronAPI {
  isDesktop: boolean;
  toggleFullscreen: () => Promise<boolean>;
  getSystemInfo: () => Promise<{
    version: string;
    platform: string;
    isDesktop: boolean;
  }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
