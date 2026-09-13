import type { Observation } from "./types";
import { isHTMLElement, isHTMLImage, isHTMLInput, isHTMLTextArea } from "./dom";

const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "LINK", "META", "HEAD"]);

function isVisible(el: Element): boolean {
  if (!isHTMLElement(el)) return false;
  if (el.hidden || el.getAttribute("aria-hidden") === "true") return false;
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  if (!style) return true;
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (Number.parseFloat(style.opacity || "1") === 0) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function roleOf(el: Element): string {
  const explicit = el.getAttribute("role");
  if (explicit) return explicit;
  const tag = el.tagName;
  if (tag === "A") return "link";
  if (tag === "BUTTON") return "button";
  if (tag === "NAV") return "navigation";
  if (tag === "MAIN") return "main";
  if (tag === "HEADER") return "banner";
  if (tag === "FOOTER") return "contentinfo";
  if (tag === "FORM") return "form";
  if (tag === "TABLE") return "table";
  if (tag === "H1" || tag === "H2" || tag === "H3" || tag === "H4") return "heading";
  if (tag === "LI") return "listitem";
  if (tag === "UL" || tag === "OL") return "list";
  if (tag === "SELECT") return "combobox";
  if (tag === "TEXTAREA") return "textbox";
  if (tag === "LABEL") return "label";
  if (tag === "IMG") return "image";
  if (tag === "INPUT" && isHTMLInput(el)) {
    if (el.type === "search") return "searchbox";
    if (el.type === "checkbox") return "checkbox";
    if (el.type === "radio") return "radio";
    if (el.type === "submit" || el.type === "button") return "button";
    return "textbox";
  }
  return "generic";
}

function nameOf(el: Element): string {
  const labelled = el.getAttribute("aria-label");
  if (labelled) return labelled.trim();
  if (isHTMLInput(el) || isHTMLTextArea(el)) {
    const ph = el.getAttribute("placeholder");
    if (ph) return ph.trim();
    if (el.value) return el.value.trim().slice(0, 80);
  }
  if (isHTMLImage(el)) return el.alt.trim();
  const own = Array.from(el.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent?.trim() ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (own) return own.slice(0, 100);
  const role = roleOf(el);
  if (["main", "banner", "navigation", "list", "form", "article", "region", "contentinfo"].includes(role)) {
    return "";
  }
  if (isHTMLElement(el)) {
    const text = el.innerText.replace(/\s+/g, " ").trim();
    return text.slice(0, 100);
  }
  return "";
}

function isInteractive(el: Element): boolean {
  const role = roleOf(el);
  if (
    ["button", "link", "textbox", "searchbox", "combobox", "checkbox", "radio", "tab", "menuitem"].includes(
      role,
    )
  ) {
    return true;
  }
  return el.hasAttribute("tabindex") && el.getAttribute("tabindex") !== "-1";
}

function shouldKeep(el: Element): boolean {
  const role = roleOf(el);
  if (role === "listitem" && el.querySelector("button, a, input")) return false;
  if (isInteractive(el)) return true;
  return [
    "heading",
    "main",
    "navigation",
    "banner",
    "form",
    "table",
    "list",
    "listitem",
    "article",
    "region",
  ].includes(role);
}

export type SnapshotMaps = {
  byId: Map<string, Element>;
  xpathMap: Record<string, string>;
};

function xpathFor(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node.nodeType === Node.ELEMENT_NODE) {
    const tag = node.tagName.toLowerCase();
    let i = 1;
    let sib = node.previousElementSibling;
    while (sib) {
      if (sib.tagName === node.tagName) i += 1;
      sib = sib.previousElementSibling;
    }
    parts.unshift(`${tag}[${i}]`);
    node = node.parentElement;
  }
  return "/" + parts.join("/");
}

export function captureSnapshot(root: Element): Observation & { maps: SnapshotMaps } {
  const byId = new Map<string, Element>();
  const xpathMap: Record<string, string> = {};
  let counter = 0;
  const lines: string[] = [];

  const walk = (el: Element, depth: number) => {
    if (SKIP.has(el.tagName)) return;
    if (!isVisible(el) && el !== root) return;
    const keep = shouldKeep(el) && el !== root;
    if (keep) {
      counter += 1;
      const id = `1-${counter}`;
      el.setAttribute("data-aperture-id", id);
      byId.set(id, el);
      xpathMap[id] = xpathFor(el);
      const role = roleOf(el);
      const name = nameOf(el);
      const extra =
        isHTMLInput(el) || isHTMLTextArea(el)
          ? el.value
            ? ` value=${JSON.stringify(el.value.slice(0, 60))}`
            : ""
          : "";
      const label = name ? ` ${JSON.stringify(name)}` : "";
      lines.push(`${"  ".repeat(Math.max(0, depth))}[${id}] ${role}${label}${extra}`);
    }
    const nextDepth = keep ? depth + 1 : depth;
    for (const child of Array.from(el.children)) walk(child, nextDepth);
  };

  walk(root, 0);

  const heading = root.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
  return {
    url: "",
    title: heading,
    formattedTree: lines.join("\n") || "[empty page]",
    xpathMap,
    maps: { byId, xpathMap },
  };
}

export function pageText(root: ParentNode): string {
  const el = root instanceof Element ? root : (root as Document).body;
  return (el && "innerText" in el ? (el as HTMLElement).innerText : "").replace(/\s+/g, " ").trim();
}

export function findById(root: ParentNode, id: string): Element | null {
  const safe = id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return root.querySelector(`[data-aperture-id="${safe}"]`);
}
