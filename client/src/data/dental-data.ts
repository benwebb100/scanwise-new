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

// Full list of conditions (will be expanded with official ADA list later)
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
  { value: 'fracture', label: 'Fracture' }
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

// Full list of treatments (will be expanded with official ADA list later)
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
  { value: 'gum-graft', label: 'Gum graft' }
]

// Auto-suggestion mapping: condition -> suggested treatments
// Updated with more comprehensive mappings
export const CONDITION_TREATMENT_SUGGESTIONS: Record<string, string[]> = {
  // Primary mappings from documentation
  'caries': ['filling'],
  'periapical-lesion': ['root-canal-treatment'],
  'fracture': ['crown'],
  'root-fracture': ['crown'],
  'crown-fracture': ['crown'],
  'existing-large-filling': ['crown'],
  'tooth-wear': ['composite-build-up', 'crown'],
  'attrition': ['composite-build-up', 'crown'],
  'pulpitis': ['root-canal-treatment'],
  'missing-tooth': ['implant-placement', 'bridge', 'partial-denture'],
  'mobility': ['extraction'],
  'tooth-mobility': ['extraction'],
  'impacted-tooth': ['surgical-extraction'],
  'root-piece': ['surgical-extraction'],
  'periodontal-pocket': ['deep-cleaning'],
  'gingivitis': ['scale-and-clean'],
  
  // Additional mappings for other conditions
  'abrasion': ['composite-build-up', 'crown'],
  'erosion': ['composite-build-up', 'fluoride-treatment'],
  'calculus': ['scale-and-clean'],
  'plaque': ['scale-and-clean'],
  'abscess': ['root-canal-treatment', 'extraction'],
  'cyst': ['surgical-extraction'],
  'resorption': ['root-canal-treatment', 'extraction'],
  'staining': ['whitening', 'veneer'],
  'fluorosis': ['whitening', 'veneer'],
  'malocclusion': ['orthodontic-treatment'],
  'crowding': ['orthodontic-treatment', 'extraction'],
  'spacing': ['orthodontic-treatment', 'bonding'],
  'overjet': ['orthodontic-treatment'],
  'overbite': ['orthodontic-treatment'],
  'crossbite': ['orthodontic-treatment'],
  'open-bite': ['orthodontic-treatment'],
  'tmj-disorder': ['night-guard', 'orthodontic-treatment'],
  'hypoplasia': ['composite-build-up', 'crown']
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

// Default pricing for treatments (will be expanded and made configurable per clinic)
export const DEFAULT_TREATMENT_PRICES: Record<string, number> = {
  'filling': 120,
  'extraction': 180,
  'root-canal-treatment': 400,
  'crown': 1200,
  'bridge': 850,
  'implant-placement': 2300,
  'partial-denture': 600,
  'scale-and-clean': 80,
  'periodontal-treatment': 250,
  'veneer': 800,
  'fluoride-treatment': 45,
  'composite-build-up': 200,
  'surgical-extraction': 350,
  'deep-cleaning': 300,
  'complete-denture': 1200,
  'inlay': 400,
  'onlay': 500,
  'whitening': 300,
  'bonding': 150,
  'sealant': 60,
  'night-guard': 250,
  'orthodontic-treatment': 4000,
  'braces': 3500,
  'invisalign': 4500,
  'retainer': 200,
  'space-maintainer': 180,
  'apicoectomy': 600,
  'bone-graft': 800,
  'sinus-lift': 1200,
  'gum-graft': 700
}