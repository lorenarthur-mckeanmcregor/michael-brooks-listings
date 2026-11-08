// Stats number image: /api/agent-stat?a=EMAIL&s=total draws the agent's number of listings for sale,
// s=available draws the listings that are available now (all listings less the ones marked Under Offer / under contract),
// s=suburbs draws the number of different suburbs across those listings. These are read live from the agent's listings page.
// s=openhomes draws the agent's number of upcoming open homes, read live from https://mckeanmcgregor.com.au/openhomes?type=sale (0 is shown as 0).
// Unknown email, unknown s, or nothing to show: a 1040 x 1 transparent image.
import { ImageResponse } from '@vercel/og';
import { getAgentListings } from '../lib/agentlistings.js';
import { getAgentOpenHomesCount } from '../lib/agentopenhomes.js';
import { statElement, STAT_WIDTH, STAT_HEIGHT } from '../lib/agentcard.js';
import { statFonts } from '../lib/assets.js';

export const config = { runtime: 'edge' };

const BLANK = 'iVBORw0KGgoAAAANSUhEUgAABBAAAAABCAYAAABnoF3dAAAAG0lEQVR42u3BgQAAAADDoPlTH+ECVQEAAAAcAxBBAAFEa7aUAAAAAElFTkSuQmCC'; // 1040 wide, 1 pixel tall, transparent
const CACHE = 'public, max-age=300, s-maxage=300, stale-while-revalidate=600';

function blank() {
  const bin = atob(BLANK);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Response(bytes, { headers: { 'content-type': 'image/png', 'cache-control': CACHE } });
}

// "16 Bettalan Court, SPRING GULLY VIC 3550" -> "SPRING GULLY"
export function suburbOf(address) {
  const m = String(address).match(/,\s*([^,]+?)\s+(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s+\d{4}$/);
  return m ? m[1].trim().toUpperCase() : '';
}

export default async function handler(req) {
  const q = new URL(req.url).searchParams;
  const s = q.get('s');
  let value = null;
  try {
    if (s === 'openhomes') {
      const n = await getAgentOpenHomesCount(q.get('a'));
      if (n !== null) value = n;
    } else {
      const r = await getAgentListings(q.get('a'));
      if (r && s === 'total' && r.total > 0) value = r.total;
      if (r && s === 'available') { const n = r.items.filter((x) => !x.underContract).length; if (n > 0) value = n; }
      if (r && s === 'suburbs') { const n = new Set(r.items.map((x) => suburbOf(x.address)).filter(Boolean)).size; if (n > 0) value = n; }
    }
  } catch (_) { value = null; }
  if (value === null) return blank();
  return new ImageResponse(statElement(value), {
    width: STAT_WIDTH, height: STAT_HEIGHT, fonts: await statFonts(),
    headers: { 'cache-control': CACHE },
  });
}
