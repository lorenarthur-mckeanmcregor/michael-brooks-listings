// Reads the agent's public staff page on the McKean McGregor website, for example
// https://mckeanmcgregor.com.au/staff/bec-allen , and returns the job title shown there.
// Public page only, no Rex login or key. Keeps a 5 minute copy.

import { staffSlugForEmail } from './agents.js';
import { SITE } from './agentlistings.js';

const CACHE_MS = 5 * 60 * 1000;
const cache = new Map(); // slug -> { at, data }

const decode = (s) => String(s || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();

// Title sits in: <h2 ... role="text-staff-position">Licensed Estate Agent</h2>
export function parseStaffPage(html) {
  const t = html.match(/role="text-staff-position"[^>]*>([\s\S]*?)<\/h\d>/i);
  const n = html.match(/role="text-staff-name"[^>]*>([\s\S]*?)<\/h\d>/i);
  return { title: t ? decode(t[1]) : '', name: n ? decode(n[1]) : '' };
}

export async function getStaff(email) {
  const slug = staffSlugForEmail(email);
  if (!slug) return null;
  const hit = cache.get(slug);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  try {
    const res = await fetch(SITE + '/staff/' + slug, { headers: { 'user-agent': 'McKeanMcGregor-EmailCards/1.0' } });
    if (!res.ok) throw new Error('Staff page returned ' + res.status);
    const data = parseStaffPage(await res.text());
    cache.set(slug, { at: Date.now(), data });
    return data;
  } catch (err) {
    if (hit) return hit.data; // last good copy if the site is down
    throw err;
  }
}
