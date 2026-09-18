export function normalizeTitle(title: string) {
  let value = title.toLowerCase();
  value = value.replace(/grand theft auto/g, "gta");
  value = value.replace(/\bvi\b/g, "6");
  value = value.replace(/\bv\b/g, "5");
  value = value.replace(/\biv\b/g, "4");
  value = value.replace(/\biii\b/g, "3");
  value = value.replace(/&/g, " and ");
  value = value.replace(/[^a-z0-9]+/g, " ");
  return value.replace(/\s+/g, " ").trim();
}

export function titleTokens(title: string) {
  const stop = new Set(["the", "a", "an", "to", "of", "for", "and", "in", "on", "at", "with"]);
  return normalizeTitle(title)
    .split(" ")
    .filter((token) => token.length > 1 && !stop.has(token));
}

export function jaccard(a: string[], b: string[]) {
  const left = new Set(a);
  const right = new Set(b);
  let inter = 0;
  left.forEach((item) => {
    if (right.has(item)) inter += 1;
  });
  const union = left.size + right.size - inter;
  return union === 0 ? 0 : inter / union;
}
