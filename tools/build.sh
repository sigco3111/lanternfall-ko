#!/bin/sh
# LANTERNFALL build: concatenates three.min.js + src/*.js into one self-contained index.html (only if the JS parses)
cd "$(dirname "$0")/.."
python tools/ascii.py; cat src/*.js | sed "s/__BUILD__/r9 $(date -u +%H:%MZ)/g" > game.js
node --check game.js || { echo "SYNTAX ERROR - index.html left untouched"; exit 1; }
{
cat src/head.html
printf '<script>\n'
cat three.min.js
printf '\n</script>\n<script>\n'
cat game.js
printf '\n</script>\n</body></html>\n'
} > index.tmp.html
if [ "$1" = "stage" ]; then mv index.tmp.html stage.html; F=stage.html; else mv index.tmp.html index.html; F=index.html; fi
ls -la $F | awk '{print $5, $9}'
