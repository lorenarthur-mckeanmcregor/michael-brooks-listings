// Agent title image: /api/agent-title?a=EMAIL draws the job title from the agent's staff page
// (for example "Licensed Estate Agent"), italic, centred, transparent background.
// Unknown email or no title found: a 1040 x 1 transparent image.
import { ImageResponse } from '@vercel/og';
import { getStaff } from '../lib/staff.js';
import { titleElement, TITLE_WIDTH, TITLE_HEIGHT } from '../lib/agentcard.js';
import { titleFonts } from '../lib/assets.js';

export const config = { runtime: 'edge' };

const BLANK = 'iVBORw0KGgoAAAANSUhEUgAABBAAAAABCAYAAABnoF3dAAAAG0lEQVR42u3BgQAAAADDoPlTH+ECVQEAAAAcAxBBAAFEa7aUAAAAAElFTkSuQmCC'; // 1040 wide, 1 pixel tall, transparent
const CACHE = 'public, max-age=300, s-maxage=300, stale-while-revalidate=600';

function blank() {
  const bin = atob(BLANK);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Response(bytes, { headers: { 'content-type': 'image/png', 'cache-control': CACHE } });
}

export default async function handler(req) {
  const q = new URL(req.url).searchParams;
  let title = '';
  try {
    const s = await getStaff(q.get('a'));
    title = s && s.title ? s.title : '';
  } catch (_) { title = ''; }
  if (!title) return blank();
  return new ImageResponse(titleElement(title), {
    width: TITLE_WIDTH, height: TITLE_HEIGHT, fonts: await titleFonts(),
    headers: { 'cache-control': CACHE },
  });
}
