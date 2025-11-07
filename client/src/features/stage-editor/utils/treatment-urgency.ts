/**
 * Treatment urgency classification for staging
 * 
 * HIGH = Stage 1: Emergency/Infection Control - needs immediate attention
 * MEDIUM = Stage 2: Major Restorative/Surgical - important but can wait
 * LOW = Stage 3: Preventive/Cosmetic - elective treatments
 */

export type UrgencyLevel = 'high' | 'medium' | 'low';

// Condition urgency mapping
export const CONDITION_URGENCY: Record<string, UrgencyLevel> = {
  // HIGH URGENCY - Emergency/Infection Control (Stage 1)
  'caries': 'high',                    // Active decay needs immediate treatment
  'pulpitis': 'high',                  // Inflamed pulp, causes pain
  'abscess': 'high',                   // Infection, urgent
  'periapical-lesion': 'high',         // Root infection
  'root-fracture': 'high',             // Structural emergency
  'crown-fracture': 'high',            // Exposed tooth structure
  'fracture': 'high',                  // General fracture
  'tooth-mobility': 'high',            // Risk of tooth loss
  'mobility': 'high',                  // Risk of tooth loss
  'cyst': 'high',                      // Pathology requiring surgery
  'resorption': 'high',                // Progressive tooth destruction
  
  // MEDIUM URGENCY - Major Restorative (Stage 2)
  'missing-tooth': 'medium',           // Affects function but not emergency
  'impacted-tooth': 'medium',          // Surgical but not urgent
  'root-piece': 'medium',              // Surgical extraction needed
  'existing-large-filling': 'medium',  // May need crown but not urgent
  'tooth-wear': 'medium',              // Progressive but not emergency
  'attrition': 'medium',               // Wear from grinding
  'abrasion': 'medium',                // Mechanical wear
  'erosion': 'medium',                 // Chemical wear
  'periodontal-pocket': 'medium',      // Significant gum disease
  'malocclusion': 'medium',            // Bite issues, affects function
  'tmj-disorder': 'medium',            // Joint problems
  'hypoplasia': 'medium',              // Developmental defect
  
  // LOW URGENCY - Preventive/Cosmetic (Stage 3)
  'gingivitis': 'low',                 // Early gum disease
  'calculus': 'low',                   // Tartar buildup
  'plaque': 'low',                     // Bacterial buildup
  'staining': 'low',                   // Cosmetic concern
  'fluorosis': 'low',                  // Cosmetic fluoride staining
  'crowding': 'low',                   // Orthodontic, elective
  'spacing': 'low',                    // Orthodontic, elective
  'overjet': 'low',                    // Orthodontic, elective
  'overbite': 'low',                   // Orthodontic, elective
  'crossbite': 'low',                  // Orthodontic, elective
  'open-bite': 'low',                  // Orthodontic, elective
  
  // NEW: Comprehensive urgency mappings from Batch 1
  // HIGH URGENCY - Emergency/Infection Control (Stage 1)
  'tooth_nonrestorable': 'high',       // Non-restorable tooth
  'irreversible_pulpitis': 'high',     // Irreversible pulp inflammation
  'necrotic_pulp': 'high',             // Dead pulp tissue
  'periapical_abscess': 'high',        // Periapical abscess
  'symptomatic_apical_periodontitis': 'high', // Symptomatic apical periodontitis
  'flare_up_post_endo': 'high',        // Post-endodontic flare-up
  'periodontal_abscess': 'high',       // Periodontal abscess
  'pericoronitis': 'high',             // Pericoronitis
  'dry_socket': 'high',                // Alveolar osteitis (dry socket)
  'trauma_avulsion': 'high',           // Dental trauma - avulsion
  'trauma_luxation': 'high',           // Dental trauma - luxation
  'trauma_fracture_crown': 'high',     // Dental trauma - crown fracture
  
  // MEDIUM URGENCY - Major Restorative (Stage 2)
  'caries_dentine': 'medium',          // Caries in dentine
  'caries_recurrent': 'medium',        // Recurrent caries
  'caries_root': 'medium',             // Root caries
  'fractured_cusp_restorable': 'medium', // Fractured cusp (restorable)
  'cracked_tooth_vital': 'medium',     // Cracked tooth (vital)
  'failed_restoration': 'medium',      // Failed/defective restoration
  'reversible_pulpitis': 'medium',     // Reversible pulpitis
  'asymptomatic_apical_periodontitis': 'medium', // Asymptomatic apical periodontitis
  'periodontitis_stage_i_ii': 'medium', // Periodontitis (Stage I-II)
  'periodontitis_stage_iii_iv': 'medium', // Periodontitis (Stage III-IV)
  'impacted_tooth': 'medium',          // Impacted tooth
  'retained_root': 'medium',           // Retained root
  'soft_tissue_lesion_suspect': 'medium', // Suspicious soft tissue lesion
  'bruxism': 'medium',                 // Bruxism/parafunction
  'tmj_pain_dysfunction': 'medium',    // TMJ pain/dysfunction
  
  // LOW URGENCY - Preventive/Cosmetic (Stage 3)
  'caries_enamel': 'low',              // Caries in enamel (incipient)
  'tooth_wear_attrition': 'low',       // Tooth wear - attrition
  'tooth_wear_erosion': 'low',         // Tooth wear - erosion
  'tooth_wear_abfraction': 'low',      // Tooth wear - abfraction/abrasion
  'dentine_hypersensitivity': 'low',   // Dentine hypersensitivity
  'gingivitis_plaque': 'low',          // Gingivitis (plaque-induced)
  'mucositis_denture': 'low',          // Denture stomatitis/mucositis
  'halitosis': 'low',                  // Halitosis (oral cause)
  'missing_single_tooth': 'low',       // Missing tooth (single)
  'partial_edentulism': 'low',         // Partial edentulism
  'complete_edentulism': 'low',        // Complete edentulism
  'aesthetic_discolouration': 'low',   // Aesthetic concern - discolouration
  'aesthetic_shape_alignment': 'low'   // Aesthetic concern - shape/alignment
};

