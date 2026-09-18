import type { Category } from "@/lib/config/env";

const gaming = ["game", "gaming", "playstation", "xbox", "nintendo", "steam", "gta", "studio", "rpg", "esport"];
const hardware = ["gpu", "rtx", "nvidia", "amd", "intel", "chip", "processor", "laptop", "ssd", " ram"];
const ai = ["openai", "anthropic", "llm", "gpt", "model", "chatgpt", "gemini", "claude", "ai "];

export function inferCategory(text: string): Category {
  const hay = ` ${text.toLowerCase()} `;
  if (ai.some((token) => hay.includes(token))) return "ai";
  if (hardware.some((token) => hay.includes(token))) return "hardware";
  if (gaming.some((token) => hay.includes(token))) return "gaming";
  return "technology";
}
