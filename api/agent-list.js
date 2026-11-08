// Check page: /api/agent-list?a=EMAIL shows what the service currently reads for that agent, as plain text.
import { getAgentListings } from '../lib/agentlistings.js';
import { slugForEmail } from '../lib/agents.js';
import { MAX_SHOWN } from '../lib/agentcard.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const email = new URL(req.url).searchParams.get('a');
  let body;
  try {
    const slug = slugForEmail(email);
    if (!slug) body = 'That email is not in the agent list.';
    else {
      const r = await getAgentListings(email);
      const lines = r.items.map((x, i) =>
        `${i + 1}${i < MAX_SHOWN ? '*' : ' '} ${x.address} | ${x.price} | ${x.specs.concat(x.land ? [x.land] : []).join(', ')}${x.underContract ? ' | UNDER CONTRACT' : ''}`);
      body = `Agent: ${slug}\nTotal listings: ${r.total}\nRead from page: ${r.items.length}\n(* = shown in the email)\n\n` + lines.join('\n');
    }
  } catch (err) { body = 'Could not read the listings page: ' + err.message; }
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
}
