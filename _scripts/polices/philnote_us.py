# Fabrication de PhilNote7-us (notation américaine) à partir de PhilNote7 :
# copie exacte dont les glyphes propres à la notation américaine sont
# repris de PhilNote6-US (cadences IAC, PC, DC, HC ; altération avant le
# chiffre : ♯5, ♭4, ♯IV ; M7…), ligature « IV+ » ajoutée.
#
#   fontforge -lang=py -script _scripts/polices/philnote_us.py \
#       assets/fonts/PhilNote7-Regular.otf _scripts/polices/PhilNote6-US-Regular.otf \
#       assets/fonts/PhilNote7-us.otf
import fontforge, sys

SRC, US, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
f  = fontforge.open(SRC)
us = fontforge.open(US)
LOOKUP = f.getLookupSubtables(f.gsub_lookups[0])[0]

def copy_glyph(name):
    src = us[name]
    if name in f: g = f[name]
    else:
        g = f.createChar(-1, name)
        for ps in src.getPosSub('*'):
            if ps[1] == 'Ligature': g.addPosSub(LOOKUP, tuple(ps[2:]))
    g.foreground = src.foreground
    g.width = src.width

# Glyphes qui diffèrent entre PhilNote6 et PhilNote6-US, et ceux qui
# n'existent que dans PhilNote6-US
base6 = {g.glyphname for g in f.glyphs()}
for g in us.glyphs():
    n = g.glyphname
    if n not in base6:
        copy_glyph(n)
    else:
        a = f[n]
        if a.width != g.width or [round(x) for x in a.boundingBox()] != [round(x) for x in g.boundingBox()]:
            copy_glyph(n)

f.fontname = 'PhilNote7-us'
f.familyname = 'PhilNote7-us'
f.fullname = 'PhilNote7-us Regular'
f.generate(OUT)
print('ok', OUT)
