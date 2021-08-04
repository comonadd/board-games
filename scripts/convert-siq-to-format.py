from zipfile import ZipFile
import xml.etree.ElementTree as ET
import argparse
import sys
import json
import os

def parse_questions_from_files(files):
    questions_by_theme = {}
    related_files = {}
    related_files['Images'] = []
    for pack in files:
        zip = ZipFile(pack)
        all_files = { name: zip.read(name) for name in zip.namelist() }
        for path in all_files:
            if path.startswith('Images/'):
                related_files['Images'].append((path.replace('Images/', ''), all_files[path]))
        # print(all_files.keys())

        content_xml = all_files['content.xml']
        et = ET.fromstring(content_xml)
        # import pdb; pdb.set_trace()
        info, rounds = list(et)
        for round in list(rounds):
            themes = list(round)[0]
            for theme in list(themes):
                theme_name = theme.get('name')
                questions_to_append = []
                questions = list(theme)[0]
                for question in questions:
                    children = list(question)
                    info = None
                    scenario = None
                    right = None
                    for child in children:
                        name = child.tag
                        if name.endswith('info'):
                            info = child
                        elif name.endswith('scenario'):
                            scenario = child
                        elif name.endswith('right'):
                            right = child
                    scenario_question = ""
                    if scenario is not None:
                        for atom in list(scenario):
                            scenario_question += atom.text
                    answer_text = ""
                    if right is not None:
                        answer_text = list(right)[0].text
                    item = { "text": scenario_question, "answer": answer_text }
                    questions_to_append.append(item)
                questions_by_theme[theme_name] = questions_to_append
    return {
        "questions": questions_by_theme,
        "themes": list(questions_by_theme.keys()),
        "files": related_files,
    }

def main():
    parser = argparse.ArgumentParser(description='Convert questions in SIQ format to json')
    parser.add_argument('files', nargs='+', help='questions pack file paths')
    parser.add_argument('--out', help='Output json file name')
    args = parser.parse_args()
    files_to_convert = args.files
    out_dir = args.out
    if os.path.isfile(out_dir):
        print("Invalid output file specified.")
        return -1
    if not os.path.isdir(out_dir):
        print("Output directory does not exist, creating...")
        os.mkdir(out_dir)
    output_file = os.path.join(out_dir, "questions.json")
    themes_output_file = os.path.join(out_dir, "themes.json")
    parsed = parse_questions_from_files(files_to_convert)
    with open(themes_output_file, 'w+') as f:
        json.dump(parsed["themes"], f)
    with open(output_file, 'w+') as f:
        json.dump(parsed["questions"], f)
    images_dir = os.path.join(out_dir, "Images")
    if not os.path.isdir(images_dir):
        os.mkdir(images_dir)
    for fname, blob in parsed["files"]["Images"]:
        with open(os.path.join(images_dir, fname), "wb") as f:
            f.write(blob)

if __name__ == '__main__':
    main()
