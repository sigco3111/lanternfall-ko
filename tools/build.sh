#!/bin/sh
# LANTERNFALL build: concatenates three.min.js + src/*.js into one self-contained index.html (only if the JS parses)
cd "$(dirname "$0")/.."
python tools/ascii.py; cat src/00-util.js src/10-kit.js src/20-human.js src/20b-wardrobe.js src/21-heroes.js src/22-monsters.js src/25-anim.js src/30-world.js src/40-post.js src/50-fx.js src/60-data.js src/61-game.js src/70-ui.js src/10-78-music.js src/79-sfx.js src/80-audio.js src/90-main.js | sed "s/__BUILD__/r9 $(date -u +%H:%MZ)/g" > game.js
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
