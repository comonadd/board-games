from pathlib import Path
import csv
import os
import argparse
from util import ALLOWED_CHARS

def load_csv_param_at(csv_path: Path, k: int):
    result = []
    with open(csv_path, encoding="utf-8") as f:
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

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate words from CSV at kth position")
    parser.add_argument("file", type=str, help="CSV file path")
    parser.add_argument("--output", type=str, help="Output file", required=True)
    parser.add_argument("--k", type=int, help="Index of the column", required=True)
    args = parser.parse_args()
    fp  = args.file
    output_file = args.output
    k = args.k
    words = load_csv_param_at(fp, k)
    with open(output_file, "w") as f:
        for w in words:
            f.write(f"{w}\n")
