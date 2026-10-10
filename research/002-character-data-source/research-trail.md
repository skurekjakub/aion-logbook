# Research trail — 002 character data source

The endpoints were found by measurement first (the official page's network log and its script bundle, `evidence/02-browser/`, `evidence/04-site-js/`); the web rounds below looked for documentation, community use and the terms that govern it.

## Round 1 — 2026-10-10

| Query | What came back |
|---|---|
| `aion2.plaync.com api character info characterId serverId` | Nothing on Aion 2; PlayFab and other games' character APIs. |
| `AION 2 official character search API open API NCSOFT developers` | No NCSOFT developer API in the results (the search missed NC's developer center; see round 4); metabot.gg's armory, which says it reads the official site's public data. |
| `aion2 armory character lookup github api-search.plaync.com` | No repo or doc names the endpoints; metabot.gg again. |

Synthesis: the endpoints are undocumented. The only public trace is fan armories that say they read the official data. Next: does any Korean source document them, and what do NC's terms say about automated reads.

## Round 2 — 2026-10-10

| Query | What came back |
|---|---|
| `아이온2 캐릭터 정보 api character/equipment plaync 조회 사이트` | Korean game news only; no API documentation or lookup tool named. |
| `아이온2 공식 홈페이지 캐릭터 정보 갱신 주기 접속 종료` | Nothing on how often the official character data refreshes; server-transfer news (level 45 and up). |
| `plaync terms of service automated access crawling scraping game website` | Other companies' anti-scraping clauses; NC's own terms not surfaced. |

Synthesis: the refresh cadence is not published anywhere the search reaches; NC's terms need fetching directly.

## Round 3 — primary sources, 2026-10-10

Fetched rather than searched:

- NC's Terms of Use (`evidence/06-terms/plaync-com-policy-service-game-en.md`): § 6, "Restrictions On And Use Of The Services", forbids accessing or searching the Services "by any means (automated or otherwise) other than through our currently available, published interfaces", calls scraping without NC's consent prohibited, and bars spiders, robots and crawlers other than NC's own agents or generally available browsers.
- `aion2.plaync.com/robots.txt` (`evidence/06-terms/aion2-plaync-com-robots.txt`): allows everything.
- metabot.gg's robots.txt and developer page (`evidence/05-metabot/`): `/api/` disallowed, no developer page (404).

Synthesis: technically open, contractually unpublished. The verdict carries the Terms as the deciding caveat for the scheduled sync.

## Round 4 — review recheck, 2026-10-10

The review noted that the captured game Terms list an "NC OPEN API Service" in their policy menu, so "unpublished" needed testing rather than a search result. Fetched directly:

- The NC OPEN API Service terms (`evidence/07-nc-open-api/plaync-com-policy-service-developers.md`): the API's kinds are whatever the developer center lists; a key from the developer center is required; result data can't be cached or stored beyond what the terms allow; automated or periodic access that loads the servers is forbidden.
- The developer center (`evidence/07-nc-open-api/developers-plaync-com-home.txt`, `developers-plaync-com-apis-l2m.txt`, `developers-plaync-com-apis-aion2.txt`): it documents the Lineage 2M market API only; the Aion 2 path lands on NC's error page.
- The gateway (`evidence/07-nc-open-api/dev-api-curl.tsv`): 401 without a key on the Lineage 2M path and on guessed Aion 2 paths alike, so it neither confirms nor denies an Aion 2 API.
- The profile page's footer (`evidence/08-browser-recheck/official-profile-footer-links.json`): "Terms of Use" points at the captured game Terms, so they govern the page.

Synthesis: NC has a published interface, but it carries no Aion 2 character data, global or KR. The verdict's caveat stands with that citation.

## Not used

- metabot.gg's internal `/api/aion-2/armory/search`: answers curl with 403, and from the browser its official-search mode answered 403 too; it is not a documented API.
