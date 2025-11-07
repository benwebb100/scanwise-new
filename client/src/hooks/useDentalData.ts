import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { SearchableSelectOption } from '@/components/ui/searchable-select';

interface DentalDataState {
  conditions: SearchableSelectOption[];
  treatments: SearchableSelectOption[];
  isLoading: boolean;
  error: string | null;
}

export function useDentalData() {
  const [state, setState] = useState<DentalDataState>({
    conditions: [],
    treatments: [],
    isLoading: true,
    error: null
  });

  useEffect(() => {
    loadDentalData();
  }, []);

  const loadDentalData = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Load both conditions and treatments from database
      const [conditionsData, treatmentsData] = await Promise.all([
        api.getDentalConditions(),
        api.getDentalTreatments()
      ]);

      // Transform conditions to SearchableSelectOption format
      const conditions: SearchableSelectOption[] = conditionsData.map((condition: any) => ({
        value: condition.code,
        label: condition.name,
        pinned: false // Could add logic to mark common conditions as pinned
      }));

      // Transform treatments to SearchableSelectOption format
      const treatments: SearchableSelectOption[] = treatmentsData.map((treatment: any) => ({
        value: treatment.code,
        label: treatment.name,
        pinned: false // Could add logic to mark common treatments as pinned
      }));

      setState({
        conditions,
        treatments,
        isLoading: false,
        error: null
      });

    } catch (error) {
      console.error('Failed to load dental data:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load dental data from database'
      }));
    }
  };

  return {
    conditions: state.conditions,
    treatments: state.treatments,
    isLoading: state.isLoading,
    error: state.error,
    reload: loadDentalData
  };
}