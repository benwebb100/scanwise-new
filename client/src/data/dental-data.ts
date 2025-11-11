import { SearchableSelectOption } from "@/components/ui/searchable-select"

// Tooth Numbering Systems
export type ToothNumberingSystem = 'FDI' | 'Universal'

export const TOOTH_NUMBERING_SYSTEMS = {
  FDI: {
    name: 'FDI Notation',
    description: 'Australian standard (11-48)',
    teeth: [
      // Upper Right
      '18', '17', '16', '15', '14', '13', '12', '11',
      // Upper Left  
      '21', '22', '23', '24', '25', '26', '27', '28',
      // Lower Left
      '38', '37', '36', '35', '34', '33', '32', '31',
      // Lower Right
      '41', '42', '43', '44', '45', '46', '47', '48'
    ]
  },
  Universal: {
    name: 'Universal Notation',
    description: 'U.S. standard (1-32)',
    teeth: [
      // Upper Right to Left
      '1', '2', '3', '4', '5', '6', '7', '8',
      '9', '10', '11', '12', '13', '14', '15', '16',
      // Lower Left to Right
      '17', '18', '19', '20', '21', '22', '23', '24',
      '25', '26', '27', '28', '29', '30', '31', '32'
    ]
  }
}

// Common Conditions (pinned at top)
export const COMMON_CONDITIONS: SearchableSelectOption[] = [
  { value: 'caries', label: 'Caries', pinned: true },
  { value: 'periapical-lesion', label: 'Periapical lesion', pinned: true },
  { value: 'root-fracture', label: 'Root fracture', pinned: true },
  { value: 'impacted-tooth', label: 'Impacted tooth', pinned: true },
  { value: 'missing-tooth', label: 'Missing tooth', pinned: true },
  { value: 'gingivitis', label: 'Gingivitis', pinned: true },
  { value: 'periodontal-pocket', label: 'Periodontal pocket', pinned: true },
  { value: 'attrition', label: 'Attrition', pinned: true },
  { value: 'pulpitis', label: 'Pulpitis', pinned: true },
  { value: 'tooth-mobility', label: 'Tooth mobility', pinned: true }
]

// Full list of conditions (expanded with comprehensive dental database)
export const ALL_CONDITIONS: SearchableSelectOption[] = [
  ...COMMON_CONDITIONS,
  // Additional conditions
  { value: 'abrasion', label: 'Abrasion' },
  { value: 'erosion', label: 'Erosion' },
  { value: 'calculus', label: 'Calculus' },
  { value: 'plaque', label: 'Plaque' },
  { value: 'crown-fracture', label: 'Crown fracture' },
  { value: 'root-piece', label: 'Root piece' },
  { value: 'abscess', label: 'Abscess' },
  { value: 'cyst', label: 'Cyst' },
  { value: 'resorption', label: 'Resorption' },
  { value: 'hypoplasia', label: 'Hypoplasia' },
  { value: 'fluorosis', label: 'Fluorosis' },
  { value: 'staining', label: 'Staining' },
  { value: 'malocclusion', label: 'Malocclusion' },
  { value: 'crowding', label: 'Crowding' },
  { value: 'spacing', label: 'Spacing' },
  { value: 'overjet', label: 'Overjet' },
  { value: 'overbite', label: 'Overbite' },
  { value: 'crossbite', label: 'Crossbite' },
  { value: 'open-bite', label: 'Open bite' },
  { value: 'tmj-disorder', label: 'TMJ disorder' },
  // Add some missing conditions that might come from AI
  { value: 'existing-large-filling', label: 'Existing large filling' },
  { value: 'tooth-wear', label: 'Tooth wear' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'fracture', label: 'Fracture' },
  
  // NEW: Comprehensive conditions from Australian Dental Glossary (Batch 1)
  // Caries variations
  { value: 'caries_enamel', label: 'Caries (Enamel/Incipient)' },
  { value: 'caries_dentine', label: 'Caries (Dentine)' },
  { value: 'caries_recurrent', label: 'Recurrent Caries' },
  { value: 'caries_root', label: 'Root Caries' },
  
  // Fractures and structural issues
  { value: 'fractured_cusp_restorable', label: 'Fractured Cusp (Restorable)' },
  { value: 'cracked_tooth_vital', label: 'Cracked Tooth (Vital)' },
  { value: 'tooth_nonrestorable', label: 'Non-restorable Tooth' },
  { value: 'failed_restoration', label: 'Failed/Defective Restoration' },
  
  // Tooth wear variations
  { value: 'tooth_wear_attrition', label: 'Tooth Wear – Attrition' },
  { value: 'tooth_wear_erosion', label: 'Tooth Wear – Erosion' },
  { value: 'tooth_wear_abfraction', label: 'Tooth Wear – Abfraction/Abrasion' },
  { value: 'dentine_hypersensitivity', label: 'Dentine Hypersensitivity' },
  
  // Pulp and endodontic conditions
  { value: 'reversible_pulpitis', label: 'Reversible Pulpitis' },
  { value: 'irreversible_pulpitis', label: 'Irreversible Pulpitis' },
  { value: 'necrotic_pulp', label: 'Necrotic Pulp' },
  { value: 'periapical_abscess', label: 'Periapical Abscess' },
  { value: 'symptomatic_apical_periodontitis', label: 'Symptomatic Apical Periodontitis' },
  { value: 'asymptomatic_apical_periodontitis', label: 'Asymptomatic Apical Periodontitis' },
  { value: 'flare_up_post_endo', label: 'Post-Endodontic Flare-Up' },
  
  // Periodontal conditions
  { value: 'gingivitis_plaque', label: 'Gingivitis (Plaque-Induced)' },
  { value: 'periodontitis_stage_i_ii', label: 'Periodontitis (Stage I–II)' },
  { value: 'periodontitis_stage_iii_iv', label: 'Periodontitis (Stage III–IV)' },
  { value: 'periodontal_abscess', label: 'Periodontal Abscess' },
  { value: 'pericoronitis', label: 'Pericoronitis' },
  { value: 'mucositis_denture', label: 'Denture Stomatitis/Mucositis' },
  { value: 'halitosis', label: 'Halitosis (Oral Cause)' },
  
  // Surgical conditions
  { value: 'impacted_tooth', label: 'Impacted Tooth' },
  { value: 'retained_root', label: 'Retained Root' },
  { value: 'dry_socket', label: 'Alveolar Osteitis (Dry Socket)' },
  { value: 'soft_tissue_lesion_suspect', label: 'Suspicious Soft Tissue Lesion' },
  
  // Edentulism variations
  { value: 'missing_single_tooth', label: 'Missing Tooth (Single)' },
  { value: 'partial_edentulism', label: 'Partial Edentulism' },
  { value: 'complete_edentulism', label: 'Complete Edentulism' },
  
  // Aesthetic conditions
  { value: 'aesthetic_discolouration', label: 'Aesthetic Concern – Discolouration' },
  { value: 'aesthetic_shape_alignment', label: 'Aesthetic Concern – Shape/Alignment' },
  
  // Functional conditions
  { value: 'bruxism', label: 'Bruxism/Parafunction' },
  { value: 'tmj_pain_dysfunction', label: 'TMJ Pain/Dysfunction' },
  
  // Trauma conditions
  { value: 'trauma_avulsion', label: 'Dental Trauma – Avulsion' },
  { value: 'trauma_luxation', label: 'Dental Trauma – Luxation' },
  { value: 'trauma_fracture_crown', label: 'Dental Trauma – Crown Fracture' }
]

