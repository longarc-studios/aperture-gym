export function uid(prefix = "ap"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function now() {
  return Date.now();
}
