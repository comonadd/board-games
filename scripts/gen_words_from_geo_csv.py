import csv
import os
from pathlib import Path

SCRIPTS_DIR = os.path.dirname(os.path.realpath(__file__))
ROOT = Path(SCRIPTS_DIR, "../russian-words")
ALLOWED_CHARS = set(["-"])
for i in range(ord("а"), ord("я")):
    ALLOWED_CHARS.add(chr(i))
for i in range(ord("А"), ord("Я")):
    ALLOWED_CHARS.add(chr(i))

def load_csv_param_at(csv_path: Path, k: int):
    result = []
    with open(csv_path, encoding="windows-1251") as f:
        r = csv.reader(f, delimiter=";")
        for row in r:
            country = row[k]
            if len(country.split(" ")) != 1:
                continue
            valid = True
            for ch in country:
                if not ch in ALLOWED_CHARS:
                    valid = False
                    break
            if not valid:
                continue
            result.append(country)
    return result

words = []
words += load_csv_param_at(Path(ROOT, "country.csv"), 2)
words += load_csv_param_at(Path(ROOT, "../russian-words/city.csv"), 3)
words += load_csv_param_at(Path(ROOT, "../russian-words/region.csv"), 3)

with open(Path(ROOT, "geo.txt"), "w") as f:
    for w in words:
        f.write(f"{w}\n")
