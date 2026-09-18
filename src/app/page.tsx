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
        <div className="landing-orbit orbit-one" aria-hidden="true">
          <span className="orbit-shine" />
          <span className="orbit-ui orbit-ui-a"><i /><i /><i /></span>
        </div>
        <div className="landing-orbit orbit-two" aria-hidden="true">
          <span className="orbit-shine" />
          <span className="orbit-ui orbit-ui-b"><i /><i /></span>
        </div>
        <div className="landing-orbit orbit-three" aria-hidden="true">
          <span className="orbit-shine" />
          <span className="orbit-ui orbit-ui-c"><i /><i /><i /></span>
        </div>
        <div className="landing-orbit orbit-four" aria-hidden="true">
          <span className="orbit-shine" />
          <span className="orbit-ui orbit-ui-d"><i /><i /></span>
        </div>

        <div className="landing-copy">
          <p className="landing-kicker"><span /> Autonomous website redesign</p>
          <h1>Your website<br />but better.</h1>
          <p className="landing-subcopy">
            Paste your site. Remade researches it, asks what matters, explores real directions,
            and critiques its own work before you ship.
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
        <div className="landing-proof-copy">
          <p>Not prompt-to-template.</p>
          <h2>Research first. Design second. Critique before publish.</h2>
        </div>
        <div className="landing-proof-flow" aria-label="Remade workflow">
          <span>01 Understand</span>
          <span>02 Direct</span>
          <span>03 Build</span>
          <span>04 Critique</span>
          <span>05 Repair</span>
        </div>
      </section>
    </main>
  );
}