// Common Treatments (pinned at top)
export const COMMON_TREATMENTS: SearchableSelectOption[] = [
  { value: 'filling', label: 'Filling', pinned: true },
  { value: 'extraction', label: 'Extraction', pinned: true },
  { value: 'root-canal-treatment', label: 'Root canal treatment', pinned: true },
  { value: 'crown', label: 'Crown', pinned: true },
  { value: 'scale-and-clean', label: 'Scale and clean', pinned: true },
  { value: 'implant-placement', label: 'Implant placement', pinned: true },
  { value: 'bridge', label: 'Bridge', pinned: true },
  { value: 'periodontal-treatment', label: 'Periodontal treatment', pinned: true },
  { value: 'veneer', label: 'Veneer', pinned: true },
  { value: 'fluoride-treatment', label: 'Fluoride treatment', pinned: true }
]

// Full list of treatments (expanded with comprehensive dental database)
export const ALL_TREATMENTS: SearchableSelectOption[] = [
  ...COMMON_TREATMENTS,
  // Additional treatments
  { value: 'composite-build-up', label: 'Composite build-up' },
  { value: 'surgical-extraction', label: 'Surgical extraction' },
  { value: 'deep-cleaning', label: 'Deep cleaning (Scaling & Root Planing)' },
  { value: 'partial-denture', label: 'Partial denture' },
  { value: 'complete-denture', label: 'Complete denture' },
  { value: 'inlay', label: 'Inlay' },
  { value: 'onlay', label: 'Onlay' },
  { value: 'whitening', label: 'Whitening' },
  { value: 'bonding', label: 'Bonding' },
  { value: 'sealant', label: 'Sealant' },
  { value: 'night-guard', label: 'Night guard' },
  { value: 'orthodontic-treatment', label: 'Orthodontic treatment' },
  { value: 'braces', label: 'Braces' },
  { value: 'invisalign', label: 'Invisalign' },
  { value: 'retainer', label: 'Retainer' },
  { value: 'space-maintainer', label: 'Space maintainer' },
  { value: 'apicoectomy', label: 'Apicoectomy' },
  { value: 'bone-graft', label: 'Bone graft' },
  { value: 'sinus-lift', label: 'Sinus lift' },
  { value: 'gum-graft', label: 'Gum graft' },
  
  // NEW: Comprehensive treatments from Australian Dental Glossary (Batch 1)
  // Examinations and diagnostics
  { value: 'exam_emergency', label: 'Emergency Examination' },
  { value: 'exam_comprehensive', label: 'Comprehensive Examination' },
  { value: 'radiograph_intraoral', label: 'Intraoral Radiograph (PA/BW)' },
  { value: 'radiograph_opg', label: 'OPG (Panoramic)' },
  
  // Preventive treatments
  { value: 'scale_clean_polish', label: 'Scale, Clean and Polish' },
  { value: 'fluoride_application', label: 'Topical Fluoride Application' },
  { value: 'fissure_sealant', label: 'Fissure Sealant (per tooth)' },
  { value: 'desensitising', label: 'Desensitising (per tooth/area)' },
  { value: 'oh_instructions', label: 'Oral Hygiene Instruction' },
  { value: 'whitening_inchair', label: 'Tooth Whitening – In-chair' },
  { value: 'whitening_takehome', label: 'Tooth Whitening – Take-home Kit' },
  
  // Restorative treatments - Composite
  { value: 'resto_comp_one_surface_ant', label: 'Composite Restoration – 1 surface (Ant)' },
  { value: 'resto_comp_two_surface_ant', label: 'Composite Restoration – 2 surfaces (Ant)' },
  { value: 'resto_comp_three_plus_ant', label: 'Composite Restoration – 3+ surfaces (Ant)' },
  { value: 'resto_comp_one_surface_post', label: 'Composite Restoration – 1 surface (Post)' },
  { value: 'resto_comp_two_surface_post', label: 'Composite Restoration – 2 surfaces (Post)' },
  { value: 'resto_comp_three_plus_post', label: 'Composite Restoration – 3+ surfaces (Post)' },
  { value: 'resto_glassionomer', label: 'Glass Ionomer/Temporary Restoration' },
  { value: 'resto_amalgam_post', label: 'Amalgam Restoration (Posterior)' },
  
  // Crowns and indirect restorations
  { value: 'crown_temp', label: 'Provisional Crown (per tooth)' },
  { value: 'crown_full_tooth_coloured', label: 'Crown – Full Tooth-Coloured (e.g., Zirconia/Emax)' },
  { value: 'crown_full_metal', label: 'Crown – Full Metal' },
  { value: 'onlay_inlay_indirect_tc', label: 'Indirect Inlay/Onlay – Tooth Coloured' },
  { value: 'veneer_indirect', label: 'Veneer – Indirect (Porcelain)' },
  { value: 'veneer_direct', label: 'Veneer – Direct (Composite)' },
  
  // Endodontic treatments
  { value: 'endo_direct_pulp_cap', label: 'Direct Pulp Cap' },
  { value: 'endo_indirect_pulp_cap', label: 'Indirect Pulp Cap' },
  { value: 'endo_pulpotomy', label: 'Pulpotomy' },
  { value: 'endo_extirpation', label: 'Extirpation (Emergency RCT)' },
  { value: 'endo_rct_single', label: 'Root Canal Treatment – Single Canal' },
  { value: 'endo_rct_multi', label: 'Root Canal Treatment – Multi-Canal' },
  { value: 'endo_retx', label: 'Root Canal Retreatment' },
  { value: 'endo_apicectomy', label: 'Apicectomy' },
  
  // NEW: Root Canal Variants (1-4 canals)
  { value: 'endo_rct_1_canal', label: 'Root Canal Treatment – 1 Canal' },
  { value: 'endo_rct_2_canals', label: 'Root Canal Treatment – 2 Canals' },
  { value: 'endo_rct_3_canals', label: 'Root Canal Treatment – 3 Canals' },
  { value: 'endo_rct_4_canals', label: 'Root Canal Treatment – 4 Canals' },
  
  // NEW: Root Canal Loads/Add-ons
  { value: 'endo_retx_load', label: 'RCT Retreatment Load' },
  { value: 'endo_calcified_per_canal', label: 'Calcified Canal (per canal)' },
  { value: 'endo_remove_post', label: 'Remove Post' },
  { value: 'endo_remove_root_filling_per_canal', label: 'Remove Root Filling (per canal)' },
  { value: 'endo_additional_irrigation_visit', label: 'Additional Irrigation Visit' },
  { value: 'endo_interim_therapeutic_fill', label: 'Interim Therapeutic Filling' },
  { value: 'endo_apicectomy_per_root', label: 'Apicectomy (per root)' },
  { value: 'endo_extirpation_emergency', label: 'Emergency Extirpation' },
  
  // Periodontal treatments
  { value: 'perio_scale_root_planing', label: 'Scaling & Root Planing (per quadrant)' },
  { value: 'perio_curettage', label: 'Periodontal Curettage (per quadrant)' },
  { value: 'perio_flap_surgery', label: 'Periodontal Flap Surgery (per quadrant)' },
  { value: 'perio_graft', label: 'Gingival Graft (per site)' },
  { value: 'perio_crown_lengthening', label: 'Crown Lengthening' },
  
  // Surgical treatments
  { value: 'surg_simple_extraction', label: 'Extraction – Simple' },
  { value: 'surg_surgical_extraction', label: 'Extraction – Surgical' },
  { value: 'surg_incision_drainage', label: 'Incision & Drainage of Abscess' },
  { value: 'surg_replantation', label: 'Replantation of Avulsed Tooth' },
  { value: 'surg_frenectomy', label: 'Frenectomy' },
  { value: 'surg_biopsy', label: 'Biopsy of Oral Lesion' },
  
  // Prosthodontic treatments
  { value: 'prost_partial_denture_resin', label: 'Partial Denture – Resin Base' },
  { value: 'prost_partial_denture_cast', label: 'Partial Denture – Cast Base' },
  { value: 'prost_full_denture_resin', label: 'Full Denture – Resin' },
  { value: 'prost_denture_reline', label: 'Denture Reline' },
  { value: 'prost_denture_repair', label: 'Denture Repair' },
  
  // Functional treatments
  { value: 'splint_occlusal', label: 'Occlusal Splint (Bruxism/TMD)' },
  { value: 'tmj_adjustment', label: 'Occlusal Adjustment / TMJ Therapy' },
  
  // NEW: Batch 2 - Prosthodontics (Crowns/Bridges/Posts)
  { value: 'post_core_direct', label: 'Post and Core – Direct' },
  { value: 'post_core_indirect', label: 'Post and Core – Indirect (Lab)' },
  { value: 'bridge_temp', label: 'Provisional Bridge (per unit)' },
  { value: 'bridge_pontic_indirect_tc', label: 'Bridge – Pontic (Tooth-Coloured Indirect, per unit)' },
  { value: 'bridge_abutment_crown_tc', label: 'Bridge – Abutment Crown (Tooth-Coloured, per unit)' },
  { value: 'bridge_recement', label: 'Bridge Recementation' },
  { value: 'crown_recement', label: 'Crown/Inlay/Onlay Recementation' },
  
  // NEW: Batch 2 - Dentures (Partial/Full/Repairs)
  { value: 'prost_partial_denture_resin_1to3', label: 'Partial Denture – Resin (1–3 teeth)' },
  { value: 'prost_partial_denture_resin_4plus', label: 'Partial Denture – Resin (4+ teeth)' },
  { value: 'prost_partial_denture_cast_1to3', label: 'Partial Denture – Cast Metal (1–3 teeth)' },
  { value: 'prost_partial_denture_cast_4plus', label: 'Partial Denture – Cast Metal (4+ teeth)' },
  { value: 'prost_immediate_denture_partial', label: 'Immediate Partial Denture' },
  { value: 'prost_immediate_denture_full', label: 'Immediate Full Denture (single arch)' },
  { value: 'prost_full_denture_upper', label: 'Full Denture – Upper' },
  { value: 'prost_full_denture_lower', label: 'Full Denture – Lower' },
  { value: 'prost_add_to_denture', label: 'Add Tooth/Clasp to Existing Denture (per item)' },
  { value: 'prost_soft_reline', label: 'Soft Reline (Chairside) – Denture' },
  { value: 'prost_hard_reline_lab', label: 'Hard Reline (Lab) – Denture' },
  { value: 'prost_denture_repair_fracture', label: 'Denture Repair – Fracture/Base' },
  { value: 'prost_denture_adjustment', label: 'Denture Adjustment/Polish' },
  
  // NEW: Batch 2 - Implant Restorative
  { value: 'crown_implant_supported_tc', label: 'Implant-Supported Crown – Tooth-Coloured (Restorative phase)' },
  { value: 'abutment_custom', label: 'Custom Abutment (Implant)' },
  
  // NEW: Batch 2 - General/Palliative/Sedation
  { value: 'palliative_care', label: 'Palliative Care (Pain/Infection Relief)' },
  { value: 'postop_review_simple', label: 'Post-Op Review (simple)' },
  { value: 'medication_prescription', label: 'Prescription (Antibiotic/Analgesic/CHX)' },
  { value: 'nitrous_sedation', label: 'Inhalation Sedation (Nitrous Oxide)' },
  { value: 'iv_sedation_inhouse', label: 'IV Sedation (In-house, per hour)' },
  { value: 'mouthguard_custom', label: 'Custom Sports Mouthguard' },
  
  // NEW: Batch 3 - Advanced Periodontics
  { value: 'perio_guided_tissue_regen', label: 'Guided Tissue Regeneration (per site)' },
  { value: 'perio_bone_graft', label: 'Bone Grafting (per site, periodontal)' },
  
  // NEW: Batch 3 - Oral Surgery Extensions
  { value: 'surg_exposure_unerupted', label: 'Exposure of Unerupted Tooth' },
  { value: 'surg_alveoloplasty', label: 'Alveoloplasty (per quadrant)' },
  { value: 'surg_tori_removal', label: 'Removal of Tori/Exostosis' },
  { value: 'surg_minor_soft_tissue', label: 'Minor Soft Tissue Surgery (fibroma, epulis excision)' },
  { value: 'surg_apical_cystectomy', label: 'Cystectomy (Apical/Small Cyst)' },
  
  // NEW: Batch 3 - Trauma / Emergency
  { value: 'trauma_splinting', label: 'Splinting of Traumatised Teeth' },
  { value: 'trauma_pulpotomy_temp', label: 'Pulpotomy/Interim Dressing (Trauma)' },
  
  // NEW: Batch 3 - Optional Prosthodontics (Advanced GP)
  { value: 'prost_resilient_lining', label: 'Resilient Lining (Denture)' },
  { value: 'prost_overdenture', label: 'Overdenture (Tooth/Implant Retained, per arch)' },
  
  // NEW: Batch 3 - Optional Orthodontic (Lite Mode)
  { value: 'ortho_removable_appliance', label: 'Removable Orthodontic Appliance (simple)' },
  { value: 'ortho_clear_aligner_simple', label: 'Clear Aligner Therapy (per arch, simple)' },
  { value: 'ortho_retainer', label: 'Orthodontic Retainer (per arch)' }
]

