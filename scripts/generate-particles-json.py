import os
import json
from collections import Counter, defaultdict

dictionary_path = "./russian-words/words.txt"
output_file = "./public/particles.json"
PARTICLE_LENGTH = 3

def generate_from_dictionary(dicp):
    result = Counter()
    with open(dicp, "r", encoding="windows-1251") as f:
        lines = f.readlines()
        for word in lines:
            word_len = len(word) - 1 # don't include the newline character
            if word.startswith('-'): continue
            if word_len < PARTICLE_LENGTH: continue
            particles = []
            i = 0
            word_ending = word_len - (word_len % PARTICLE_LENGTH) + 1
            while i < word_ending:
                start = i
                end = min(i + PARTICLE_LENGTH, word_len)
                if (end - start) < PARTICLE_LENGTH: break
                j = start
                p = ""
                while j < end:
                    p += word[j]
                    j += 1
                particles.append(p)
                i += 1
            for p in particles:
                result[p] += 1
    return result

freq = generate_from_dictionary(dictionary_path)
with open(output_file, "w") as f:
    json.dump(freq, f, ensure_ascii=False)
