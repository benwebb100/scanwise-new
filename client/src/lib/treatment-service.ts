/**
 * TreatmentService - Master Treatment Database Query Layer
 * 
 * Single source of truth for all treatment data from treatments.au.json
 * Provides consistent access to treatment properties across the application.
 * 
 * Usage:
 *   - Settings UI: displayName, category, defaultPrice, defaultDuration
 *   - Dental Findings: displayName, defaultPrice (if toggled), autoMapConditions
 *   - Stage Editor: friendlyPatientName, defaultPrice, defaultDuration
 *   - Report Generation: friendlyPatientName, insuranceCodes.AU, description
 *   - Auto-mapping: autoMapConditions, toothNumberRules
 */

import treatmentsAU from '@/data/treatments.au.json';
import { Treatment } from '@/lib/types/treatment';

export class TreatmentService {
  private static treatments: Treatment[] = treatmentsAU as Treatment[];

  /**
   * Get all treatments
   */
  static getAll(): Treatment[] {
    return this.treatments;
  }

  /**
   * Get treatment by code (primary key)
   * @param code - Treatment code (e.g., "endo_rct_prep_1")
   */
  static getByCode(code: string): Treatment | undefined {
    return this.treatments.find(t => t.code === code);
  }

  /**
   * Get all treatments in a specific category
   * @param category - Category name (e.g., "endodontics", "restorative")
   */
  static getByCategory(category: string): Treatment[] {
    return this.treatments.filter(t => t.category === category);
  }

  /**
   * Get unique list of all categories
   */
  static getAllCategories(): string[] {
    const categories = new Set(this.treatments.map(t => t.category));
    return Array.from(categories).sort();
  }

  /**
   * Get display name (for Settings UI, Dental Findings dropdown)
   * Professional name used in staff-facing interfaces
   * @param code - Treatment code
   * @returns Display name or fallback to code
   */
  static getDisplayName(code: string): string {
    return this.getByCode(code)?.displayName || code;
  }

  /**
   * Get friendly patient name (for Stage Editor, Report generation)
   * Patient-friendly name used in reports and patient communications
   * @param code - Treatment code
   * @returns Friendly patient name or fallback to display name
   */
  static getFriendlyName(code: string): string {
    const treatment = this.getByCode(code);
    return treatment?.friendlyPatientName || treatment?.displayName || code;
  }

  /**
   * Get treatment description
   * Used in tooltips, condition explanation boxes in reports
   * @param code - Treatment code
   * @returns Description or empty string
   */
  static getDescription(code: string): string {
    return this.getByCode(code)?.description || '';
  }

  /**
   * Get default price in AUD
   * Used in: Settings, Dental Findings (if toggled), Stage Editor, Report
   * @param code - Treatment code
   * @returns Default price in AUD or 0
   */
  static getDefaultPrice(code: string): number {
    return this.getByCode(code)?.defaultPriceAUD || 0;
  }

  /**
   * Get default duration in minutes
   * Used in: Settings, Stage Editor, Report
   * @param code - Treatment code
   * @returns Default duration in minutes or 30
   */
  static getDefaultDuration(code: string): number {
    return this.getByCode(code)?.defaultDuration || 30;
  }

  /**
   * Get insurance item code for a specific country
   * Currently supports: AU, US, UK, CA, NZ
   * @param code - Treatment code
   * @param country - Country code (default: 'AU')
   * @returns Insurance code or null if not available
   */
  static getInsuranceCode(
    code: string, 
    country: 'AU' | 'US' | 'UK' | 'CA' | 'NZ' = 'AU'
  ): string | null {
    const treatment = this.getByCode(code);
    return treatment?.insuranceCodes[country] || null;
  }

  /**
   * Get category of a treatment
   * @param code - Treatment code
   * @returns Category name or 'general'
   */
  static getCategory(code: string): string {
    return this.getByCode(code)?.category || 'general';
  }

  /**
   * Get treatments that auto-map to a specific condition
   * Used in: Dental Findings auto-suggestion
   * @param condition - Condition code (e.g., "caries_dentine")
   * @returns Array of treatments that can treat this condition
   */
  static getByCondition(condition: string): Treatment[] {
    return this.treatments.filter(t => 
      t.autoMapConditions?.includes(condition)
    );
  }

