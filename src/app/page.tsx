import Link from "next/link";
import { UrlIntake } from "@/components/landing/UrlIntake";

export default function HomePage() {
  return (
    <main className="shell landing">
      <header className="topbar">
        <Link className="brand" href="/">
          Remade
        </Link>
      </header>

      <section className="hero">
        <p className="brand-mark">Remade</p>
        <h1>Your website deserves better.</h1>
        <p className="hero-sub">
          Paste an existing site. We research the business, interview you, and only
          then design — with critique and repair until it’s actually good.
        </p>
        <UrlIntake />
      </section>
    </main>
  );
}
