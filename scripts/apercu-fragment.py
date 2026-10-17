# Transforme apercu/index.html (build APERCU=1) en fragment publiable dans claude.ai.
import re, sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
# Le JavaScript inliné peut contenir « <body » ou « </head> » : on découpe sur les vraies balises.
debut_head = s.index('<head>') + len('<head>')
fin_head = s.index('</head>', debut_head)
head = s[debut_head:fin_head]
debut_body = s.index('>', s.index('<body', fin_head)) + 1
body = s[debut_body:s.rindex('</body>')]
for pat in [r'<meta charset[^>]*>\s*', r'<meta name="viewport"[^>]*>\s*', r'<link rel="manifest"[^>]*>\s*',
            r'<link rel="icon"[^>]*>\s*', r'<title>.*?</title>\s*']:
    head = re.sub(pat, '', head, flags=re.S)
frag = '<title>Superpuffin</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n' + head.strip() + '\n' + body.strip() + '\n'
open(dst, 'w', encoding='utf-8').write(frag)
print(f'{dst} : {len(frag)} octets')
