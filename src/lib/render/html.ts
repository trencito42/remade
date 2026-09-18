import type { Concept } from "@/lib/schemas/site";
import type { SiteDocument } from "@/lib/schemas/site";
import { sanitizeGeneratedCss } from "@/lib/security/sanitize";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Full website HTML for sandboxed iframe preview (no script execution needed). */
export function renderSiteHtml(site: SiteDocument): string {
  const ds = site.designSystem;
  const fonts = ds.fonts.google
    .map((g) => `family=${g}`)
    .join("&");
  const sections = site.sections
    .map((section) => {
      switch (section.type) {
        case "nav":
          return `<header class="nav" data-section="nav">
  <div class="brand">${esc(section.brand)}</div>
  <nav>${section.links.map((l) => `<a href="#">${esc(l)}</a>`).join("")}</nav>
  ${section.cta ? `<a class="btn" href="#contact">${esc(section.cta)}</a>` : ""}
</header>`;
        case "hero":
          return `<section class="hero" data-section="hero">
  <div class="hero-copy">
    ${section.eyebrow ? `<p class="eyebrow">${esc(section.eyebrow)}</p>` : ""}
    <h1>${esc(section.headline)}</h1>
    <p class="sub">${esc(section.subhead)}</p>
    <div class="cta-row">
      <a class="btn" href="${esc(section.primaryHref ?? "#contact")}">${esc(section.primaryCta)}</a>
      ${section.secondaryCta ? `<a class="linkish" href="${esc(section.secondaryHref ?? section.primaryHref ?? "#contact")}">${esc(section.secondaryCta)}</a>` : ""}
    </div>
  </div>
  <div class="hero-media" aria-hidden="true">${esc(section.mediaLabel ?? "Visual")}</div>
</section>`;
        case "services":
          return `<section class="services" data-section="services">
  <h2>${esc(section.title)}</h2>
  <p class="intro">${esc(section.intro)}</p>
  <div class="service-list">
    ${section.items
      .map(
        (item) => `<article class="service-item">
      <h3>${esc(item.title)}</h3>
      <p>${esc(item.body)}</p>
    </article>`,
      )
      .join("")}
  </div>
</section>`;
        case "about":
          return `<section class="about" data-section="about">
  <h2>${esc(section.title)}</h2>
  <p>${esc(section.body)}</p>
</section>`;
        case "contact":
          return `<section class="contact" id="contact" data-section="contact">
  <h2>${esc(section.title)}</h2>
  <p>${esc(section.body)}</p>
  <ul class="contact-list">
    ${section.phone ? `<li>Phone: ${esc(section.phone)}</li>` : ""}
    ${section.email ? `<li>Email: ${esc(section.email)}</li>` : ""}
  </ul>
  <a class="btn" href="#">${esc(section.cta)}</a>
</section>`;
        case "footer":
          return `<footer class="footer" data-section="footer"><p>${esc(section.text)}</p></footer>`;
        case "content":
          return `<section class="content-section content-${esc(section.variant)}" data-section="content" data-variant="${esc(section.variant)}">
  <div class="content-head">
    ${section.eyebrow ? `<p class="eyebrow">${esc(section.eyebrow)}</p>` : ""}
    <h2>${esc(section.title)}</h2>
    ${section.body ? `<p class="intro">${esc(section.body)}</p>` : ""}
  </div>
  ${section.mediaUrl ? `<div class="content-media"><img src="${esc(section.mediaUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer"/></div>` : ""}
  ${section.items.length ? `<div class="content-items">
    ${section.items.map((item) => `<article class="content-item">
      ${item.title ? `<h3>${esc(item.title)}</h3>` : ""}
      <p>${esc(item.body)}</p>
      ${item.meta ? `<span class="meta">${esc(item.meta)}</span>` : ""}
    </article>`).join("")}
  </div>` : ""}
  ${section.cta ? `<a class="btn" href="${esc(section.cta.href)}">${esc(section.cta.label)}</a>` : ""}
</section>`;
        default:
          return "";
      }
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(site.meta.title)}</title>
<meta name="description" content="${esc(site.meta.description)}"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fonts}&display=swap"/>
<style>
:root {
  --bg: ${ds.colors.bg};
  --surface: ${ds.colors.surface};
  --ink: ${ds.colors.ink};
  --muted: ${ds.colors.muted};
  --accent: ${ds.colors.accent};
  --accent-ink: ${ds.colors.accentInk};
  --line: ${ds.colors.line};
  --radius: ${ds.radii.control};
  --media-radius: ${ds.radii.media};
  --section-y: ${ds.spacing.sectionY};
  --stack: ${ds.spacing.stack};
  --max: ${ds.spacing.contentWidth};
  --display: "${ds.fonts.display}", Georgia, serif;
  --body: "${ds.fonts.body}", system-ui, sans-serif;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--body);
  font-size: ${ds.typeScale.body};
  line-height: 1.5;
}
a { color: inherit; text-decoration: none; }
.nav, .hero, .services, .about, .contact, .content-section, .footer {
  width: min(100% - 2rem, var(--max));
  margin-inline: auto;
}
.nav {
  display: flex; align-items: center; gap: 1rem; justify-content: space-between;
  padding: 1.25rem 0; border-bottom: ${ds.borders.width} solid var(--line);
}
.nav nav { display: flex; gap: 1rem; flex-wrap: wrap; color: var(--muted); font-size: ${ds.typeScale.small}; }
.brand { font-family: var(--display); font-weight: 600; letter-spacing: -0.03em; }
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--accent); color: var(--accent-ink);
  padding: 0.85rem 1.1rem; border-radius: var(--radius); font-weight: 600;
}
.linkish { color: var(--muted); text-decoration: underline; text-underline-offset: 3px; }
.hero {
  display: grid; gap: 1.5rem; padding: var(--section-y) 0;
  grid-template-columns: 1.2fr 0.8fr; align-items: end;
}
.hero h1 {
  font-family: var(--display); font-size: ${ds.typeScale.display};
  line-height: 1.05; letter-spacing: -0.04em; margin: 0.2rem 0 0.8rem;
  max-width: 12ch;
}
.eyebrow { text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.72rem; color: var(--accent); margin: 0; }
.sub { color: var(--muted); max-width: 36rem; margin: 0 0 1.25rem; }
.cta-row { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
.hero-media {
  background: var(--surface); border: ${ds.borders.width} solid var(--line);
  border-radius: var(--media-radius); min-height: 280px;
  display: grid; place-items: center; color: var(--muted); font-size: ${ds.typeScale.small};
}
.services, .about, .contact, .content-section { padding: var(--section-y) 0; }
h2 { font-family: var(--display); font-size: ${ds.typeScale.h2}; letter-spacing: -0.02em; margin: 0 0 0.75rem; }
.intro { color: var(--muted); margin: 0 0 1.5rem; max-width: 40rem; }
.service-list { display: grid; gap: 1.25rem; }
.service-list { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.service-item {
  padding: 0; border: none; background: transparent;
  border-top: ${ds.borders.width} solid var(--line); padding-top: 1rem;
}
.service-item h3 { margin: 0 0 0.4rem; font-size: 1.05rem; }
.service-item p { margin: 0; color: var(--muted); }
.content-section { border-top: ${ds.borders.width} solid var(--line); }
.content-head { max-width: 46rem; margin-bottom: clamp(1.25rem, 4vw, 2.5rem); }
.content-items { display: grid; gap: var(--stack); }
.content-item { padding-top: 1rem; border-top: ${ds.borders.width} solid var(--line); }
.content-item h3 { margin: 0 0 .4rem; font-size: 1.05rem; }
.content-item p { margin: 0; color: var(--muted); }
.content-item .meta { display: block; margin-top: .5rem; font-size: ${ds.typeScale.small}; color: var(--muted); }
.content-media { margin: 0 0 1.5rem; overflow: hidden; border-radius: var(--media-radius); background: var(--surface); }
.content-media img { width: 100%; height: auto; display: block; }
.content-gallery .content-items, .content-team .content-items, .content-pricing .content-items, .content-menu .content-items { grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); }
.content-faq .content-items, .content-process .content-items, .content-list .content-items { grid-template-columns: 1fr; max-width: 52rem; }
.content-split { display: grid; grid-template-columns: .9fr 1.1fr; gap: 2rem; align-items: start; }
.content-split .content-head { margin-bottom: 0; }
.content-section > .btn { margin-top: 1.25rem; }
.contact-list { padding-left: 1.1rem; color: var(--muted); }
.footer {
  padding: 2rem 0 3rem; border-top: ${ds.borders.width} solid var(--line);
  color: var(--muted); font-size: ${ds.typeScale.small};
}
@media (max-width: 800px) {
  .hero, .content-split { grid-template-columns: 1fr; }
  .hero h1 { max-width: none; font-size: clamp(2.2rem, 10vw, 3.2rem); }
  .nav nav { display: none; }
}
${sanitizeGeneratedCss(site.customCss ?? "")}
</style>
</head>
<body>
${sections}
</body>
</html>`;
}

/** Compact concept strip HTML for direction selection. */
export function renderConceptPreviewHtml(concept: Concept, viewport: "desktop" | "mobile"): string {
  const dna = concept.styleDna;
  const p = concept.preview;
  const width = viewport === "mobile" ? 390 : 1440;
  const bg = "#f3f3f0";
  const accent = "#111111";
  const display = "system-ui, sans-serif";

  return `<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=${width}"/>
<style>
body{margin:0;background:${bg};color:#141210;font-family:system-ui,sans-serif}
.frame{width:${Math.min(width, 720)}px;max-width:100%;margin:0 auto;padding:12px}
.nav{display:flex;justify-content:space-between;gap:8px;padding:10px 0;border-bottom:1px solid #ccc;font-size:12px}
.hero{display:grid;gap:12px;padding:28px 0;grid-template-columns:1.2fr .8fr;align-items:end}
h1{font-family:${display};font-size:34px;line-height:1.05;margin:0;letter-spacing:-.03em;max-width:11ch}
.sub{color:#666;font-size:14px;max-width:34ch}
.btn{display:inline-block;background:${accent};color:#fff;padding:10px 12px;font-size:13px;font-weight:600;text-decoration:none}
.media{min-height:140px;background:#fff;border:1px solid #ccc;display:grid;place-items:center;color:#888;font-size:12px}
.section{padding:22px 0;border-top:1px solid #ccc}
.section h2{font-size:18px;margin:0 0 8px;font-family:${display}}
ul{margin:0;padding-left:18px;color:#555;font-size:13px}
@media(max-width:500px){.hero{grid-template-columns:1fr}h1{font-size:28px}}
${sanitizeGeneratedCss(concept.previewCss ?? "")}\n</style></head><body><div class="frame">
<div class="nav"><strong>${esc(p.nav.brand)}</strong><span>${p.nav.links.slice(0, 3).map(esc).join(" · ")}</span>${p.nav.cta ? `<span>${esc(p.nav.cta)}</span>` : ""}</div>
<div class="hero">
  <div>
    ${p.hero.eyebrow ? `<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${accent}">${esc(p.hero.eyebrow)}</div>` : ""}
    <h1>${esc(p.hero.headline)}</h1>
    <p class="sub">${esc(p.hero.subhead)}</p>
    <a class="btn" href="${esc(p.hero.primaryHref ?? "#contact")}">${esc(p.hero.primaryCta)}</a>
  </div>
  <div class="media">${esc(p.hero.mediaLabel ?? "Image")}</div>
</div>

<div class="section">
  <h2>${esc(p.section.title)}</h2>
  <p class="sub">${esc(p.section.body)}</p>
  <ul>${p.section.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
</div>
</div></body></html>`;
}
