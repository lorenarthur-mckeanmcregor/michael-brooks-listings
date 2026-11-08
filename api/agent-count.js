// Count line image: /api/agent-count?a=EMAIL draws "Featuring 6 of my 28 current listings"
// (or "Featuring my 4 current listings" when the agent has 6 or fewer). The total is read live from the agent's listings page.
// Unknown email or no listings: a 1 pixel transparent image.
import { ImageResponse } from '@vercel/og';
import { getAgentListings } from '../lib/agentlistings.js';
import { countElement, countText, AGENT_CARD_WIDTH, COUNT_HEIGHT } from '../lib/agentcard.js';
import { cardFonts } from '../lib/assets.js';

export const config = { runtime: 'edge' };

const BLANK = 'iVBORw0KGgoAAAANSUhEUgAABBAAAAABCAYAAABnoF3dAAAAG0lEQVR42u3BgQAAAADDoPlTH+ECVQEAAAAcAxBBAAFEa7aUAAAAAElFTkSuQmCC'; // 1040 wide, 1 pixel tall, transparent: shown at 520 wide it is half a pixel tall, so the slot collapses
const CACHE = 'public, max-age=300, s-maxage=300, stale-while-revalidate=600';

function blank() {
  const bin = atob(BLANK);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Response(bytes, { headers: { 'content-type': 'image/png', 'cache-control': CACHE } });
}

export default async function handler(req) {
  let total = 0;
  try { const r = await getAgentListings(new URL(req.url).searchParams.get('a')); total = r ? r.total : 0; } catch (_) { total = 0; }
  if (!countText(total)) return blank();
  const fonts = (await cardFonts()).filter((f) => f.name === 'Montserrat');
  return new ImageResponse(countElement(total), {
    width: AGENT_CARD_WIDTH, height: COUNT_HEIGHT, fonts,
    headers: { 'cache-control': CACHE },
  });
}