// Auto-suggestion mapping: condition -> suggested treatments
// Updated to use database treatment codes
export const CONDITION_TREATMENT_SUGGESTIONS: Record<string, string[]> = {
  // Primary mappings using database codes
  'caries': ['resto_comp_one_surface_ant', 'resto_comp_two_surface_ant', 'resto_comp_one_surface_post'],
  'periapical-lesion': ['endo_rct_1_canal', 'endo_rct_2_canals'],
  'fracture': ['crown_full_tooth_coloured', 'crown_temp'],
  'root-fracture': ['crown_full_tooth_coloured', 'endo_rct_1_canal'],
  'crown-fracture': ['crown_full_tooth_coloured', 'veneer_indirect'],
  'existing-large-filling': ['crown_full_tooth_coloured', 'onlay_inlay_indirect_tc'],
  'tooth-wear': ['resto_comp_three_plus_ant', 'crown_full_tooth_coloured'],
  'attrition': ['resto_comp_three_plus_ant', 'crown_full_tooth_coloured'],
  'pulpitis': ['endo_rct_1_canal', 'endo_rct_2_canals'],
  'missing-tooth': ['implant_placement', 'bridge_3_unit', 'prost_partial_denture_resin'],
  'mobility': ['surg_simple_extraction', 'perio_scale_root_planing'],
  'tooth-mobility': ['surg_simple_extraction', 'perio_scale_root_planing'],
  'impacted-tooth': ['surg_surgical_extraction'],
  'root-piece': ['surg_surgical_extraction'],
  'periodontal-pocket': ['perio_scale_root_planing', 'perio_curettage'],
  'gingivitis': ['scale_clean_polish', 'perio_scale_root_planing'],
  
  // Additional mappings using database codes
  'abrasion': ['resto_comp_two_surface_ant', 'crown_full_tooth_coloured'],
  'erosion': ['resto_comp_one_surface_ant', 'fluoride_application'],
  'calculus': ['scale_clean_polish'],
  'plaque': ['scale_clean_polish'],
  'abscess': ['endo_rct_1_canal', 'surg_simple_extraction'],
  'cyst': ['surg_surgical_extraction'],
  'resorption': ['endo_rct_1_canal', 'surg_simple_extraction'],
  'staining': ['whitening_inchair', 'veneer_indirect'],
  'fluorosis': ['whitening_inchair', 'veneer_indirect'],
  'malocclusion': ['ortho_removable_appliance'],
  'crowding': ['ortho_removable_appliance', 'surg_simple_extraction'],
  'spacing': ['ortho_removable_appliance', 'resto_comp_one_surface_ant'],
  'overjet': ['ortho_removable_appliance'],
  'overbite': ['ortho_removable_appliance'],
  'crossbite': ['ortho_removable_appliance'],
  'open-bite': ['ortho_removable_appliance'],
  'tmj-disorder': ['nightguard_upper', 'ortho_removable_appliance'],
  'hypoplasia': ['resto_comp_two_surface_ant', 'crown_full_tooth_coloured'],
  
  // NEW: Comprehensive condition-treatment mappings from Batch 1
  // Caries variations
  'caries_dentine': ['resto_comp_one_surface_post', 'resto_glassionomer', 'crown_full_tooth_coloured'],
  'caries_enamel': ['resto_comp_one_surface_ant', 'fluoride_application'],
  'caries_root': ['resto_comp_one_surface_post', 'resto_glassionomer'],
  'failed_restoration': ['resto_comp_three_plus_post', 'crown_full_tooth_coloured'],
  
  // Tooth wear variations
  'tooth_wear_attrition': ['resto_comp_two_surface_ant', 'splint_occlusal'],
  'tooth_wear_erosion': ['resto_comp_one_surface_ant', 'fluoride_application'],
  'tooth_wear_abfraction': ['resto_comp_one_surface_post', 'desensitising'],
  'dentine_hypersensitivity': ['desensitising', 'fluoride_application'],
  
  // Pulp and endodontic conditions
  'reversible_pulpitis': ['endo_indirect_pulp_cap', 'resto_comp_one_surface_post'],
  'irreversible_pulpitis': ['endo_extirpation_emergency', 'endo_rct_1_canal', 'endo_rct_2_canals', 'endo_rct_3_canals', 'endo_rct_4_canals', 'surg_simple_extraction'],
  'necrotic_pulp': ['endo_rct_1_canal', 'endo_rct_2_canals', 'endo_rct_3_canals', 'endo_rct_4_canals', 'surg_surgical_extraction'],
  'periapical_abscess': ['surg_incision_drainage', 'endo_rct_1_canal', 'endo_rct_2_canals', 'endo_rct_3_canals', 'endo_rct_4_canals', 'surg_surgical_extraction'],
  'asymptomatic_apical_periodontitis': ['endo_rct_1_canal', 'endo_rct_2_canals', 'endo_rct_3_canals', 'endo_rct_4_canals', 'endo_retx'],
  'flare_up_post_endo': ['endo_retx', 'surg_incision_drainage'],
  
  // Periodontal conditions
  'gingivitis_plaque': ['scale_clean_polish', 'oh_instructions', 'fluoride_application'],
  'periodontitis_stage_i_ii': ['perio_scale_root_planing', 'perio_curettage'],
  'periodontal_abscess': ['surg_incision_drainage', 'perio_scale_root_planing'],
  
  // Surgical conditions
  'dry_socket': ['surg_incision_drainage', 'exam_emergency'],
  
  // Edentulism variations - will be overridden by Batch 2 enhanced mappings
  
  // Aesthetic conditions
  'aesthetic_discolouration': ['whitening_inchair', 'veneer_indirect', 'veneer_direct'],
  
  // Functional conditions
  'bruxism': ['splint_occlusal', 'tmj_adjustment'],
  
  // Trauma conditions
  'trauma_avulsion': ['surg_replantation', 'splint_occlusal', 'endo_rct_single'],
  
  // NEW: Batch 2 - Enhanced condition-treatment mappings
  // Bridges/Crowns - Enhanced mappings
  'caries_recurrent': ['resto_comp_two_surface_post', 'crown_full_tooth_coloured', 'crown_recement'],
  'fractured_cusp_restorable': ['onlay_inlay_indirect_tc', 'crown_full_tooth_coloured', 'resto_comp_three_plus_post'],
  'cracked_tooth_vital': ['onlay_inlay_indirect_tc', 'splint_occlusal', 'crown_full_tooth_coloured'],
  'tooth_nonrestorable': ['surg_simple_extraction', 'prost_immediate_denture_partial', 'crown_implant_supported_tc'],
  
  // Missing Teeth / Edentulism - Enhanced mappings
  'missing_single_tooth': ['bridge_abutment_crown_tc', 'bridge_pontic_indirect_tc', 'crown_implant_supported_tc'],
  'partial_edentulism': ['prost_partial_denture_cast_4plus', 'prost_partial_denture_resin_4plus', 'prost_immediate_denture_partial'],
  
  // Denture Maintenance/Repairs - Enhanced mappings
  'mucositis_denture': ['prost_denture_adjustment', 'prost_soft_reline', 'oh_instructions'],
  'retained_root': ['surg_simple_extraction', 'prost_add_to_denture', 'prost_partial_denture_resin_1to3'],
  
  // Palliative / Sedation / Mouthguards - Enhanced mappings
  'symptomatic_apical_periodontitis': ['palliative_care', 'medication_prescription', 'endo_extirpation'],
  'pericoronitis': ['palliative_care', 'medication_prescription', 'surg_surgical_extraction'],
  'tmj_pain_dysfunction': ['splint_occlusal', 'tmj_adjustment', 'nitrous_sedation'],
  'halitosis': ['scale_clean_polish', 'oh_instructions', 'mouthguard_custom'],
  
  // NEW: Batch 3 - Enhanced condition-treatment mappings
  // Advanced Perio - Enhanced mappings
  'periodontitis_stage_iii_iv': ['perio_flap_surgery', 'perio_guided_tissue_regen', 'perio_bone_graft'],
  
  // Oral Surgery - Enhanced mappings
  'impacted_tooth': ['surg_exposure_unerupted', 'surg_surgical_extraction', 'surg_alveoloplasty'],
  'soft_tissue_lesion_suspect': ['surg_biopsy', 'surg_minor_soft_tissue', 'surg_apical_cystectomy'],
  
  // Trauma - Enhanced mappings
  'trauma_luxation': ['trauma_splinting', 'endo_rct_single', 'palliative_care'],
  'trauma_fracture_crown': ['crown_temp', 'trauma_pulpotomy_temp', 'crown_full_tooth_coloured'],
  
  // Optional Prosthodontics - Enhanced mappings
  'complete_edentulism': ['prost_full_denture_upper', 'prost_overdenture', 'prost_resilient_lining'],
  
  // Ortho Lite - Enhanced mappings
  'aesthetic_shape_alignment': ['ortho_clear_aligner_simple', 'ortho_removable_appliance', 'ortho_retainer']
}

