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

function classToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "default";
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

/** Compact, art-directed concept canvas for direction selection. */
export function renderConceptPreviewHtml(
  concept: Concept,
  viewport: "desktop" | "mobile",
): string {
  const p = concept.preview;
  const width = viewport === "mobile" ? 390 : 1440;

  const legacyBlocks =
    p.blocks.length > 0
      ? p.blocks
      : [
          ...(p.nav
            ? [{
                kind: "nav" as const,
                variant: "legacy",
                eyebrow: null,
                title: p.nav.brand,
                body: null,
                items: p.nav.links,
                meta: null,
                cta: p.nav.cta,
              }]
            : []),
          ...(p.hero
            ? [{
                kind: "headline" as const,
                variant: "legacy",
                eyebrow: p.hero.eyebrow,
                title: p.hero.headline,
                body: p.hero.subhead,
                items: [],
                meta: null,
                cta: p.hero.primaryCta,
              }]
            : []),
          ...(p.section
            ? [{
                kind: "feature" as const,
                variant: "legacy",
                eyebrow: null,
                title: p.section.title,
                body: p.section.body,
                items: p.section.items,
                meta: null,
                cta: null,
              }]
            : []),
        ];

  const blocks = legacyBlocks
    .map((block) => {
      const variant = classToken(block.variant);
      const eyebrow = block.eyebrow
        ? `<p class="block-eyebrow">${esc(block.eyebrow)}</p>`
        : "";
      const title = block.title
        ? `<h2>${esc(block.title)}</h2>`
        : "";
      const body = block.body
        ? `<p class="block-body">${esc(block.body)}</p>`
        : "";
      const meta = block.meta
        ? `<span class="block-meta">${esc(block.meta)}</span>`
        : "";
      const cta = block.cta
        ? `<span class="block-cta">${esc(block.cta)}</span>`
        : "";
      const items = block.items ?? [];

      switch (block.kind) {
        case "nav":
          return `<header class="concept-block block-nav variant-${variant}">
            <strong>${esc(block.title ?? "Brand")}</strong>
            <nav>${items.slice(0, 5).map((item) => `<span>${esc(item)}</span>`).join("")}</nav>
            ${cta}
          </header>`;
        case "headline":
          return `<section class="concept-block block-headline variant-${variant}">
            <div>${eyebrow}${title}${body}${cta}</div>
          </section>`;
        case "text":
          return `<section class="concept-block block-text variant-${variant}">
            ${eyebrow}${title}${body}${meta}
          </section>`;
        case "media":
          return `<section class="concept-block block-media variant-${variant}">
            <div class="media-plane"><span>${esc(block.title ?? block.meta ?? "Visual direction")}</span></div>
            ${body}
          </section>`;
        case "list":
          return `<section class="concept-block block-list variant-${variant}">
            ${eyebrow}${title}${body}
            <div class="list-rows">${items.map((item, index) => `<div><span>${String(index + 1).padStart(2, "0")}</span><strong>${esc(item)}</strong></div>`).join("")}</div>
          </section>`;
        case "ticker":
          return `<section class="concept-block block-ticker variant-${variant}">
            ${title}<div class="ticker-track">${items.map((item) => `<span>${esc(item)}</span>`).join("")}</div>
          </section>`;
        case "data":
          return `<section class="concept-block block-data variant-${variant}">
            ${eyebrow}${title}${body}
            <div class="data-grid">${items.map((item, index) => `<div><span>${String(index + 1).padStart(2, "0")}</span><strong>${esc(item)}</strong></div>`).join("")}</div>
          </section>`;
        case "feature":
          return `<section class="concept-block block-feature variant-${variant}">
            ${eyebrow}${title}${body}
            <div class="feature-grid">${items.map((item) => `<article>${esc(item)}</article>`).join("")}</div>
            ${cta}
          </section>`;
        case "quote":
          return `<section class="concept-block block-quote variant-${variant}">
            ${eyebrow}<blockquote>${esc(block.body ?? block.title ?? "")}</blockquote>${meta}
          </section>`;
        case "cta":
          return `<section class="concept-block block-cta-panel variant-${variant}">
            ${eyebrow}${title}${body}${cta}
          </section>`;
        case "split":
          return `<section class="concept-block block-split variant-${variant}">
            <div>${eyebrow}${title}${body}${cta}</div>
            <div class="split-side">${items.map((item) => `<span>${esc(item)}</span>`).join("")}</div>
          </section>`;
      }
    })
    .join("\n");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=${width}, initial-scale=1"/>
<style>
:root{
  --bg:#f4f3ef;
  --ink:#111214;
  --muted:#666863;
  --line:rgba(17,18,20,.14);
  --surface:#ffffff;
  --accent:#111214;
}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:var(--bg);color:var(--ink)}
body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.canvas{
  width:min(100%,${viewport === "mobile" ? "390px" : "1180px"});
  min-height:100vh;
  margin:0 auto;
  overflow:hidden;
  background:var(--bg);
}
.concept-block{position:relative}
.block-nav{
  min-height:58px;
  padding:16px 22px;
  display:grid;
  grid-template-columns:auto 1fr auto;
  align-items:center;
  gap:18px;
  border-bottom:1px solid var(--line);
  font-size:12px;
}
.block-nav strong{font-size:14px;letter-spacing:-.03em}
.block-nav nav{display:flex;gap:16px;justify-content:center;color:var(--muted)}
.block-cta,.block-cta-panel .block-cta{
  display:inline-flex;
  width:max-content;
  padding:10px 14px;
  background:var(--accent);
  color:#fff;
  font-size:12px;
  font-weight:700;
}
.block-headline{
  min-height:330px;
  padding:clamp(34px,6vw,74px) clamp(22px,5vw,60px);
  display:flex;
  align-items:flex-end;
}
.block-headline>div{max-width:780px}
.block-eyebrow{
  margin:0 0 10px;
  font-size:10px;
  font-weight:700;
  letter-spacing:.15em;
  text-transform:uppercase;
  color:var(--muted);
}
h2{
  margin:0;
  font-size:clamp(34px,7vw,74px);
  line-height:.95;
  letter-spacing:-.055em;
  font-weight:650;
}
.block-body{
  max-width:620px;
  margin:16px 0 0;
  color:var(--muted);
  font-size:clamp(14px,2vw,18px);
  line-height:1.45;
}
.block-headline .block-cta,.block-cta-panel .block-cta{margin-top:20px}
.block-text,.block-list,.block-data,.block-feature,.block-quote,.block-cta-panel{
  padding:clamp(26px,4vw,48px) clamp(22px,5vw,60px);
  border-top:1px solid var(--line);
}
.block-text h2,.block-list h2,.block-data h2,.block-feature h2,.block-cta-panel h2{
  font-size:clamp(24px,4vw,42px);
  line-height:1;
}
.block-media{padding:0}
.media-plane{
  min-height:300px;
  display:grid;
  place-items:end start;
  padding:28px;
  background:
    radial-gradient(circle at 70% 30%,rgba(255,255,255,.28),transparent 22%),
    linear-gradient(135deg,#d7d7d2,#a7aba7);
  overflow:hidden;
}
.media-plane span{
  font-size:12px;
  text-transform:uppercase;
  letter-spacing:.12em;
  color:rgba(0,0,0,.52);
}
.block-media>.block-body{padding:0 22px 28px}
.list-rows,.data-grid{margin-top:22px}
.list-rows>div,.data-grid>div{
  display:grid;
  grid-template-columns:42px 1fr;
  gap:10px;
  padding:12px 0;
  border-top:1px solid var(--line);
}
.list-rows span,.data-grid span{font-size:10px;color:var(--muted)}
.list-rows strong,.data-grid strong{font-size:15px}
.block-ticker{
  display:flex;
  align-items:center;
  gap:18px;
  min-height:54px;
  padding:0 22px;
  border-top:1px solid var(--line);
  border-bottom:1px solid var(--line);
  overflow:hidden;
}
.block-ticker h2{font-size:13px;white-space:nowrap}
.ticker-track{display:flex;gap:24px;white-space:nowrap;color:var(--muted);font-size:12px}
.feature-grid{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:12px;
  margin-top:22px;
}
.feature-grid article{
  min-height:92px;
  padding:16px;
  border-top:1px solid var(--line);
  font-size:13px;
}
.block-quote blockquote{
  margin:0;
  max-width:900px;
  font-family:Georgia,serif;
  font-size:clamp(28px,5vw,56px);
  line-height:1.05;
  letter-spacing:-.03em;
}
.block-meta{display:block;margin-top:12px;color:var(--muted);font-size:11px}
.block-split{
  min-height:310px;
  display:grid;
  grid-template-columns:1.1fr .9fr;
  gap:0;
  border-top:1px solid var(--line);
}
.block-split>div:first-child{padding:clamp(28px,5vw,58px)}
.block-split h2{font-size:clamp(28px,5vw,56px)}
.split-side{
  display:grid;
  align-content:center;
  gap:0;
  padding:28px;
  border-left:1px solid var(--line);
}
.split-side span{padding:12px 0;border-top:1px solid var(--line);font-size:13px}
@media(max-width:600px){
  .block-nav{grid-template-columns:1fr auto;padding:13px 16px}
  .block-nav nav{display:none}
  .block-headline{min-height:260px;padding:34px 18px}
  h2{font-size:clamp(36px,12vw,52px)}
  .block-text,.block-list,.block-data,.block-feature,.block-quote,.block-cta-panel{padding:26px 18px}
  .block-media>.block-body{padding-inline:18px}
  .media-plane{min-height:210px;padding:18px}
  .feature-grid{grid-template-columns:1fr}
  .block-split{grid-template-columns:1fr;min-height:0}
  .block-split>div:first-child{padding:28px 18px}
  .split-side{border-left:0;border-top:1px solid var(--line);padding:18px}
}
${sanitizeGeneratedCss(concept.previewCss ?? "")}
</style>
</head>
<body>
  <main class="canvas layout-${classToken(p.layout)}">
    ${blocks}
  </main>
</body>
</html>`;
}

