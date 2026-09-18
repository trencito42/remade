import type { StyleDNA } from "@/lib/schemas/style-dna";
import { completeJson, getConfiguredProvider } from "@/lib/ai/provider";
import { DesignSystemSchema, type DesignSystem } from "@/lib/schemas/site";

function fontsFor(dna: StyleDNA): DesignSystem["fonts"] {
  const t = dna.typography.toLowerCase();
  if (t.includes("serif")) {
    return {
      display: "Newsreader",
      body: "Sora",
      google: ["Newsreader:ital,wght@0,500;0,600;1,500", "Sora:wght@400;500;600"],
    };
  }
  if (t.includes("geometric")) {
    return {
      display: "Space Grotesk",
      body: "Space Grotesk",
      google: ["Space+Grotesk:wght@400;500;600;700"],
    };
  }
  return {
    display: "IBM Plex Sans",
    body: "IBM Plex Sans",
    google: ["IBM+Plex+Sans:wght@400;500;600;700"],
  };
}

function colorsFor(dna: StyleDNA): DesignSystem["colors"] {
  const p = dna.personality.toLowerCase();
  if (p.includes("dignified") || p.includes("funeral")) {
    return {
      bg: "#f3f1ec",
      surface: "#ebe7df",
      ink: "#1c1a17",
      muted: "#5f5a52",
      accent: "#3d4a3f",
      accentInk: "#f7f6f2",
      line: "#cfc7ba",
    };
  }
  if (p.includes("editorial") || p.includes("premium")) {
    return {
      bg: "#f6f3ee",
      surface: "#fffdf8",
      ink: "#141210",
      muted: "#6a645c",
      accent: "#7a2e1e",
      accentInk: "#fff8f4",
      line: "#ddd4c8",
    };
  }
  if (p.includes("bold") || p.includes("expressive")) {
    return {
      bg: "#f2f2f0",
      surface: "#ffffff",
      ink: "#0c0c0c",
      muted: "#555555",
      accent: "#0b6e4f",
      accentInk: "#f4fff9",
      line: "#111111",
    };
  }
  // minimal / trust
  return {
    bg: "#eef0ee",
    surface: "#fbfbfa",
    ink: "#121412",
    muted: "#5a5f5b",
    accent: "#184e77",
    accentInk: "#f3f8fc",
    line: "#c9cec9",
  };
}

export function buildDesignSystem(dna: StyleDNA): DesignSystem {
  const density = dna.density.toLowerCase();
  const corners = dna.corners.toLowerCase();
  return DesignSystemSchema.parse({
    version: 1,
    fonts: fontsFor(dna),
    colors: colorsFor(dna),
    typeScale: {
      display: density.includes("compact") ? "clamp(2.4rem, 6vw, 4rem)" : "clamp(2.8rem, 7vw, 5rem)",
      h1: "clamp(2rem, 4vw, 3rem)",
      h2: "clamp(1.4rem, 2.5vw, 1.9rem)",
      body: "1.05rem",
      small: "0.86rem",
    },
    spacing: {
      sectionY: density.includes("airy")
        ? "clamp(4rem, 10vw, 7rem)"
        : density.includes("compact")
          ? "clamp(2.5rem, 6vw, 4rem)"
          : "clamp(3.25rem, 8vw, 5.5rem)",
      stack: density.includes("compact") ? "0.85rem" : "1.15rem",
      contentWidth: "72rem",
    },
    radii: {
      control: corners.includes("square")
        ? "2px"
        : corners.includes("rounded")
          ? "12px"
          : "6px",
      media: corners.includes("square") ? "0px" : "8px",
    },
    borders: {
      width: dna.borders.toLowerCase().includes("none") ? "0px" : "1px",
      style: dna.borders.toLowerCase().includes("structural")
        ? "solid"
        : "solid",
    },
    motion: {
      enabled: !dna.motion.toLowerCase().includes("none"),
      duration: "180ms",
    },
    principles: [
      "Components exist only when interaction or hierarchy requires them",
      "Cards are not the default section container",
      ...dna.avoidPatterns.slice(0, 6),
    ],
  });
}


export async function buildDesignSystemWithAi(input: {
  projectId: string;
  dna: StyleDNA;
}): Promise<DesignSystem> {
  const fallback = buildDesignSystem(input.dna);
  try {
    const result = await completeJson<DesignSystem>({
      projectId: input.projectId,
      task: "design_system",
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content: [
            "Create a production-ready web design system from Style DNA.",
            "Return JSON only using exactly the provided DesignSystem shape.",
            "Choose accessible color contrast, purposeful typography, spacing and radii.",
            "Avoid the stereotypical purple AI palette, generic gradients, card soup and excessive rounding.",
            "The system must work beautifully on 390px mobile first and scale to desktop.",
            "Google font family entries must be valid Google Fonts query family values.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({ styleDna: input.dna, validExample: fallback }),
        },
      ],
      parseJson: (raw) => {
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");
        const slice = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
        return DesignSystemSchema.parse(JSON.parse(slice));
      },
    });
    return result?.data ?? fallback;
  } catch (error) {
    if (getConfiguredProvider()) throw error;
    return fallback;
  }
}