// Generate tooth options for searchable select
export function getToothOptions(system: ToothNumberingSystem): SearchableSelectOption[] {
  const teeth = TOOTH_NUMBERING_SYSTEMS[system].teeth;
  
  // Sort teeth numerically for better UX in dropdown
  const sortedTeeth = [...teeth].sort((a, b) => {
    const numA = parseInt(a);
    const numB = parseInt(b);
    return numA - numB;
  });
  
  return sortedTeeth.map(tooth => ({
    value: tooth,
    label: tooth
  }))
}

// Get suggested treatments for a condition
export function getSuggestedTreatments(condition: string): SearchableSelectOption[] {
  // Normalize the condition key to handle variations
  const normalizedCondition = condition.toLowerCase().trim()
  const suggestions = CONDITION_TREATMENT_SUGGESTIONS[normalizedCondition] || []
  
  if (suggestions.length === 0) {
    // If no specific suggestions, return all treatments without any pinned
    return ALL_TREATMENTS.map(t => ({ ...t, pinned: false }))
  }
  
  // Return suggested treatments with pinned flag, plus all other treatments
  const suggestedOptions = suggestions.map(treatmentValue => {
    const treatment = ALL_TREATMENTS.find(t => t.value === treatmentValue)
    return treatment ? { ...treatment, pinned: true } : null
  }).filter(Boolean) as SearchableSelectOption[]

  const otherTreatments = ALL_TREATMENTS.filter(t => 
    !suggestions.includes(t.value)
  ).map(t => ({ ...t, pinned: false }))

  return [...suggestedOptions, ...otherTreatments]
}

