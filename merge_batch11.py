#!/usr/bin/env python3
"""Merge Batch 11: Periodontics therapy & surgery + occlusal splint fabrication"""
import json

# Load existing
with open('client/src/data/treatments.au.json', 'r') as f:
    treatments = json.load(f)
with open('client/src/data/mappings.core.json', 'r') as f:
    mappings = json.load(f)

# Batch 11 treatments
new_treatments = [
    # PERIODONTAL THERAPY
    {
        "code": "perio_full_mouth_debridement",
        "displayName": "Full-Mouth Debridement (Gross Debridement)",
        "friendlyPatientName": "Deep clean (gross debridement)",
        "category": "periodontics",
        "description": "Initial full-mouth gross debridement to remove heavy calculus/plaque prior to definitive therapy.",
        "defaultDuration": 45,
        "defaultPriceAUD": 180,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["gingivitis_plaque","calculus","periodontitis_stage_i_ii","periodontitis_stage_iii_iv"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {}
    },
    {
        "code": "perio_srp_quadrant_v2",
        "displayName": "Scaling & Root Planing — per Quadrant",
        "friendlyPatientName": "Deep clean under gums (per quadrant)",
        "category": "periodontics",
        "description": "Subgingival instrumentation to remove calculus and smooth root surfaces for periodontal healing.",
        "defaultDuration": 60,
        "defaultPriceAUD": 250,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["periodontitis_stage_i_ii","periodontitis_stage_iii_iv","periodontal-pocket"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"perUnit": "quadrant"}
    },
    {
        "code": "perio_re_evaluation_4_6w",
        "displayName": "Periodontal Re-evaluation (4–6 Weeks)",
        "friendlyPatientName": "Perio re-check (4–6 weeks)",
        "category": "periodontics",
        "description": "Re-assessment of pockets, bleeding, and plaque control after initial periodontal therapy.",
        "defaultDuration": 20,
        "defaultPriceAUD": 70,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["periodontitis_stage_i_ii","periodontitis_stage_iii_iv","gingivitis_plaque"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {}
    },
    # PERIODONTAL SURGERY
    {
        "code": "perio_gingivectomy_per_sextant",
        "displayName": "Gingivectomy — per Sextant",
        "friendlyPatientName": "Gum recontouring (per sextant)",
        "category": "periodontics",
        "description": "Excision of excess/inflamed gingival tissue to reduce pocketing and improve contours.",
        "defaultDuration": 30,
        "defaultPriceAUD": 260,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["periodontitis_stage_i_ii","periodontitis_stage_iii_iv","gingivitis_plaque"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"perUnit": "sextant", "surgical": True}
    },
    {
        "code": "perio_crown_lengthening_functional_single",
        "displayName": "Crown Lengthening — Functional (Single Tooth)",
        "friendlyPatientName": "Functional crown lengthening (single tooth)",
        "category": "periodontics",
        "description": "Surgical adjustment of gingiva/bone to increase clinical crown length for restorative access.",
        "defaultDuration": 60,
        "defaultPriceAUD": 650,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["failed_restoration","fractured_cusp_restorable","existing-large-filling"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"surgical": True, "perUnit": "tooth"}
    },
    {
        "code": "perio_crown_lengthening_aesthetic_segment",
        "displayName": "Crown Lengthening — Aesthetic (Anterior Segment)",
        "friendlyPatientName": "Aesthetic crown lengthening (front teeth)",
        "category": "periodontics",
        "description": "Anterior aesthetic crown lengthening to harmonise gingival margins and tooth display.",
        "defaultDuration": 90,
        "defaultPriceAUD": 1200,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["aesthetic_shape_alignment"],
        "toothNumberRules": {"anteriorFDI": [13,12,11,21,22,23,33,32,31,41,42,43]},
        "replacementOptions": [],
        "metadata": {"surgical": True}
    },
    {
        "code": "perio_flap_debridement_quadrant",
        "displayName": "Periodontal Flap Debridement — per Quadrant",
        "friendlyPatientName": "Perio flap surgery (per quadrant)",
        "category": "periodontics",
        "description": "Open flap debridement for access to deep pockets and root surfaces.",
        "defaultDuration": 75,
        "defaultPriceAUD": 480,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["periodontitis_stage_iii_iv"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"perUnit": "quadrant", "surgical": True}
    },
    {
        "code": "perio_osseous_recontouring_quadrant",
        "displayName": "Osseous Recontouring — per Quadrant",
        "friendlyPatientName": "Bone reshaping with flap (per quadrant)",
        "category": "periodontics",
        "description": "Osseous recontouring in conjunction with flap surgery to achieve physiologic bone architecture.",
        "defaultDuration": 90,
        "defaultPriceAUD": 620,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["periodontitis_stage_iii_iv"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"perUnit": "quadrant", "surgical": True}
    },
    {
        "code": "perio_gtr_localised",
        "displayName": "Guided Tissue Regeneration — Localised",
        "friendlyPatientName": "Guided tissue regeneration (local)",
        "category": "periodontics",
        "description": "Barrier membrane/graft for localised intrabony defect or furcation to regenerate attachment.",
        "defaultDuration": 60,
        "defaultPriceAUD": 950,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["periodontitis_stage_iii_iv"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"surgical": True, "adjunct": True}
    },
    {
        "code": "perio_ctg_single_site",
        "displayName": "Connective Tissue Graft — Single Site",
        "friendlyPatientName": "Gum graft (single site)",
        "category": "periodontics",
        "description": "Subepithelial connective tissue graft for root coverage or thin biotype augmentation.",
        "defaultDuration": 75,
        "defaultPriceAUD": 900,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": [],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"surgical": True, "perUnit": "site"}
    },
    {
        "code": "perio_fgg_single_site",
        "displayName": "Free Gingival Graft — Single Site",
        "friendlyPatientName": "Free gingival graft (single site)",
        "category": "periodontics",
        "description": "Free gingival graft to increase keratinised tissue width for hygiene and stability.",
        "defaultDuration": 70,
        "defaultPriceAUD": 800,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": [],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"surgical": True, "perUnit": "site"}
    },
    # OCCLUSAL SPLINT FABRICATION
    {
        "code": "splint_night_guard_hard",
        "displayName": "Occlusal Splint — Hard Acrylic (Laboratory)",
        "friendlyPatientName": "Night guard (hard acrylic)",
        "category": "functional",
        "description": "Custom hard acrylic occlusal splint for bruxism/TMJ protection and bite stabilisation.",
        "defaultDuration": 40,
        "defaultPriceAUD": 500,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["bruxism","tmj_pain_dysfunction","tooth_wear_attrition"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True}
    },
    {
        "code": "splint_night_guard_soft",
        "displayName": "Occlusal Splint — Soft EVA (Laboratory)",
        "friendlyPatientName": "Night guard (soft)",
        "category": "functional",
        "description": "Custom soft EVA splint for minor parafunction or interim protection.",
        "defaultDuration": 30,
        "defaultPriceAUD": 350,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["bruxism","tmj_pain_dysfunction"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True}
    }
]

# Merge treatments
existing_codes = {t['code']: i for i, t in enumerate(treatments)}
for new_t in new_treatments:
    if new_t['code'] in existing_codes:
        idx = existing_codes[new_t['code']]
        treatments[idx].update(new_t)
        print(f"✅ Updated: {new_t['code']}")
    else:
        treatments.append(new_t)
        print(f"➕ Added: {new_t['code']}")

# Sort by displayName then code
treatments.sort(key=lambda x: (x['displayName'].lower(), x['code']))

# Write treatments
with open('client/src/data/treatments.au.json', 'w') as f:
    json.dump(treatments, f, indent=2, ensure_ascii=False)

print(f"\n✅ Treatments updated: {len(treatments)} total")

# Batch 11 mappings - MERGE strategy
new_mappings = [
    {"condition": "gingivitis_plaque", "treatments": [
        {"treatment": "perio_full_mouth_debridement", "priority": 1, "stage": 2},
        {"treatment": "perio_re_evaluation_4_6w", "priority": 3, "stage": 3}
    ]},
    {"condition": "periodontitis_stage_i_ii", "treatments": [
        {"treatment": "perio_srp_quadrant_v2", "priority": 1, "stage": 2},
        {"treatment": "perio_re_evaluation_4_6w", "priority": 2, "stage": 2},
        {"treatment": "perio_gingivectomy_per_sextant", "priority": 3, "stage": 3}
    ]},
    {"condition": "periodontitis_stage_iii_iv", "treatments": [
        {"treatment": "perio_srp_quadrant_v2", "priority": 1, "stage": 2},
        {"treatment": "perio_flap_debridement_quadrant", "priority": 2, "stage": 2},
        {"treatment": "perio_osseous_recontouring_quadrant", "priority": 3, "stage": 3},
        {"treatment": "perio_gtr_localised", "priority": 4, "stage": 3}
    ]},
    {"condition": "failed_restoration", "treatments": [
        {"treatment": "perio_crown_lengthening_functional_single", "priority": 6, "stage": 2}
    ]},
    {"condition": "fractured_cusp_restorable", "treatments": [
        {"treatment": "perio_crown_lengthening_functional_single", "priority": 5, "stage": 2}
    ]},
    {"condition": "aesthetic_shape_alignment", "treatments": [
        {"treatment": "perio_crown_lengthening_aesthetic_segment", "priority": 6, "stage": 3}
    ]},
    {"condition": "bruxism", "treatments": [
        {"treatment": "splint_night_guard_hard", "priority": 1, "stage": 2},
        {"treatment": "splint_night_guard_soft", "priority": 2, "stage": 2}
    ]},
    {"condition": "tmj_pain_dysfunction", "treatments": [
        {"treatment": "splint_night_guard_hard", "priority": 2, "stage": 2}
    ]},
    {"condition": "tooth_wear_attrition", "treatments": [
        {"treatment": "splint_night_guard_hard", "priority": 3, "stage": 3}
    ]}
]

# MERGE: Add to existing mappings
existing_mappings = {m['condition']: i for i, m in enumerate(mappings)}
for new_m in new_mappings:
    cond = new_m['condition']
    if cond in existing_mappings:
        idx = existing_mappings[cond]
        existing_treatments = {t['treatment']: t for t in mappings[idx]['treatments']}
        for new_t in new_m['treatments']:
            existing_treatments[new_t['treatment']] = new_t
        mappings[idx]['treatments'] = list(existing_treatments.values())
        mappings[idx]['treatments'].sort(key=lambda x: x.get('priority', 999))
        print(f"🔄 Merged mapping: {cond} (now {len(mappings[idx]['treatments'])} treatments)")
    else:
        mappings.append(new_m)
        print(f"➕ Added mapping: {cond}")

# Write mappings
with open('client/src/data/mappings.core.json', 'w') as f:
    json.dump(mappings, f, indent=2, ensure_ascii=False)

print(f"\n✅ Mappings updated: {len(mappings)} conditions mapped")
print("\n🎉 Batch 11 merge complete!")

