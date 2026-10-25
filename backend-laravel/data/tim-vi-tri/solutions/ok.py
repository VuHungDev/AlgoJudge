n = int(input())
a = list(map(int, input().split()))
x = int(input())
try:
    print(a.index(x) + 1)
except ValueError:
    print(-1)
