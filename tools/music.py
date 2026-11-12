# python tools/music.py <audio file> [<audio file> ...]  -> fills the MUSIC_MIME / MUSIC_B64 arrays in src/78-music.js (playlist order)
# python tools/music.py --clear  empties them
import sys, base64, io, os, json
M = {'.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.flac': 'audio/flac', '.wav': 'audio/wav', '.m4a': 'audio/mp4'}
files = [] if sys.argv[1] == '--clear' else sys.argv[1:]
mime = [M[os.path.splitext(f)[1].lower()] for f in files]
b64 = [base64.b64encode(open(f, 'rb').read()).decode('ascii') for f in files]
head = ["/* LANTERNFALL - music slot: a playlist of embedded tracks.",
        "   Fill with:  python tools/music.py <file1> [<file2> ...]   then rebuild with:  sh tools/build.sh",
        "   Empty with: python tools/music.py --clear   (the game then has no music, only the wind and the campfire). */",
        "const MUSIC_MIME = " + json.dumps(mime) + ";", "const MUSIC_B64 = " + json.dumps(b64) + ";", ""]
io.open('src/78-music.js', 'w', encoding='utf8', newline='\n').write('\n'.join(head))
print('music:', len(files), 'track(s)', sum(len(b) for b in b64), 'chars')
