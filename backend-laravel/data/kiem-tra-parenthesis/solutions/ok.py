s = input()
stack = []
match = {')': '(', ']': '[', '}': '{'}
for c in s:
    if c in '([{':
        stack.append(c)
    elif c in ')]}':
        if not stack or stack[-1] != match[c]:
            print("NO"); exit()
        stack.pop()
print("YES" if not stack else "NO")
