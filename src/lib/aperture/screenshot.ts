import { isHTMLElement } from "./dom";

const FILL = "#121416";
const INK = "#ececea";
const MUTED = "#8b908c";
const LINE = "rgba(236,236,234,0.16)";
const ACCENT = "#d6d3cc";

export type ShotOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
};

export function schematicScreenshot(root: HTMLElement, options: ShotOptions = {}): string {
  const maxW = options.maxWidth ?? 720;
  const maxH = options.maxHeight ?? 480;
  const width = Math.min(maxW, Math.max(320, Math.floor(root.clientWidth) || 720));
  const height = Math.min(maxH, Math.max(240, Math.floor(root.clientHeight) || 480));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = FILL;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }

  const rootRect = root.getBoundingClientRect();
  const nodes = Array.from(root.querySelectorAll("*")).filter((el): el is HTMLElement => {
    if (!isHTMLElement(el)) return false;
    const r = el.getBoundingClientRect();
    return r.width >= 8 && r.height >= 8 && r.bottom > rootRect.top && r.top < rootRect.bottom;
  });

  const take = nodes.slice(0, 80);
  for (const el of take) {
    const r = el.getBoundingClientRect();
    const scaleX = width / Math.max(1, root.clientWidth || width);
    const scaleY = height / Math.max(1, root.clientHeight || height);
    const x = (r.left - rootRect.left) * scaleX;
    const y = (r.top - rootRect.top) * scaleY;
    const w = Math.min(r.width * scaleX, width - x);
    const h = Math.min(r.height * scaleY, height - y);
    if (w <= 1 || h <= 1) continue;
    const interactive = isInteractive(el);
    ctx.strokeStyle = interactive ? ACCENT : LINE;
    ctx.lineWidth = interactive ? 1.5 : 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    if (interactive && h >= 14 && w >= 36) {
      const label =
        el.getAttribute("data-aperture-id") ??
        (el.innerText || el.getAttribute("aria-label") || "").slice(0, 28);
      if (label) {
        ctx.fillStyle = "rgba(10,11,12,0.72)";
        ctx.fillRect(x + 2, y + 2, Math.min(w - 4, ctx.measureText(label).width + 10), 14);
        ctx.fillStyle = INK;
        ctx.font = "10px IBM Plex Mono, ui-monospace, monospace";
        ctx.fillText(label, x + 6, y + 12);
      }
    }
  }

  const title = root.querySelector("h1")?.textContent?.trim() || "untitled";
  ctx.fillStyle = MUTED;
  ctx.font = "11px IBM Plex Mono, ui-monospace, monospace";
  ctx.fillText(title, 12, height - 14);

  const quality = options.quality ?? 0.62;
  return canvas.toDataURL("image/jpeg", quality);
}

function isInteractive(el: HTMLElement) {
  const tag = el.tagName;
  return (
    tag === "A" ||
    tag === "BUTTON" ||
    tag === "INPUT" ||
    tag === "SELECT" ||
    tag === "TEXTAREA" ||
    Boolean(el.getAttribute("data-aperture-id"))
  );
}
