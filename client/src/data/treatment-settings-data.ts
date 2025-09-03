import { TreatmentSetting, TreatmentCategoryGroup, TreatmentCategory } from '@/types/treatment-settings.types';
import { ALL_TREATMENTS } from './dental-data';
import { DEFAULT_TREATMENT_PRICES } from './dental-data';
import { TREATMENT_DURATIONS } from '@/features/stage-editor/utils/treatment-urgency';

// Helper function to get treatment duration from urgency mapping
const getTreatmentDuration = (treatmentValue: string): number => {
  return TREATMENT_DURATIONS[treatmentValue] || 30; // Default to 30 minutes
};

// Helper function to get treatment price from dental data
const getTreatmentPrice = (treatmentValue: string): number => {
  return DEFAULT_TREATMENT_PRICES[treatmentValue] || 0;
};

// Helper function to categorize treatments based on their value/label
const categorizeTreatment = (treatmentValue: string, label: string): TreatmentCategory => {
  const value = treatmentValue.toLowerCase();
  const labelLower = label.toLowerCase();

  // Emergency/General
  if (value.includes('emergency') || value.includes('exam_') || value.includes('radiograph_')) {
    return 'general';
  }

  // Preventive
  if (value.includes('scale_') || value.includes('fluoride_') || value.includes('fissure_') || 
      value.includes('desensitising') || value.includes('oh_') || value.includes('whitening_')) {
    return 'preventive';
  }

  // Restorative
  if (value.includes('resto_') || value.includes('crown_') || value.includes('onlay_') || 
      value.includes('inlay') || value.includes('veneer_') || value.includes('filling') ||
      value.includes('composite') || value.includes('amalgam') || value.includes('glassionomer')) {
    return 'restorative';
  }

  // Endodontics
  if (value.includes('endo_') || value.includes('pulp') || value.includes('rct') || 
      value.includes('apicectomy') || value.includes('retx')) {
    return 'endodontics';
  }

  // Periodontics
  if (value.includes('perio_') || value.includes('scale') || value.includes('curettage') || 
      value.includes('flap') || value.includes('graft') || value.includes('crown_lengthening') ||
      value.includes('guided_tissue') || value.includes('bone_graft')) {
    return 'periodontics';
  }

  // Oral Surgery
  if (value.includes('surg_') || value.includes('extraction') || value.includes('implant') ||
      value.includes('incision') || value.includes('replantation') || value.includes('frenectomy') ||
      value.includes('biopsy') || value.includes('exposure') || value.includes('alveoloplasty') ||
      value.includes('tori') || value.includes('cystectomy') || value.includes('trauma_')) {
    return 'oral-surgery';
  }

  // Prosthodontics
  if (value.includes('prost_') || value.includes('denture') || value.includes('bridge_') ||
      value.includes('post_core') || value.includes('overdenture') || value.includes('reline') ||
      value.includes('abutment') || value.includes('resilient')) {
    return 'prosthodontics';
  }

  // Orthodontics
  if (value.includes('ortho_') || value.includes('aligner') || value.includes('retainer') ||
      value.includes('appliance') || value.includes('braces') || value.includes('invisalign') ||
      value.includes('space_maintainer')) {
    return 'orthodontics';
  }

  // Functional
  if (value.includes('splint_') || value.includes('tmj_') || value.includes('occlusal') ||
      value.includes('mouthguard') || value.includes('night_guard')) {
    return 'functional';
  }

  // Emergency/Palliative
  if (value.includes('palliative') || value.includes('medication') || value.includes('sedation') ||
      value.includes('postop')) {
    return 'emergency';
  }

  // Default to general
  return 'general';
};

// Create treatment settings from ALL_TREATMENTS
const createTreatmentSettings = (): TreatmentSetting[] => {
  return ALL_TREATMENTS.map(treatment => ({
    value: treatment.value,
    label: treatment.label,
    category: categorizeTreatment(treatment.value, treatment.label),
    defaultDuration: getTreatmentDuration(treatment.value),
    defaultPrice: getTreatmentPrice(treatment.value)
  }));
};

// Generate all treatment settings
export const ALL_TREATMENT_SETTINGS = createTreatmentSettings();

// Category groups with descriptions
export const TREATMENT_CATEGORIES: TreatmentCategoryGroup[] = [
  {
    id: 'general',
    name: 'General & Diagnostic',
    description: 'Examinations, radiographs, and diagnostic procedures',
    treatments: ALL_TREATMENT_SETTINGS.filter(t => t.category === 'general')
  },
  {
    id: 'preventive',
    name: 'Preventive Care',
    description: 'Cleanings, fluoride, sealants, and preventive treatments',
    treatments: ALL_TREATMENT_SETTINGS.filter(t => t.category === 'preventive')
  },
  {
    id: 'restorative',
    name: 'Restorative',
    description: 'Fillings, crowns, veneers, and direct restorations',
    treatments: ALL_TREATMENT_SETTINGS.filter(t => t.category === 'restorative')
  },
  {
    id: 'endodontics',
    name: 'Endodontics',
    description: 'Root canal treatments and pulp therapies',
    treatments: ALL_TREATMENT_SETTINGS.filter(t => t.category === 'endodontics')
  },
  {
    id: 'periodontics',
    name: 'Periodontics',
    description: 'Gum treatments, scaling, and periodontal surgery',
    treatments: ALL_TREATMENT_SETTINGS.filter(t => t.category === 'periodontics')
  },
  {
    id: 'oral-surgery',
    name: 'Oral Surgery',
    description: 'Extractions, implants, and surgical procedures',
    treatments: ALL_TREATMENT_SETTINGS.filter(t => t.category === 'oral-surgery')
  },
  {
    id: 'prosthodontics',
    name: 'Prosthodontics',
    description: 'Dentures, bridges, and prosthetic restorations',
    treatments: ALL_TREATMENT_SETTINGS.filter(t => t.category === 'prosthodontics')
  },
  {
    id: 'orthodontics',
    name: 'Orthodontics',
    description: 'Braces, aligners, and orthodontic appliances',
    treatments: ALL_TREATMENT_SETTINGS.filter(t => t.category === 'orthodontics')
  },
  {
    id: 'functional',
    name: 'Functional',
    description: 'Splints, mouthguards, and TMJ treatments',
    treatments: ALL_TREATMENT_SETTINGS.filter(t => t.category === 'functional')
  },
  {
    id: 'emergency',
    name: 'Emergency & Palliative',
    description: 'Emergency care, pain relief, and palliative treatments',
    treatments: ALL_TREATMENT_SETTINGS.filter(t => t.category === 'emergency')
  }
];

// Helper function to get treatment setting by value
export const getTreatmentSetting = (treatmentValue: string): TreatmentSetting | undefined => {
  return ALL_TREATMENT_SETTINGS.find(t => t.value === treatmentValue);
};

// Helper function to get all treatments in a category
export const getTreatmentsByCategory = (category: TreatmentCategory): TreatmentSetting[] => {
  return ALL_TREATMENT_SETTINGS.filter(t => t.category === category);
};

// Helper function to search treatments across all categories
export const searchTreatments = (query: string): TreatmentSetting[] => {
  const lowerQuery = query.toLowerCase();
  return ALL_TREATMENT_SETTINGS.filter(t => 
    t.label.toLowerCase().includes(lowerQuery) || 
    t.value.toLowerCase().includes(lowerQuery)
  );
};
