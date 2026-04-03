with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the exact invisible character on line 4 of the block
idx = content.find('ch A. B. C. D')
block = content[idx:idx+500]
print('EXACT bytes around line 4:')
# Find the if line
i4 = block.find('if (!prevChar')
print(repr(block[i4:i4+80]))
