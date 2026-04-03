with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# The exact old block - note U+200B (zero-width space) invisible char after ';'
old_regex = (
    "        // T\u00e1ch A. B. C. D. xu\u1ed1ng d\u00f2ng ri\u00eang\n"
    "        text = text.replace(/([A-D])[\\.)](?:\\s|\\u00A0|&nbsp;)*/gi, function (match, p1, offset, fullString) {\n"
    "            const prevChar = fullString[offset - 1];\n"
    "            if (!prevChar || /[\\s>;\u200b\\u00A0\\t\\n\\r]/.test(prevChar)) {\n"
    "                return '\\n' + p1.toUpperCase() + '. ';\n"
    "            }\n"
    "            return match;\n"
    "        });"
)

# New improved regex - splits A/B/C/D on same line too
new_regex = (
    "        // T\u00e1ch A. B. C. D. xu\u1ed1ng d\u00f2ng ri\u00eang (k\u1ec3 c\u1ea3 khi nhi\u1ec1u \u0111\u00e1p \u00e1n n\u1eb1m c\u00f9ng 1 d\u00f2ng)\n"
    "        text = text.replace(/([ \\t\\n\\r>.]|^)([A-D])[.)]/gm, function(match, before, p1) {\n"
    "            return (before || '') + '\\n' + p1.toUpperCase() + '. ';\n"
    "        });"
)

if old_regex in content:
    content = content.replace(old_regex, new_regex)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Regex fixed!')
else:
    print('FAIL: Old string not found')
    print('Length of old:', len(old_regex))
    # Try to see what's different
    idx = content.find('//\u00a0T\u00e1ch A') 
    idx2 = content.find('// T\u00e1ch A')
    print('idx with nbsp:', idx, 'idx normal:', idx2)
