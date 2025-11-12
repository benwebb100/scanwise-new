/**
 * Core treatment database types for ScanWise
 * All data is AU-centric with room for international expansion
 */

export type CountryCodes = {
  AU: string | null;
  US?: string | null;
  UK?: string | null;
  CA?: string | null;
  NZ?: string | null;
};

export type ToothRules = {
  anteriorFDI?: number[];      // Anterior teeth (e.g., [11,12,13,21,22,23])
  premolarFDI?: number[];      // Premolar teeth (e.g., [14,15,24,25])
  molarFDI?: number[];         // Molar teeth (e.g., [16,17,18,26,27,28])
  specificFDI?: Record<number, {
    overrideCode?: string;     // Use different treatment code for this tooth
    alt?: string;              // Alternative treatment name
  }>;
  notes?: string;
};

export type TreatmentCategory =
  | "preventive"
  | "restorative"
  | "endodontics"
  | "periodontics"
  | "oral-surgery"
  | "prosthodontics"
  | "orthodontics"
  | "functional"
  | "emergency";

export type Treatment = {
  code: string;                          // unique key (e.g., "endo_rct_prep_1")
  displayName: string;                   // dentist-facing (e.g., "Chemo-mechanical Preparation — 1 Canal")
  friendlyPatientName: string;           // plain-English patient label (e.g., "Root canal cleaning (1 canal)")
  category: TreatmentCategory;
  description: string;
  defaultDuration: number;               // minutes
  defaultPriceAUD: number;               // AUD
  insuranceCodes: CountryCodes;          // ADA AU code required (string or null)
  autoMapConditions?: string[];          // condition codes that trigger this treatment
  toothNumberRules?: ToothRules;         // for tooth-driven defaults
  replacementOptions?: string[];         // for extractions/tooth loss
  metadata?: Record<string, any>;
};

export type Condition = {
  value: string;                         // unique code (e.g., "irreversible_pulpitis")
  label: string;                         // human-readable (e.g., "Irreversible Pulpitis")
  urgency: "high" | "medium" | "low";
  category?: string;
};

export type ConditionMapping = {
  condition: string;                     // condition code
  treatments: Array<{
    treatment: string;                   // treatment code
    priority: number;                    // lower = higher priority (1 = first choice)
  }>;
};

export type BatchImport = {
  batch: number;
  notes?: string;
  treatments: Treatment[];
  conditions?: Condition[];
  mappings?: ConditionMapping[];
  done: boolean;
};

/**
 * Price structure with currency support
 */
export type PriceData = {
  AU: { amount: number; currency: "AUD" } | null;
  US?: { amount: number; currency: "USD" } | null;
  UK?: { amount: number; currency: "GBP" } | null;
  CA?: { amount: number; currency: "CAD" } | null;
  NZ?: { amount: number; currency: "NZD" } | null;
};

