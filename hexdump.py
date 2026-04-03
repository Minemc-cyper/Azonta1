with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the exact invisible character on line 4 of the block
idx = content.find('ch A. B. C. D')
block = content[idx:idx+500]
i4 = block.find('if (!prevChar')
chunk = block[i4:i4+80]
print('Hex dump:')
for i, c in enumerate(chunk):
    print(f'{i:02d}: U+{ord(c):04X} {repr(c)}')
