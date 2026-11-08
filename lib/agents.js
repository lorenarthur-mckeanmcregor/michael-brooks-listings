// This repository serves one agent only: Michael Brooks.
// Sender's Rex email -> the agent's filter slug on the McKean McGregor listings page.
// An email that is not listed here shows nothing and links to the main listings page.

export const AGENTS = {
  'michael@mckeanmcgregor.com.au': 'michael-brooks',
};

export function slugForEmail(email) {
  return AGENTS[String(email || '').trim().toLowerCase()] || '';
}

// Staff page slug for each email: https://mckeanmcgregor.com.au/staff/<slug> (used for the live job title).
export const STAFF = {
  'michael@mckeanmcgregor.com.au': 'michael-brooks',
};

export function staffSlugForEmail(email) {
  return STAFF[String(email || '').trim().toLowerCase()] || '';
}
