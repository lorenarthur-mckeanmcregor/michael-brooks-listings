const fontCache = {};

async function googleFont(family, weight, italic = false) {
  const key = family + weight + (italic ? 'i' : '');
  if (fontCache[key]) return fontCache[key];
  const axis = italic ? `:ital,wght@1,${weight}` : `:wght@${weight}`;
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}${axis}`)).text();
  const url = (css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/) || [])[1];
  if (!url) throw new Error('Font not found: ' + family + ' ' + weight);
  fontCache[key] = await (await fetch(url)).arrayBuffer();
  return fontCache[key];
}

export async function cardFonts() {
  const [m400, m600, o400] = await Promise.all([
    googleFont('Montserrat', 400), googleFont('Montserrat', 600), googleFont('Open Sans', 400),
  ]);
  return [
    { name: 'Montserrat', data: m400, weight: 400, style: 'normal' },
    { name: 'Montserrat', data: m600, weight: 600, style: 'normal' },
    { name: 'Open Sans', data: o400, weight: 400, style: 'normal' },
  ];
}

function toDataUrl(buf, type) {
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return `data:${type};base64,${btoa(bin)}`;
}

export async function photoDataUrl(src) {
  if (!src) return null;
  const tries = [src.replace(/\.jpg$/i, '_800x600.jpg'), src];
  for (const u of tries) {
    try {
      const r = await fetch(u);
      if (r.ok && (r.headers.get('content-type') || '').startsWith('image/')) return toDataUrl(await r.arrayBuffer(), r.headers.get('content-type'));
    } catch (_) {}
  }
  return null;
}

// Serif for the stats numbers and the agent title.
// The email's font list is Calluna, Georgia, Times New Roman. Calluna is not available, so readers see Georgia.
// Gelasio is the free Google Fonts match for Georgia (same shapes and spacing), loaded from Google Fonts like the website's own fonts.
export const STAT_FONT_FAMILY = 'Gelasio';
export async function statFonts() {
  return [{ name: 'StatSerif', data: await googleFont(STAT_FONT_FAMILY, 400), weight: 400, style: 'normal' }];
}
export async function titleFonts() {
  return [{ name: 'StatSerif', data: await googleFont(STAT_FONT_FAMILY, 400, true), weight: 400, style: 'italic' }];
}
