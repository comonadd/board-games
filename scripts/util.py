ALLOWED_CHARS = set([])
for i in range(ord("а"), ord("я")):
    ALLOWED_CHARS.add(chr(i))
for i in range(ord("А"), ord("Я")):
    ALLOWED_CHARS.add(chr(i))
