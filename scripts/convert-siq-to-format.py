#!/bin/env python3

from zipfile import ZipFile
import xml.etree.ElementTree as ET
import argparse
import sys
import json
import os


def parse_questions_from_files(files):
    questions_by_theme = {}
    related_files = {}
    related_files["Images"] = []
    for pack in files:
        zip = ZipFile(pack)
        all_files = {name: zip.read(name) for name in zip.namelist()}
        for path in all_files:
            if path.startswith("Images/"):
                related_files["Images"].append(
                    (path.replace("Images/", ""), all_files[path])
                )
        content_xml = all_files["content.xml"]
        et = ET.fromstring(content_xml)
        # import pdb; pdb.set_trace()
        if len(list(et)) > 2:
            continue
        info, rounds = list(et)
        for round in list(rounds):
            roundl = list(round)
            themes = roundl[0]
            for theme in list(themes):
                theme_name = theme.get("name")
                questions_to_append = []
                if theme_name is None:
                    continue

                # <questions>
                questions = list(theme)[0]
                # TODO: Consider the "price" tag to maybe be used to compute the value of the question
                # TODO: Process the "sources" field to provide some info on question
                for qidx, question in enumerate(questions):
                    # for each <question>
                    # parse question info
                    children = list(question)
                    info = None
                    scenario = None
                    right = None
                    wrong = None
                    for child in children:
                        name = child.tag
                        if name.endswith("info"):
                            # <info>
                            info = child
                        elif name.endswith("scenario"):
                            # <scenario>
                            scenario = child
                        elif name.endswith("right"):
                            # <right>
                            right = child
                        elif name.endswith("wrong"):
                            # <wrong>
                            wrong = child

                    # scenario contains the actual question
                    scenario_question = ""
                    # images in the question
                    q_images = []
                    # images to show after answer
                    ans_images = []
                    if scenario is None:
                        # skip if no question
                        print(
                            f"Warning: no question specified for {theme_name} -> question #{qidx}"
                        )
                        continue
                    parsing_answer_content = False
                    for atom in list(scenario):
                        atom_type = atom.get("type")
                        if atom_type == "image":
                            img_src = atom.text
                            if parsing_answer_content:
                                # answer image
                                ans_images.append(img_src)
                            else:
                                # question image
                                q_images.append(img_src)
                        elif atom_type == "marker":
                            # end of the question, after this marker the scenario answer content begins
                            parsing_answer_content = True
                            break
                        elif atom.text is not None:
                            scenario_question += atom.text
                        else:
                            print(f"Warning: Unknown <scenario> node found: {atom.tag}")

                    # collect all <answer> nodes into an array of possible answers
                    possible_answers = []
                    if right is not None:
                        for answer in list(right):
                            possible_answers.append(answer.text)
                    if len(possible_answers) == 0:
                        # skip if no answer specified
                        continue
                    wrong_options = []
                    if wrong is not None:
                        for opt in list(wrong):
                            wrong_options.append(opt.text)
                    item = {
                        "text": scenario_question,
                        "qimages": q_images,
                        "aimages": ans_images,
                        "answers": possible_answers,
                        "wrong_options": wrong_options,
                    }

                    # append new question
                    questions_to_append.append(item)
                questions_by_theme[theme_name] = questions_to_append
    return {
        "questions": questions_by_theme,
        "themes": list(questions_by_theme.keys()),
        "files": related_files,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Convert questions in SIQ format to json"
    )
    parser.add_argument("files", nargs="+", help="questions pack file paths")
    parser.add_argument("--out", help="Output json file name", required=True)
    args = parser.parse_args()
    files_to_convert = args.files
    out_dir = args.out
    if os.path.isfile(out_dir):
        print("Invalid output file specified.", file=sys.stderr)
        return -1
    if not os.path.isdir(out_dir):
        print("Output directory does not exist, creating...", file=sys.stderr)
        os.mkdir(out_dir)
    output_file = os.path.join(out_dir, "questions.json")
    themes_output_file = os.path.join(out_dir, "themes.json")
    parsed = parse_questions_from_files(files_to_convert)
    with open(themes_output_file, "w+") as f:
        json.dump(parsed["themes"], f)
    print(parsed["questions"])
    with open(output_file, "w+", encoding="utf-8") as f:
        json.dump(parsed["questions"], f)
    images_dir = os.path.join(out_dir, "Images")
    if not os.path.isdir(images_dir):
        os.mkdir(images_dir)
    for fname, blob in parsed["files"]["Images"]:
        with open(os.path.join(images_dir, fname), "wb") as f:
            f.write(blob)


if __name__ == "__main__":
    main()
