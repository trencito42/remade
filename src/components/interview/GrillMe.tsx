"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Message = {
  id: string;
  role: string;
  content: string;
  metadata: {
    type?: string;
    question?: { id: string; whyItMatters?: string };
  } | null;
};

type Summary = {
  businessName: string | null;
  whatTheyDo: string;
  whoTheyServe: string;
  positioning: string;
  primaryConversion: string;
  visualDirectionHints: string;
  mustPreserve: string[];
  mustAvoid: string[];
  openQuestions: string[];
  corrections: string[];
};

export function GrillMe({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<string>("undecided");
  const [status, setStatus] = useState<string>("active");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [draft, setDraft] = useState("");
  const [correction, setCorrection] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentQuestionId = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.metadata?.type === "question")
    ?.metadata?.question?.id;

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}/interview`, {
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Interview unavailable");
    setMessages(data.messages);
    setMode(data.interview.mode);
    setStatus(data.interview.status);
    setSummary(data.interview.summary);
    if (data.interview.status === "confirmed") {
      router.replace(`/projects/${projectId}/directions`);
    }
  }, [projectId, router]);

  useEffect(() => {
    refresh().catch((err) => setError(err.message));
  }, [refresh]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/interview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Request failed");
      if (data.summary) setSummary(data.summary);
      if (data.next) {
        router.push(data.next);
        return data;
      }
      await refresh();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAnswer(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    const content = draft;
    setDraft("");
    await post({
      action: "answer",
      content,
      questionId: currentQuestionId,
    });
  }

  return (
    <div className="interview">
      <p className="eyebrow">Grill Me</p>
      <h1>A short interview before design</h1>
      <p className="lede">
        Adaptive questions only — nothing the website already answered.
      </p>

      {mode === "undecided" ? (
        <div className="mode-row">
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={() => post({ action: "set_mode", mode: "grill" })}
          >
            Ask me everything
          </button>
          <button
            type="button"
            className="ghost"
            disabled={busy}
            onClick={() => post({ action: "set_mode", mode: "assumptions" })}
          >
            Just make smart assumptions
          </button>
        </div>
      ) : null}

      <div className="transcript" aria-live="polite">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`bubble ${message.role === "user" ? "user" : "assistant"}`}
          >
            <p>{message.content}</p>
            {message.metadata?.question?.whyItMatters ? (
              <p className="why">{message.metadata.question.whyItMatters}</p>
            ) : null}
          </div>
        ))}
      </div>

      {mode === "grill" && status === "active" ? (
        <form className="answer-form" onSubmit={onAnswer}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Your answer…"
            rows={3}
            disabled={busy}
          />
          <div className="answer-actions">
            <button
              type="submit"
              className="primary"
              disabled={busy || !draft.trim()}
            >
              Send
            </button>
            <button
              type="button"
              className="ghost"
              disabled={busy}
              onClick={() =>
                post({ action: "skip", questionId: currentQuestionId })
              }
            >
              Skip
            </button>
            <button
              type="button"
              className="ghost"
              disabled={busy}
              onClick={() => post({ action: "request_summary" })}
            >
              Finish early
            </button>
          </div>
        </form>
      ) : null}

      {summary && status === "awaiting_summary" ? (
        <section className="summary-card">
          <h2>What I understood</h2>
          <dl>
            <div>
              <dt>Business</dt>
              <dd>{summary.businessName ?? "Unnamed business"}</dd>
            </div>
            <div>
              <dt>What they do</dt>
              <dd>{summary.whatTheyDo}</dd>
            </div>
            <div>
              <dt>Who they serve</dt>
              <dd>{summary.whoTheyServe}</dd>
            </div>
            <div>
              <dt>Positioning</dt>
              <dd>{summary.positioning}</dd>
            </div>
            <div>
              <dt>Primary conversion</dt>
              <dd>{summary.primaryConversion}</dd>
            </div>
            <div>
              <dt>Visual direction</dt>
              <dd>{summary.visualDirectionHints}</dd>
            </div>
          </dl>
          <div className="summary-lists">
            <div>
              <h3>Must preserve</h3>
              <ul>
                {summary.mustPreserve.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Must avoid</h3>
              <ul>
                {summary.mustAvoid.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          {summary.corrections?.length ? (
            <div>
              <h3>Your corrections</h3>
              <ul>
                {summary.corrections.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="summary-actions">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!correction.trim()) return;
                const text = correction;
                setCorrection("");
                void post({ action: "correct_summary", content: text });
              }}
            >
              <label htmlFor="correction">Correct something</label>
              <input
                id="correction"
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
                placeholder="e.g. We are premium, not local-budget"
                disabled={busy}
              />
            </form>
            <button
              type="button"
              className="primary"
              disabled={busy}
              onClick={() => post({ action: "confirm_summary" })}
            >
              Confirm & continue
            </button>
          </div>
        </section>
      ) : null}

      {error ? <p className="intake-error">{error}</p> : null}
    </div>
  );
}
