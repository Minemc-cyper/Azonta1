with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

old = "        // T\u00e1ch A. B. C. D. xu\u1ed1ng d\u00f2ng ri\u00eang\r\n        text = text.replace(/([A-D])[\\.)](?:\\s|\\u00A0|&nbsp;)*/gi, function (match, p1, offset, fullString) {\r\n            const prevChar = fullString[offset - 1];\r\n            if (!prevChar || /[\\s>;\\u200b\\u00A0\\t\\n\\r]/.test(prevChar)) {\r\n                return '\\\\n' + p1.toUpperCase() + '. ';\r\n            }\r\n            return match;\r\n        });"

new = "        // T\u00e1ch A. B. C. D. xu\u1ed1ng d\u00f2ng ri\u00eang (k\u1ec3 c\u1ea3 khi nhi\u1ec1u \u0111\u00e1p \u00e1n n\u1eb1m c\u00f9ng 1 d\u00f2ng)\r\n        text = text.replace(/( |\\t|^|\\n|\\r|>|\\.)([A-D])[.)]/gm, function(match, before, p1) {\r\n            return before + '\\n' + p1.toUpperCase() + '. ';\r\n        });"

if old in content:
    content = content.replace(old, new)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Replaced regex block')
else:
    print('FAIL: Old string not found')
    # Try to find with actual invisible char on line 4
    idx = content.find('\u200b')
    print('Zero-width space at index:', idx)
