import { describe, expect, it } from "vitest";
import { clusterScore, decideMatch, distinctiveMismatch, eventAgreement, titleSimilarity } from "@/features/clustering/score";

const positives: Array<[string, string]> = [
  ["Rockstar delays GTA VI to November 2027", "GTA 6 release pushed back, Rockstar confirms new date"],
  ["NVIDIA unveils RTX 5090 at $1999", "GeForce RTX 5090 officially announced for $1,999"],
  ["Microsoft buys Foo Studios", "Foo Studios acquired by Microsoft"],
  ["OpenAI launches GPT-5 in limited preview", "Open AI announces limited GPT-5 preview launch"],
  ["Apple unveils the new iPhone 17", "iPhone 17 officially announced by Apple"],
  ["AMD reveals Ryzen 9000 pricing", "AMD announces Ryzen 9000 prices"],
  ["Sony delays Helldivers 2 PC launch", "Helldivers 2 PC release postponed by Sony"],
  ["Valve patches Steam Client offline mode bug", "Steam Client update fixes offline play"],
  ["Intel cuts 15,000 jobs in restructuring", "Intel announces 15,000 layoffs"],
  ["Hackers reveal how Flock cameras really track cars and people", "Hackers Stole Flock’s Camera Software, Revealing How the Company Tracks Cars and People"],
];

const negatives: Array<[string, string]> = [
  ["GTA VI delayed to 2027", "GTA VI trailer breaks YouTube record"],
  ["GTA VI delayed to 2027", "GTA VI PC requirements leak"],
  ["GTA VI delayed to 2027", "Take-Two discusses GTA VI pricing"],
  ["Fire Emblem Fortune’s Weave: Should you skip Part 2?", "Fire Emblem Fortune’s Weave: Best story protagonist to choose first, ranked"],
  ["Nex Playground announces $150m in new funding as hardware sales pass one million", '"Every major publisher has approached us to review their old Kinect and Wii catalogue" – Nex Playground is spoilt for choice'],
  ["NVIDIA unveils RTX 5090 at $1999", "Developer vibe codes a tool to let Nvidia RTX 50-series laptop owners crank up their power limits"],
  ["OpenAI launches GPT-5 in limited preview", "OpenAI sued over training data"],
  ["Apple unveils the new iPhone 17", "Apple iPhone 17 battery life leak"],
  ["Sony delays Helldivers 2 PC launch", "Sony raises PlayStation Plus prices"],
  ["Apple unveils iPhone Duo", "Apple unveils Apple Watch Ultra 4"],
];

function pairScore(a: string, b: string) {
  return clusterScore({
    embeddingSimilarity: null,
    titleSimilarity: titleSimilarity(a, b),
    entityOverlap: 0.7,
    temporalScore: 0.9,
    categoryScore: 1,
    eventAgreement: eventAgreement(a, b),
    distinctiveMismatch: distinctiveMismatch(a, b),
  });
}

describe("event clustering eval set", () => {
  it("attaches same-event paraphrases without embeddings", () => {
    const misses = positives.filter(([a, b]) => pairScore(a, b) < 0.72);
    expect(misses).toEqual([]);
  });

  it("keeps a low false-merge rate on same-entity different events", () => {
    const falseMerges = negatives.filter(([a, b]) => decideMatch(pairScore(a, b), b) === "attach");
    expect(falseMerges).toEqual([]);
  });
});
