import type { SnapshotAction } from "./types";
import { findById } from "./snapshot";
import { isHTMLElement, isHTMLInput, isHTMLSelect, isHTMLTextArea } from "./dom";

function dispatchInput(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const win = el.ownerDocument.defaultView;
  const proto =
    el.tagName === "TEXTAREA"
      ? (win?.HTMLTextAreaElement ?? HTMLTextAreaElement).prototype
      : (win?.HTMLInputElement ?? HTMLInputElement).prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, value);
  if (!setter) el.value = value;
  const Ev = win?.Event ?? Event;
  el.dispatchEvent(new Ev("input", { bubbles: true }));
  el.dispatchEvent(new Ev("change", { bubbles: true }));
}

export function performAction(
  root: ParentNode,
  action: SnapshotAction,
  navigate?: (taskId: string) => void,
): string {
  if (action.op === "goto") {
    const url = action.url ?? action.value;
    if (!url) throw new Error("goto requires url");
    if (!isAllowedUrl(url)) {
      throw new Error(
        "External navigation is blocked in this gym. Stay on /worlds/* hosted tasks.",
      );
    }
    const taskId = taskIdFromUrl(url);
    if (!taskId) throw new Error("goto requires a /worlds/:task path");
    navigate?.(taskId);
    return `navigated to /worlds/${taskId}`;
  }

  if (action.op === "press") {
    const key = action.key ?? action.value ?? "Enter";
    const target =
      (action.id ? findById(root, action.id) : (root as Document).activeElement) ??
      (root instanceof Element ? root : document.body);
    const win = target.ownerDocument.defaultView;
    const Key = win?.KeyboardEvent ?? KeyboardEvent;
    target.dispatchEvent(new Key("keydown", { key, bubbles: true, cancelable: true }));
    if (key === "Enter" && isHTMLElement(target)) {
      const form = target.closest("form");
      if (form && isHTMLInput(target)) {
        const submit = form.querySelector<HTMLButtonElement>(
          "button[type=submit], button:not([type])",
        );
        submit?.click();
      }
    }
    target.dispatchEvent(new Key("keyup", { key, bubbles: true }));
    return `pressed ${key}`;
  }

  if (!action.id) throw new Error(`${action.op} requires a snapshot id`);
  const el = findById(root, action.id);
  if (!el) {
    throw new Error(
      `Stale snapshot id ${action.id}. Take another snapshot of the active page.`,
    );
  }

  switch (action.op) {
    case "click": {
      if (isHTMLElement(el)) el.click();
      return `clicked ${action.id}`;
    }
    case "hover": {
      const win = el.ownerDocument.defaultView;
      const Mouse = win?.MouseEvent ?? MouseEvent;
      el.dispatchEvent(new Mouse("mouseover", { bubbles: true }));
      el.dispatchEvent(new Mouse("mouseenter", { bubbles: true }));
      return `hovered ${action.id}`;
    }
    case "fill": {
      if (!(isHTMLInput(el) || isHTMLTextArea(el))) {
        throw new Error(`${action.id} is not a text field`);
      }
      el.focus();
      dispatchInput(el, action.value ?? "");
      return `filled ${action.id}`;
    }
    case "type": {
      if (!(isHTMLInput(el) || isHTMLTextArea(el))) {
        throw new Error(`${action.id} is not a text field`);
      }
      dispatchInput(el, `${el.value}${action.value ?? ""}`);
      return `typed into ${action.id}`;
    }
    case "select": {
      if (!isHTMLSelect(el)) throw new Error(`${action.id} is not a select`);
      el.value = action.value ?? "";
      const win = el.ownerDocument.defaultView;
      const Ev = win?.Event ?? Event;
      el.dispatchEvent(new Ev("change", { bubbles: true }));
      return `selected ${el.value} on ${action.id}`;
    }
    case "scroll": {
      el.scrollIntoView({ block: "center", inline: "nearest" });
      return `scrolled ${action.id} into view`;
    }
    default:
      throw new Error(`Unsupported op ${(action as SnapshotAction).op}`);
  }
}

export function isAllowedUrl(url: string): boolean {
  if (url.startsWith("/worlds/")) return true;
  try {
    const parsed = new URL(url, "https://aperture.local");
    return parsed.pathname.startsWith("/worlds/");
  } catch {
    return false;
  }
}

function taskIdFromUrl(url: string): string | null {
  try {
    const path = url.startsWith("/") ? url : new URL(url, "https://aperture.local").pathname;
    const match = path.match(/^\/worlds\/([^/?#]+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}
