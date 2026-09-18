import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/utils";

describe("Publishing & Slugification", () => {
  it("converts titles into clean, URL-safe slugs", () => {
    expect(slugify("NVIDIA GeForce RTX 5090 Announced!")).toBe("nvidia-geforce-rtx-5090-announced");
    expect(slugify("Grand Theft Auto VI: Release Date & Platforms")).toBe("grand-theft-auto-vi-release-date-platforms");
    expect(slugify("Apple's M4 Max Chip — Full Breakdown")).toBe("apple-s-m4-max-chip-full-breakdown");
  });

  it("handles leading/trailing special characters and multiple dashes", () => {
    expect(slugify("---Hello World---")).toBe("hello-world");
    expect(slugify("100% Guaranteed Success")).toBe("100-guaranteed-success");
  });
});
