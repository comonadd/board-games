from zipfile import ZipFile
import xml.etree.ElementTree as ET
import argparse
import sys
import json

def parse_questions_from_files(files):
    questions_by_theme = {}
    for pack in files:
        zip = ZipFile(pack)
        all_files = { name: zip.read(name) for name in zip.namelist() }
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
    return questions_by_theme

def main():
    parser = argparse.ArgumentParser(description='Convert questions in SIQ format to json')
    parser.add_argument('files', nargs='+', help='questions pack file paths')
    parser.add_argument('--out', help='Output json file name')
    parser.add_argument('--out-themes', help='Output themes json file name')
    args = parser.parse_args()
    files_to_convert = args.files
    output_file = args.out
    themes_output_file = args.out_themes
    questions_by_theme = parse_questions_from_files(files_to_convert)
    all_themes = list(questions_by_theme.keys())
    with open(themes_output_file, 'w+') as f:
        json.dump(all_themes, f)
    with open(output_file, 'w+') as f:
        json.dump(questions_by_theme, f)

if __name__ == '__main__':
    main()
