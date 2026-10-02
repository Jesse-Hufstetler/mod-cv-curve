#!/bin/bash
# Changes the plugin URI everywhere it appears. The URI is the plugin's permanent ID: pedalboards
# that use the old one will show the plugin as missing until it is re-added.
#
# Usage: tools/rename-uri.sh <new-uri>
set -e
cd "$(dirname "$0")/.."
NEW="$1"
[ -n "$NEW" ] || { echo "usage: $0 <new-uri>"; exit 1; }
OLD=$(sed -n 's/^#define PLUGIN_URI "\(.*\)"/\1/p' mod-cv-curve.c)
[ -n "$OLD" ] || { echo "could not read the current URI from mod-cv-curve.c"; exit 1; }
echo "old: $OLD"
echo "new: $NEW"
for f in mod-cv-curve.c mod-cv-curve.lv2/*.ttl mod-cv-curve.lv2/manifest.ttl.in README.md; do
  [ -f "$f" ] && grep -qF "$OLD" "$f" && sed -i "s|$OLD|$NEW|g" "$f" && echo "updated $f"
done
echo "Rebuild the plugin and reinstall it, then re-add it on your pedalboards."
