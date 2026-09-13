type View = Window & typeof globalThis;

export function viewOf(el: Node): View | null {
  return (el.ownerDocument?.defaultView as View | null) ?? null;
}

export function isHTMLElement(el: Element): el is HTMLElement {
  const Ctor = viewOf(el)?.HTMLElement ?? HTMLElement;
  return el instanceof Ctor;
}

export function isHTMLInput(el: Element): el is HTMLInputElement {
  const Ctor = viewOf(el)?.HTMLInputElement ?? HTMLInputElement;
  return el instanceof Ctor;
}

export function isHTMLTextArea(el: Element): el is HTMLTextAreaElement {
  const Ctor = viewOf(el)?.HTMLTextAreaElement ?? HTMLTextAreaElement;
  return el instanceof Ctor;
}

export function isHTMLSelect(el: Element): el is HTMLSelectElement {
  const Ctor = viewOf(el)?.HTMLSelectElement ?? HTMLSelectElement;
  return el instanceof Ctor;
}

export function isHTMLImage(el: Element): el is HTMLImageElement {
  const Ctor = viewOf(el)?.HTMLImageElement ?? HTMLImageElement;
  return el instanceof Ctor;
}
