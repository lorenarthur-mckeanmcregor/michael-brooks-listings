// Reads the public open homes page, https://mckeanmcgregor.com.au/openhomes?type=sale , every page of it
// (it follows the page's own "Next" link: ?type=sale&page=2 and on), and returns each open home time.
// The website has no agent filter on this page, so the agent's own open homes are picked out here:
// an open home belongs to the agent when their staff page link (/staff/<slug>) is in its agent section.
// Public page only, no Rex login or key. Keeps a 5 minute copy. Not shared with the open homes service.

import { staffSlugForEmail } from './agents.js';
import { SITE } from './agentlistings.js';

export const OPEN_HOMES_PAGE = SITE + '/openhomes?type=sale';
const CACHE_MS = 5 * 60 * 1000;
const MAX_PAGES = 10; // safety stop
let cache = { at: 0, events: null, shell: '' };

// Returns the whole <div ...> ... </div> that starts at index i, counting nested divs.
export function divAt(html, i) {
  const re = /<div\b|<\/div>/gi;
  re.lastIndex = i;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    depth += m[0].charAt(1) === '/' ? -1 : 1;
    if (depth === 0) return html.slice(i, re.lastIndex);
  }
  return '';
}

// One open home on the website is a row div with the classes "md:v2-flex-row v2-flex-nowrap".
// at is the position of its listing image; the row is the last such div that opens before it.
function rowMarkup(block, at) {
  const before = block.slice(0, at);
  const re = /<div class="[^"]*md:v2-flex-row v2-flex-nowrap[^"]*">/g;
  let start = -1, m;
  while ((m = re.exec(before))) start = m.index;
  return start > -1 ? divAt(block, start) : '';
}

const decode = (s) => String(s || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();
const abs = (u) => { u = decode(u); return !u ? '' : u.startsWith('//') ? 'https:' + u : u.startsWith('/') ? SITE + u : u; };

// Land: m2 as a whole number with a comma, ha and ac to 2 decimals (same as the listings cards)
function landText(t) {
  const m = String(t).match(/^([\d.,]+)\s*(m²|m2|ha|ac)/i);
  if (!m) return t;
  const n = parseFloat(m[1].replace(/,/g, ''));
  const u = m[2].toLowerCase();
  if (u === 'm²' || u === 'm2') return Math.round(n).toLocaleString('en-AU') + ' m²';
  return (Math.round(n * 100) / 100).toFixed(2) + ' ' + u;
}

// Reads one page of HTML. Returns { events, next }.
// Each day sits in its own event block with the day title, for example "Saturday, 7th November".
// Each open home starts at data-testid="event-listing-image".
export function parseOpenHomesPage(html) {
  const events = [];
  const blocks = String(html).split('data-testid="event-block"').slice(1);
  for (const block of blocks) {
    const dayM = block.match(/role="text-open-home-day-title"[^>]*>([\s\S]*?)<\/h\d>/);
    const day = dayM ? decode(dayM[1]) : '';
    const parts = block.split('data-testid="event-listing-image"');
    const rows = parts.slice(1);
    for (let k = 0; k < rows.length; k++) {
      const row = rows[k];
      // The website's own markup for this open home, used to draw the agent's page in the website style
      const rowHtml = rowMarkup(block, parts.slice(0, k + 1).join('data-testid="event-listing-image"').length);
      const href = (row.match(/^\s*href="([^"]+)"/) || [])[1] || '';
      const img = (row.match(/\ssrc=['"]((?:https:)?\/\/au-crm[^'"]+)['"]/) || [])[1] || '';
      const addrM = row.match(/data-testid="event-address"[\s\S]*?<h4[^>]*>([\s\S]*?)<\/h4>/);
      const address = addrM ? decode(addrM[1]) : '';
      // "Open Home" heading then its time, "Sale" heading then the price
      const info = {};
      const re = /data-testid="event-text-heading"[^>]*>([\s\S]*?)<\/p>\s*<p[^>]*data-testid="event-text-content"[^>]*>([\s\S]*?)<\/p>/g;
      let m;
      while ((m = re.exec(row))) info[decode(m[1]).toLowerCase()] = decode(m[2]);
      const ICONS = [['d="M0 4.38462', 'Bed'], ['d="M5.33334 6', 'Bath'], ['d="M1 10.0356', 'Car']];
      const specs = [];
      const specArea = row.split('data-testid="event-text-heading"')[0];
      for (const [d, label] of ICONS) {
        const i = specArea.indexOf(d);
        if (i > -1) {
          const v = specArea.slice(i).match(/<p[^>]*>([^<]+)<\/p>/);
          if (v) specs.push(decode(v[1]) + ' ' + label);
        }
      }
      const landM = specArea.match(/title="Land Area"[\s\S]*?<p[^>]*>([^<]+)<\/p>/);
      const agentChunk = row.split('data-testid="event-agent"').slice(1).join(' ');
      const agents = [...new Set([...agentChunk.matchAll(/href="(?:https?:\/\/[^"\/]+)?\/staff\/([a-z0-9-]+)\/?"/gi)].map((x) => x[1].toLowerCase()))];
      if (!href || !address) continue;
      events.push({
        day, time: info['open home'] || '', price: info['sale'] || '',
        url: abs(href), img: abs(img), address, specs,
        land: landM ? landText(decode(landM[1])) : '', agents, rowHtml,
      });
    }
  }
  const nextM = String(html).match(/<a[^>]*href="([^"]+)"[^>]*rel="next"/) || String(html).match(/<a[^>]*rel="next"[^>]*href="([^"]+)"/);
  return { events, next: nextM ? abs(nextM[1]) : '' };
}

async function fetchPage(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'McKeanMcGregor-EmailCards/1.0' } });
  if (!res.ok) throw new Error('Open homes page returned ' + res.status);
  const html = await res.text();
  return { ...parseOpenHomesPage(html), html };
}

// The website's first open homes page, as last read (used as the frame for the agent's page).
export function openHomesShell() { return cache.shell || ''; }

// Every open home time on every page, in page order.
export async function getAllOpenHomes() {
  if (cache.events && Date.now() - cache.at < CACHE_MS) return cache.events;
  try {
    let url = OPEN_HOMES_PAGE;
    const seen = new Set();
    const events = [];
    let firstHtml = '';
    for (let p = 0; p < MAX_PAGES && url && !seen.has(url); p++) {
      seen.add(url);
      const r = await fetchPage(url);
      if (!firstHtml) firstHtml = r.html;
      events.push(...r.events);
      url = r.next;
    }
    cache = { at: Date.now(), events, shell: firstHtml };
    return events;
  } catch (err) {
    if (cache.events) return cache.events; // last good copy if the site is down
    throw err;
  }
}

// Main entry: sender's email in, { slug, events } out (only the agent's own open homes). Unknown email returns null.
export async function getAgentOpenHomes(email) {
  const slug = staffSlugForEmail(email);
  if (!slug) return null;
  const all = await getAllOpenHomes();
  return { slug, events: all.filter((e) => e.agents.includes(slug)), shell: openHomesShell() };
}

// Number of upcoming open homes for the stats row. Unknown email returns null.
export async function getAgentOpenHomesCount(email) {
  const r = await getAgentOpenHomes(email);
  return r ? r.events.length : null;
}