  /**
   * Get treatments for a specific tooth number (with FDI tooth rules)
   * Refines treatment suggestions based on tooth type (anterior/premolar/molar)
   * Used in: Smart auto-mapping with tooth-specific logic
   * @param condition - Condition code
   * @param toothFDI - FDI tooth number (11-48)
   * @returns Array of treatments appropriate for this tooth
   */
  static getByConditionAndTooth(condition: string, toothFDI: number): Treatment[] {
    const candidates = this.getByCondition(condition);
    
    return candidates.filter(t => {
      // If no tooth rules specified, treatment applies to all teeth
      if (!t.toothNumberRules) return true;
      
      const rules = t.toothNumberRules;
      
      // Check if no restrictions (empty rules object)
      if (!rules.anteriorFDI && !rules.premolarFDI && !rules.molarFDI && !rules.specificFDI) {
        return true;
      }
      
      // Check anterior teeth
      if (rules.anteriorFDI?.includes(toothFDI)) return true;
      
      // Check premolar teeth
      if (rules.premolarFDI?.includes(toothFDI)) return true;
      
      // Check molar teeth
      if (rules.molarFDI?.includes(toothFDI)) return true;
      
      // Check specific tooth overrides
      if (rules.specificFDI && toothFDI in rules.specificFDI) return true;
      
      // If rules exist but tooth not matched, exclude this treatment
      return false;
    });
  }

  /**
   * Get the override code for a specific tooth (if defined in toothNumberRules)
   * Example: Wisdom tooth extraction defaults to surgical extraction
   * @param code - Base treatment code
   * @param toothFDI - FDI tooth number
   * @returns Override code or original code
   */
  static getToothOverrideCode(code: string, toothFDI: number): string {
    const treatment = this.getByCode(code);
    if (!treatment?.toothNumberRules?.specificFDI) return code;
    
    const override = treatment.toothNumberRules.specificFDI[toothFDI];
    return override?.overrideCode || code;
  }

  /**
   * Get replacement options for extracted teeth
   * Used in: Dental Findings (post-extraction workflow)
   * @param code - Treatment code (should be extraction-related)
   * @returns Array of treatment codes for replacement options
   */
  static getReplacementOptions(code: string): string[] {
    return this.getByCode(code)?.replacementOptions || [];
  }

  /**
   * Get metadata for a treatment
   * Used for custom logic (e.g., perUnit, labWork, surgical flags)
   * @param code - Treatment code
   * @returns Metadata object or empty object
   */
  static getMetadata(code: string): Record<string, any> {
    return this.getByCode(code)?.metadata || {};
  }

  /**
   * Check if treatment requires lab work
   * @param code - Treatment code
   * @returns True if metadata.labWork is true
   */
  static requiresLabWork(code: string): boolean {
    return this.getMetadata(code).labWork === true;
  }

  /**
   * Check if treatment is surgical
   * @param code - Treatment code
   * @returns True if metadata.surgical is true
   */
  static isSurgical(code: string): boolean {
    return this.getMetadata(code).surgical === true;
  }

  /**
   * Convert to dropdown options format (for legacy compatibility)
   * Used in: Settings UI, Dental Findings dropdowns
   * @returns Array of {value, label, category} objects
   */
  static toDropdownOptions(): Array<{ 
    value: string; 
    label: string; 
    category?: string;
    pinned?: boolean;
  }> {
    return this.treatments.map(t => ({
      value: t.code,
      label: t.displayName,
      category: t.category,
      pinned: false
    }));
  }

  /**
   * Search treatments by name (display or friendly)
   * @param query - Search query
   * @returns Array of matching treatments
   */
  static search(query: string): Treatment[] {
    const lowerQuery = query.toLowerCase();
    return this.treatments.filter(t => 
      t.displayName.toLowerCase().includes(lowerQuery) ||
      t.friendlyPatientName.toLowerCase().includes(lowerQuery) ||
      t.code.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get treatments sorted by category and name
   * @returns Sorted array of treatments
   */
  static getSorted(): Treatment[] {
    return [...this.treatments].sort((a, b) => {
      // First sort by category
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      // Then by display name
      return a.displayName.localeCompare(b.displayName);
    });
  }

  /**
   * Get total count of treatments in database
   */
  static getCount(): number {
    return this.treatments.length;
  }

  /**
   * Validate if a treatment code exists
   * @param code - Treatment code to check
   * @returns True if treatment exists in database
   */
  static exists(code: string): boolean {
    return this.getByCode(code) !== undefined;
  }
}

// Export singleton instance for convenience
export const treatmentService = TreatmentService;