// Treatment urgency mapping
export const TREATMENT_URGENCY: Record<string, UrgencyLevel> = {
  // HIGH URGENCY - Emergency/Infection Control (Stage 1)
  'root-canal-treatment': 'high',      // Treats infected/inflamed pulp
  'apicoectomy': 'high',               // Root-end surgery
  'extraction': 'high',                // Tooth removal (usually urgent)
  
  'surgical-extraction': 'medium',     // Complex but planned surgical procedure
  'filling': 'medium',                 // Restores decay but not always urgent
  'crown': 'medium',                   // Major restoration
  'bridge': 'medium',                  // Major restoration
  'implant-placement': 'medium',       // Surgical but planned
  'composite-build-up': 'medium',      // Significant restoration
  'inlay': 'medium',                   // Indirect restoration
  'onlay': 'medium',                   // Indirect restoration
  'partial-denture': 'medium',         // Major prosthetic
  'complete-denture': 'medium',        // Major prosthetic
  'deep-cleaning': 'medium',           // Scaling & root planing
  'periodontal-treatment': 'medium',   // Gum disease treatment
  'bone-graft': 'medium',              // Surgical procedure
  'sinus-lift': 'medium',              // Surgical procedure
  'gum-graft': 'medium',               // Surgical procedure
  'orthodontic-treatment': 'medium',   // Long-term treatment
  'braces': 'medium',                  // Long-term treatment
  'invisalign': 'medium',              // Long-term treatment
  
  // LOW URGENCY - Preventive/Cosmetic (Stage 3)
  'scale-and-clean': 'low',            // Routine cleaning
  'fluoride-treatment': 'low',         // Preventive
  'sealant': 'low',                    // Preventive
  'whitening': 'low',                  // Cosmetic
  'veneer': 'low',                     // Cosmetic
  'bonding': 'low',                    // Minor cosmetic
  'night-guard': 'low',                // Protective appliance
  'retainer': 'low',                   // Orthodontic maintenance
  'space-maintainer': 'low',           // Preventive appliance
};

