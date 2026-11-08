// Reads an agent's live listings on the McKean McGregor website and returns them in page order.
// Reads the public listings page only, no Rex API key.

import { slugForEmail } from './agents.js';

export const SITE = 'https://mckeanmcgregor.com.au';
const CACHE_MS = 5 * 60 * 1000; // keep a copy for 5 minutes, like the open homes reader
const MAX_PAGES = 10;           // safety stop

const cache = new Map(); // slug -> { at, data }

const decode = (s) => String(s || '')
  .replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();
const strip = (s) => decode(String(s || '').replace(/<[^>]*>/g, ' '));
const abs = (u) => !u ? '' : u.startsWith('//') ? 'https:' + u : u.startsWith('/') ? SITE + u : u;

export function agentPageUrl(slug, page = 1) {
  return SITE + '/listings?agent=' + encodeURIComponent(slug) +
    '&saleOrRental=Sale&sortby=dateListed-desc&status=available_under_contract' +
    (page > 1 ? '&page=' + page : '');
}

// Land: m2 as a whole number with a comma, ha and ac to 2 decimals
function landText(t) {
  const m = String(t).match(/^([\d.,]+)\s*(m²|m2|ha|ac)/i);
  if (!m) return t;
  const n = parseFloat(m[1].replace(/,/g, ''));
  const u = m[2].toLowerCase();
  if (u === 'm²' || u === 'm2') return Math.round(n).toLocaleString('en-AU') + ' m²';
  return (Math.round(n * 100) / 100).toFixed(2) + ' ' + u;
}

// Address: "16 Bettalan Court, Spring Gully VIC 3550" -> "16 Bettalan Court, SPRING GULLY VIC 3550"
function addressText(full) {
  const am = full.match(/^(.*),\s*(.+?)\s+(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s+(\d{4})$/);
  return am ? `${am[1]}, ${am[2].toUpperCase()} ${am[3]} ${am[4]}` : full;
}

// Reads one page of HTML. Returns { total, items } where total is the page's own "Found N results".
export function parseAgentPage(html) {
  const tm = html.match(/Found\s+([\d,]+)\s+results?/i);
  const total = tm ? parseInt(tm[1].replace(/,/g, ''), 10) : null;
  const items = [];
  const cards = html.split('<div class="v2-flex v2-flex-col v2-relative v2-gap-y-3">').slice(1);
  for (const card of cards) {
    const href = (card.match(/href="(\/listings\/[^"]+)"/) || [])[1] || '';
    const img = (card.match(/\ssrc=['"]((?:https:)?\/\/au-crm[^'"]+)['"]/) || [])[1] || '';
    const addrM = card.match(/<h4[^>]*>([\s\S]*?)<\/h4>/);
    const full = addrM ? strip(addrM[1]) : '';
    const priceM = card.match(/<strong[^>]*v2-text-primary-500[^>]*>([\s\S]*?)<\/strong>/);
    const price = priceM ? strip(priceM[1]) : '';
    const chipM = card.match(/role="listing-status"[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/);
    const tag = chipM ? strip(chipM[1]) : '';
    // specs: each has its own icon; the number sits in the next <p>
    const ICONS = [['d="M0 4.38462', 'Bed'], ['d="M5.33334 6', 'Bath'], ['d="M1 10.0356', 'Car']];
    const specs = [];
    for (const [d, label] of ICONS) {
      const i = card.indexOf(d);
      if (i > -1) {
        const v = card.slice(i).match(/<p[^>]*>([^<]+)<\/p>/);
        if (v) specs.push(decode(v[1]).replace(/\s*(Bed|Bath|Car)s?$/i, '') + ' ' + label);
      }
    }
    const landM = card.match(/title="Land Area"[\s\S]*?<p[^>]*>([^<]+)<\/p>/);
    const land = landM ? landText(decode(landM[1])) : '';
    if (!href || !full) continue;
    items.push({
      url: abs(href), img: abs(img), price, address: addressText(full),
      specs, land, tag,
      underContract: /under\s*(offer|contract)/i.test(tag),
    });
  }
  return { total, items };
}

async function fetchPage(slug, page) {
  const res = await fetch(agentPageUrl(slug, page), { headers: { 'user-agent': 'McKeanMcGregor-EmailCards/1.0' } });
  if (!res.ok) throw new Error('Listings page returned ' + res.status);
  return parseAgentPage(await res.text());
}

// Reads every page for the agent's slug. total comes from the page itself, never typed in.
export async function getAgentListingsBySlug(slug) {
  const hit = cache.get(slug);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  try {
    const first = await fetchPage(slug, 1);
    const perPage = first.items.length || 12;
    const total = first.total ?? first.items.length;
    const pages = Math.min(MAX_PAGES, Math.ceil(total / perPage));
    const rest = [];
    for (let p = 2; p <= pages; p++) rest.push(fetchPage(slug, p));
    const more = await Promise.all(rest);
    const items = first.items.concat(...more.map((m) => m.items));
    const data = { slug, total, items };
    cache.set(slug, { at: Date.now(), data });
    return data;
  } catch (err) {
    if (hit) return hit.data; // serve the last good copy if the site is down
    throw err;
  }
}

// Main entry: sender's email in, their listings out. Unknown email returns null.
export async function getAgentListings(email) {
  const slug = slugForEmail(email);
  if (!slug) return null;
  return getAgentListingsBySlug(slug);
}
