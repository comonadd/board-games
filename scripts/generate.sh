#!/bin/bash

RT="russian-words"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
SP="$SCRIPT_DIR"
OUT_DIR="server/assets"
WORDS_LIST_PATH="$OUT_DIR/words.txt"
PARTICLES_PATH="$OUT_DIR/particles.json"
CWP="$RT/words-common.txt"

mkdir -p $OUT_DIR

# Download common words into words-common.txt
curl https://raw.githubusercontent.com/danakt/russian-words/master/russian.txt -o "$RT/words-cp1251.txt"
iconv -f windows-1251 -t utf-8 < "$RT/words-cp1251.txt" > "$RT/words-unicode.txt"

# Download country.csv, city.csv, and region.csv
# TODO: Direct link
python "$SP/gen_words_from_geo_csv.py" --output $RT/geo.txt

# Combine them to create a list of words
cat "$RT/words-unicode.txt" > $WORDS_LIST_PATH
cat "$RT/geo.txt" >> $WORDS_LIST_PATH

# Generate particles
python "$SP/generate-particles-json.py" $WORDS_LIST_PATH --output $PARTICLES_PATH
