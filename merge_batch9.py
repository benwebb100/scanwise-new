#!/usr/bin/env python3
"""Merge Batch 9: Endodontic retreatment, apical surgery, perio adjuncts, implant second-stage, diagnostics, ortho"""
import json

# Load existing
with open('client/src/data/treatments.au.json', 'r') as f:
    treatments = json.load(f)
with open('client/src/data/mappings.core.json', 'r') as f:
    mappings = json.load(f)

# Batch 9 treatments
new_treatments = [
    {
        "code": "endo_retreatment_prep_1",
        "displayName": "Endodontic Retreatment — Instrument/Prep (1 canal)",
        "friendlyPatientName": "Root canal re-treatment (1 canal prep)",
        "category": "endodontics",
        "description": "Removal of existing root filling and re-instrumentation of the primary canal.",
        "defaultDuration": 50,
        "defaultPriceAUD": 450,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["periapical-lesion","necrotic_pulp","asymptomatic_apical_periodontitis","symptomatic_apical_periodontitis"],
        "toothNumberRules": {"anteriorFDI": [13,12,11,21,22,23,33,32,31,41,42,43]},
        "replacementOptions": [],
        "metadata": {}
    },
    {
        "code": "endo_retreatment_prep_addl",
        "displayName": "Endodontic Retreatment — Instrument/Prep (each additional canal)",
        "friendlyPatientName": "Retreatment — extra canal prep",
        "category": "endodontics",
        "description": "Re-instrumentation for each additional canal beyond the first.",
        "defaultDuration": 20,
        "defaultPriceAUD": 180,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["periapical-lesion","necrotic_pulp","asymptomatic_apical_periodontitis","symptomatic_apical_periodontitis"],
        "toothNumberRules": {"premolarFDI": [14,15,24,25,34,35,44,45], "molarFDI": [16,17,26,27,36,37,46,47]},
        "replacementOptions": [],
        "metadata": {}
    },
    {
        "code": "endo_retreatment_obt_1",
        "displayName": "Endodontic Retreatment — Obturation (1 canal)",
        "friendlyPatientName": "Retreatment — fill 1 canal",
        "category": "endodontics",
        "description": "Re-obturation of the primary canal after retreatment.",
        "defaultDuration": 30,
        "defaultPriceAUD": 280,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["periapical-lesion","necrotic_pulp"],
        "toothNumberRules": {"anteriorFDI": [13,12,11,21,22,23,33,32,31,41,42,43]},
        "replacementOptions": [],
        "metadata": {}
    },
    {
        "code": "endo_retreatment_obt_addl",
        "displayName": "Endodontic Retreatment — Obturation (each additional canal)",
        "friendlyPatientName": "Retreatment — fill extra canal",
        "category": "endodontics",
        "description": "Re-obturation for each additional canal beyond the first.",
        "defaultDuration": 15,
        "defaultPriceAUD": 160,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["periapical-lesion","necrotic_pulp"],
        "toothNumberRules": {"premolarFDI": [14,15,24,25,34,35,44,45], "molarFDI": [16,17,26,27,36,37,46,47]},
        "replacementOptions": [],
        "metadata": {}
    },
    {
        "code": "endo_root_end_filling_mta",
        "displayName": "Root-End Filling (MTA/Equivalent)",
        "friendlyPatientName": "Root-end filling",
        "category": "endodontics",
        "description": "Placement of bioceramic root-end filling after apicectomy to seal the apex.",
        "defaultDuration": 20,
        "defaultPriceAUD": 220,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["asymptomatic_apical_periodontitis","symptomatic_apical_periodontitis","periapical-lesion"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"surgical": True}
    },
    {
        "code": "endo_post_op_review",
        "displayName": "Endodontic Post-Op Review",
        "friendlyPatientName": "Root canal review",
        "category": "endodontics",
        "description": "Review appointment after endodontic treatment or apical surgery to assess healing.",
        "defaultDuration": 10,
        "defaultPriceAUD": 40,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["periapical-lesion","asymptomatic_apical_periodontitis","symptomatic_apical_periodontitis"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {}
    },
    {
        "code": "perio_local_antimicrobial_site",
        "displayName": "Local Antimicrobial (per site)",
        "friendlyPatientName": "Local antibiotic gel (per site)",
        "category": "periodontics",
        "description": "Locally delivered antimicrobial agent into periodontal pocket as an adjunct to SRP.",
        "defaultDuration": 10,
        "defaultPriceAUD": 60,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["periodontitis_stage_i_ii","periodontitis_stage_iii_iv"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"perUnit": "site", "adjunct": True}
    },
    {
        "code": "perio_chlorhexidine_dispense",
        "displayName": "Chlorhexidine Mouthrinse — Dispense",
        "friendlyPatientName": "Chlorhexidine mouthrinse (dispensed)",
        "category": "periodontics",
        "description": "Dispense/issue chlorhexidine mouthrinse with usage instructions as perio adjunct.",
        "defaultDuration": 5,
        "defaultPriceAUD": 15,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["gingivitis_plaque","periodontitis_stage_i_ii","periodontitis_stage_iii_iv","pericoronitis"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"dispensed": True}
    },
    {
        "code": "perio_recall_3m",
        "displayName": "Periodontal Maintenance — 3-Month Recall",
        "friendlyPatientName": "Perio review (3-monthly)",
        "category": "periodontics",
        "description": "Scheduled supportive perio care at 3-month intervals for disease control.",
        "defaultDuration": 40,
        "defaultPriceAUD": 170,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["periodontitis_stage_i_ii","periodontitis_stage_iii_iv"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"recall": "3m"}
    },
    {
        "code": "implant_uncover_second_stage",
        "displayName": "Implant Uncovering — Second Stage",
        "friendlyPatientName": "Uncover implant (second stage)",
        "category": "oral-surgery",
        "description": "Expose integrated implant and place healing abutment where indicated.",
        "defaultDuration": 30,
        "defaultPriceAUD": 350,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["missing_single_tooth","partial_edentulism"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"surgical": True}
    },
    {
        "code": "implant_healing_abutment_placement",
        "displayName": "Healing Abutment — Placement",
        "friendlyPatientName": "Place healing abutment",
        "category": "oral-surgery",
        "description": "Placement of a healing abutment to shape peri-implant soft tissue.",
        "defaultDuration": 10,
        "defaultPriceAUD": 120,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["missing_single_tooth","partial_edentulism"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {}
    },
    {
        "code": "surg_socket_preservation_graft",
        "displayName": "Socket Preservation Graft",
        "friendlyPatientName": "Socket preservation (bone graft)",
        "category": "oral-surgery",
        "description": "Bone graft and membrane at extraction site to preserve ridge for future implant/bridge.",
        "defaultDuration": 45,
        "defaultPriceAUD": 900,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["tooth_nonrestorable","retained_root","fracture","missing_single_tooth"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"surgical": True}
    },
    {
        "code": "radiograph_cbct_large_field",
        "displayName": "CBCT — Large Field",
        "friendlyPatientName": "3D scan (full arch/large area)",
        "category": "general",
        "description": "Large field-of-view CBCT for comprehensive surgical or orthodontic planning.",
        "defaultDuration": 10,
        "defaultPriceAUD": 280,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["impacted_tooth","impacted-tooth","missing_single_tooth","partial_edentulism"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {}
    },
    {
        "code": "records_progress_photography",
        "displayName": "Progress Photography (Clinical Records)",
        "friendlyPatientName": "Progress photos",
        "category": "general",
        "description": "Standardised clinical photos during or after treatment for monitoring and documentation.",
        "defaultDuration": 10,
        "defaultPriceAUD": 60,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": [],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {}
    },
    {
        "code": "ortho_attachment_placement",
        "displayName": "Clear Aligner Attachment Placement",
        "friendlyPatientName": "Place aligner attachments",
        "category": "orthodontics",
        "description": "Placement of composite attachments to aid aligner tooth movements.",
        "defaultDuration": 30,
        "defaultPriceAUD": 180,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["aesthetic_shape_alignment","crowding","spacing","malocclusion"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {}
    },
    {
        "code": "ortho_debond_simple",
        "displayName": "Orthodontic Debond — Simple (Aligners/Minor Fixed)",
        "friendlyPatientName": "Remove ortho attachments/brackets",
        "category": "orthodontics",
        "description": "Removal of attachments or minor fixed appliances with finishing and polish.",
        "defaultDuration": 30,
        "defaultPriceAUD": 220,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["aesthetic_shape_alignment","crowding","spacing","malocclusion"],
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

# Batch 9 mappings - MERGE strategy
new_mappings = [
    {
        "condition": "periapical-lesion",
        "treatments": [
            {"treatment": "endo_retreatment_prep_1", "priority": 2, "stage": 2},
            {"treatment": "endo_retreatment_prep_addl", "priority": 3, "stage": 2},
            {"treatment": "endo_retreatment_obt_1", "priority": 4, "stage": 2},
            {"treatment": "endo_retreatment_obt_addl", "priority": 5, "stage": 2},
            {"treatment": "endo_apicectomy_per_root", "priority": 6, "stage": 3},
            {"treatment": "endo_root_end_filling_mta", "priority": 7, "stage": 3},
            {"treatment": "endo_post_op_review", "priority": 8, "stage": 3}
        ]
    },
    {
        "condition": "asymptomatic_apical_periodontitis",
        "treatments": [
            {"treatment": "endo_retreatment_prep_1", "priority": 1, "stage": 2},
            {"treatment": "endo_retreatment_obt_1", "priority": 2, "stage": 2},
            {"treatment": "endo_apicectomy_per_root", "priority": 3, "stage": 3}
        ]
    },
    {
        "condition": "symptomatic_apical_periodontitis",
        "treatments": [
            {"treatment": "endo_retreatment_prep_1", "priority": 1, "stage": 1},
            {"treatment": "endo_retreatment_obt_1", "priority": 2, "stage": 2},
            {"treatment": "endo_apicectomy_per_root", "priority": 4, "stage": 3}
        ]
    },
    {
        "condition": "periodontitis_stage_i_ii",
        "treatments": [
            {"treatment": "perio_local_antimicrobial_site", "priority": 3, "stage": 2},
            {"treatment": "perio_chlorhexidine_dispense", "priority": 4, "stage": 2},
            {"treatment": "perio_recall_3m", "priority": 5, "stage": 3}
        ]
    },
    {
        "condition": "periodontitis_stage_iii_iv",
        "treatments": [
            {"treatment": "perio_local_antimicrobial_site", "priority": 4, "stage": 2},
            {"treatment": "perio_chlorhexidine_dispense", "priority": 5, "stage": 2},
            {"treatment": "perio_recall_3m", "priority": 6, "stage": 3}
        ]
    },
    {
        "condition": "pericoronitis",
        "treatments": [
            {"treatment": "perio_chlorhexidine_dispense", "priority": 3, "stage": 1}
        ]
    },
    {
        "condition": "missing_single_tooth",
        "treatments": [
            {"treatment": "implant_uncover_second_stage", "priority": 6, "stage": 2},
            {"treatment": "implant_healing_abutment_placement", "priority": 7, "stage": 2},
            {"treatment": "surg_socket_preservation_graft", "priority": 1, "stage": 2}
        ]
    },
    {
        "condition": "tooth_nonrestorable",
        "treatments": [
            {"treatment": "surg_socket_preservation_graft", "priority": 2, "stage": 2}
        ]
    },
    {
        "condition": "malocclusion",
        "treatments": [
            {"treatment": "ortho_attachment_placement", "priority": 3, "stage": 2},
            {"treatment": "ortho_debond_simple", "priority": 8, "stage": 3}
        ]
    },
    {
        "condition": "crowding",
        "treatments": [
            {"treatment": "ortho_attachment_placement", "priority": 3, "stage": 2}
        ]
    },
    {
        "condition": "spacing",
        "treatments": [
            {"treatment": "ortho_attachment_placement", "priority": 3, "stage": 2}
        ]
    }
]

# MERGE: Add to existing mappings, don't replace
existing_mappings = {m['condition']: i for i, m in enumerate(mappings)}
for new_m in new_mappings:
    cond = new_m['condition']
    if cond in existing_mappings:
        idx = existing_mappings[cond]
        # MERGE treatments: combine and deduplicate
        existing_treatments = {t['treatment']: t for t in mappings[idx]['treatments']}
        for new_t in new_m['treatments']:
            existing_treatments[new_t['treatment']] = new_t
        mappings[idx]['treatments'] = list(existing_treatments.values())
        # Re-sort by priority
        mappings[idx]['treatments'].sort(key=lambda x: x.get('priority', 999))
        print(f"🔄 Merged mapping: {cond} (now {len(mappings[idx]['treatments'])} treatments)")
    else:
        mappings.append(new_m)
        print(f"➕ Added mapping: {cond}")

# Write mappings
with open('client/src/data/mappings.core.json', 'w') as f:
    json.dump(mappings, f, indent=2, ensure_ascii=False)

print(f"\n✅ Mappings updated: {len(mappings)} conditions mapped")
print("\n🎉 Batch 9 merge complete!")

