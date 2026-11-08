// Agent link: /api/agent-go?a=EMAIL&n=1 sends the reader to the agent's 1st listing (n=1 to 6).
// n=all, an empty slot, or anything unexpected goes to the agent's listings page.
// An email that is not in the agent list goes to the main listings page.
import { getAgentListings, agentPageUrl, SITE } from '../lib/agentlistings.js';
import { slugForEmail } from '../lib/agents.js';
import { MAX_SHOWN } from '../lib/agentcard.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const q = new URL(req.url).searchParams;
  const slug = slugForEmail(q.get('a'));
  let target = SITE + '/listings';
  if (slug) {
    target = agentPageUrl(slug);
    const n = parseInt(q.get('n') || '', 10);
    if (n >= 1 && n <= MAX_SHOWN) {
      try { const r = await getAgentListings(q.get('a')); const item = r && r.items[n - 1]; if (item && item.url) target = item.url; } catch (_) {}
    }
  }
  return new Response(null, { status: 302, headers: { location: target, 'cache-control': 'no-store' } });
}