// Keyword-based fallback for unmapped items
export const URGENCY_KEYWORDS: Record<string, UrgencyLevel> = {
  // High urgency keywords
  'emergency': 'high',
  'urgent': 'high',
  'pain': 'high',
  'infection': 'high',
  'abscess': 'high',
  'fracture': 'high',
  'trauma': 'high',
  'swelling': 'high',
  
  // Medium urgency keywords
  'surgical': 'medium',
  'extraction': 'medium',
  'restoration': 'medium',
  'crown': 'medium',
  'root': 'medium',
  
  // Low urgency keywords
  'cleaning': 'low',
  'preventive': 'low',
  'cosmetic': 'low',
  'whitening': 'low',
  'maintenance': 'low',
  'routine': 'low',
};

/**
 * Get urgency level for a condition or treatment
 */
export function getUrgencyLevel(item: string, type: 'condition' | 'treatment'): UrgencyLevel {
  const normalizedItem = item.toLowerCase().trim();
  
  // Check direct mappings first
  if (type === 'condition' && CONDITION_URGENCY[normalizedItem]) {
    return CONDITION_URGENCY[normalizedItem];
  }
  
  if (type === 'treatment' && TREATMENT_URGENCY[normalizedItem]) {
    return TREATMENT_URGENCY[normalizedItem];
  }
  
  // Fallback to keyword matching
  for (const [keyword, urgency] of Object.entries(URGENCY_KEYWORDS)) {
    if (normalizedItem.includes(keyword)) {
      return urgency;
    }
  }
  
  // Default to medium urgency if no match found
  return 'medium';
}

/**
 * Get urgency level for a finding (considers both condition and treatment)
 */
export function getFindingUrgency(condition: string, treatment: string): UrgencyLevel {
  const conditionUrgency = getUrgencyLevel(condition, 'condition');
  const treatmentUrgency = getUrgencyLevel(treatment, 'treatment');
  
  // Return the higher urgency level (high > medium > low)
  if (conditionUrgency === 'high' || treatmentUrgency === 'high') {
    return 'high';
  }
  if (conditionUrgency === 'medium' || treatmentUrgency === 'medium') {
    return 'medium';
  }
  return 'low';
}

/**
 * Create dynamic stages based on available urgency levels
 */
