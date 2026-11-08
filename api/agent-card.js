// Agent card image: /api/agent-card?a=EMAIL&n=1 draws the agent's 1st listing, n=2 the 2nd ... up to n=6.
// Empty slot, unknown email, or n above 6: a 1 pixel transparent image, so the email shows nothing there.
import { ImageResponse } from '@vercel/og';
import { getAgentListings } from '../lib/agentlistings.js';
import { agentCardElement, AGENT_CARD_WIDTH, AGENT_CARD_HEIGHT, MAX_SHOWN } from '../lib/agentcard.js';
import { cardFonts, photoDataUrl } from '../lib/assets.js';

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
  const q = new URL(req.url).searchParams;
  const n = parseInt(q.get('n') || '1', 10);
  if (!(n >= 1 && n <= MAX_SHOWN)) return blank();
  let item = null;
  try { const r = await getAgentListings(q.get('a')); item = r ? r.items[n - 1] || null : null; } catch (_) { item = null; }
  if (!item) return blank();
  const [fonts, photo] = await Promise.all([cardFonts(), photoDataUrl(item.img)]);
  return new ImageResponse(agentCardElement(item, photo), {
    width: AGENT_CARD_WIDTH, height: AGENT_CARD_HEIGHT, fonts,
    headers: { 'cache-control': CACHE },
  });
}
