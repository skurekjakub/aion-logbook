#!/usr/bin/env bash
# Probes whether the official info endpoint accepts the characterId both
# URL-encoded (%3D, as the search returns it) and raw (=, as info returns it).
# Plain curl, no cookies, no auth header. One row per request in
# probe-id-forms.tsv (name, status, bytes, profile.characterName, URL).
#
# Usage: probe-id-forms.sh <outdir>
set -u
out="$1"
mkdir -p "$out"

SITE="https://aion2.plaync.com"
SID=2319

doors=$(cat <<EOF
id-percent-encoded	$SITE/api/character/info?region=eu&lang=en-US&characterId=xzsyGd6XtPyctmj9TJwqU2r8vtL-V3jn_EWQe1YEXwo%3D&serverId=$SID
id-raw-equals	$SITE/api/character/info?region=eu&lang=en-US&characterId=xzsyGd6XtPyctmj9TJwqU2r8vtL-V3jn_EWQe1YEXwo=&serverId=$SID
EOF
)

table="$out/probe-id-forms.tsv"
printf 'name\tstatus\tbytes\tcharacterName\turl\n' > "$table"
while IFS=$'\t' read -r name url; do
  body=$(mktemp)
  meta=$(curl -s -m 30 -o "$body" -w '%{http_code}\t%{size_download}' "$url")
  who=$(node -e 'try{const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(j.profile?.characterName??"-")}catch{console.log("-")}' "$body")
  printf '%s\t%s\t%s\t%s\n' "$name" "$meta" "$who" "$url" >> "$table"
  rm -f "$body"
done <<<"$doors"
