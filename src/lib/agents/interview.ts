import type { BusinessProfile } from "@/lib/schemas/business";
import {
  InterviewQuestionSchema,
  UnderstandingSummarySchema,
  type InterviewQuestion,
  type UnderstandingSummary,
} from "@/lib/schemas/interview";
import { completeJson, getConfiguredProvider } from "@/lib/ai/provider";
import { z } from "zod";

const INTERVIEW_TOPICS = new Set([
  "goals",
  "audience",
  "positioning",
  "conversion",
  "perception",
  "visual",
  "dislikes",
  "competitors",
  "content_accuracy",
  "functionality",
] as const);

type InterviewTopic = InterviewQuestion["topic"];

function normalizeInterviewTopic(value: unknown): InterviewTopic {
  const raw = String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (INTERVIEW_TOPICS.has(raw as InterviewTopic)) return raw as InterviewTopic;

  const aliases: Record<string, InterviewTopic> = {
    goal: "goals",
    objectives: "goals",
    objective: "goals",
    users: "audience",
    customers: "audience",
    target_audience: "audience",
    brand: "positioning",
    branding: "positioning",
    strategy: "positioning",
    cta: "conversion",
    conversions: "conversion",
    sales: "conversion",
    trust: "perception",
    credibility: "perception",
    aesthetics: "visual",
    design: "visual",
    style: "visual",
    avoid: "dislikes",
    references: "competitors",
    competition: "competitors",
    accuracy: "content_accuracy",
    content: "content_accuracy",
    features: "functionality",
    feature: "functionality",
    technical: "functionality",
  };

  return aliases[raw] ?? "goals";
}

function normalizeInterviewQuestion(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const question = raw as Record<string, unknown>;
  return { ...question, topic: normalizeInterviewTopic(question.topic) };
}

function baseQuestions(profile: BusinessProfile): InterviewQuestion[] {
  const questions: InterviewQuestion[] = [];

  const cta = profile.primaryCtas.map((c) => c.toLowerCase());
  if (cta.some((c) => c.includes("call") || c.includes("phone"))) {
    questions.push({
      id: "conversion-channel",
      prompt:
        "You currently push phone calls heavily. Do most customers actually call, or would you rather drive them toward WhatsApp, booking, or a form?",
      topic: "conversion",
      whyItMatters: "Primary CTA shapes layout, hero, and contact patterns.",
      skippable: true,
    });
  } else if (!profile.primaryCtas.length) {
    questions.push({
      id: "conversion-primary",
      prompt:
        "What should visitors do first on the new site — call, book, request a quote, buy, or something else?",
      topic: "conversion",
      whyItMatters: "Without a conversion goal, the redesign cannot prioritize actions.",
      skippable: false,
    });
  }

  questions.push({
    id: "positioning",
    prompt:
      "Your current site reads as practical/local. Do you want to keep that, or move toward a more premium/polished perception?",
    topic: "positioning",
    whyItMatters: "Positioning drives visual density, typography, and imagery.",
    skippable: true,
  });

  if (profile.contradictions.length || profile.servicesOrProducts.length > 6) {
    questions.push({
      id: "services-current",
      prompt:
        "I found overlapping or incomplete service lists. Which services are current and must appear on the new site?",
      topic: "content_accuracy",
      whyItMatters: "Prevents publishing outdated offerings.",
      skippable: false,
    });
  }

  if (profile.brand.logoUrls.length) {
    questions.push({
      id: "logo-direction",
      prompt:
        "Your existing logo is available. Should I design around it as-is, or are you open to a refreshed visual direction while keeping the logo?",
      topic: "visual",
      whyItMatters: "Logo constraints affect color, contrast, and layout.",
      skippable: true,
    });
  } else {
    questions.push({
      id: "logo-missing",
      prompt:
        "I could not confidently find a logo file. Do you have a logo to use, or should we design with strong wordmark typography for now?",
      topic: "visual",
      whyItMatters: "Missing brand marks change header and identity treatment.",
      skippable: true,
    });
  }

  questions.push({
    id: "audience",
    prompt: "Who are you trying to attract more of?",
    topic: "audience",
    whyItMatters: "Audience clarity prevents generic marketing copy and aesthetics.",
    skippable: true,
  });

  questions.push({
    id: "competitors",
    prompt:
      "Which competitors (or unrelated sites) do you think look better than yours today — and what specifically feels better?",
    topic: "competitors",
    whyItMatters: "Reference taste without copying templates.",
    skippable: true,
  });

  questions.push({
    id: "dislikes",
    prompt: "What do you absolutely NOT want your new website to look like?",
    topic: "dislikes",
    whyItMatters: "Negative constraints are often more reliable than vague likes.",
    skippable: true,
  });

  if (profile.confidence.unknownFields.includes("businessType") || !profile.businessType) {
    questions.unshift({
      id: "business-type",
      prompt: "In one sentence, what does your business actually sell or do?",
      topic: "content_accuracy",
      whyItMatters: "Category clarity prevents wrong visual language.",
      skippable: false,
    });
  }

  return questions.map((q) => InterviewQuestionSchema.parse(q));
}

/** Adaptive: drop questions already answered by profile confidence or prior replies. */
export function selectNextQuestions(input: {
  profile: BusinessProfile;
  answeredIds: string[];
  priorAnswers: string[];
  limit?: number;
}): InterviewQuestion[] {
  const answered = new Set(input.answeredIds);
  const corpus = input.priorAnswers.join(" ").toLowerCase();

  return baseQuestions(input.profile)
    .filter((q) => !answered.has(q.id))
    .filter((q) => {
      if (q.id === "audience" && /customers? are|we serve|target/i.test(corpus)) {
        return false;
      }
      if (q.id === "positioning" && /premium|affordable|luxury|local/i.test(corpus)) {
        return false;
      }
      return true;
    })
    .slice(0, input.limit ?? 1);
}

