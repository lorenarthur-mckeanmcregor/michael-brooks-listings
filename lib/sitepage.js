// Draws the agent's open homes page in the website's own style.
// It takes the live website open homes page (https://mckeanmcgregor.com.au/openhomes?type=sale) as it is,
// with its header, banner, fonts, styles and footer, and swaps the list for the agent's own open homes,
// using the website's own markup for each one. Nothing is redrawn by hand, so it looks like the website.
// Changes made to the website page:
// - a <base> tag so the website's styles, scripts, images and links load from mckeanmcgregor.com.au
// - noindex, so search engines do not list this copy
// - the browser title and banner title name the agent
// - the For Sale / Rentals / Auctions search box is removed (it would show every agent's open homes)
// - the list shows only the agent's open homes, grouped by day; the page numbers are removed
// Returns '' if the website page is not in the expected shape, so the caller can fall back.

import { divAt } from './agentopenhomes.js';
import { SITE } from './agentlistings.js';

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildSitePage(shell, name, events, listingsUrl) {
  let html = String(shell || '');
  if (!html.includes('data-testid="event-block"') && !html.includes('id="inner-block-wrapper"')) return '';

  // 1. Head: base, noindex, title
  const head = html.match(/<head\b[^>]*>/i);
  if (!head) return '';
  html = html.replace(head[0], head[0] + `\n<base href="${SITE}/">\n<meta name="robots" content="noindex, nofollow">`);
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(name)} Open Homes | McKean McGregor</title>`);

  // 2. Banner title
  html = html.replace(/(<h1[^>]*role="text-banner-title"[^>]*>)[\s\S]*?(<\/h1>)/, `$1 ${esc(name)}'s Open Homes $2`);

  // 3. Remove the type search box
  const f = html.indexOf('<div x-data="{ open: false, selectedItem:');
  if (f > -1) { const box = divAt(html, f); if (box) html = html.slice(0, f) + html.slice(f + box.length); }

  // 4. Swap the list. Each day sits in an inner-block-wrapper div; the page numbers sit in one too.
  const wrappers = [];
  const re = /<div id="inner-block-wrapper"/g;
  let m;
  while ((m = re.exec(html))) {
    const div = divAt(html, m.index);
    if (div && (div.includes('data-testid="event-block"') || div.includes('data-testid="pagination"'))) wrappers.push({ at: m.index, div });
  }
  const sample = wrappers.find((w) => w.div.includes('data-testid="event-block"'));
  if (!sample) return '';
  const wrapOpen = sample.div.match(/^<div id="inner-block-wrapper"[^>]*>/)[0];
  const blockOpen = (sample.div.match(/<div data-testid="event-block"[^>]*>/) || [])[0];
  const h2Open = (sample.div.match(/<h2[^>]*role="text-open-home-day-title"[^>]*>/) || [])[0];
  if (!blockOpen || !h2Open) return '';

  let list = '';
  if (events.length) {
    const days = [];
    for (const e of events) {
      let d = days.find((x) => x.day === e.day);
      if (!d) { d = { day: e.day, rows: [] }; days.push(d); }
      d.rows.push(e.rowHtml);
    }
    list = days.map((d) => `${wrapOpen}\n${blockOpen}\n${h2Open}${esc(d.day)}</h2>\n${d.rows.join('\n')}\n</div>\n</div>`).join('\n');
  } else {
    list = `${wrapOpen}\n${blockOpen}\n${h2Open}${esc(name)} has no open homes booked right now.</h2>\n` +
      `<p class="v2-text-body"><a href="${esc(listingsUrl)}">View ${esc(name.split(' ')[0])}'s listings</a></p>\n</div>\n</div>`;
  }

  // Remove the old wrappers from last to first, then put the agent's list where the first one was.
  const first = wrappers[0].at;
  for (const w of wrappers.slice().reverse()) html = html.slice(0, w.at) + html.slice(w.at + w.div.length);
  html = html.slice(0, first) + list + html.slice(first);
  return html;
}
