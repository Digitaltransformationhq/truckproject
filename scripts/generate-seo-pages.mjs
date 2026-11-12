// Generates crawlable SEO pages after `vite build`:
//   dist/truck-booking.html               hub listing every route
//   dist/truck-booking/<from>-to-<to>.html one page per freight corridor
//   dist/sitemap.xml                       all public URLs (+ Hindi/Gujarati alternates for the home page)
// Pages are plain HTML (no JavaScript needed), so every search engine and link preview can read them.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SITE = 'https://www.fares24x7.com';
const OUT = 'dist';
const TODAY = new Date().toISOString().slice(0, 10);

/** What typically moves out of / into each city (well-known industries; no statistics). */
const CITIES = {
  Ahmedabad: { state: 'Gujarat', goods: ['textiles and yarn', 'pharmaceuticals', 'chemicals', 'engineering goods'] },
  Mumbai: { state: 'Maharashtra', goods: ['FMCG and consumer goods', 'port containers', 'packaged food', 'electronics'] },
  Pune: { state: 'Maharashtra', goods: ['auto components', 'engineering goods', 'industrial machinery'] },
  Delhi: { state: 'Delhi NCR', goods: ['FMCG', 'garments', 'electronics', 'furniture'] },
  Jaipur: { state: 'Rajasthan', goods: ['textiles', 'handicrafts', 'marble and stone'] },
  Surat: { state: 'Gujarat', goods: ['textiles and synthetic fabric', 'yarn', 'packaging material'] },
  Vadodara: { state: 'Gujarat', goods: ['chemicals', 'engineering goods', 'power equipment'] },
  Rajkot: { state: 'Gujarat', goods: ['engineering and auto parts', 'castings and forgings', 'ceramics from nearby Morbi'] },
  Bengaluru: { state: 'Karnataka', goods: ['electronics', 'FMCG', 'garments', 'machinery'] },
  Chennai: { state: 'Tamil Nadu', goods: ['auto components', 'electronics', 'port containers'] },
  Hyderabad: { state: 'Telangana', goods: ['pharmaceuticals', 'FMCG', 'construction material'] },
  Kolkata: { state: 'West Bengal', goods: ['steel', 'jute products', 'FMCG'] },
  Ludhiana: { state: 'Punjab', goods: ['hosiery and woollens', 'cycle and auto parts', 'steel products'] },
  Indore: { state: 'Madhya Pradesh', goods: ['soya and agri produce', 'FMCG', 'pharmaceuticals'] },
  Nagpur: { state: 'Maharashtra', goods: ['agri produce', 'FMCG', 'construction material'] },
  Mundra: { state: 'Gujarat', goods: ['import and export containers', 'bulk cargo'] },
  Vapi: { state: 'Gujarat', goods: ['chemicals', 'paper', 'plastics'] },
  Kanpur: { state: 'Uttar Pradesh', goods: ['leather goods', 'textiles', 'FMCG'] },
  Coimbatore: { state: 'Tamil Nadu', goods: ['textiles', 'pumps and motors', 'engineering goods'] },
  Bhiwandi: { state: 'Maharashtra', goods: ['warehouse stock', 'FMCG', 'e-commerce shipments'] },
};

const ROUTES = [
  ['Ahmedabad', 'Mumbai'], ['Mumbai', 'Ahmedabad'], ['Mumbai', 'Pune'], ['Pune', 'Mumbai'], ['Delhi', 'Jaipur'], ['Delhi', 'Mumbai'],
  ['Mumbai', 'Delhi'], ['Surat', 'Mumbai'], ['Surat', 'Delhi'], ['Vadodara', 'Pune'], ['Ahmedabad', 'Delhi'], ['Rajkot', 'Ahmedabad'],
  ['Mumbai', 'Bengaluru'], ['Chennai', 'Bengaluru'], ['Bengaluru', 'Chennai'], ['Hyderabad', 'Bengaluru'], ['Kolkata', 'Delhi'],
  ['Pune', 'Hyderabad'], ['Ludhiana', 'Delhi'], ['Indore', 'Mumbai'], ['Nagpur', 'Hyderabad'], ['Ahmedabad', 'Pune'],
  ['Mundra', 'Ahmedabad'], ['Vapi', 'Mumbai'], ['Chennai', 'Hyderabad'], ['Jaipur', 'Ahmedabad'], ['Kanpur', 'Delhi'],
  ['Coimbatore', 'Chennai'], ['Bhiwandi', 'Pune'], ['Delhi', 'Ludhiana'],
];

