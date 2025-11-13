#!/usr/bin/env python3
"""Enrich existing treatments with Australian ADA item codes"""
import json
import re

# Load existing treatments
with open('client/src/data/treatments.au.json', 'r') as f:
    treatments = json.load(f)

# ADA codes provided
ada_codes = {
    # Examinations
    "011": "Comprehensive oral examination",
    "012": "Periodic oral examination",
    "013": "Oral examination – limited",
    "014": "Consultation",
    "015": "Consultation – extended (30 minutes or more)",
    "016": "Consultation by referral",
    "017": "Consultation by referral – extended (30 minutes or more)",
    "018": "Written report (not elsewhere included)",
    "019": "Letter of referral",
    
    # Radiographs
    "022": "Intraoral periapical or bitewing radiograph – per exposure",
    "025": "Intraoral occlusal radiograph – per exposure",
    "026": "Cone Beam Volumetric Tomography – scan acquisition – per appointment",
    "031": "Extraoral radiograph – per exposure",
    "033": "Lateral/AP/PA/submento-vertex skull radiograph",
    "035": "Radiograph of temporomandibular joint – per exposure",
    "036": "Cephalometric radiograph – lateral/AP/PA/submento-vertex",
    "037": "Panoramic radiograph – per exposure",
    "038": "Hand–wrist radiograph for skeletal age assessment",
    
    # Preventive
    "111": "Removal of plaque and/or stain",
    "114": "Removal of calculus – first appointment",
    "115": "Removal of calculus – subsequent appointment",
    "117": "Bleaching, internal – per tooth",
    "118": "Bleaching, external – per tooth",
    "119": "Bleaching, home application – per arch",
    "121": "Topical remineralisation/cariostatic agents – one treatment",
    "122": "Topical remineralisation/cariostatic – home application per arch",
    "161": "Fissure and/or tooth surface sealing – per tooth",
    
    # Periodontics
    "221": "Gingivectomy/gingivoplasty – per tooth or implant",
    "222": "Root planing and subgingival curettage – per tooth",
    "223": "Non-surgical treatment of peri-implant disease – per implant",
    "233": "Surgical treatment of peri-implant disease – per implant",
    "235": "Gingival graft – per tooth, implant or extraction socket",
    "236": "Guided tissue regeneration – per tooth or implant",
    "241": "Root resection – per root",
    "242": "Osseous surgery – per tooth or implant",
    "243": "Osseous graft – per tooth or implant",
    
    # Extractions
    "311": "Removal of a tooth or part(s) thereof (simple extraction)",
    "314": "Sectional removal of a tooth or part(s) thereof",
    "322": "Surgical removal of tooth/fragment – no bone removal or division",
    "323": "Surgical removal of tooth/fragment – with bone removal",
    "324": "Surgical removal – bone removal and tooth division",
    "391": "Frenectomy",
    "392": "Drainage of abscess",
    
    # Endodontics
    "415": "Complete chemo-mechanical preparation of root canal – one canal",
    "416": "Complete chemo-mechanical preparation of root canal – each additional canal",
    "417": "Root canal obturation – one canal",
    "418": "Root canal obturation – each additional canal",
    "419": "Extirpation of pulp or debridement of root canal(s) – emergency/palliative",
    "421": "Resorbable root canal filling – primary tooth",
    "432": "Apicectomy – per root",
    "434": "Apical seal – per canal",
    "451": "Removal of root filling – per canal",
    "452": "Removal of a cemented root canal post or post crown",
    "453": "Removal or bypassing fractured endodontic instrument",
    "455": "Additional visit for irrigation/dressing of root canal system – per tooth",
    "458": "Interim therapeutic root filling – per tooth",
    
    # Restorative - Anterior
    "521": "Adhesive restoration – one surface – anterior tooth – direct",
    "522": "Adhesive restoration – two surfaces – anterior tooth – direct",
    "523": "Adhesive restoration – three surfaces – anterior tooth – direct",
    "524": "Adhesive restoration – four surfaces – anterior tooth – direct",
    "525": "Adhesive restoration – five surfaces – anterior tooth – direct",
    "526": "Adhesive restoration – veneer – anterior tooth – direct",
    
    # Restorative - Posterior
    "531": "Adhesive restoration – one surface – posterior tooth – direct",
    "532": "Adhesive restoration – two surfaces – posterior tooth – direct",
    "533": "Adhesive restoration – three surfaces – posterior tooth – direct",
    "534": "Adhesive restoration – four surfaces – posterior tooth – direct",
    "535": "Adhesive restoration – five surfaces – posterior tooth – direct",
    "536": "Adhesive restoration – veneer – posterior tooth – direct",
    
    # Indirect restorations
    "556": "Tooth-coloured restoration – veneer – indirect",
    
    # Crowns - Preformed
    "586": "Crown – metallic – with tooth preparation – preformed",
    "587": "Crown – metallic – minimal tooth preparation – preformed",
    "588": "Crown – tooth-coloured – preformed",
    
    # Crowns - Indirect
    "613": "Full crown – non-metallic – indirect",
    "615": "Full crown – veneered – indirect",
    "618": "Full crown – metallic – indirect",
    "625": "Post and core for crown – indirect",
    "627": "Preliminary restoration for crown – direct",
    
    # Bridges
    "632": "Provisional bridge pontic – per pontic",
    "642": "Bridge pontic – direct – per pontic",
    "643": "Bridge pontic – indirect – per pontic",
    "649": "Retainer for bonded fixture – indirect – per tooth",
    "651": "Recementing crown or veneer",
    "652": "Recementing bridge or splint – per abutment",
    "653": "Rebonding of bridge or splint where retreatment of surface required",
    "656": "Removal of bridge or splint",
    "658": "Repair of crown, bridge or splint – indirect",
    "659": "Repair of crown, bridge or splint – direct",
    
    # Implant prosthetics
    "664": "Fitting of bar for denture – per abutment",
    "671": "Full crown attached to osseointegrated implant – metallic – indirect",
    "672": "Full crown attached to osseointegrated implant – veneered – indirect",
    
    # Dentures
    "711": "Complete maxillary denture",
    "712": "Complete mandibular denture",
    "713": "Provisional complete maxillary denture",
    "714": "Provisional complete mandibular denture",
    "715": "Provisional complete maxillary and mandibular dentures",
    "719": "Complete maxillary and mandibular dentures",
    "721": "Partial maxillary denture – resin base",
    "722": "Partial mandibular denture – resin base",
    "723": "Provisional partial maxillary denture",
    "724": "Provisional partial mandibular denture",
    "727": "Partial maxillary denture – cast metal framework",
    "728": "Partial mandibular denture – cast metal framework",
    "733": "Tooth/teeth (partial denture)",
    "735": "Precision or magnetic denture attachment",
    
    # Orthodontics
    "862": "Bonding of attachment for application of orthodontic force",
    "871": "Orthodontic adjustment",
    "878": "Relining – removable appliance – processed"
}