// Comprehensive treatment duration mapping (in minutes) - Australian Dental Glossary
export const TREATMENT_DURATIONS: Record<string, number> = {
  // Existing treatments (updated with more accurate durations)
  'filling': 30,
  'crown': 90,
  'root-canal-treatment': 120,
  'surgical-extraction': 60,
  'implant': 180,
  'implant-placement': 180,
  'bridge': 120,
  'scaling': 60,
  'whitening': 45,
  'extraction': 30,
  'cleaning': 60,
  
  // NEW: Comprehensive durations from Australian Dental Glossary (Batch 1)
  // Examinations and diagnostics
  'exam_emergency': 20,
  'exam_comprehensive': 30,
  'radiograph_intraoral': 10,
  'radiograph_opg': 10,
  
  // Preventive treatments
  'scale_clean_polish': 45,
  'fluoride_application': 5,
  'fissure_sealant': 20,
  'desensitising': 10,
  'oh_instructions': 10,
  'whitening_inchair': 75,
  'whitening_takehome': 30,
  
  // Restorative treatments - Composite
  'resto_comp_one_surface_ant': 30,
  'resto_comp_two_surface_ant': 40,
  'resto_comp_three_plus_ant': 50,
  'resto_comp_one_surface_post': 40,
  'resto_comp_two_surface_post': 50,
  'resto_comp_three_plus_post': 60,
  'resto_glassionomer': 25,
  'resto_amalgam_post': 45,
  
  // Crowns and indirect restorations
  'crown_temp': 30,
  'crown_full_tooth_coloured': 90,
  'crown_full_metal': 90,
  'onlay_inlay_indirect_tc': 80,
  'veneer_indirect': 80,
  'veneer_direct': 60,
  
  // Endodontic treatments
  'endo_direct_pulp_cap': 20,
  'endo_indirect_pulp_cap': 20,
  'endo_pulpotomy': 40,
  'endo_extirpation': 30,
  'endo_rct_single': 90,
  'endo_rct_multi': 120,
  'endo_retx': 120,
  'endo_apicectomy': 60,
  
  // NEW: Root Canal Variants (1-4 canals)
  'endo_rct_1_canal': 90,
  'endo_rct_2_canals': 105,
  'endo_rct_3_canals': 120,
  'endo_rct_4_canals': 135,
  
  // NEW: Root Canal Loads/Add-ons
  'endo_retx_load': 30,
  'endo_calcified_per_canal': 15,
  'endo_remove_post': 20,
  'endo_remove_root_filling_per_canal': 15,
  'endo_additional_irrigation_visit': 15,
  'endo_interim_therapeutic_fill': 20,
  'endo_apicectomy_per_root': 60,
  'endo_extirpation_emergency': 30,
  
  // Periodontal treatments
  'perio_scale_root_planing': 45,
  'perio_curettage': 45,
  'perio_flap_surgery': 90,
  'perio_graft': 60,
  'perio_crown_lengthening': 75,
  
  // Surgical treatments
  'surg_simple_extraction': 30,
  'surg_surgical_extraction': 60,
  'surg_incision_drainage': 30,
  'surg_replantation': 60,
  'surg_frenectomy': 45,
  'surg_biopsy': 30,
  
  // Prosthodontic treatments
  'prost_partial_denture_resin': 120,
  'prost_partial_denture_cast': 150,
  'prost_full_denture_resin': 150,
  'prost_denture_reline': 60,
  'prost_denture_repair': 45,
  
  // Functional treatments
  'splint_occlusal': 60,
  'tmj_adjustment': 30,
  
  // NEW: Batch 2 - Prosthodontics (Crowns/Bridges/Posts)
  'post_core_direct': 45,
  'post_core_indirect': 60,
  'bridge_temp': 30,
  'bridge_pontic_indirect_tc': 70,
  'bridge_abutment_crown_tc': 90,
  'bridge_recement': 30,
  'crown_recement': 25,
  
  // NEW: Batch 2 - Dentures (Partial/Full/Repairs)
  'prost_partial_denture_resin_1to3': 120,
  'prost_partial_denture_resin_4plus': 130,
  'prost_partial_denture_cast_1to3': 150,
  'prost_partial_denture_cast_4plus': 160,
  'prost_immediate_denture_partial': 150,
  'prost_immediate_denture_full': 170,
  'prost_full_denture_upper': 150,
  'prost_full_denture_lower': 150,
  'prost_add_to_denture': 45,
  'prost_soft_reline': 45,
  'prost_hard_reline_lab': 60,
  'prost_denture_repair_fracture': 45,
  'prost_denture_adjustment': 20,
  
  // NEW: Batch 2 - Implant Restorative
  'crown_implant_supported_tc': 75,
  'abutment_custom': 40,
  
  // NEW: Batch 2 - General/Palliative/Sedation
  'palliative_care': 20,
  'postop_review_simple': 10,
  'medication_prescription': 5,
  'nitrous_sedation': 45,
  'iv_sedation_inhouse': 60,
  'mouthguard_custom': 30,
  
  // NEW: Batch 3 - Advanced Periodontics
  'perio_guided_tissue_regen': 90,
  'perio_bone_graft': 75,
  
  // NEW: Batch 3 - Oral Surgery Extensions
  'surg_exposure_unerupted': 45,
  'surg_alveoloplasty': 60,
  'surg_tori_removal': 90,
  'surg_minor_soft_tissue': 45,
  'surg_apical_cystectomy': 90,
  
  // NEW: Batch 3 - Trauma / Emergency
  'trauma_splinting': 45,
  'trauma_pulpotomy_temp': 30,
  
  // NEW: Batch 3 - Optional Prosthodontics (Advanced GP)
  'prost_resilient_lining': 45,
  'prost_overdenture': 150,
  
  // NEW: Batch 3 - Optional Orthodontic (Lite Mode)
  'ortho_removable_appliance': 60,
  'ortho_clear_aligner_simple': 60,
  'ortho_retainer': 30,
  
  // Additional existing treatments with durations
  'scale-and-clean': 45,
  'deep-cleaning': 45,
  'periodontal-treatment': 45,
  'fluoride-treatment': 5,
  'composite-build-up': 30,
  'partial-denture': 120,
  'complete-denture': 150,
  'inlay': 80,
  'onlay': 80,
  'bonding': 30,
  'sealant': 20,
  'night-guard': 60,
  'orthodontic-treatment': 60,
  'braces': 60,
  'invisalign': 30,
  'retainer': 30,
  'space-maintainer': 30,
  'bone-graft': 60,
  'sinus-lift': 90,
  'gum-graft': 60
};