const slug = (from, to) => `${from}-to-${to}`.toLowerCase();
const url = (from, to) => `${SITE}/truck-booking/${slug(from, to)}`;
const esc = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const list = (items) => items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : items[0];
const SIGNUP = `${SITE}/?auth=signup`;

const STYLE = `
:root{--ink:#171717;--muted:#5f656b;--line:#e4e2dc;--orange:#ffa51f;--cream:#fff8ec}
*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--ink);font:16px/1.7 "DM Sans",system-ui,-apple-system,"Segoe UI",sans-serif}
a{color:#b85f00}header,main,footer{max-width:960px;margin:0 auto;padding:0 20px}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;height:72px;border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:9px;color:var(--ink);text-decoration:none;font:800 19px Manrope,system-ui,sans-serif}
.brand span{width:34px;height:34px;display:grid;place-items:center;border:1.5px solid var(--ink);border-radius:9px;background:var(--orange);font-size:10px}
.btn{display:inline-flex;align-items:center;gap:8px;height:46px;padding:0 20px;border:1.5px solid var(--ink);border-radius:11px;background:var(--orange);color:var(--ink);font-weight:800;text-decoration:none;box-shadow:3px 3px 0 var(--ink)}
.btn.light{background:#fff}
nav.crumbs{margin:22px 0 0;color:var(--muted);font-size:13px}nav.crumbs a{color:var(--muted)}
h1{margin:10px 0 12px;font:800 clamp(30px,5vw,46px)/1.12 Manrope,system-ui,sans-serif;letter-spacing:-.03em}
h2{margin:40px 0 10px;font:800 24px/1.25 Manrope,system-ui,sans-serif}
.lead{color:var(--muted);font-size:18px;max-width:720px}
.cta{display:flex;flex-wrap:wrap;gap:12px;margin:24px 0 8px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:14px}
.card{padding:18px;border:1px solid var(--line);border-radius:14px;background:#fff}
.card strong{display:block;margin-bottom:4px}
ol.steps{padding-left:20px}ol.steps li{margin-bottom:8px}
details{padding:14px 16px;border:1px solid var(--line);border-radius:12px;margin-bottom:10px;background:#fff}
summary{cursor:pointer;font-weight:800}
.routes{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.routes a{padding:7px 12px;border:1px solid var(--line);border-radius:20px;color:var(--ink);text-decoration:none;font-size:14px}
.routes a:hover{border-color:var(--orange);background:var(--cream)}
.band{margin:44px 0;padding:26px;border:1.5px solid var(--ink);border-radius:18px;background:var(--orange);box-shadow:5px 5px 0 var(--ink)}
.band h2{margin-top:0}
footer{margin-top:40px;padding:26px 20px 40px;border-top:1px solid var(--line);color:var(--muted);font-size:14px}
`;

