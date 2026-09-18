export function normalizeTitle(title: string) {
  let value = title.toLowerCase();
  value = value.replace(/grand theft auto/g, "gta");
  value = value.replace(/geforce/g, "nvidia");
  value = value.replace(/open ai/g, "openai");
  value = value.replace(/take two/g, "taketwo");
  value = value.replace(/take-two/g, "taketwo");
  value = value.replace(/\bvi\b/g, "6");
  value = value.replace(/\bv\b/g, "5");
  value = value.replace(/\biv\b/g, "4");
  value = value.replace(/\biii\b/g, "3");
  value = value.replace(/&/g, " and ");
  value = value.replace(/\$/g, " ");
  value = value.replace(/(\d),(\d{3})/g, "$1$2");
  value = value.replace(/[^a-z0-9]+/g, " ");
  return value.replace(/\s+/g, " ").trim();
}

function stemToken(token: string) {
  if (token.length <= 3) return token;
  return token.replace(/(ing|ed|es|s)$/, "");
}

export function titleTokens(title: string) {
  const stop = new Set([
    "the",
    "a",
    "an",
    "to",
    "of",
    "for",
    "and",
    "in",
    "on",
    "at",
    "with",
    "by",
    "from",
    "is",
    "as",
    "its",
    "it",
    "be",
    "or",
    "new",
    "into",
    "over",
    "after",
    "about",
    "has",
    "have",
    "will",
    "than",
    "this",
    "that",
    "are",
    "was",
    "were",
    "says",
    "said",
    "officially",
    "confirm",
    "confirms",
  ]);
  return normalizeTitle(title)
    .split(" ")
    .filter((token) => token.length > 1 && !stop.has(token))
    .map(stemToken);
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

export function dice(a: string[], b: string[]) {
  const left = new Set(a);
  const right = new Set(b);
  let inter = 0;
  left.forEach((item) => {
    if (right.has(item)) inter += 1;
  });
  const denom = left.size + right.size;
  return denom === 0 ? 0 : (2 * inter) / denom;
}

export function charNgrams(title: string, n = 3) {
  const compact = normalizeTitle(title).replace(/ /g, "");
  if (compact.length <= n) return compact ? [compact] : [];
  const grams: string[] = [];
  for (let i = 0; i <= compact.length - n; i += 1) {
    grams.push(compact.slice(i, i + n));
  }
  return grams;
}
