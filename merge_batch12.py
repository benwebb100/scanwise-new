#!/usr/bin/env python3
"""Merge Batch 12 (FINAL): Removable prosthodontics, bridge prosthetics, implant prosthetic phase"""
import json

# Load existing
with open('client/src/data/treatments.au.json', 'r') as f:
    treatments = json.load(f)
with open('client/src/data/mappings.core.json', 'r') as f:
    mappings = json.load(f)

# Batch 12 treatments
new_treatments = [
    # REMOVABLE PROSTHODONTICS
    {
        "code": "denture_complete_single_arch",
        "displayName": "Complete Denture — Single Arch",
        "friendlyPatientName": "Full denture (one arch)",
        "category": "prosthodontics",
        "description": "Fabrication of a complete denture for a fully edentulous maxillary or mandibular arch.",
        "defaultDuration": 120,
        "defaultPriceAUD": 1600,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["complete_edentulism"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True, "perUnit": "arch", "multiVisit": True}
    },
    {
        "code": "denture_complete_both_arches",
        "displayName": "Complete Dentures — Both Arches",
        "friendlyPatientName": "Full dentures (upper & lower)",
        "category": "prosthodontics",
        "description": "Fabrication of both maxillary and mandibular complete dentures.",
        "defaultDuration": 180,
        "defaultPriceAUD": 3000,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["complete_edentulism"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True, "multiVisit": True}
    },
    {
        "code": "denture_partial_acrylic",
        "displayName": "Partial Denture — Acrylic Base",
        "friendlyPatientName": "Partial denture (acrylic)",
        "category": "prosthodontics",
        "description": "Acrylic base removable partial denture to replace missing teeth.",
        "defaultDuration": 90,
        "defaultPriceAUD": 1200,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["partial_edentulism"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True, "multiVisit": True}
    },
    {
        "code": "denture_partial_cobalt_chrome",
        "displayName": "Partial Denture — Cobalt-Chrome",
        "friendlyPatientName": "Partial denture (metal framework)",
        "category": "prosthodontics",
        "description": "Cast cobalt-chrome framework partial denture with superior strength and fit.",
        "defaultDuration": 110,
        "defaultPriceAUD": 2000,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["partial_edentulism"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True, "multiVisit": True}
    },
    {
        "code": "denture_repair_simple",
        "displayName": "Denture Repair — Simple",
        "friendlyPatientName": "Denture repair (simple)",
        "category": "prosthodontics",
        "description": "Simple repair to existing denture (e.g., minor crack, re-bond tooth).",
        "defaultDuration": 20,
        "defaultPriceAUD": 160,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": [],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True}
    },
    {
        "code": "denture_repair_fracture",
        "displayName": "Denture Repair — Fracture/Reinforcement",
        "friendlyPatientName": "Denture repair (fracture)",
        "category": "prosthodontics",
        "description": "Repair of fractured denture base; reinforcement as required.",
        "defaultDuration": 30,
        "defaultPriceAUD": 220,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": [],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True}
    },
    {
        "code": "denture_add_tooth",
        "displayName": "Denture Addition — Tooth",
        "friendlyPatientName": "Add tooth to denture",
        "category": "prosthodontics",
        "description": "Addition of a prosthetic tooth to an existing partial denture.",
        "defaultDuration": 20,
        "defaultPriceAUD": 200,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["missing_single_tooth","partial_edentulism"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True}
    },
    {
        "code": "denture_add_clasp",
        "displayName": "Denture Addition — Clasp",
        "friendlyPatientName": "Add clasp to denture",
        "category": "prosthodontics",
        "description": "Addition of a clasp/retainer to an existing partial denture for improved retention.",
        "defaultDuration": 20,
        "defaultPriceAUD": 180,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": [],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True}
    },
    {
        "code": "denture_reline_chairside_v2",
        "displayName": "Denture Reline — Chairside",
        "friendlyPatientName": "Chairside reline",
        "category": "prosthodontics",
        "description": "Chairside soft/temporary reline to improve denture fit.",
        "defaultDuration": 25,
        "defaultPriceAUD": 260,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["complete_edentulism","partial_edentulism"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {}
    },
    {
        "code": "denture_reline_lab_v2",
        "displayName": "Denture Reline — Laboratory",
        "friendlyPatientName": "Lab reline",
        "category": "prosthodontics",
        "description": "Laboratory processed reline for improved adaptation of existing denture.",
        "defaultDuration": 20,
        "defaultPriceAUD": 420,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["complete_edentulism","partial_edentulism"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True}
    },
    {
        "code": "denture_soft_reline",
        "displayName": "Denture Soft Reline",
        "friendlyPatientName": "Soft reline",
        "category": "prosthodontics",
        "description": "Soft liner reline material to cushion and improve comfort in an existing denture.",
        "defaultDuration": 20,
        "defaultPriceAUD": 320,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["complete_edentulism","partial_edentulism"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True}
    },
    # BRIDGE PROSTHETICS
    {
        "code": "bridge_three_unit_ceramic",
        "displayName": "Fixed Bridge — 3-Unit (Ceramic/PFM)",
        "friendlyPatientName": "3-unit bridge",
        "category": "prosthodontics",
        "description": "Three-unit fixed bridge to replace a single missing tooth (two abutments, one pontic).",
        "defaultDuration": 120,
        "defaultPriceAUD": 4200,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["missing_single_tooth","partial_edentulism"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True, "multiVisit": True}
    },
    {
        "code": "bridge_additional_unit",
        "displayName": "Fixed Bridge — Additional Unit (per tooth)",
        "friendlyPatientName": "Bridge — add unit",
        "category": "prosthodontics",
        "description": "Additional abutment or pontic unit added to a fixed bridge.",
        "defaultDuration": 25,
        "defaultPriceAUD": 1000,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["partial_edentulism"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True, "perUnit": "tooth"}
    },
    {
        "code": "bridge_resin_bonded_maryland",
        "displayName": "Resin-Bonded Bridge (Maryland)",
        "friendlyPatientName": "Maryland bridge",
        "category": "prosthodontics",
        "description": "Minimal-prep resin-bonded fixed bridge (one or two wings) for single-tooth replacement.",
        "defaultDuration": 80,
        "defaultPriceAUD": 2200,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["missing_single_tooth"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True}
    },
    {
        "code": "bridge_temp_provisional_per_unit",
        "displayName": "Provisional Bridge — per Unit",
        "friendlyPatientName": "Temporary bridge (per unit)",
        "category": "prosthodontics",
        "description": "Provisional bridge unit to maintain aesthetics/function during fabrication.",
        "defaultDuration": 20,
        "defaultPriceAUD": 260,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["missing_single_tooth","partial_edentulism","failed_restoration"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"perUnit": "tooth", "provisional": True}
    },
    # IMPLANT PROSTHETIC PHASE
    {
        "code": "implant_impression_scan_body",
        "displayName": "Implant Impression / Scan Body Placement",
        "friendlyPatientName": "Implant impression / scan body",
        "category": "prosthodontics",
        "description": "Implant-level impression or intraoral scan with scan body for prosthetic fabrication.",
        "defaultDuration": 25,
        "defaultPriceAUD": 160,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["missing_single_tooth","partial_edentulism"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True}
    },
    {
        "code": "implant_stock_abutment",
        "displayName": "Implant Stock Abutment — Selection & Fit",
        "friendlyPatientName": "Stock implant abutment",
        "category": "prosthodontics",
        "description": "Selection, adjustment, and fit of a stock abutment for implant restoration.",
        "defaultDuration": 20,
        "defaultPriceAUD": 220,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["missing_single_tooth","partial_edentulism"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {}
    },
    {
        "code": "implant_custom_abutment",
        "displayName": "Implant Custom Abutment — Design & Supply",
        "friendlyPatientName": "Custom implant abutment",
        "category": "prosthodontics",
        "description": "Laboratory-fabricated custom abutment for optimal emergence profile and aesthetics.",
        "defaultDuration": 20,
        "defaultPriceAUD": 480,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["missing_single_tooth","partial_edentulism"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True}
    },
    {
        "code": "implant_crown_screw_retained",
        "displayName": "Implant Crown — Screw-Retained",
        "friendlyPatientName": "Implant crown (screw-retained)",
        "category": "prosthodontics",
        "description": "Single screw-retained crown on integrated implant; includes fit and torque.",
        "defaultDuration": 50,
        "defaultPriceAUD": 1900,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["missing_single_tooth"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True}
    },
    {
        "code": "implant_crown_cemented",
        "displayName": "Implant Crown — Cemented",
        "friendlyPatientName": "Implant crown (cemented)",
        "category": "prosthodontics",
        "description": "Single cement-retained crown on stock or custom abutment.",
        "defaultDuration": 50,
        "defaultPriceAUD": 1800,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["missing_single_tooth"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True}
    },
    {
        "code": "implant_temp_crown_provisional",
        "displayName": "Implant Temporary Crown — Provisional",
        "friendlyPatientName": "Temporary implant crown",
        "category": "prosthodontics",
        "description": "Provisional crown on implant to shape soft tissue or trial aesthetics/occlusion.",
        "defaultDuration": 30,
        "defaultPriceAUD": 420,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["missing_single_tooth"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"provisional": True}
    },
    {
        "code": "implant_torque_check_review",
        "displayName": "Implant Torque Check / Review",
        "friendlyPatientName": "Implant torque check",
        "category": "prosthodontics",
        "description": "Torque verification and post-fit review for implant restoration.",
        "defaultDuration": 10,
        "defaultPriceAUD": 80,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["missing_single_tooth","partial_edentulism"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {}
    },
    {
        "code": "implant_overdenture_locator_per_arch",
        "displayName": "Implant Overdenture — Locator (per Arch)",
        "friendlyPatientName": "Implant-retained overdenture (per arch)",
        "category": "prosthodontics",
        "description": "Fabrication of locator-retained overdenture on 2–4 implants (per arch).",
        "defaultDuration": 120,
        "defaultPriceAUD": 3800,
        "insuranceCodes": {"AU": None, "US": None, "UK": None, "CA": None, "NZ": None},
        "autoMapConditions": ["complete_edentulism","partial_edentulism"],
        "toothNumberRules": {},
        "replacementOptions": [],
        "metadata": {"labWork": True, "perUnit": "arch", "multiVisit": True}
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

# Batch 12 mappings - MERGE strategy
new_mappings = [
    {"condition": "complete_edentulism", "treatments": [
        {"treatment": "denture_complete_single_arch", "priority": 1, "stage": 3},
        {"treatment": "denture_complete_both_arches", "priority": 2, "stage": 3},
        {"treatment": "implant_overdenture_locator_per_arch", "priority": 3, "stage": 3}
    ]},
    {"condition": "partial_edentulism", "treatments": [
        {"treatment": "denture_partial_cobalt_chrome", "priority": 1, "stage": 3},
        {"treatment": "denture_partial_acrylic", "priority": 2, "stage": 3},
        {"treatment": "denture_reline_lab_v2", "priority": 3, "stage": 3},
        {"treatment": "denture_repair_simple", "priority": 4, "stage": 3},
        {"treatment": "denture_add_tooth", "priority": 5, "stage": 3},
        {"treatment": "denture_add_clasp", "priority": 6, "stage": 3}
    ]},
    {"condition": "missing_single_tooth", "treatments": [
        {"treatment": "bridge_three_unit_ceramic", "priority": 6, "stage": 3},
        {"treatment": "bridge_resin_bonded_maryland", "priority": 7, "stage": 3},
        {"treatment": "bridge_temp_provisional_per_unit", "priority": 8, "stage": 2},
        {"treatment": "implant_impression_scan_body", "priority": 4, "stage": 2},
        {"treatment": "implant_custom_abutment", "priority": 5, "stage": 2},
        {"treatment": "implant_crown_screw_retained", "priority": 9, "stage": 3},
        {"treatment": "implant_crown_cemented", "priority": 10, "stage": 3},
        {"treatment": "implant_temp_crown_provisional", "priority": 3, "stage": 2},
        {"treatment": "implant_torque_check_review", "priority": 11, "stage": 3}
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
print("\n🎉 Batch 12 (FINAL) merge complete!")
print("=" * 60)
print("🏆 ALL BATCHES COMPLETE - DATABASE FULLY POPULATED!")
print("=" * 60)

