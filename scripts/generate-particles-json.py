import os
import json
import argparse
from collections import Counter, defaultdict

ALLOWED_CHARS = set()
for i in range(ord("а"), ord("я")):
    ALLOWED_CHARS.add(chr(i))
for i in range(ord("А"), ord("Я")):
    ALLOWED_CHARS.add(chr(i))

def generate_from_dictionary(dicp: str, encoding: str, freq: Counter, particle_len: int):
    with open(dicp, "r", encoding=encoding) as f:
        lines = f.readlines()
        for word in lines:
            word_len = len(word) - 1 # don't include the newline character
            if word.startswith('-'): continue
            if word_len < particle_len: continue
            particles = []
            i = 0
            word_ending = word_len - (word_len % particle_len) + 1
            while i < word_ending:
                start = i
                end = min(i + particle_len, word_len)
                if (end - start) < particle_len: break
                j = start
                p = ""
                valid = True
                while j < end:
                    ch = word[j]
                    if not ch in ALLOWED_CHARS:
                        valid = False
                        break
                    p += ch
                    j += 1
                if valid:
                    particles.append(p.lower())
                i += 1
            for p in particles:
                freq[p] += 1

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate particles of a certain length from text files containing words")
    parser.add_argument("files", type=str, nargs="+", help="Source files")
    parser.add_argument("--output", type=str, help="Output file", required=True)
    parser.add_argument("--length", type=int, help="Particle length", default=3)
    args = parser.parse_args()
    source_files = args.files
    output_file = args.output
    particle_len = args.length
    freq = Counter()
    for dicp in source_files:
        print(f"Reading {dicp}...")
        generate_from_dictionary(dicp, "utf-8", freq, particle_len)
        print("Done.")
    if os.path.isfile(output_file):
        os.remove(output_file)
    with open(output_file, "w") as f:
        json.dump(freq, f, ensure_ascii=False)
