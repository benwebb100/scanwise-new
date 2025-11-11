# Tooth-Aware Treatment Mapping System

## Overview

This system replaces simple condition→treatment mappings with a sophisticated, tooth-aware rule engine that considers:
- **Tooth group** (anterior, premolar, molar, third_molar)
- **Condition type** (caries, periapical-lesion, etc.)
- **Modifiers** (impacted, severity, etc.)

## Key Features

✅ **Tooth Group Awareness**: Automatically determines tooth group from tooth number (supports Universal, FDI, Palmer notation)

✅ **Tiered Rule System**: Most specific rules checked first, falls back to generic rules

✅ **High-Priority Rules**: Impacted teeth always get surgical extraction

✅ **Tooth-Specific Treatments**: 
- Caries → different filling types based on anterior vs posterior
- Periapical lesions → RCT type based on tooth group (1 canal for anterior, 3+ for molars)
- Root pieces → simple vs surgical extraction based on tooth group

✅ **Easy to Extend**: Add new rules to `TREATMENT_RULES` array

## Usage

### Basic Usage

```typescript
import { getTreatmentSuggestion } from '@/utils/tooth-aware-treatment-mapping';

const finding = {
  tooth: 19, // Molar
  condition: 'caries',
  severity: 'medium'
};

const treatment = getTreatmentSuggestion(finding);
// Returns: 'resto_comp_two_surface_post'
```

### Integration Helper (Recommended)

```typescript
import { processFindingWithTreatment } from '@/utils/treatment-mapping-integration';

// When user selects a condition for a tooth
const finding = processFindingWithTreatment({
  tooth: 19,
  condition: 'caries',
  severity: 'medium'
});

// finding.treatment is automatically set to 'resto_comp_two_surface_post'
```

### Processing Multiple Findings (Add All)

```typescript
import { processDetectionsWithTreatments } from '@/utils/treatment-mapping-integration';

// From AI detections
const detections = [
  { tooth: 19, class: 'caries', severity: 'medium' },
  { tooth: 3, class: 'periapical-lesion' },
  { tooth: 1, class: 'impacted-tooth' }
];

const findingsWithTreatments = processDetectionsWithTreatments(detections);
// Each finding now has a suggested treatment based on tooth group
```

## Tooth Groups

The system automatically maps tooth numbers to groups:

- **anterior**: Incisors and canines (6-11, 22-27 in Universal)
- **premolar**: Premolars/bicuspids (4-5, 12-13, 20-21, 28-29)
- **molar**: Molars (2-3, 14-15, 18-19, 30-31)
- **third_molar**: Wisdom teeth (1, 16, 17, 32)

## Implemented Rules

### 1. Caries → Fillings
- **Anterior + small** → Composite filling - 1 surface (anterior)
- **Anterior + large** → Composite filling - 2 surfaces (anterior)
- **Premolar/Molar + small** → Composite filling - 1 surface (posterior)
- **Premolar/Molar + medium/large** → Composite filling - 2-3 surfaces (posterior)

### 2. Periapical Lesions → Root Canal Type
- **Anterior** → RCT - 1 canal
- **Premolar** → RCT - 2 canals
- **Molar** → RCT - 3+ canals
- **Third Molar** → Surgical extraction (RCT not recommended)

### 3. Root Pieces → Extraction Type
- **Anterior/Premolar, not impacted** → Simple extraction
- **Molar, not impacted** → Surgical extraction
- **Any tooth, impacted** → Surgical extraction
- **Third Molar** → Surgical extraction

### 4. Impacted Teeth
- **Always** → Surgical extraction (highest priority rule)

### 5. Furcation Involvement
- **Molar/Premolar** → Furcation debridement
- **Other** → Scale and root planing

### 6. Missing Teeth
- **Any tooth group** → Implant placement (primary)
- **Fallback** → Bridge pontic

## Adding New Rules

Edit `client/src/utils/tooth-aware-treatment-mapping.ts`:

```typescript
const TREATMENT_RULES: TreatmentRule[] = [
  // Add your new rule here
  {
    condition: 'your-condition',
    tooth_group: 'molar', // optional
    severity: 'large', // optional
    modifiers: ['impacted'], // optional
    treatment: 'your_treatment_code',
    priority: 80 // Higher = checked first
  },
  // ... existing rules
];
```

## Priority System

Rules are checked in order of priority (highest first):
- **100-90**: Critical rules (impacted teeth, third molars)
- **80-70**: Tooth-group specific rules
- **60-50**: Generic fallback rules

## Integration Points

This system should be integrated wherever findings are created:

1. **AI Analysis Section**: When "Add All" or "Add Individually" is clicked
2. **Manual Findings Entry**: When dentist selects a condition for a tooth
3. **Report Generation**: Already integrated via `getTreatmentFriendlyName()`

## Future Enhancements

- [ ] Clinic-specific rule overrides (configurable per clinic)
- [ ] Severity detection from AI model
- [ ] Multi-condition rules (e.g., caries + fracture → crown)
- [ ] Cost/time estimates per tooth group
- [ ] Regional variations (e.g., different RCT codes by country)

