import re

with open('/Users/andrey/Documents/Ancial-React/ancial/app/about/legal/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# React attributes replacements
replacements = {
    r'\bclass=': 'className=',
    r'\bonclick=': 'onClick=',
    r'\bfill-opacity=': 'fillOpacity=',
    r'\bstop-color=': 'stopColor=',
    r'\bstop-opacity=': 'stopOpacity=',
    r'\bstroke-width=': 'strokeWidth=',
    r'\bstroke-linejoin=': 'strokeLinejoin=',
    r'\bstroke-linecap=': 'strokeLinecap=',
    r'\bfill-rule=': 'fillRule=',
    r'\bclip-rule=': 'clipRule=',
    r'\bviewBox=': 'viewBox=',
    r'\bxmlns:xlink=': 'xmlnsXlink=',
    r'\bxml:space=': 'xmlSpace=',
    r"<\?php echo \$lang\['documents'\]; \?>": "{lang?.documents || 'Документы'}",
    r"readonly": "readOnly",
    r"autocomplete": "autoComplete",
    r"max-width": "maxWidth",
}

for k, v in replacements.items():
    text = re.sub(k, v, text)

# Fix comments (HTML to JSX)
text = re.sub(r'<!--(.*?)-->', r'{/* \1import re

with open('/Userse
with rey/Documents/Ancial-React/ancial/app/about/legal/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