function page({ title, description, canonical, body, jsonld }) {
  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Fares24x7"><meta property="og:locale" content="en_IN">
<meta property="og:url" content="${canonical}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}/og-image.png"><meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#ffa51f">
<link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&family=Manrope:wght@800&display=swap" rel="stylesheet">
<style>${STYLE}</style>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body>
<header><a class="brand" href="/"><span>F24</span>Fares24x7.</a><a class="btn light" href="${SITE}/?auth=login">Log in</a></header>
<main>${body}</main>
<footer><p><strong>Fares24x7</strong>: simple truck requests for Indian transport businesses. Post a load, get a clear answer, move.</p>
<p><a href="/">Home</a> · <a href="/truck-booking">All truck routes</a> · <a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Service</a> · <a href="mailto:support@fares24x7.com">support@fares24x7.com</a></p></footer>
</body>
</html>`;
}

const VEHICLES = [
  ['14 ft LCV', 'Small part loads and city-to-city cartons, up to about 4 tonnes.'],
  ['20 ft container', 'Covered, secure loads such as cartons, textiles and electronics.'],
  ['24 ft single axle', 'Mid-size full truck loads of general goods.'],
  ['32 ft multi axle', 'Heavy and high-volume full truck loads, up to around 16+ tonnes.'],
];

function routePage([from, to]) {
  const a = CITIES[from], b = CITIES[to];
  const reverse = ROUTES.find(([x, y]) => x === to && y === from);
  const related = ROUTES.filter(([x, y]) => (x === from || y === to || x === to) && !(x === from && y === to)).slice(0, 8);
  const title = `${from} to ${to} Truck Booking | Full & Part Load Trucks | Fares24x7`;
  const description = `Book a truck from ${from} to ${to} online. Post your load in a minute; verified truck owners already heading to ${to} accept it. Full truck and part load, GST & KYC verified, no brokers.`;
  const faqs = [
    [`How do I book a truck from ${from} to ${to}?`, `Create a free Fares24x7 account and post a request with ${from} as pickup and ${to} as delivery, plus the goods, weight and date. Truck owners with an available truck on the ${from}–${to} route are alerted and can accept it. You are notified instantly with the truck and owner details.`],
    [`How much does a truck from ${from} to ${to} cost?`, `The price depends on the truck size, the weight, the type of goods and the date. You can add your expected budget when you post; truck owners see it before accepting, and you agree the final price directly with the transporter, with no broker commission in between.`],
    [`Can I book a part load from ${from} to ${to}?`, `Yes. Choose "Shared truck" (part load) when you post the request if your goods do not need a full truck.`],
    [`Are the transporters verified?`, `Businesses on Fares24x7 submit GST and PAN details for review, and trucks carry RC, insurance, fitness and PUC documents. You can also see each transporter's rating from past trips.`],
    reverse
      ? [`I own a truck. How do I find a return load from ${to} to ${from}?`, `Add your truck and its route on Fares24x7. Requests from ${to} towards ${from} reach you so your truck earns on the way back instead of returning empty.`]
      : [`I own a truck going to ${to}. How do I find loads?`, `Add your truck and its usual routes on Fares24x7. Requests on routes you cover reach you directly, including return loads from ${to}.`],
  ];
  const body = `
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/truck-booking">Truck routes</a> › ${esc(from)} to ${esc(to)}</nav>
<h1>Truck booking from ${esc(from)} to ${esc(to)}</h1>
<p class="lead">Need a truck from ${esc(from)} (${esc(a.state)}) to ${esc(to)} (${esc(b.state)})? Post one request on Fares24x7. Verified truck owners already heading to ${esc(to)} see it and accept it, so you get a truck faster and they avoid an empty trip.</p>
<div class="cta"><a class="btn" href="${SIGNUP}">Post a request: ${esc(from)} → ${esc(to)}</a><a class="btn light" href="${SIGNUP}">I own a truck on this route</a></div>

<h2>What moves on the ${esc(from)}–${esc(to)} route</h2>
<p>Businesses in ${esc(from)} commonly ship ${esc(list(a.goods))}. Loads heading back from ${esc(to)} often include ${esc(list(b.goods))}. That two-way demand is what makes return loads on this corridor work for truck owners.</p>

<h2>How to book a truck from ${esc(from)} to ${esc(to)}</h2>
<ol class="steps">
<li><strong>Post your load.</strong> Enter ${esc(from)} as pickup and ${esc(to)} as delivery, the goods, weight, truck type and pickup date. It takes under a minute.</li>
<li><strong>Get matched.</strong> Truck owners with an available truck near ${esc(from)} or heading to ${esc(to)} are alerted and review your request.</li>
<li><strong>Confirmed and tracked.</strong> The first owner to accept gets the trip. You see the truck, driver and contact, and follow it from Picked up to Delivered. The transporter needs your 4-digit delivery code to mark it delivered.</li>
</ol>

<h2>Truck types for ${esc(from)} to ${esc(to)}</h2>
<div class="grid">${VEHICLES.map(([name, text]) => `<div class="card"><strong>${esc(name)}</strong>${esc(text)}</div>`).join('')}</div>

<div class="band"><h2>Ship from ${esc(from)} to ${esc(to)} without brokers</h2><p>Direct contact with verified transporters, clear accept-or-decline answers, and live trip status.</p><a class="btn light" href="${SIGNUP}">Create a free account</a></div>

<h2>Frequently asked questions</h2>
${faqs.map(([q, ans]) => `<details><summary>${esc(q)}</summary><p>${esc(ans)}</p></details>`).join('\n')}

<h2>Related truck routes</h2>
<div class="routes">${[...(reverse ? [reverse] : []), ...related.filter((r) => r !== reverse)].slice(0, 8).map(([x, y]) => `<a href="/truck-booking/${slug(x, y)}">${esc(x)} → ${esc(y)}</a>`).join('')}<a href="/truck-booking">All routes</a></div>`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Truck routes', item: `${SITE}/truck-booking` },
        { '@type': 'ListItem', position: 3, name: `${from} to ${to}`, item: url(from, to) },
      ] },
      { '@type': 'Service', name: `Truck booking from ${from} to ${to}`, serviceType: 'Truck booking (FTL and part load)',
        provider: { '@type': 'Organization', name: 'Fares24x7', url: `${SITE}/` },
        areaServed: [{ '@type': 'City', name: from }, { '@type': 'City', name: to }], url: url(from, to), description },
      { '@type': 'FAQPage', mainEntity: faqs.map(([q, ans]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: ans } })) },
    ],
  };
  return page({ title, description, canonical: url(from, to), body, jsonld });
}

