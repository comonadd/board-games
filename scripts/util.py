ALLOWED_CHARS = set([])
for i in range(ord("а"), ord("я") + 1):
    ALLOWED_CHARS.add(chr(i))
for i in range(ord("А"), ord("Я") + 1):
    ALLOWED_CHARS.add(chr(i))
