McKean McGregor agent listings card service
===========================================

What it does (Michael Brooks's own repository and Vercel project)
- /api/agent-card?a=EMAIL&n=1 ... n=6   Image of the agent's 1st to 6th listing, drawn in the website style.
                                        Empty slots return a 1040 by 1 transparent strip so they collapse.
- /api/agent-count?a=EMAIL              Image of the count line, for example "Featuring 6 of my 28 current listings".
- /api/agent-go?a=EMAIL&n=1 ... n=6     Sends the reader to that listing. Empty slot goes to the agent's listings page.
- /api/agent-go?a=EMAIL&n=all           Sends the reader to the agent's listings page.
- /api/agent-list?a=EMAIL               Plain text list for checking, starting with the total count.
- /api/agent-stat?a=EMAIL&s=total       Image of the total number of current listings, including under contract.
- /api/agent-stat?a=EMAIL&s=available   Image of the number of available listings, not counting under contract (stats row, For sale now).
- /api/agent-stat?a=EMAIL&s=suburbs     Image of the number of different suburbs across those listings (stats row).
- /api/agent-stat?a=EMAIL&s=openhomes   Image of the agent's number of upcoming open homes, read from
                                        https://mckeanmcgregor.com.au/openhomes?type=sale (stats row, Open homes). Reads every page.
- /api/agent-openhomes?a=EMAIL          The website's own open homes page (same header, banner, styles and footer) showing
                                        only the agent's upcoming open homes, grouped by day, each linking to its listing
                                        (v9, built by lib/sitepage.js). Not listed by search engines (noindex). The website's open homes page has no agent filter, so this page
                                        picks the agent's open homes out of every page of
                                        https://mckeanmcgregor.com.au/openhomes?type=sale . The Open homes stat links here.
- /api/agent-title?a=EMAIL              Image of the agent's job title, read from their staff page
                                        (https://mckeanmcgregor.com.au/staff/michael-brooks), for example "Sales Consultant".

Fonts: stats and title use Gelasio from Google Fonts, the free match for Georgia. The email's font list is
Calluna, Georgia, Times New Roman; Calluna is not available, so readers see Georgia, and the images match it.

It reads the public listings page, the public open homes page and the agent's public staff page only. No Rex login or API key is used or stored.
It keeps a copy of each agent's pages for 5 minutes.
This repository serves one agent only: Michael Brooks (see lib/agents.js). An email that is not listed there shows nothing
and links to https://mckeanmcgregor.com.au/listings

This is its own repository and its own Vercel project. It does not share files with the open homes service.

Deploy
1. GitHub: New repository, upload the api folder (7 files), the lib folder (7 files), package.json and this README, commit.
2. Vercel: Add New, Project, pick the repository, Deploy. Leave every setting as it is.
3. Send the Vercel address to Claude to put into the Rex agent template.
