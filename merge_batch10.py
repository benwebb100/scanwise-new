#!/usr/bin/env python3
"""Merge Batch 10: Preventive & cosmetic set, indirect restorations, emergency treatments"""
import json

# Load existing
with open('client/src/data/treatments.au.json', 'r') as f:
    treatments = json.load(f)
with open('client/src/data/mappings.core.json', 'r') as f:
    mappings = json.load(f)

# Batch 10 treatments
new_treatments = [
    # PREVENTIVE
    {
        "code": "prophy_scale_polish",
        "displayName": "Prophylaxis — Scale and Polish",
        "friendlyPatientName": "Scale & polish clean",
        "category": "preventive",
        "description": "Removal of plaque and calculus with polishing to reduce gingival inflammation.",
        "defaultDuration": 30,
        "defaultPriceAUD": 150,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["gingivitis_plaque","calculus","plaque"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {}
    },
    {
        "code": "fluoride_varnish_v2",
        "displayName": "Topical Fluoride — Varnish",
        "friendlyPatientName": "Fluoride varnish",
        "category": "preventive",
        "description": "Application of fluoride varnish to reduce caries risk and sensitivity.",
        "defaultDuration": 10,
        "defaultPriceAUD": 45,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["caries_enamel","caries_root","dentine_hypersensitivity"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {}
    },
    {
        "code": "fissure_sealant_per_tooth_v2",
        "displayName": "Fissure Sealant — per Tooth",
        "friendlyPatientName": "Fissure sealant (per tooth)",
        "category": "preventive",
        "description": "Resin sealant placed on pits and fissures to prevent decay.",
        "defaultDuration": 10,
        "defaultPriceAUD": 55,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["caries_enamel","caries_root"],
        "toothNumberRules": {"molarFDI": [16,17,26,27,36,37,46,47], "premolarFDI": [14,15,24,25,34,35,44,45]},
        "replacementOptions": [],
        "metadata": {"perUnit": "tooth"}
    },
    {
        "code": "desensitising_agent_per_quadrant",
        "displayName": "Desensitising Agent — per Quadrant",
        "friendlyPatientName": "Tooth desensitiser (per quadrant)",
        "category": "preventive",
        "description": "Application of desensitising agent to exposed dentine surfaces.",
        "defaultDuration": 10,
        "defaultPriceAUD": 40,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["dentine_hypersensitivity","tooth_wear_abfraction","tooth_wear_erosion"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"perUnit": "quadrant"}
    },
    {
        "code": "dietary_counselling",
        "displayName": "Dietary Counselling — Caries Risk",
        "friendlyPatientName": "Diet advice for teeth",
        "category": "preventive",
        "description": "Targeted counselling to reduce fermentable carbohydrate exposure and caries risk.",
        "defaultDuration": 10,
        "defaultPriceAUD": 35,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["caries_enamel","caries_dentine","caries_recurrent"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {}
    },
    {
        "code": "smoking_cessation_counselling",
        "displayName": "Smoking Cessation Counselling",
        "friendlyPatientName": "Quit smoking support",
        "category": "preventive",
        "description": "Brief intervention and planning to support smoking cessation for oral and general health.",
        "defaultDuration": 10,
        "defaultPriceAUD": 40,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["periodontitis_stage_i_ii","periodontitis_stage_iii_iv","pericoronitis"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {}
    },
    # COSMETIC
    {
        "code": "whitening_in_chair_v2",
        "displayName": "Teeth Whitening — In-Chair",
        "friendlyPatientName": "In-chair whitening",
        "category": "cosmetic",
        "description": "Professional in-chair bleaching session with isolation and high-strength gel.",
        "defaultDuration": 60,
        "defaultPriceAUD": 650,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["aesthetic_discolouration","staining","fluorosis"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {}
    },
    {
        "code": "whitening_take_home_kit",
        "displayName": "Teeth Whitening — Take-Home Kit",
        "friendlyPatientName": "Take-home whitening kit",
        "category": "cosmetic",
        "description": "Custom trays and professional-strength gel for home whitening.",
        "defaultDuration": 30,
        "defaultPriceAUD": 450,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["aesthetic_discolouration","staining","fluorosis"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True}
    },
    {
        "code": "enamel_microabrasion",
        "displayName": "Enamel Microabrasion",
        "friendlyPatientName": "Microabrasion for spots",
        "category": "cosmetic",
        "description": "Conservative removal of superficial enamel discolorations/defects.",
        "defaultDuration": 30,
        "defaultPriceAUD": 220,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["fluorosis","aesthetic_discolouration","staining"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {}
    },
    {
        "code": "veneer_porcelain_v2",
        "displayName": "Porcelain Veneer",
        "friendlyPatientName": "Porcelain veneer",
        "category": "cosmetic",
        "description": "Indirect ceramic veneer for aesthetic shape/colour correction.",
        "defaultDuration": 80,
        "defaultPriceAUD": 1200,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["aesthetic_discolouration","aesthetic_shape_alignment","staining"],
        "toothNumberRules": {"anteriorFDI": [13,12,11,21,22,23,33,32,31,41,42,43]},
        "replacementOptions": [],
        "metadata": {"labWork": True}
    },
    {
        "code": "veneer_composite_direct_v2",
        "displayName": "Composite Veneer — Direct",
        "friendlyPatientName": "Composite veneer",
        "category": "cosmetic",
        "description": "Direct composite veneer for aesthetic improvement.",
        "defaultDuration": 60,
        "defaultPriceAUD": 450,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["aesthetic_discolouration","aesthetic_shape_alignment"],
        "toothNumberRules": {"anteriorFDI": [13,12,11,21,22,23,33,32,31,41,42,43]},
        "replacementOptions": [],
        "metadata": {}
    },
    # INDIRECT RESTORATIONS
    {
        "code": "onlay_ceramic",
        "displayName": "Ceramic Onlay",
        "friendlyPatientName": "Ceramic onlay",
        "category": "restorative",
        "description": "Indirect ceramic onlay for cuspal coverage and reinforcement of heavily restored teeth.",
        "defaultDuration": 90,
        "defaultPriceAUD": 980,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["existing-large-filling","fractured_cusp_restorable","tooth_wear_attrition","tooth_wear_erosion"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True}
    },
    {
        "code": "onlay_gold",
        "displayName": "Gold Onlay",
        "friendlyPatientName": "Gold onlay",
        "category": "restorative",
        "description": "Cast gold onlay for high-strength cuspal coverage with excellent longevity.",
        "defaultDuration": 90,
        "defaultPriceAUD": 1100,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["existing-large-filling","tooth_wear_attrition"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True}
    },
    {
        "code": "inlay_ceramic",
        "displayName": "Ceramic Inlay",
        "friendlyPatientName": "Ceramic inlay",
        "category": "restorative",
        "description": "Indirect ceramic inlay for proximal/occlusal defects where cuspal coverage not required.",
        "defaultDuration": 80,
        "defaultPriceAUD": 840,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["caries_dentine","caries_recurrent","existing-large-filling"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True}
    },
    {
        "code": "inlay_gold",
        "displayName": "Gold Inlay",
        "friendlyPatientName": "Gold inlay",
        "category": "restorative",
        "description": "Cast gold inlay for proximal/occlusal restorations with high wear resistance.",
        "defaultDuration": 80,
        "defaultPriceAUD": 980,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["caries_dentine","existing-large-filling"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True}
    },
    # EXTRA CROWN TYPES
    {
        "code": "crown_pfm",
        "displayName": "Crown — Porcelain-Fused-to-Metal (PFM)",
        "friendlyPatientName": "PFM crown",
        "category": "prosthodontics",
        "description": "Full-coverage crown with porcelain fused to metal substructure.",
        "defaultDuration": 90,
        "defaultPriceAUD": 1450,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["failed_restoration","fractured_cusp_restorable","tooth_wear_attrition"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True}
    },
    {
        "code": "crown_full_metal",
        "displayName": "Crown — Full Metal",
        "friendlyPatientName": "Full metal crown",
        "category": "prosthodontics",
        "description": "Full-coverage metal crown (e.g., gold alloy) for maximal strength.",
        "defaultDuration": 90,
        "defaultPriceAUD": 1350,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["tooth_wear_attrition","existing-large-filling"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True}
    },
    {
        "code": "crown_temp_indirect",
        "displayName": "Provisional Crown — Indirect",
        "friendlyPatientName": "Temporary crown",
        "category": "prosthodontics",
        "description": "Laboratory or chairside provisional crown to protect preparation before final crown.",
        "defaultDuration": 30,
        "defaultPriceAUD": 220,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["failed_restoration","fractured_cusp_restorable"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"provisional": True}
    },
    # EMERGENCY
    {
        "code": "endo_access_open_and_dress",
        "displayName": "Access Opening and Dressing",
        "friendlyPatientName": "Open tooth & medicate",
        "category": "endodontics",
        "description": "Emergency access cavity with medicament/dressing to relieve symptoms pending definitive treatment.",
        "defaultDuration": 30,
        "defaultPriceAUD": 220,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["irreversible_pulpitis","symptomatic_apical_periodontitis","flare_up_post_endo"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {}
    },
    {
        "code": "surg_incision_and_drainage",
        "displayName": "Incision and Drainage (Intraoral)",
        "friendlyPatientName": "Incision & drainage",
        "category": "oral-surgery",
        "description": "Incision and drainage of localized abscess with irrigation as indicated.",
        "defaultDuration": 30,
        "defaultPriceAUD": 260,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["periapical_abscess","periodontal_abscess"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"surgical": True}
    },
    {
        "code": "dry_socket_alveolar_dressing",
        "displayName": "Dry Socket — Alveolar Dressing",
        "friendlyPatientName": "Dry socket dressing",
        "category": "oral-surgery",
        "description": "Irrigation and medicated dressing of alveolus for alveolar osteitis (dry socket).",
        "defaultDuration": 15,
        "defaultPriceAUD": 90,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["dry_socket"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {}
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

# Batch 10 mappings - MERGE strategy
new_mappings = [
    {"condition": "gingivitis_plaque", "treatments": [
        {"treatment": "prophy_scale_polish", "priority": 1, "stage": 2},
        {"treatment": "fluoride_varnish_v2", "priority": 2, "stage": 2},
        {"treatment": "dietary_counselling", "priority": 3, "stage": 3}
    ]},
    {"condition": "calculus", "treatments": [
        {"treatment": "prophy_scale_polish", "priority": 1, "stage": 2}
    ]},
    {"condition": "caries_enamel", "treatments": [
        {"treatment": "fissure_sealant_per_tooth_v2", "priority": 1, "stage": 2},
        {"treatment": "fluoride_varnish_v2", "priority": 2, "stage": 2}
    ]},
    {"condition": "dentine_hypersensitivity", "treatments": [
        {"treatment": "desensitising_agent_per_quadrant", "priority": 1, "stage": 2},
        {"treatment": "fluoride_varnish_v2", "priority": 2, "stage": 2}
    ]},
    {"condition": "aesthetic_discolouration", "treatments": [
        {"treatment": "whitening_in_chair_v2", "priority": 1, "stage": 3},
        {"treatment": "whitening_take_home_kit", "priority": 2, "stage": 3},
        {"treatment": "enamel_microabrasion", "priority": 3, "stage": 3},
        {"treatment": "veneer_porcelain_v2", "priority": 4, "stage": 3},
        {"treatment": "veneer_composite_direct_v2", "priority": 5, "stage": 3}
    ]},
    {"condition": "staining", "treatments": [
        {"treatment": "whitening_take_home_kit", "priority": 1, "stage": 3},
        {"treatment": "whitening_in_chair_v2", "priority": 2, "stage": 3}
    ]},
    {"condition": "fluorosis", "treatments": [
        {"treatment": "enamel_microabrasion", "priority": 1, "stage": 3},
        {"treatment": "whitening_take_home_kit", "priority": 2, "stage": 3}
    ]},
    {"condition": "aesthetic_shape_alignment", "treatments": [
        {"treatment": "veneer_porcelain_v2", "priority": 3, "stage": 3},
        {"treatment": "veneer_composite_direct_v2", "priority": 4, "stage": 3}
    ]},
    {"condition": "existing-large-filling", "treatments": [
        {"treatment": "onlay_ceramic", "priority": 1, "stage": 3},
        {"treatment": "onlay_gold", "priority": 2, "stage": 3},
        {"treatment": "inlay_ceramic", "priority": 3, "stage": 3},
        {"treatment": "crown_pfm", "priority": 4, "stage": 3}
    ]},
    {"condition": "fractured_cusp_restorable", "treatments": [
        {"treatment": "onlay_ceramic", "priority": 1, "stage": 2},
        {"treatment": "crown_full_metal", "priority": 2, "stage": 3},
        {"treatment": "crown_pfm", "priority": 3, "stage": 3},
        {"treatment": "crown_temp_indirect", "priority": 4, "stage": 2}
    ]},
    {"condition": "tooth_wear_attrition", "treatments": [
        {"treatment": "onlay_gold", "priority": 1, "stage": 3},
        {"treatment": "crown_full_metal", "priority": 2, "stage": 3}
    ]},
    {"condition": "tooth_wear_erosion", "treatments": [
        {"treatment": "onlay_ceramic", "priority": 1, "stage": 3},
        {"treatment": "inlay_ceramic", "priority": 2, "stage": 3}
    ]},
    {"condition": "irreversible_pulpitis", "treatments": [
        {"treatment": "endo_access_open_and_dress", "priority": 1, "stage": 1}
    ]},
    {"condition": "symptomatic_apical_periodontitis", "treatments": [
        {"treatment": "endo_access_open_and_dress", "priority": 1, "stage": 1}
    ]},
    {"condition": "periapical_abscess", "treatments": [
        {"treatment": "surg_incision_and_drainage", "priority": 1, "stage": 1}
    ]},
    {"condition": "periodontal_abscess", "treatments": [
        {"treatment": "surg_incision_and_drainage", "priority": 1, "stage": 1}
    ]},
    {"condition": "dry_socket", "treatments": [
        {"treatment": "dry_socket_alveolar_dressing", "priority": 1, "stage": 1}
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
print("\n🎉 Batch 10 merge complete!")

