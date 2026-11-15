import os
import glob
import re
import json
from urllib.parse import unquote

# Universal Subject Rules (CSE 2nd Year + ECE 3rd Year)
SUBJECT_RULES = [
    # --- CSE 2nd Year (Sem 3 & 4) ---
    (r'MATHEMATICS[\s\-_]*IV|MATHS[\s\-_]*4|MATH[\s\-_]*4|BAS303|BAS403|\bM-4\b', "Mathematics-IV", 3),
    (r'DATA[\s\-_]*STRUCTURES?|BCS301|\bDS\b', "Data Structures", 3),
    (r'COMPUTER[\s\-_]*ORGANIZATION|BCS302|\bCOA\b', "Computer Organization & Architecture (COA)", 3),
    (r'DISCRETE[\s\-_]*STRUCTURES?|BCS303|\bDSTL\b', "Discrete Structures & Theory of Logic (DSTL)", 3),
    (r'OPERATING[\s\-_]*SYSTEMS?|BCS401|\bOS\b', "Operating Systems", 4),
    (r'AUTOMATA|FORMAL[\s\-_]*LANGUAGES|BCS402|\bTAFL\b', "Theory of Automata and Formal Languages (TAFL)", 4),
    (r'OOP|JAVA|BCS403', "OOP with Java", 4),
    (r'PYTHON|BCC302|BCC402', "Python Programming", 3),
    (r'CYBER[\s\-_]*SECURITY|BCC301|BCC401', "Cyber Security", 3),
    (r'HUMAN[\s\-_]*VALUES|UHVPE|BVE301|BVE401', "Universal Human Values (UHVPE)", 3),
    (r'TECHNICAL[\s\-_]*COMMUNICATION|BAS301|BAS401|\bTC\b', "Technical Communication", 3),
    (r'PLACEMENT[\s\-_]*PREPARATION|LOGICAL[\s\-_]*REASONING|QUANTITATIVE[\s\-_]*APTITUDE', "Placement Preparation", 4),
    (r'DIGITAL[\s\-_]*SYSTEM[\s\-_]*DESIGN|\bDSD\b', "Digital System Design (DSD)", 4),
    (r'NETWORK[\s\-_]*ANALYSIS|\bNAS\b', "Network Analysis & Synthesis (NAS)", 4),
    (r'DIGITAL[\s\-_]*ELECTRONICS|BOE310|\bDE\b', "Digital Electronics", 3),
    (r'ELECTRONICS[\s\-_]*BY[\s\-_]*GULSHAN|ELECTRONICS[\s\-_]*ENGINEERING', "Electronics Engineering", 3),
    (r'LASER[\s\-_]*SYSTEM', "Laser Systems & Applications", 4),
    (r'ENERGY[\s\-_]*SCIENCE|\bES\b', "Energy Science & Engineering", 4),
    (r'ANALOG[\s\-_]*CIRCUITS?', "Analog Circuits", 4),
    (r'MATERIAL[\s\-_]*SCIENCE', "Material Science", 4),

    # --- ECE 3rd Year (Sem 5 & 6) ---
    (r'BEC501|INTEGRATED[\s\-_]*CIRCUITS|\bIC\b', "Integrated Circuits (IC)", 5),
    (r'BEC502|MICROPROCESSOR|\bMM\b', "Microprocessor & Microcontroller (MM)", 5),
    (r'BEC503|DIGITAL[\s\-_]*SIGNAL[\s\-_]*PROCESSING|\bDSP\b', "Digital Signal Processing (DSP)", 5),
    (r'BEC601|DIGITAL[\s\-_]*COMMUNICATION', "Digital Communication", 6),
    (r'BEC602|CONTROL[\s\-_]*SYSTEM', "Control System", 6),
    (r'BEC603|ANTENNA', "Antenna & Wave Propagation", 6),
    (r'BNC601|CONSTITUTION[\s\-_]*OF[\s\-_]*INDIA|\bCOI\b', "Constitution of India (COI)", 6),
    (r'BNC602|ESSENCE[\s\-_]*OF[\s\-_]*INDIAN|\bEITK\b', "Essence of Indian Traditional Knowledge (EITK)", 6),
    (r'BEC054|VLSI', "VLSI Technology", 5),
    (r'BEC055|ELECTRONICS[\s\-_]*SWITCHING', "Electronics Switching", 5),
    (r'BEC057|OPTICAL[\s\-_]*COMMUNICATION', "Optical Communication", 5),
]

