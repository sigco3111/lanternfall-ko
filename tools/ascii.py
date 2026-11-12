import io, glob
for f in glob.glob('src/*.js'):
    s = io.open(f, encoding='utf8').read()
    t = ''.join(c if ord(c) < 128 else chr(92) + 'u%04x' % ord(c) for c in s)
    if t != s:
        io.open(f, 'w', encoding='utf8', newline='\n').write(t); print('fixed', f)
