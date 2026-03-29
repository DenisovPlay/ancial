import re
with open('/Users/andrey/Documents/Ancial-React/ancial/app/about/legal/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add React hooks
if "import React" not in text:
    text = "'use client';\n\nimport React, { useState, useEffect } from 'react';\nimport { useRouter } from 'next/navigation';\nimport { useAuth } from '../../context/AuthContext';\nimport Modal from '../../components/modal';\n" + text

# React attributes replacements
replacements = {
    r'\bclass=': 'className=',
    r'\bfill-opacity=': 'fillOpacity=',
    r'\bstop-color=': 'stopColor=',
    r'\bstop-opacity=': 'stopOpacity=',
    r'\bstroke-width=': 'strokeWidth=',
    r'\bstroke-linejoin=': 'strokeLinejoin=',
    r'\bstroke-linecap=': 'strokeLinecap=',
    r'\bfill-rule=': 'fillRule=',
    r'\bclip-rule=': 'clipRule=',
    r'\bxmlns:xlink=': 'xmlnsXlink=',
    r'\bxml:space=': 'xmlSpace=',
    r"<\?php echo \$lang\['documents'\]; \?>": "{lang?.documents || 'Документы'}",
}
for k, v in replacements.items():
    text = re.sub(k, v, text)

# Rewrite onClick instances to React-friendly
text = re.sub(r'onclick="topage\(' + r"'/about'" + r'\);"|onclick="topage\(' + r"'/about'" + r'\)"', r'onClick={() => router.push("/about")}', text)
text = re.sub(r'onclick="showALL\(\)"', r'onClick={() => setLangFilter("ALL")}', text)
text = re.sub(r'onclick="showRU\(\)"', r'onClick={() => setLangFilter("RU")}', text)
text = re.sub(r'onclick="showEN\(\)"', r'onClick={() => setLangFilter("EN")}', text)

# Remove script/style
text = re.sub(r'<style>.*?</style>', '', text, flags=re.DOTALL)
text = re.sub(r'<script>.*?</script>', '', text, flags=re.DOTALL)
text = re.sub(r'data-fancybox="" data-src="(.*?)"', r'onClick={() => setActiveModal("\1")}', text)
text = re.sub(r'data-fancybox data-src="(.*?)"', r'onClick={() => setActiveModal("\1")}', text)

# Find HTML styles and convert to inline React styles
def fix_style(m):
    s = m.group(1)
    if 'display: none;' in s and 'max-width:1000px;' in s:
        return 'style={{ display: "none", maxWidth: "1000px" }}'
    if 'display: none;' in s and 'max-width:min(1000px, calc(100vw - 12px));' in s:
        return 'style={{ display: "none", maxWidth: "min(1000px, calc(100vw - 12px))" }}'
    return m.group(0)

text = re.sub(r'style="([^"]+)"', fix_style, text)

# Fix <br> without closures if any
text = text.replace('<br>', '<br />')
text = text.replace('<hr>', '<hr />')
text = text.replace('href="#ru"', 'href={"#ru"}')
text = text.replace('href="#en"', 'href={"#en"}')

# Inject setup inside LegalPage
hook_injector = """export default function LegalPage() {
  const router = useRouter();
  const { lang } = useAuth();
  const [langFilter, setLangFilter] = useState('ALL');
  const [activeModal, setActiveModal] = useState(null);

  const isVisible = (lng) => langFilter === 'ALL' || langFilter === lng;
"""
text = text.replace('export default function LegalPage() {', hook_injector)

# Hide elements properly instead of using old jQuery classes `.RU.hidden` etc
text = re.sub(r'(className=")([^"]*RU[^"]*)(")', r'\1\2 ${isVisible("RU") ? "" : "hidden"}\3', text)
text = re.sub(r'(className=")([^"]*EN[^"]*)(")', r'\1\2 ${isVisible("EN") ? "" : "hidden"}\3', text)

# In order to interpolate in className, flip the string to a template literal where needed
# Actually, a simpler way is to just do class replacements:
text = text.replace('className="RU', 'className={`RU ${isVisible("RU") ? "" : "hidden"}')
text = text.replace('className="EN', 'className={`EN ${isVisible("EN") ? "" : "hidden"}')
text = re.sub(r'(className=\{`RU \$\{isVisible\("RU"\) \? "" : "hidden"\}\}.*?)(">)', r'\1`}>', text)
text = re.sub(r'(className=\{`EN \$\{isVisible\("EN"\) \? "" : "hidden"\}\}.*?)(">)', r'\1`}>', text)
text = re.sub(r'(className=\{`RU \$\{isVisible\("RU"\) \? "" : "hidden"\}\}.*?)(" )', r'\1`} ', text)
text = re.sub(r'(className=\{`EN \$\{isVisible\("EN"\) \? "" : "hidden"\}\}.*?)(" )', r'\1`} ', text)

# Update styling combinations for the active Lang buttons
text = text.replace('id="allbutton" className="p-2 lg:text-lg text-zinc-300 rounded-3xl duration-300 bg-zinc-800 rounded-r-none', 'className={`p-2 lg:text-lg text-zinc-300 rounded-3xl duration-300 rounded-r-none ${langFilter === "ALL" ? "bg-zinc-800" : ""}`')
text = text.replace('id="rubutton" className="p-2 lg:text-lg text-zinc-300 /rounded-3xl duration-300 hover:bg-zinc-800', 'className={`p-2 lg:text-lg text-zinc-300 duration-300 hover:bg-zinc-800 ${langFilter === "RU" ? "bg-zinc-800" : ""}`')
text = text.replace('id="enbutton" className="p-2 lg:text-lg text-zinc-300 rounded-3xl duration-300 hover:bg-zinc-800 rounded-l-none', 'className={`p-2 lg:text-lg text-zinc-300 rounded-3xl duration-300 hover:bg-zinc-800 rounded-l-none ${langFilter === "EN" ? "bg-zinc-800" : ""}`')

with open('/Users/andrey/Documents/Ancial-React/ancial/app/about/legal/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Done")