// Smart treatment suggestion that works with database treatments
export function getSmartTreatmentSuggestion(condition: string, availableTreatments: SearchableSelectOption[]): string | null {
  const normalizedCondition = condition.toLowerCase().trim();
  const suggestions = CONDITION_TREATMENT_SUGGESTIONS[normalizedCondition] || [];
  
  // Try to find the first suggested treatment that exists in the database
  for (const suggestion of suggestions) {
    const exists = availableTreatments.find(t => t.value === suggestion);
    if (exists) {
      return suggestion;
    }
  }
  
  // Fallback: try to find similar treatments by partial matching
  for (const suggestion of suggestions) {
    // For caries -> filling, try to find any composite filling
    if (suggestion.includes('resto_comp') || suggestion === 'filling') {
      const compositeFillings = availableTreatments.filter(t => 
        t.value.includes('resto_comp') || 
        t.label.toLowerCase().includes('composite') ||
        t.label.toLowerCase().includes('filling')
      );
      if (compositeFillings.length > 0) {
        return compositeFillings[0].value;
      }
    }
    
    // For root canal treatments
    if (suggestion.includes('endo_rct') || suggestion === 'root-canal-treatment') {
      const rctTreatments = availableTreatments.filter(t => 
        t.value.includes('endo_rct') || 
        t.label.toLowerCase().includes('root canal')
      );
      if (rctTreatments.length > 0) {
        return rctTreatments[0].value;
      }
    }
    
    // For extractions
    if (suggestion.includes('surg_') && suggestion.includes('extraction')) {
      const extractions = availableTreatments.filter(t => 
        t.value.includes('extraction') || 
        t.label.toLowerCase().includes('extraction')
      );
      if (extractions.length > 0) {
        return extractions[0].value;
      }
    }
    
    // For crowns
    if (suggestion.includes('crown')) {
      const crowns = availableTreatments.filter(t => 
        t.value.includes('crown') || 
        t.label.toLowerCase().includes('crown')
      );
      if (crowns.length > 0) {
        return crowns[0].value;
      }
    }
  }
  
  return null;
}

