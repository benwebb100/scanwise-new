import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { TreatmentService } from '@/lib/treatment-service';
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

      // Load conditions from backend API
      // Load treatments from master database (TreatmentService)
      const conditionsData = await api.getDentalConditions();
      
      // ✅ Use TreatmentService to get ALL treatments from master database
      const allTreatments = TreatmentService.getAll();

      // Transform conditions to SearchableSelectOption format
      const conditions: SearchableSelectOption[] = conditionsData.map((condition: any) => ({
        value: condition.code,
        label: condition.name,
        pinned: false // Could add logic to mark common conditions as pinned
      }));

      // ✅ Transform treatments using TreatmentService dropdown options
      // This ensures we get ALL treatments with proper display names
      const treatments: SearchableSelectOption[] = TreatmentService.toDropdownOptions();

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