export function buildAssumptionsSummary(
  profile: BusinessProfile,
): UnderstandingSummary {
  return UnderstandingSummarySchema.parse({
    businessName: profile.businessName,
    whatTheyDo:
      profile.summary ||
      `${profile.businessName ?? "This business"} provides ${profile.servicesOrProducts.slice(0, 3).join(", ") || "services"}.`,
    whoTheyServe:
      profile.targetCustomers ??
      "Local customers seeking a clear, trustworthy provider (assumed — correct if wrong).",
    positioning:
      "Approachable and credible rather than experimental or startup-fashion (assumed from current site).",
    primaryConversion:
      profile.primaryCtas[0] ??
      "Contact / inquiry (assumed — confirm preferred channel).",
    visualDirectionHints:
      "Clean, business-appropriate redesign that preserves factual content and logo assets where available; avoid generic SaaS aesthetics unless the business is software.",
    mustPreserve: profile.preserveVsReplace.preserve.slice(0, 8),
    mustAvoid: [
      ...profile.preserveVsReplace.replace.slice(0, 4),
      "Fake testimonials or invented statistics",
      "Generic AI-startup visual language if not a startup",
    ],
    openQuestions: profile.needsConfirmation.slice(0, 5),
    corrections: [],
  });
}

export function buildUnderstandingSummary(input: {
  profile: BusinessProfile;
  answers: { questionId?: string; content: string }[];
}): UnderstandingSummary {
  const answerText = input.answers.map((a) => a.content).join("\n");
  const base = buildAssumptionsSummary(input.profile);

  const positioningMatch = answerText.match(
    /(premium|luxury|affordable|local|approachable|bold|playful|professional)/i,
  );
  const conversionMatch = answerText.match(
    /(whatsapp|book|booking|call|phone|form|quote|email)/i,
  );

  return UnderstandingSummarySchema.parse({
    ...base,
    whoTheyServe:
      answerText.match(/attract|customers?|clients?|audience([\s\S]{0,120})/i)?.[0] ??
      base.whoTheyServe,
    positioning: positioningMatch
      ? `Owner indicated a preference toward: ${positioningMatch[0]}.`
      : base.positioning,
    primaryConversion: conversionMatch
      ? `Preferred conversion leans toward: ${conversionMatch[0]}.`
      : base.primaryConversion,
    mustAvoid: [
      ...base.mustAvoid,
      ...( /not want|hate|avoid|don't want/i.test(answerText)
        ? ["Owner-stated dislikes from the interview"]
        : []),
    ],
    openQuestions: base.openQuestions.filter(
      (q) => !answerText.toLowerCase().includes(q.toLowerCase().slice(0, 18)),
    ),
  });
}

export async function maybeEnrichSummaryWithLlm(input: {
  projectId: string;
  profile: BusinessProfile;
  summary: UnderstandingSummary;
  transcript: string;
}): Promise<UnderstandingSummary> {
  try {
    const llm = await completeJson<UnderstandingSummary>({
      projectId: input.projectId,
      task: "interview",
      messages: [
        {
          role: "system",
          content:
            "Summarize an owner interview into a concise understanding brief. Never invent business facts. Return JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            profile: input.profile,
            draftSummary: input.summary,
            transcript: input.transcript,
          }),
        },
      ],
      parseJson: (raw) => {
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");
        const slice = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
        return UnderstandingSummarySchema.parse(JSON.parse(slice));
      },
    });
    if (llm) return llm.data;
  } catch {
    // keep heuristic summary
  }
  return input.summary;
}

export function openingInterviewMessage(profile: BusinessProfile): string {
  const name = profile.businessName ?? "your business";
  return [
    `I reviewed the existing site for ${name}.`,
    "I will only ask questions that materially change the redesign — not things the website already answered.",
    "Choose Ask me everything, or Just make smart assumptions if you want to move faster.",
  ].join(" ");
}


export async function selectNextQuestionsWithAi(input: {
  projectId: string;
  profile: BusinessProfile;
  answeredIds: string[];
  priorAnswers: string[];
  limit?: number;
}): Promise<InterviewQuestion[]> {
  const fallback = selectNextQuestions(input);
  try {
    const result = await completeJson<InterviewQuestion[]>({
      projectId: input.projectId,
      task: "interview_question",
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content: [
            "You are interviewing a website owner before a redesign.",
            "Ask only questions whose answer would materially change information architecture, conversion, content accuracy, visual direction, features or brand treatment.",
            "Do not ask what the existing website already answers.",
            "Adapt to any website model including ecommerce, SaaS, portfolio, editorial, hospitality, events, nonprofit, education, local services and communities.",
            "Ask one concise question at a time unless explicitly requested otherwise.",
            "Return only a JSON array matching the supplied question examples.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            business: input.profile,
            answeredQuestionIds: input.answeredIds,
            priorAnswers: input.priorAnswers,
            fallbackExamples: fallback,
            desiredCount: input.limit ?? 1,
          }),
        },
      ],
      parseJson: (raw) => {
        const start = raw.indexOf("[");
        const end = raw.lastIndexOf("]");
        const slice = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
        const parsed = JSON.parse(slice) as unknown;
        if (!Array.isArray(parsed)) {
          return z.array(InterviewQuestionSchema).parse(parsed);
        }
        return z
          .array(InterviewQuestionSchema)
          .max(input.limit ?? 1)
          .parse(parsed.map(normalizeInterviewQuestion));
      },
    });
    return result?.data?.length ? result.data : fallback;
  } catch (error) {
    if (getConfiguredProvider()) throw error;
    return fallback;
  }
}