def read_lines_safely(file_path):
    for enc in ["utf-8-sig", "utf-8", "utf-16", "cp1252", "latin-1"]:
        try:
            with open(file_path, "r", encoding=enc) as f:
                txt = f.read()
                if txt:
                    return txt.splitlines()
        except:
            continue
    return []

def clean_url(raw_url):
    url = raw_url.strip()
    if "google.com/search?q=" in url:
        url = url.split("google.com/search?q=")[-1]
    return unquote(url).strip()

def detect_subject_and_sem(search_text, fallback_sem=3):
    text = search_text.upper()
    for pattern, subj_name, sem in SUBJECT_RULES:
        if re.search(pattern, text):
            return subj_name, sem
    if "SYLLABUS" in text or "SYLL" in text:
        return "General Syllabus", fallback_sem
    return "General Notes", fallback_sem

def detect_category(text):
    t = text.upper()
    if "PYQ" in t or "PREVIOUS YEAR" in t:
        return "PYQs"
    if "QUANTUM" in t or "QUESTION BANK" in t or "IMP" in t or "IMPORTANT" in t:
        return "Quantum"
    if "SYLLABUS" in t or "SYLL" in t:
        return "Syllabus"
    return "Notes"

def process_vault_files():
    search_dirs = ["raw_notes", "."]
    excluded_names = {"notes_data.txt", "notes_data_2.txt", "vault_data.txt", "dist_inspected_code.txt", "managing cmd.txt"}

    input_files = []
    for d in search_dirs:
        if os.path.exists(d):
            for fp in glob.glob(os.path.join(d, "*.txt")):
                base = os.path.basename(fp)
                if base not in excluded_names and fp not in input_files:
                    input_files.append(fp)

    if not input_files:
        print("[!] No raw .txt files found to process.")
        return

    print(f"[*] Found {len(input_files)} raw txt files: {input_files}")

    all_records = []

    for fp in input_files:
        base_name = os.path.basename(fp).lower()

        if "ece" in base_name:
            default_branch = "ECE"
            fallback_sem = 5
        elif "cse" in base_name:
            default_branch = "CSE"
            fallback_sem = 3
        elif "it" in base_name:
            default_branch = "IT"
            fallback_sem = 3
        else:
            default_branch = "GEN"
            fallback_sem = 3

        lines = read_lines_safely(fp)
        current_section = ""
        valid_in_file = 0

        for line in lines:
            line = line.replace("\x00", "").strip()
            if not line or line.startswith("==="):
                continue

            if line.startswith("###"):
                current_section = line.replace("#", "").strip()
                continue

            # Case A: Pipe Delimited Format
            if "|" in line:
                parts = [p.strip() for p in line.split("|")]
                if len(parts) >= 6:
                    branch, sem, subject, category, title = parts[:5]
                    url = clean_url("|".join(parts[5:]))
                    all_records.append({
                        "branch": branch.upper(),
                        "sem": sem,
                        "subject": subject,
                        "category": category,
                        "title": title,
                        "url": url
                    })
                    valid_in_file += 1
                continue

            # Case B: Bracketed / Emoji Format
            url_match = re.search(r'https?://[^\s]+', line)
            if url_match:
                raw_url = url_match.group(0)
                clean_link = clean_url(raw_url)
                text_part = line[:url_match.start()].strip()

                # Remove date brackets like [2026/07/11]
                text_part = re.sub(r'\[\d{4}/\d{2}/\d{2}\]', '', text_part).strip()

                brackets = re.findall(r'\[(.*?)\]', text_part)
                if brackets:
                    title = brackets[-1].strip()
                    search_context = " ".join(brackets) + " " + current_section
                else:
                    title = text_part.lstrip("📄 ").rstrip(" :").strip()
                    search_context = title + " " + current_section

                subject, sem = detect_subject_and_sem(search_context, fallback_sem=fallback_sem)
                category = detect_category(search_context)
                branch = default_branch

                # Keep CSE 2nd year files strictly in 2nd year (Sem 3 or 4)
                if default_branch == "CSE" and fallback_sem == 3:
                    if sem not in [3, 4]:
                        sem = 3

                # NO DEDUPLICATION: Add every valid entry
                all_records.append({
                    "branch": branch.upper(),
                    "sem": sem,
                    "subject": subject,
                    "category": category,
                    "title": title,
                    "url": clean_link
                })
                valid_in_file += 1

        print(f"    -> Loaded all {valid_in_file} records from '{fp}'")

    print(f"\n[*] Total records processed (No filter): {len(all_records)}")

    # 1. Generate master notes_data.txt
    lines_output = [
        f"{r['branch']} | {r['sem']} | {r['subject']} | {r['category']} | {r['title']} | {r['url']}"
        for r in all_records
    ]

    with open("notes_data.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(lines_output) + "\n")

    os.makedirs("public", exist_ok=True)
    with open(os.path.join("public", "notes_data.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines_output) + "\n")

    print("[✓] Generated: notes_data.txt & public/notes_data.txt")

    # 2. Build Frontend JSON
    branches = {
        "cse": {"code": "cse", "name": "[1] CSE", "years": {}},
        "ece": {"code": "ece", "name": "[2] ECE", "years": {}},
        "ee":  {"code": "ee",  "name": "[3] EE",  "years": {}},
        "me":  {"code": "me",  "name": "[4] ME",  "years": {}},
        "ce":  {"code": "ce",  "name": "[5] CE",  "years": {}},
        "it":  {"code": "it",  "name": "[6] IT",  "years": {}}
    }

    year_meta = {
        "1ST_YEAR": {"id": "1ST_YEAR", "name": "[1] 1st Year (1ST_YEAR)", "subtitle": "Common to all (Sem 1 & 2)"},
        "2ND_YEAR": {"id": "2ND_YEAR", "name": "[2] 2nd Year (2ND_YEAR)", "subtitle": "Core Basics (Sem 3 & 4)"},
        "3RD_YEAR": {"id": "3RD_YEAR", "name": "[3] 3rd Year (3RD_YEAR)", "subtitle": "Advanced & Labs (Sem 5 & 6)"},
        "4TH_YEAR": {"id": "4TH_YEAR", "name": "[4] 4th Year (4TH_YEAR)", "subtitle": "Specializations (Sem 7 & 8)"}
    }

    for b in branches.values():
        for y_id, y_info in year_meta.items():
            b["years"][y_id] = {
                "id": y_id,
                "name": y_info["name"],
                "subtitle": y_info["subtitle"],
                "subjects": {}
            }

    for r in all_records:
        b_key = r["branch"].lower()
        if b_key not in branches:
            branches[b_key] = {"code": b_key, "name": f"[{b_key.upper()}]", "years": {}}
            for y_id, y_info in year_meta.items():
                branches[b_key]["years"][y_id] = {
                    "id": y_id,
                    "name": y_info["name"],
                    "subtitle": y_info["subtitle"],
                    "subjects": {}
                }

        try:
            sem_num = int(r["sem"])
        except:
            sem_num = 3

        if sem_num in [1, 2]:
            y_key = "1ST_YEAR"
        elif sem_num in [3, 4]:
            y_key = "2ND_YEAR"
        elif sem_num in [5, 6]:
            y_key = "3RD_YEAR"
        else:
            y_key = "4TH_YEAR"

        subj = r["subject"]
        year_obj = branches[b_key]["years"][y_key]

        if subj not in year_obj["subjects"]:
            year_obj["subjects"][subj] = {
                "name": subj,
                "files": []
            }

        year_obj["subjects"][subj]["files"].append({
            "title": r["title"],
            "category": r["category"],
            "sem": sem_num,
            "url": r["url"]
        })

    for b_key, b_data in branches.items():
        total_branch = 0
        for y_key, y_data in b_data["years"].items():
            total_year = 0
            for s_name, s_data in y_data["subjects"].items():
                s_data["count"] = len(s_data["files"])
                total_year += s_data["count"]
            y_data["totalFiles"] = total_year
            y_data["badge"] = f"{total_year} DOCS" if total_year > 0 else "0 FILES"
            total_branch += total_year
        b_data["totalFiles"] = total_branch
        b_data["countText"] = f"{total_branch} files" if total_branch > 0 else "empty"

    with open(os.path.join("public", "vault_data.json"), "w", encoding="utf-8") as f:
        json.dump(branches, f, indent=2, ensure_ascii=False)

    print("[✓] Generated: public/vault_data.json")
    print(f"\n[SUCCESS] CSE: {branches['cse']['totalFiles']} total files | ECE: {branches['ece']['totalFiles']} total files!")

if __name__ == "__main__":
    process_vault_files()
