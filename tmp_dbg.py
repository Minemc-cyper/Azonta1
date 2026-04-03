with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('ch A. B. C. D')
block = content[idx:idx+500]
with open('debug_block.txt', 'w', encoding='utf-8') as g:
    g.write(block)
print('Done. Length:', len(block))
