export type DesktopBridge = {
  isDesktop: boolean;
  openFiles: () => Promise<Array<{ name: string; text: string }>>;
};

declare global {
  interface Window {
    apertureDesktop?: DesktopBridge;
  }
}

export function isDesktopGui(): boolean {
  if (typeof window === "undefined") return false;
  if (window.apertureDesktop?.isDesktop) return true;
  try {
    if (new URLSearchParams(window.location.search).has("gui")) return true;
    return window.localStorage.getItem("aperture-gui") === "1";
  } catch {
    return false;
  }
}

export function setDesktopGui(on: boolean) {
  try {
    window.localStorage.setItem("aperture-gui", on ? "1" : "0");
  } catch {
    /* ignore */
  }
}
