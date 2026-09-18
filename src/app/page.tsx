import Link from "next/link";
import { UrlIntake } from "@/components/landing/UrlIntake";

const examples = ["SaaS", "Restaurant", "Portfolio", "Store"];

export default function HomePage() {
  return (
    <main className="landing-home">
      <header className="landing-nav">
        <Link className="landing-brand" href="/">
          Remade<span className="landing-beta">Beta</span>
        </Link>
        <nav className="landing-links" aria-label="Primary navigation">
          <a href="#examples">Examples</a>
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="landing-nav-actions">
          <button className="landing-signin" type="button">Sign in</button>
          <a className="landing-nav-cta" href="#rebuild">Try Remade</a>
        </div>
      </header>

      <section className="landing-stage" id="rebuild">
        <div className="landing-orbit orbit-one" aria-hidden="true"><span /></div>
        <div className="landing-orbit orbit-two" aria-hidden="true"><span /></div>
        <div className="landing-orbit orbit-three" aria-hidden="true"><span /></div>
        <div className="landing-orbit orbit-four" aria-hidden="true"><span /></div>

        <div className="landing-copy">
          <p className="landing-kicker"><span /> Autonomous website redesign</p>
          <h1>Your website<br />but better.</h1>
          <p className="landing-subcopy">
            Drop your website and watch an AI design team research it, question the right things,
            generate directions, critique the result, and repair it before you ever ship.
          </p>
          <div className="landing-intake-wrap">
            <UrlIntake />
          </div>
          <div className="landing-examples" id="examples">
            <span>Built for</span>
            {examples.map((example) => <span key={example} className="landing-chip">{example}</span>)}
          </div>
        </div>
      </section>

      <section className="landing-proof" id="how">
        <p>Not prompt-to-template.</p>
        <h2>Research first. Design second. Critique before publish.</h2>
      </section>
    </main>
  );
}