// Get replacement options for extracted teeth based on tooth number
export function getReplacementOptions(tooth: string): SearchableSelectOption[] {
  if (!tooth) return []
  
  try {
    const toothNum = parseInt(tooth)
    
    // Front teeth (cosmetic importance) - suggest implant
    if (toothNum >= 6 && toothNum <= 11 || toothNum >= 22 && toothNum <= 27) {
      return [
        { value: 'implant-placement', label: 'Implant', pinned: true },
        { value: 'bridge', label: 'Bridge', pinned: false },
        { value: 'partial-denture', label: 'Partial Denture', pinned: false },
        { value: 'none', label: 'No Replacement', pinned: false }
      ]
    }
    
    // Back teeth (functional importance) - suggest bridge
    if (toothNum >= 1 && toothNum <= 5 || toothNum >= 12 && toothNum <= 16 || 
        toothNum >= 17 && toothNum <= 21 || toothNum >= 28 && toothNum <= 32) {
      return [
        { value: 'bridge', label: 'Bridge', pinned: true },
        { value: 'implant-placement', label: 'Implant', pinned: false },
        { value: 'partial-denture', label: 'Partial Denture', pinned: false },
        { value: 'none', label: 'No Replacement', pinned: false }
      ]
    }
    
    // Default options for unknown tooth numbers
    return [
      { value: 'implant-placement', label: 'Implant', pinned: false },
      { value: 'bridge', label: 'Bridge', pinned: false },
      { value: 'partial-denture', label: 'Partial Denture', pinned: false },
      { value: 'none', label: 'No Replacement', pinned: false }
    ]
  } catch {
    // If tooth number parsing fails, return default options
    return [
      { value: 'implant-placement', label: 'Implant', pinned: false },
      { value: 'bridge', label: 'Bridge', pinned: false },
      { value: 'partial-denture', label: 'Partial Denture', pinned: false },
      { value: 'none', label: 'No Replacement', pinned: false }
    ]
  }
}

