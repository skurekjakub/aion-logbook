#!/usr/bin/env bash
# Probes the official Aion 2 character endpoints with plain curl: no cookies,
# no auth header, curl's default User-Agent. Writes each response body to
# <name>.json and one row per request to probe-table.tsv (name, status,
# content type, cache-control, set-cookie present, bytes, seconds, URL).
#
# Usage: probe.sh <outdir>
set -u
out="$1"
mkdir -p "$out"

SITE="https://aion2.plaync.com"
SEARCH="https://api-search.plaync.com"
# The character the record is about: Baon, Fafnir (EU), from the EU search below.
CID="xzsyGd6XtPyctmj9TJwqU2r8vtL-V3jn_EWQe1YEXwo%3D"
SID=2319

# name<TAB>url — the doors, in the order they are probed.
doors=$(cat <<EOF
gameinfo-servers-eu	$SITE/en-us/api/gameinfo/servers?lang=en-US&region=eu
gameinfo-classes-eu	$SITE/en-us/api/gameinfo/classes?lang=en-US&region=eu
gameinfo-pcdata-eu	$SITE/en-us/api/gameinfo/pcdata?lang=en-US&region=eu
gameinfo-servers-no-locale-path	$SITE/api/gameinfo/servers?lang=en-US&region=eu
search-baon-eu	$SEARCH/aion2global/search/v2/character?keyword=Baon&page=1&size=40&region=eu&localeInfo=en-US
search-baon-nae	$SEARCH/aion2global/search/v2/character?keyword=Baon&page=1&size=40&region=nae&localeInfo=en-US
search-baon-naw	$SEARCH/aion2global/search/v2/character?keyword=Baon&page=1&size=40&region=naw&localeInfo=en-US
search-baon-as	$SEARCH/aion2global/search/v2/character?keyword=Baon&page=1&size=40&region=as&localeInfo=en-US
search-baon-la	$SEARCH/aion2global/search/v2/character?keyword=Baon&page=1&size=40&region=la&localeInfo=en-US
search-baon-eu-fafnir	$SEARCH/aion2global/search/v2/character?keyword=Baon&serverId=$SID&page=1&size=40&region=eu&localeInfo=en-US
search-baon-no-locale	$SEARCH/aion2global/search/v2/character?keyword=Baon&serverId=$SID&page=1&size=40&region=eu
character-info-baon	$SITE/api/character/info?region=eu&lang=en-US&characterId=$CID&serverId=$SID
character-equipment-baon	$SITE/api/character/equipment?region=eu&lang=en-US&characterId=$CID&serverId=$SID
character-daevanion-71-baon	$SITE/api/character/daevanion/detail?region=eu&lang=en-US&characterId=$CID&serverId=$SID&boardId=71
character-info-no-region	$SITE/api/character/info?lang=en-US&characterId=$CID&serverId=$SID
character-info-wrong-server	$SITE/api/character/info?region=eu&lang=en-US&characterId=$CID&serverId=2318
character-info-unknown-id	$SITE/api/character/info?region=eu&lang=en-US&characterId=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA%3D&serverId=$SID
search-kr-baon	$SEARCH/aion2/search/v2/character?keyword=%EB%B0%94%EC%98%A8&page=1&size=5
EOF
)

table="$out/probe-table.tsv"
printf 'name\tstatus\tcontent_type\tcache_control\tset_cookie\tbytes\tseconds\turl\n' > "$table"
while IFS=$'\t' read -r name url; do
  hdr=$(mktemp)
  meta=$(curl -s -m 30 -D "$hdr" -o "$out/$name.json" -w '%{http_code}\t%{content_type}\t%{size_download}\t%{time_total}' "$url")
  status=$(cut -f1 <<<"$meta"); ctype=$(cut -f2 <<<"$meta"); bytes=$(cut -f3 <<<"$meta"); secs=$(cut -f4 <<<"$meta")
  cc=$(grep -i '^cache-control:' "$hdr" | head -1 | cut -d' ' -f2- | tr -d '\r')
  sc=$(grep -qi '^set-cookie:' "$hdr" && echo yes || echo no)
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$name" "$status" "$ctype" "${cc:--}" "$sc" "$bytes" "$secs" "$url" >> "$table"
  [ -s "$out/$name.json" ] || rm -f "$out/$name.json"
  rm -f "$hdr"
done <<<"$doors"

# Burst: the info door twenty times back to back, status and seconds per hit.
burst="$out/burst-character-info.tsv"
printf 'hit\tstatus\tseconds\n' > "$burst"
for i in $(seq 1 20); do
  printf '%s\t%s\n' "$i" "$(curl -s -m 30 -o /dev/null -w '%{http_code}\t%{time_total}' "$SITE/api/character/info?region=eu&lang=en-US&characterId=$CID&serverId=$SID")" >> "$burst"
done
