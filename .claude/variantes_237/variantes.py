# Variantes de PhilNote7-it pour #237 (largeur des noms italiens)
import fontforge, psMat, sys
SRC, OUT, mode, k = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
f = fontforge.open(SRC)
NOTES = 'ABCDEFG'
def scale(g, sx, sy):
    w = g.width
    g.transform(psMat.scale(sx, sy))
    g.width = int(round(w * sx))
if mode == 'noms':        # noms italiens réduits (chiffrage inchangé)
    for n in NOTES: scale(f[n], k, k)
elif mode == 'tout':      # toute la police réduite
    for g in f.glyphs(): scale(g, k, k)
elif mode == 'etroits':   # noms rétrécis en largeur seulement
    for n in NOTES: scale(f[n], k, 1)
f.fontname = f.familyname = 'PhilNote7-it-' + mode
f.generate(OUT)
print('ok', OUT)