# Treatment code to ADA code mapping (smart matching)
mappings = {
    # Exams
    "exam_comprehensive_new_pt": "011",
    "exam_periodic": "012",
    "exam_limited_emergency": "013",
    
    # Radiographs
    "radiograph_periapical_single": "022",
    "radiograph_bitewing_pair": "022",
    "radiograph_opg": "037",
    "cbct_small_field": "026",
    "radiograph_cbct_large_field": "026",
    
    # Preventive
    "scale_clean_polish": "111",
    "prophy_scale_polish": "114",
    "fluoride_varnish": "121",
    "fluoride_varnish_v2": "121",
    "fissure_sealant_per_tooth": "161",
    "fissure_sealant_per_tooth_v2": "161",
    
    # Whitening
    "whitening_in_chair": "118",
    "whitening_in_chair_v2": "118",
    "whitening_take_home": "119",
    "whitening_take_home_kit": "119",
    
    # Periodontics
    "perio_gingivectomy_per_sextant": "221",
    "perio_srp_quadrant": "222",
    "perio_srp_quadrant_v2": "222",
    "perio_soft_tissue_graft_local": "235",
    "perio_ctg_single_site": "235",
    "perio_fgg_single_site": "235",
    "perio_gtr_localised": "236",
    "perio_osseous_recontouring_quadrant": "242",
    
    # Extractions
    "surg_simple_extraction": "311",
    "surg_surgical_extraction": "322",
    "surg_root_extraction_fragment": "314",
    "frenectomy_labial_or_lingual": "391",
    "surg_incision_drainage": "392",
    "surg_incision_and_drainage": "392",
    
    # Endodontics
    "endo_rct_prep_1": "415",
    "endo_rct_prep_addl": "416",
    "endo_rct_obt_1": "417",
    "endo_rct_obt_addl": "418",
    "endo_extirpation": "419",
    "endo_access_open_and_dress": "419",
    "paedo_pulpotomy_primary": "421",
    "endo_apicectomy_per_root": "432",
    "endo_root_end_filling_mta": "434",
    "endo_remove_root_filling_per_canal": "451",
    "endo_remove_post": "452",
    "endo_bypass_fractured_instrument": "453",
    "endo_additional_irrigation_visit": "455",
    "endo_interim_root_fill": "458",
    
    # Restorative - Anterior
    "resto_comp_one_surface_ant": "521",
    "resto_comp_two_surface_ant": "522",
    "resto_comp_three_plus_ant": "523",
    
    # Restorative - Posterior
    "resto_comp_one_surface_post": "531",
    "resto_comp_two_surface_post": "532",
    "resto_comp_three_plus_post": "533",
    
    # Veneers
    "veneer_composite_direct": "526",
    "veneer_composite_direct_v2": "526",
    "veneer_porcelain": "556",
    "veneer_porcelain_v2": "556",
    
    # Crowns - Preformed
    "paedo_stainless_steel_crown": "586",
    
    # Crowns - Indirect
    "crown_full_tooth_coloured": "613",
    "crown_pfm": "615",
    "crown_full_metal": "618",
    "resto_post_core_cast": "625",
    "resto_post_core_direct": "625",
    "crown_temp": "627",
    "crown_temp_indirect": "627",
    
    # Bridges
    "bridge_temp_provisional_per_unit": "632",
    "bridge_pontic_tc": "643",
    "bridge_resin_bonded_maryland": "649",
    "recement_crown": "651",
    "recement_veneer": "651",
    "recement_bridge": "652",
    "crown_section_and_remove": "656",
    
    # Implant crowns
    "crown_implant_supported_tc": "672",
    "implant_crown_screw_retained": "672",
    "implant_crown_cemented": "672",
    
    # Dentures
    "prost_full_denture_upper": "711",
    "denture_complete_single_arch": "711",
    "prost_full_denture_lower": "712",
    "denture_complete_both_arches": "719",
    "prost_partial_denture_resin_1to3": "721",
    "prost_partial_denture_resin_4plus": "721",
    "denture_partial_acrylic": "721",
    "prost_partial_denture_cast_4plus": "727",
    "denture_partial_cobalt_chrome": "727",
    "denture_add_tooth": "733",
    "prost_denture_tooth_addition": "733",
    
    # Orthodontics
    "ortho_attachment_placement": "862",
    "ortho_review_short": "871",
    
    # Denture relines
    "prost_denture_reline_lab": "878",
    "denture_reline_lab": "878",
    "denture_reline_lab_v2": "878",
}

