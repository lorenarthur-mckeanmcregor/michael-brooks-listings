// Draws one agent listing card and the count line, in the same style as lib/card.js (open homes).
// Cards are drawn at 1040 wide and shown at 520 in the email so they stay sharp on phones.
// No open time. An "UNDER CONTRACT" label shows where it applies. This repository does not share files with the open homes service.

const C = { black: '#000000', text: '#1A1A1A', text2: '#333333', yellow: '#f5a623', white: '#ffffff' };
export const AGENT_CARD_WIDTH = 1040;
export const AGENT_CARD_HEIGHT = 1240;
export const COUNT_HEIGHT = 100;
export const MAX_SHOWN = 6;
export const LISTING_WORD = 'current'; // wording used in the count line: "my 28 current listings"

const h = (type, style, children) => ({ type, props: { style, children } });

export function agentCardElement(item, photoDataUrl) {
  const W = AGENT_CARD_WIDTH;
  const blocks = [];
  if (photoDataUrl) {
    blocks.push({ type: 'img', props: { src: photoDataUrl, width: W, height: 780, style: { width: W, height: 780, objectFit: 'cover' } } });
  } else {
    blocks.push(h('div', { width: W, height: 780, background: '#F3F2F2', display: 'flex' }, []));
  }
  const text = [];
  if (item.underContract) {
    text.push(h('div', { display: 'flex', fontFamily: 'Montserrat', fontWeight: 600, fontSize: 26, letterSpacing: 2, color: C.yellow, marginBottom: 14 }, 'UNDER CONTRACT'));
  }
  if (item.price) text.push(h('div', { display: 'flex', fontFamily: 'Montserrat', fontWeight: 600, fontSize: 34, color: C.black }, item.price));
  text.push(h('div', { display: 'flex', marginTop: 14, fontFamily: 'Montserrat', fontWeight: 400, fontSize: 44, lineHeight: 1.3, color: C.text }, item.address));
  const specs = (item.specs || []).concat(item.land ? [item.land] : []);
  if (specs.length) {
    text.push(h('div', { display: 'flex', flexWrap: 'wrap', marginTop: 18, fontFamily: 'Open Sans', fontSize: 30, color: C.text2 },
      specs.map((s) => h('span', { marginRight: 34 }, s))));
  }
  text.push(h('div', { display: 'flex', justifyContent: 'center', width: '100%', marginTop: 36 }, [ // View property button, centred (v10)
    h('div', { display: 'flex', background: C.black, color: C.white, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 30, padding: '28px 80px' }, 'View property'),
  ]));
  blocks.push(h('div', { display: 'flex', flexDirection: 'column', paddingTop: 36 }, text));
  return h('div', { display: 'flex', flexDirection: 'column', width: W, height: AGENT_CARD_HEIGHT, background: C.white }, blocks);
}

// "Featuring 6 of my 28 current listings" / "Featuring my 4 current listings". Transparent background.
export function countText(total) {
  if (!total || total < 1) return '';
  const word = LISTING_WORD + (total === 1 ? ' listing' : ' listings');
  return total > MAX_SHOWN ? `Featuring ${MAX_SHOWN} of my ${total} ${word}` : `Featuring my ${total} ${word}`;
}

export function countElement(total) {
  const text = countText(total);
  return h('div', { display: 'flex', alignItems: 'center', width: AGENT_CARD_WIDTH, height: COUNT_HEIGHT, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 40, color: C.text }, text);
}

// Stats numbers (for example 28 for sale now, 12 suburbs). Drawn at twice the email size: 346 x 80, shown at 173 x 40.
export const STAT_WIDTH = 346;
export const STAT_HEIGHT = 80;
export function statElement(text) {
  return h('div', { display: 'flex', alignItems: 'center', justifyContent: 'center', width: STAT_WIDTH, height: STAT_HEIGHT, fontFamily: 'StatSerif', fontWeight: 400, fontSize: 64, color: '#282829' }, String(text));
}

// Agent title line, for example "Licensed Estate Agent": italic, #414042, 17px in the email (drawn at 2x).
export const TITLE_WIDTH = 1040;
export const TITLE_HEIGHT = 50;
export function titleElement(text) {
  return h('div', { display: 'flex', alignItems: 'center', justifyContent: 'center', width: TITLE_WIDTH, height: TITLE_HEIGHT, fontFamily: 'StatSerif', fontStyle: 'italic', fontWeight: 400, fontSize: 34, color: '#414042' }, String(text));
}
