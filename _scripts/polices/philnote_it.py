# Fabrication de PhilNote7-it (notation italienne) à partir de PhilNote7 :
# copie exacte dont seules les capitales A à G sont remplacées par les
# noms italiens (La, Si, Do, Ré, Mi, Fa, Sol), à la même hauteur.
#
#   fontforge -lang=py -script _scripts/polices/philnote_it.py \
#       assets/fonts/PhilNote7-Regular.otf assets/fonts/PhilNote7-it.otf
import fontforge, psMat, sys

SRC, OUT = sys.argv[1], sys.argv[2]
src = fontforge.open(SRC)

def part(gname, idx):
    lay = fontforge.layer()
    cs = list(src[gname].foreground)
    for i in idx: lay += cs[i]
    return lay

def poly(*pts):
    c = fontforge.contour()
    for x, y in pts: c += fontforge.point(x, y)
    c.closed = True
    l = fontforge.layer(); l += c; return l

# Lettres (capitales de PhilNote7 ; L et M dessinées dans le même style ;
# minuscules extraites des mots minuscules de PhilNote7)
L = {}
for n in 'D R F S'.split(): L[n] = part(n, range(len(src[n].foreground)))
L['L'] = poly((120,0),(120,800),(193,800),(193,69),(516,69),(516,0))
L['M'] = poly((60,0),(60,800),(150,800),(430,110),(710,800),(800,800),(800,0),(727,0),(727,640),(466,0),(394,0),(133,640),(133,0))
L['o'] = part('c', [1,3])          # « do »
L['eacute'] = part('d', [0,2,3])   # « ré »
L['i'] = part('e', [0,2])          # « mi »
L['a'] = part('f', [1,2])          # « fa »
L['l'] = part('g', [0])            # « sol »
for k in L: L[k].correctDirection()

GAPS = {('M','i'):100, ('S','o'):38, ('S','i'):75, ('o','l'):70, ('R','eacute'):55}
def word(names):
    out = fontforge.layer(); x = None; prev = None
    for cur in names:
        lay = L[cur].dup()
        xmin, _, xmax, _ = lay.boundingBox()
        gap = GAPS.get((prev, cur), 60)
        dx = (0 if xmin >= 100 else 40 - xmin) if x is None else (x + gap - xmin)
        lay.transform(psMat.translate(dx, 0)); out += lay
        x = xmax + dx; prev = cur
    return out, int(round(x + 40))

NOTES = {'A':['L','a'], 'B':['S','i'], 'C':['D','o'], 'D':['R','eacute'],
         'E':['M','i'], 'F':['F','a'], 'G':['S','o','l']}
for bat, lets in NOTES.items():
    lay, w = word(lets)
    g = src[bat]
    g.foreground = lay
    g.width = w
    g.removeOverlap(); g.correctDirection(); g.round()

src.fontname = 'PhilNote7-it'
src.familyname = 'PhilNote7-it'
src.fullname = 'PhilNote7-it Regular'
src.generate(OUT)
print('ok', OUT)