/**
 * Get estimated treatment duration in minutes
 */
export function getTreatmentDuration(treatment: string): number {
  const normalizedTreatment = treatment.toLowerCase().replace(/\s+/g, '-');
  return TREATMENT_DURATIONS[normalizedTreatment] || 30; // Default to 30 minutes
}

export function createDynamicStages(findings: Array<{ condition: string; treatment: string; [key: string]: any }>): Array<{
  name: string;
  focus: string;
  urgencyLevel: UrgencyLevel;
  items: any[];
}> {
  console.log('🎯 createDynamicStages called with findings:', findings);
  console.log('🎯 Sample finding for urgency test:', findings[0]);
  
  // Categorize findings by urgency
  const highUrgencyFindings = findings.filter(f => {
    const urgency = getFindingUrgency(f.condition, f.treatment);
    console.log(`🎯 Finding: ${f.condition} + ${f.treatment} = ${urgency} urgency`);
    return urgency === 'high';
  });
  const mediumUrgencyFindings = findings.filter(f => getFindingUrgency(f.condition, f.treatment) === 'medium');
  const lowUrgencyFindings = findings.filter(f => getFindingUrgency(f.condition, f.treatment) === 'low');
  
  console.log('🎯 Urgency distribution:', {
    high: highUrgencyFindings.length,
    medium: mediumUrgencyFindings.length, 
    low: lowUrgencyFindings.length
  });
  
  const stages = [];
  
  // Dynamic stage assignment based on what exists
  let stageCounter = 1;
  
  if (highUrgencyFindings.length > 0) {
    stages.push({
      name: `Stage ${stageCounter}`,
      focus: 'Immediate treatment of urgent conditions',
      urgencyLevel: 'high' as UrgencyLevel,
      items: highUrgencyFindings
    });
    stageCounter++;
    
    if (mediumUrgencyFindings.length > 0) {
      stages.push({
        name: `Stage ${stageCounter}`,
        focus: 'Major restorative and surgical procedures',
        urgencyLevel: 'medium' as UrgencyLevel,
        items: mediumUrgencyFindings
      });
      stageCounter++;
    }
    
    if (lowUrgencyFindings.length > 0) {
      stages.push({
        name: `Stage ${stageCounter}`,
        focus: 'Maintenance and preventive treatments',
        urgencyLevel: 'low' as UrgencyLevel,
        items: lowUrgencyFindings
      });
    }
  } else if (mediumUrgencyFindings.length > 0) {
    // No high urgency items, start with medium
    stages.push({
      name: `Stage ${stageCounter}`,
      focus: 'Main treatment phase',
      urgencyLevel: 'medium' as UrgencyLevel,
      items: mediumUrgencyFindings
    });
    stageCounter++;
    
    if (lowUrgencyFindings.length > 0) {
      stages.push({
        name: `Stage ${stageCounter}`,
        focus: 'Preventive and maintenance treatments',
        urgencyLevel: 'low' as UrgencyLevel,
        items: lowUrgencyFindings
      });
    }
  } else if (lowUrgencyFindings.length > 0) {
    // Only low urgency items
    stages.push({
      name: `Stage ${stageCounter}`,
      focus: 'Preventive and cosmetic treatments',
      urgencyLevel: 'low' as UrgencyLevel,
      items: lowUrgencyFindings
    });
  }
  
  return stages;
}
