import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, Save, RotateCcw, Download, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';

// Types
interface Treatment {
  value: string;
  label: string;
  category: string;
  defaultDuration: number;
  defaultPrice: number;
}

interface TreatmentSetting {
  duration: number;
  price: number;
}

interface TreatmentSettingsData {
  [treatmentKey: string]: TreatmentSetting;
}

interface TreatmentCategory {
  id: string;
  name: string;
  description: string;
  treatments: Treatment[];
}

interface TreatmentSettingsProps {
  onClose?: () => void;
}

export function TreatmentSettings({ onClose }: TreatmentSettingsProps) {
  const { toast } = useToast();
  
  // State management
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [categories, setCategories] = useState<TreatmentCategory[]>([]);
  const [settings, setSettings] = useState<TreatmentSettingsData>({});
  const [originalSettings, setOriginalSettings] = useState<TreatmentSettingsData>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('general');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Calculate if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  }, [settings, originalSettings]);

  // Load treatment data from backend
  useEffect(() => {
    loadTreatmentData();
  }, []);

  const loadTreatmentData = async () => {
    setIsLoading(true);
    try {
      // Fetch treatment settings from backend
      const response = await api.getTreatmentSettings();
      
      if (response.status === 'success') {
        const backendSettings = response.treatment_data || {};
        
        // Fetch available treatments and conditions
        const [conditionsResponse, treatmentsResponse] = await Promise.all([
          api.getDentalConditions(),
          api.getDentalTreatments()
        ]);

        // Process treatments into categories
        const treatmentsList: Treatment[] = [];
        const categoriesMap = new Map<string, TreatmentCategory>();

        // Add treatments from backend
        treatmentsResponse.forEach((treatment: any) => {
          const category = treatment.category || 'general';
          const treatmentItem: Treatment = {
            value: treatment.code || treatment.name.toLowerCase().replace(/\s+/g, '_'),
            label: treatment.name,
            category: category,
            defaultDuration: treatment.default_duration || 30,
            defaultPrice: treatment.default_price || 0
          };
          
          treatmentsList.push(treatmentItem);

          if (!categoriesMap.has(category)) {
            categoriesMap.set(category, {
              id: category,
              name: category.charAt(0).toUpperCase() + category.slice(1),
              description: `${category} treatments`,
              treatments: []
            });
          }
          categoriesMap.get(category)!.treatments.push(treatmentItem);
        });

        // Merge with existing settings from backend
        const mergedSettings: TreatmentSettingsData = {};
        treatmentsList.forEach(treatment => {
          const existingSetting = backendSettings[treatment.value];
          mergedSettings[treatment.value] = {
            duration: existingSetting?.duration || treatment.defaultDuration,
            price: existingSetting?.price || treatment.defaultPrice
          };
        });

        setTreatments(treatmentsList);
        setCategories(Array.from(categoriesMap.values()));
        setSettings(mergedSettings);
        setOriginalSettings(JSON.parse(JSON.stringify(mergedSettings)));
        
        // Set first category as active
        if (categoriesMap.size > 0) {
          setActiveCategory(Array.from(categoriesMap.keys())[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load treatment data:', error);
      toast({
        title: "Error",
        description: "Failed to load treatment settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update treatment setting
  const updateTreatmentSetting = (treatmentValue: string, updates: Partial<TreatmentSetting>) => {
    setSettings(prev => ({
      ...prev,
      [treatmentValue]: {
        ...prev[treatmentValue],
        ...updates
      }
    }));
  };

  // Save changes to backend
  const saveChanges = async () => {
    setIsSaving(true);
    try {
      await api.saveTreatmentSettings(settings);
      setOriginalSettings(JSON.parse(JSON.stringify(settings)));
      toast({
        title: "Settings Saved",
        description: "Your treatment settings have been saved successfully.",
      });
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // In useTreatmentSettings.ts
  const handleReset = async () => {
    try {
      await api.resetTreatmentSettings();
      
      // Reload the settings after reset
      await loadTreatmentData();
      
      toast({
        title: "Settings Reset",
        description: "All treatment settings have been reset to defaults."
      });
    } catch (error) {
      console.error('Failed to reset settings:', error);
      toast({
        title: "Reset Failed",
        description: "Failed to reset settings. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Reset category to defaults
  // const resetCategoryToDefaults = (categoryId: string) => {
  //   const category = categories.find(cat => cat.id === categoryId);
  //   if (!category) return;
  // And update the resetCategoryToDefaults function if you want to implement category-specific reset:
  const resetCategoryToDefaults = async (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;

    const updatedSettings = { ...settings };
    // category.treatments.forEach(treatment => {
    //   updatedSettings[treatment.value] = {
    //     duration: treatment.defaultDuration,
    //     price: treatment.defaultPrice
    //   };
    // });
    // Reset only the treatments in this category to their defaults
    category.treatments.forEach(treatment => {
      updatedSettings[treatment.value] = {
        duration: treatment.defaultDuration,
        price: treatment.defaultPrice
      };
    });
    setSettings(updatedSettings);
    toast({
      title: "Category Reset",
      description: `${category.name} treatments have been reset to defaults.`,
    });
  };

  // Export settings
  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `treatment-settings-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Import settings
  const importSettings = async (file: File) => {
    try {
      const text = await file.text();
      const importedSettings = JSON.parse(text) as TreatmentSettingsData;
      
      // Validate imported settings
      const validSettings: TreatmentSettingsData = {};
      Object.entries(importedSettings).forEach(([key, value]) => {
        if (value && typeof value.duration === 'number' && typeof value.price === 'number') {
          validSettings[key] = value;
        }
      });

      setSettings(prev => ({ ...prev, ...validSettings }));
      return true;
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  };

  // Filter treatments based on search
  const filteredTreatments = useMemo(() => {
    if (!searchQuery.trim()) {
      return categories.find(cat => cat.id === activeCategory)?.treatments || [];
    }

    return treatments.filter(treatment => 
      treatment.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      treatment.value.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, activeCategory, categories, treatments]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Treatment Settings</h2>
          <p className="text-muted-foreground">
            Customize treatment durations and prices for your clinic
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              <AlertCircle className="h-3 w-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
        </div>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search treatments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportSettings} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button 
            variant="outline" 
            onClick={() => document.getElementById('import-file')?.click()} 
            size="sm" 
            disabled={isImporting}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <input
            id="import-file"
            type="file"
            accept=".json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              
              setIsImporting(true);
              const success = await importSettings(file);
              setIsImporting(false);
              
              toast({
                title: success ? "Import Successful" : "Import Failed",
                description: success 
                  ? "Treatment settings have been imported successfully."
                  : "Failed to import settings. Please check the file format.",
                variant: success ? "default" : "destructive"
              });
              
              e.target.value = '';
            }}
            className="hidden"
          />
        </div>
      </div>

      {/* Main Content */}
      {searchQuery ? (
        // Search Results
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Search Results ({filteredTreatments.length} treatments)
          </h3>
          <div className="grid gap-4">
            {filteredTreatments.map((treatment) => (
              <TreatmentSettingCard
                key={treatment.value}
                treatment={treatment}
                setting={settings[treatment.value]}
                onDurationChange={(duration) => updateTreatmentSetting(treatment.value, { duration })}
                onPriceChange={(price) => updateTreatmentSetting(treatment.value, { price })}
              />
            ))}
          </div>
        </div>
      ) : (
        // Category Tabs
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="flex flex-wrap gap-2 h-auto p-2 bg-gray-50 rounded-lg">
            {categories.map((category) => (
              <TabsTrigger 
                key={category.id} 
                value={category.id} 
                className="text-sm px-4 py-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
              >
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category.id} value={category.id} className="mt-6 space-y-6">
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-semibold text-blue-900">
                        {category.name}
                      </CardTitle>
                      <CardDescription className="text-gray-600 mt-1">
                        {category.description}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resetCategoryToDefaults(category.id)}
                      className="shrink-0"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset Category
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {category.treatments.map((treatment) => (
                      <TreatmentSettingCard
                        key={treatment.value}
                        treatment={treatment}
                        setting={settings[treatment.value]}
                        onDurationChange={(duration) => updateTreatmentSetting(treatment.value, { duration })}
                        onPriceChange={(price) => updateTreatmentSetting(treatment.value, { price })}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button variant="outline" onClick={handleReset} disabled={isSaving}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset All to Defaults
        </Button>
        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button onClick={saveChanges} disabled={!hasUnsavedChanges || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Treatment Setting Card Component
interface TreatmentSettingCardProps {
  treatment: Treatment;
  setting: TreatmentSetting;
  onDurationChange: (duration: number) => void;
  onPriceChange: (price: number) => void;
}

// Treatment Setting Card Component (continued)
function TreatmentSettingCard({ 
  treatment, 
  setting, 
  onDurationChange, 
  onPriceChange 
}: TreatmentSettingCardProps) {
  const isCustomDuration = setting?.duration !== treatment.defaultDuration;
  const isCustomPrice = setting?.price !== treatment.defaultPrice;

  return (
    <Card className={`transition-all duration-200 ${(isCustomDuration || isCustomPrice) ? 'border-blue-200 bg-blue-50/50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="font-medium">{treatment.label}</h4>
            <p className="text-sm text-muted-foreground">Code: {treatment.value}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor={`duration-${treatment.value}`} className="text-sm font-medium whitespace-nowrap">
                Duration (min)
              </Label>
              <Input
                id={`duration-${treatment.value}`}
                type="number"
                min="1"
                value={setting?.duration || treatment.defaultDuration}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  if (value > 0) {
                    onDurationChange(value);
                  }
                }}
                className={`w-20 ${isCustomDuration ? 'border-blue-300 bg-blue-50' : ''}`}
              />
              {isCustomDuration && (
                <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">
                  Custom
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor={`price-${treatment.value}`} className="text-sm font-medium whitespace-nowrap">
                Price ($)
              </Label>
              <Input
                id={`price-${treatment.value}`}
                type="number"
                min="0"
                step="0.01"
                value={setting?.price || treatment.defaultPrice}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  if (value >= 0) {
                    onPriceChange(value);
                  }
                }}
                className={`w-24 ${isCustomPrice ? 'border-blue-300 bg-blue-50' : ''}`}
              />
              {isCustomPrice && (
                <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">
                  Custom
                </Badge>
              )}
            </div>
          </div>
        </div>
        {(isCustomDuration || isCustomPrice) && (
          <div className="mt-2 text-xs text-muted-foreground">
            Default: {treatment.defaultDuration} min, ${treatment.defaultPrice}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TreatmentSettings;