// Default pricing for treatments (expanded with comprehensive Australian dental pricing)
export const DEFAULT_TREATMENT_PRICES: Record<string, number> = {
  // Existing treatments (updated with more accurate pricing)
  'filling': 220,
  'extraction': 250,
  'root-canal-treatment': 1100,
  'crown': 1800,
  'bridge': 850,
  'implant-placement': 2300,
  'partial-denture': 1600,
  'scale-and-clean': 190,
  'periodontal-treatment': 280,
  'veneer': 1500,
  'fluoride-treatment': 40,
  'composite-build-up': 200,
  'surgical-extraction': 450,
  'deep-cleaning': 280,
  'complete-denture': 2500,
  'inlay': 1400,
  'onlay': 1400,
  'whitening': 750,
  'bonding': 150,
  'sealant': 70,
  'night-guard': 600,
  'orthodontic-treatment': 4000,
  'braces': 3500,
  'invisalign': 4500,
  'retainer': 200,
  'space-maintainer': 180,
  'apicoectomy': 950,
  'bone-graft': 800,
  'sinus-lift': 1200,
  'gum-graft': 750,
  
  // NEW: Comprehensive pricing from Australian Dental Glossary (Batch 1)
  // Examinations and diagnostics
  'exam_emergency': 100,
  'exam_comprehensive': 120,
  'radiograph_intraoral': 45,
  'radiograph_opg': 100,
  
  // Preventive treatments
  'scale_clean_polish': 190,
  'fluoride_application': 40,
  'fissure_sealant': 70,
  'desensitising': 55,
  'oh_instructions': 40,
  'whitening_inchair': 750,
  'whitening_takehome': 450,
  
  // Restorative treatments - Composite
  'resto_comp_one_surface_ant': 220,
  'resto_comp_two_surface_ant': 280,
  'resto_comp_three_plus_ant': 340,
  'resto_comp_one_surface_post': 260,
  'resto_comp_two_surface_post': 320,
  'resto_comp_three_plus_post': 380,
  'resto_glassionomer': 160,
  'resto_amalgam_post': 290,
  
  // Crowns and indirect restorations
  'crown_temp': 180,
  'crown_full_tooth_coloured': 1800,
  'crown_full_metal': 1650,
  'onlay_inlay_indirect_tc': 1400,
  'veneer_indirect': 1500,
  'veneer_direct': 650,
  
  // Endodontic treatments
  'endo_direct_pulp_cap': 120,
  'endo_indirect_pulp_cap': 120,
  'endo_pulpotomy': 220,
  'endo_extirpation': 180,
  'endo_rct_single': 1100,
  'endo_rct_multi': 1600,
  'endo_retx': 1900,
  'endo_apicectomy': 950,
  
  // NEW: Root Canal Variants (1-4 canals)
  'endo_rct_1_canal': 1100,
  'endo_rct_2_canals': 1350,
  'endo_rct_3_canals': 1650,
  'endo_rct_4_canals': 1850,
  
  // NEW: Root Canal Loads/Add-ons
  'endo_retx_load': 300,
  'endo_calcified_per_canal': 150,
  'endo_remove_post': 180,
  'endo_remove_root_filling_per_canal': 120,
  'endo_additional_irrigation_visit': 120,
  'endo_interim_therapeutic_fill': 180,
  'endo_apicectomy_per_root': 950,
  'endo_extirpation_emergency': 180,
  
  // Periodontal treatments
  'perio_scale_root_planing': 280,
  'perio_curettage': 280,
  'perio_flap_surgery': 950,
  'perio_graft': 750,
  'perio_crown_lengthening': 950,
  
  // Surgical treatments
  'surg_simple_extraction': 250,
  'surg_surgical_extraction': 450,
  'surg_incision_drainage': 200,
  'surg_replantation': 500,
  'surg_frenectomy': 400,
  'surg_biopsy': 350,
  
  // Prosthodontic treatments
  'prost_partial_denture_resin': 1600,
  'prost_partial_denture_cast': 2200,
  'prost_full_denture_resin': 2500,
  'prost_denture_reline': 550,
  'prost_denture_repair': 300,
  
  // Functional treatments
  'splint_occlusal': 600,
  'tmj_adjustment': 250,
  
  // NEW: Batch 2 - Prosthodontics (Crowns/Bridges/Posts)
  'post_core_direct': 420,
  'post_core_indirect': 650,
  'bridge_temp': 220,
  'bridge_pontic_indirect_tc': 1600,
  'bridge_abutment_crown_tc': 1700,
  'bridge_recement': 220,
  'crown_recement': 180,
  
  // NEW: Batch 2 - Dentures (Partial/Full/Repairs)
  'prost_partial_denture_resin_1to3': 1450,
  'prost_partial_denture_resin_4plus': 1700,
  'prost_partial_denture_cast_1to3': 2100,
  'prost_partial_denture_cast_4plus': 2400,
  'prost_immediate_denture_partial': 1850,
  'prost_immediate_denture_full': 2700,
  'prost_full_denture_upper': 2500,
  'prost_full_denture_lower': 2600,
  'prost_add_to_denture': 300,
  'prost_soft_reline': 380,
  'prost_hard_reline_lab': 550,
  'prost_denture_repair_fracture': 300,
  'prost_denture_adjustment': 120,
  
  // NEW: Batch 2 - Implant Restorative
  'crown_implant_supported_tc': 1950,
  'abutment_custom': 420,
  
  // NEW: Batch 2 - General/Palliative/Sedation
  'palliative_care': 120,
  'postop_review_simple': 60,
  'medication_prescription': 30,
  'nitrous_sedation': 180,
  'iv_sedation_inhouse': 800,
  'mouthguard_custom': 220,
  
  // NEW: Batch 3 - Advanced Periodontics
  'perio_guided_tissue_regen': 1100,
  'perio_bone_graft': 950,
  
  // NEW: Batch 3 - Oral Surgery Extensions
  'surg_exposure_unerupted': 400,
  'surg_alveoloplasty': 500,
  'surg_tori_removal': 850,
  'surg_minor_soft_tissue': 400,
  'surg_apical_cystectomy': 1200,
  
  // NEW: Batch 3 - Trauma / Emergency
  'trauma_splinting': 350,
  'trauma_pulpotomy_temp': 200,
  
  // NEW: Batch 3 - Optional Prosthodontics (Advanced GP)
  'prost_resilient_lining': 400,
  'prost_overdenture': 2800,
  
  // NEW: Batch 3 - Optional Orthodontic (Lite Mode)
  'ortho_removable_appliance': 750,
  'ortho_clear_aligner_simple': 2500,
  'ortho_retainer': 400
}