function hubPage() {
  const byOrigin = new Map();
  for (const route of ROUTES) { const list = byOrigin.get(route[0]) ?? []; list.push(route); byOrigin.set(route[0], list); }
  const title = 'Truck Booking Routes Across India | Return Loads | Fares24x7';
  const description = 'Book trucks on popular Indian freight routes: Ahmedabad, Mumbai, Delhi, Pune, Surat, Bengaluru, Chennai and more. Full truck and part load, verified transporters, no brokers.';
  const body = `
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › Truck routes</nav>
<h1>Truck booking routes across India</h1>
<p class="lead">Post a truck request on any route. These are popular corridors where Fares24x7 connects businesses with truck owners already heading that way, so empty return trips become paid trips.</p>
<div class="cta"><a class="btn" href="${SIGNUP}">Post a truck request</a><a class="btn light" href="${SIGNUP}">Find return loads for my truck</a></div>
${[...byOrigin.entries()].sort().map(([origin, routes]) => `<h2>From ${esc(origin)}</h2><div class="routes">${routes.map(([x, y]) => `<a href="/truck-booking/${slug(x, y)}">${esc(x)} → ${esc(y)}</a>`).join('')}</div>`).join('\n')}
<div class="band"><h2>Don't see your route?</h2><p>You can post a request between any two cities in India. Truck owners covering that route will see it.</p><a class="btn light" href="${SIGNUP}">Post any route</a></div>`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Truck routes', item: `${SITE}/truck-booking` },
      ] },
      { '@type': 'ItemList', name: 'Truck booking routes', itemListElement: ROUTES.map(([x, y], i) => ({ '@type': 'ListItem', position: i + 1, name: `${x} to ${y}`, url: url(x, y) })) },
    ],
  };
  return page({ title, description, canonical: `${SITE}/truck-booking`, body, jsonld });
}

function write(path, content) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content); }

write(join(OUT, 'truck-booking.html'), hubPage());
for (const route of ROUTES) write(join(OUT, 'truck-booking', `${slug(...route)}.html`), routePage(route));

const urls = [
  { loc: `${SITE}/`, priority: '1.0', alternates: [['en-IN', `${SITE}/`], ['hi-IN', `${SITE}/?lang=hi`], ['gu-IN', `${SITE}/?lang=gu`], ['x-default', `${SITE}/`]] },
  { loc: `${SITE}/truck-booking`, priority: '0.9' },
  ...ROUTES.map(([x, y]) => ({ loc: url(x, y), priority: '0.8' })),
  { loc: `${SITE}/privacy`, priority: '0.3' },
  { loc: `${SITE}/terms`, priority: '0.3' },
];
write(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${TODAY}</lastmod><priority>${u.priority}</priority>${(u.alternates ?? []).map(([lang, href]) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`).join('')}</url>`).join('\n')}
</urlset>
`);
console.log(`SEO: wrote ${ROUTES.length} route pages, hub page and sitemap.xml`);