# Apply mappings
updated_count = 0
already_had_code = 0
no_mapping = 0

for treatment in treatments:
    code = treatment['code']
    
    # Ensure insuranceCodes exists
    if 'insuranceCodes' not in treatment:
        treatment['insuranceCodes'] = {}
    
    # Check if we have a mapping for this treatment
    if code in mappings:
        ada_code = mappings[code]
        
        # Check if AU code already exists and is not null
        if treatment['insuranceCodes'].get('AU'):
            already_had_code += 1
            print(f"⏭️  Skip {code}: already has AU code '{treatment['insuranceCodes']['AU']}'")
        else:
            # Add the ADA code
            treatment['insuranceCodes']['AU'] = ada_code
            updated_count += 1
            ada_name = ada_codes.get(ada_code, "Unknown")
            print(f"✅ {code}: Added AU code '{ada_code}' ({ada_name})")
    else:
        # No mapping found
        if not treatment['insuranceCodes'].get('AU'):
            no_mapping += 1
            # Keep it as null - don't print every unmapped treatment to reduce noise
            if treatment['insuranceCodes'].get('AU') is None:
                pass  # Already null, do nothing

# Write updated treatments
with open('client/src/data/treatments.au.json', 'w') as f:
    json.dump(treatments, f, indent=2, ensure_ascii=False)

print("\n" + "=" * 70)
print("📊 ENRICHMENT SUMMARY")
print("=" * 70)
print(f"✅ Updated with ADA codes:  {updated_count}")
print(f"⏭️  Already had AU codes:    {already_had_code}")
print(f"⚠️  No mapping found:        {no_mapping}")
print(f"📦 Total treatments:        {len(treatments)}")
print("=" * 70)
print("\n🎉 ADA code enrichment complete!")
print("💡 Treatments without mappings remain with AU: null (ready for future assignment)")

