# Project Aura — Social Science (10th Standard, Karnataka)

[![Board](https://img.shields.io/badge/Board-Karnataka%20KSEAB-blue)](https://kseab.karnataka.gov.in)
[![Standard](https://img.shields.io/badge/Standard-10th-green)](/)
[![Subject](https://img.shields.io/badge/Subject-Social%20Science-orange)](/)
[![Chapters](https://img.shields.io/badge/Chapters-33-purple)](/)
[![MCQs](https://img.shields.io/badge/MCQs-135+-red)](/)

## Overview

Comprehensive chapter-wise parsed content for **10th Standard Social Science** under the Karnataka State Board (KSEAB / KTBS syllabus), created for **Project Aura** — an AI-powered learning platform.

## Repository Structure

```
social_science/
├── manifest.json                          ← Master index file
├── README.md
├── history/                               ← 9 chapters
│   ├── chapter_01_advent_of_europeans.json
│   ├── chapter_02_extension_british_rule.json
│   ├── chapter_03_impact_british_rule.json
│   ├── chapter_04_opposition_british_karnataka.json
│   ├── chapter_05_social_religious_reform.json
│   ├── chapter_06_first_war_independence.json
│   ├── chapter_07_freedom_struggle.json
│   ├── chapter_08_india_after_independence.json
│   └── chapter_09_world_wars.json
├── political_science/                     ← 4 chapters
│   ├── chapter_01_public_administration.json
│   ├── chapter_02_challenges_india.json
│   ├── chapter_03_foreign_policy.json
│   └── chapter_04_world_organisations.json
├── sociology/                             ← 4 chapters
│   ├── chapter_01_social_stratification.json
│   ├── chapter_02_work_economic_life.json
│   ├── chapter_03_collective_behaviour.json
│   └── chapter_04_social_challenges.json
├── geography/                             ← 10 chapters
│   ├── chapter_01_geographical_position.json
│   ├── chapter_02_seasons.json
│   ├── chapter_03_soils.json
│   ├── chapter_04_forest_resources.json
│   ├── chapter_05_water_resources.json
│   ├── chapter_06_land_use_agriculture.json
│   ├── chapter_07_mineral_power_resources.json
│   ├── chapter_08_transport_communication.json
│   ├── chapter_09_major_industries.json
│   └── chapter_10_natural_disasters.json
├── economics/                             ← 3 chapters
│   ├── chapter_01_economy_government.json
│   ├── chapter_02_rural_development.json
│   └── chapter_03_public_finance_budget.json
└── business_studies/                      ← 3 chapters
    ├── chapter_01_banking_transactions.json
    ├── chapter_02_entrepreneurship.json
    └── chapter_03_consumer_education.json
```

## Data Statistics

| Section | Chapters | MCQs |
|---------|----------|------|
| History | 9 | 45+ |
| Political Science | 4 | 20+ |
| Sociology | 4 | 16+ |
| Geography | 10 | 40+ |
| Economics | 3 | 10+ |
| Business Studies | 3 | 12+ |
| **Total** | **33** | **135+** |

## JSON Schema

Each chapter file follows this structure:

```json
{
  "chapter_id": "SS-HIS-01",
  "subject": "Social Science",
  "section": "History",
  "chapter_number": 1,
  "chapter_name": "The Advent of Europeans to India",
  "learning_outcomes": [ "..." ],
  "key_terms": [
    { "term": "...", "definition": "..." }
  ],
  "important_dates": [
    { "year": "1498", "event": "..." }
  ],
  "mcqs": [
    {
      "q_id": "SS-HIS-01-MCQ-01",
      "question": "...",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "correct": "B",
      "explanation": "..."
    }
  ],
  "one_mark_questions": [
    { "question": "...", "answer": "..." }
  ],
  "two_mark_questions": [
    { "question": "...", "answer": ["point 1", "point 2"] }
  ],
  "three_mark_questions": [
    { "question": "...", "answer": ["point 1", "point 2", "point 3"] }
  ]
}
```

## Chapter ID Convention

| Prefix | Section |
|--------|---------|
| `SS-HIS-XX` | History |
| `SS-POL-XX` | Political Science |
| `SS-SOC-XX` | Sociology |
| `SS-GEO-XX` | Geography |
| `SS-ECO-XX` | Economics |
| `SS-BUS-XX` | Business Studies |

## Sources

- **Karnataka Textbook Society (KTBS)** — Social Science Part 1 & 2, 10th Standard
- **DSERT and DIET Haveri** — Question Bank with Solutions for Lesson-Based Assessment, 10th Std Social Science
- **KSEAB** — SSLC Model Question Paper 4 (2025-26), Subject Code 85-E (with Model Answers)
- **Exam year focus**: 2025-26 SSLC exam pattern

## Usage

```python
import json

# Load manifest
with open('manifest.json') as f:
    manifest = json.load(f)

print(f"Total chapters: {manifest['total_chapters']}")
print(f"Total MCQs: {manifest['total_mcqs']}")

# Load a specific chapter
with open('history/chapter_01_advent_of_europeans.json') as f:
    chapter = json.load(f)

# Get MCQs
for mcq in chapter['mcqs']:
    print(mcq['question'])
    print(f"Answer: {mcq['correct']}")
    print(f"Explanation: {mcq['explanation']}")
```

## License

Educational use only. Content based on Karnataka Government textbooks (KTBS) under public educational license.

---
*Generated for Project Aura | Karnataka SSLC 2025-26*
