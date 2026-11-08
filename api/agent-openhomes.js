// Agent's own open homes page: /api/agent-openhomes?a=EMAIL
// It is the website's own open homes page (same header, banner, styles and footer) showing only this agent's
// open homes, built by lib/sitepage.js. If the website page is not in the expected shape, a plain page is shown instead.
// The website's open homes page has no agent filter, so this page shows only the agent's upcoming open homes,
// read live from https://mckeanmcgregor.com.au/openhomes?type=sale (every page). Each one links to its listing on the website.
// No open homes: says so and links to the agent's listings page.
// An email that is not in the agent list, or the website not answering, goes to the full open homes page.
import { getAgentOpenHomes, OPEN_HOMES_PAGE } from '../lib/agentopenhomes.js';
import { getStaff } from '../lib/staff.js';
import { slugForEmail } from '../lib/agents.js';
import { SITE } from '../lib/agentlistings.js';
import { buildSitePage } from '../lib/sitepage.js';

export const config = { runtime: 'edge' };

const CACHE = 'public, max-age=300, s-maxage=300, stale-while-revalidate=600';
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Same agent listings link Loren uses: all listings for this agent, newest first.
const listingsLink = (slug) => SITE + '/listings?status=all&saleOrRental=any&sortby=dateListed-desc&agent=' + encodeURIComponent(slug);

function nameFromSlug(slug) {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function card(e) {
  const facts = e.specs.concat(e.land ? [e.land] : []).map(esc).join('<span class="dot">&middot;</span>');
  return `
    <a class="card" href="${esc(e.url)}">
      ${e.img ? `<img src="${esc(e.img)}" alt="${esc(e.address)}" loading="lazy">` : '<div class="noimg"></div>'}
      <div class="body">
        ${e.time ? `<p class="time">${esc(e.time)}</p>` : ''}
        <p class="addr">${esc(e.address)}</p>
        ${e.price ? `<p class="price">${esc(e.price)}</p>` : ''}
        ${facts ? `<p class="facts">${facts}</p>` : ''}
        <span class="btn">View property</span>
      </div>
    </a>`;
}

function page(name, slug, events) {
  const days = [];
  for (const e of events) {
    let d = days.find((x) => x.day === e.day);
    if (!d) { d = { day: e.day, items: [] }; days.push(d); }
    d.items.push(e);
  }
  const body = events.length
    ? days.map((d) => `<h2>${esc(d.day)}</h2>${d.items.map(card).join('')}`).join('')
    : `<p class="none">${esc(name)} has no open homes booked right now.</p>`;
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)} | Upcoming open homes | McKean McGregor</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&family=Open+Sans:wght@400&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#F3F2F2;color:#1A1A1A;font-family:'Open Sans',Arial,sans-serif}
  .wrap{max-width:760px;margin:0 auto;padding:32px 16px 48px}
  h1{font-family:'Montserrat',Arial,sans-serif;font-weight:600;font-size:28px;margin:0 0 4px;color:#000}
  .sub{font-family:'Montserrat',Arial,sans-serif;font-size:16px;margin:0 0 28px;color:#333}
  h2{font-family:'Montserrat',Arial,sans-serif;font-weight:600;font-size:18px;margin:28px 0 12px;color:#000}
  .card{display:flex;gap:0;background:#fff;color:inherit;text-decoration:none;margin:0 0 16px;overflow:hidden}
  .card img,.card .noimg{width:42%;min-height:200px;object-fit:cover;background:#e6e5e5;flex-shrink:0}
  .body{padding:20px 22px;display:flex;flex-direction:column;gap:6px}
  .body p{margin:0}
  .time{font-family:'Montserrat',Arial,sans-serif;font-weight:600;font-size:14px;letter-spacing:1px;color:#f5a623}
  .addr{font-family:'Montserrat',Arial,sans-serif;font-size:19px;line-height:1.3}
  .price{font-family:'Montserrat',Arial,sans-serif;font-weight:600;font-size:16px;color:#000}
  .facts{font-size:14px;color:#333}
  .dot{margin:0 6px}
  .btn{align-self:flex-start;margin-top:10px;background:#000;color:#fff;font-family:'Montserrat',Arial,sans-serif;font-weight:600;font-size:14px;padding:12px 28px}
  .none{background:#fff;padding:24px;font-size:16px;margin:0}
  .more{margin-top:28px;display:flex;flex-wrap:wrap;gap:12px}
  .more a{font-family:'Montserrat',Arial,sans-serif;font-weight:600;font-size:14px;color:#000;border:1px solid #000;padding:12px 20px;text-decoration:none}
  @media (max-width:600px){.card{flex-direction:column}.card img,.card .noimg{width:100%;height:220px}}
</style>
</head><body><div class="wrap">
<h1>Upcoming open homes</h1>
<p class="sub">${esc(name)}</p>
${body}
<div class="more">
  <a href="${esc(listingsLink(slug))}">All of ${esc(name.split(' ')[0])}'s listings</a>
  <a href="${esc(OPEN_HOMES_PAGE)}">All McKean McGregor open homes</a>
</div>
</div></body></html>`;
}

export default async function handler(req) {
  const email = new URL(req.url).searchParams.get('a');
  const slug = slugForEmail(email);
  if (!slug) return Response.redirect(OPEN_HOMES_PAGE, 302);
  let r;
  try { r = await getAgentOpenHomes(email); } catch (_) { r = null; }
  if (!r) return Response.redirect(OPEN_HOMES_PAGE, 302);
  let name = '';
  try { const s = await getStaff(email); name = (s && s.name) || ''; } catch (_) {}
  if (!name) name = nameFromSlug(slug);
  let html = '';
  if (r.events.every((e) => e.rowHtml)) {
    try { html = buildSitePage(r.shell, name, r.events, listingsLink(slug)); } catch (_) { html = ''; }
  }
  if (!html) html = page(name, slug, r.events); // plain fallback
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': CACHE },
  });
}
