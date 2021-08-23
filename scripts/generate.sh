#!/bin/bash

RT="./russian-words"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
SP="$SCRIPT_DIR"
OUT_DIR="server/assets"
WORDS_LIST_PATH="$OUT_DIR/words.txt"
PARTICLES_PATH="$OUT_DIR/particles.json"
CWP="$RT/words-common.txt"

mkdir -p $OUT_DIR

# Download common words into words-common.txt
[ ! -f "$RT/words-cp1251.txt" ] && curl https://raw.githubusercontent.com/danakt/russian-words/master/russian.txt -o "$RT/words-cp1251.txt"
iconv -f windows-1251 -t utf-8 < "$RT/words-cp1251.txt" > "$RT/words-unicode.txt"

# Download names into words-names.txt
[ ! -f "$RT/words-names.zip" ] && curl "https://mydata.biz/storage/download/ebcdfe6fb2d546398010e0d6564a79bb/%D0%91%D0%B0%D0%B7%D0%B0%20%D0%B4%D0%B0%D0%BD%D0%BD%D1%8B%D1%85%20%D0%B8%D0%BC%D0%B5%D0%BD%20%D0%B8%20%D1%84%D0%B0%D0%BC%D0%B8%D0%BB%D0%B8%D0%B9%20%D0%B2%20%D1%84%D0%BE%D1%80%D0%BC%D0%B0%D1%82%D0%B5%20CSV.zip" -o "$RT/words-names.zip"
[ ! -d "$RT/names" ] && unzip -d "$RT/names" "$RT/words-names.zip"
# iconv -f windows-1251 -t utf-8 < "$RT/names/russian_names.csv" > "$RT/names/russian_names-utf-8.csv"
python "$SP/gen_words_from_csv.py" "$RT/names/russian_names.csv" --k 1 --output "$RT/names.txt"

# Download country.csv, city.csv, and region.csv
# TODO: Direct link
iconv -f windows-1251 -t utf-8 < "$RT/country.csv" > "$RT/country-utf8.csv"
iconv -f windows-1251 -t utf-8 < "$RT/city.csv" > "$RT/city-utf8.csv"
iconv -f windows-1251 -t utf-8 < "$RT/region.csv" > "$RT/region-utf8.csv"
python "$SP/gen_words_from_csv.py" "$RT/country-utf8.csv" --k 2 --output $RT/countries.txt
python "$SP/gen_words_from_csv.py" "$RT/city-utf8.csv" --k 3 --output $RT/cities.txt
python "$SP/gen_words_from_csv.py" "$RT/region-utf8.csv" --k 3 --output $RT/regions.txt

# Combine them to create a list of words
cat "$RT/words-unicode.txt" > $WORDS_LIST_PATH
cat "$RT/names.txt" >> $WORDS_LIST_PATH
cat "$RT/countries.txt" >> $WORDS_LIST_PATH
cat "$RT/cities.txt" >> $WORDS_LIST_PATH
cat "$RT/regions.txt" >> $WORDS_LIST_PATH

# Generate particles
python "$SP/generate-particles-json.py" $WORDS_LIST_PATH --output $PARTICLES_PATH
