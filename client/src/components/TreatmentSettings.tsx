import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, Save, RotateCcw, Download, Upload, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTreatmentSettings } from '@/hooks/useTreatmentSettings';
import { TREATMENT_CATEGORIES } from '@/data/treatment-settings-data';
import { TreatmentCategory } from '@/types/treatment-settings.types';
import { TREATMENT_LIMITS } from '@/types/treatment-settings.types';

interface TreatmentSettingsProps {
  onClose?: () => void;
}

export function TreatmentSettings({ onClose }: TreatmentSettingsProps) {
  const { toast } = useToast();
  const {
    settings,
    hasUnsavedChanges,
    updateTreatmentSetting,
    saveChanges,
    resetToDefaults,
    resetCategoryToDefaults,
    exportSettings,
    importSettings
  } = useTreatmentSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<TreatmentCategory>('general');
  const [isImporting, setIsImporting] = useState(false);

  // Filter treatments based on search query
  const filteredTreatments = useMemo(() => {
    if (!searchQuery.trim()) {
      return TREATMENT_CATEGORIES.find(cat => cat.id === activeCategory)?.treatments || [];
    }

    // Search across all categories
    return TREATMENT_CATEGORIES
      .flatMap(cat => cat.treatments)
      .filter(treatment => 
        treatment.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        treatment.value.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [searchQuery, activeCategory]);

  // Handle treatment setting updates
  const handleDurationChange = (treatmentValue: string, duration: number) => {
    if (duration < TREATMENT_LIMITS.DURATION.MIN || duration > TREATMENT_LIMITS.DURATION.MAX) {
      toast({
        title: "Invalid Duration",
        description: `Duration must be between ${TREATMENT_LIMITS.DURATION.MIN} and ${TREATMENT_LIMITS.DURATION.MAX} minutes`,
        variant: "destructive"
      });
      return;
    }

    updateTreatmentSetting(treatmentValue, { duration });
  };

  const handlePriceChange = (treatmentValue: string, price: number) => {
    if (price < TREATMENT_LIMITS.PRICE.MIN || price > TREATMENT_LIMITS.PRICE.MAX) {
      toast({
        title: "Invalid Price",
        description: `Price must be between $${TREATMENT_LIMITS.PRICE.MIN} and $${TREATMENT_LIMITS.PRICE.MAX}`,
        variant: "destructive"
      });
      return;
    }

    updateTreatmentSetting(treatmentValue, { price });
  };

  // Handle save
  const handleSave = () => {
    saveChanges();
    toast({
      title: "Settings Saved",
      description: "Treatment settings have been saved successfully."
    });
  };

  // Handle reset
  const handleReset = () => {
    resetToDefaults();
    toast({
      title: "Settings Reset",
      description: "All treatment settings have been reset to defaults."
    });
  };

  // Handle category reset
  const handleCategoryReset = (category: TreatmentCategory) => {
    resetCategoryToDefaults(category);
    toast({
      title: "Category Reset",
      description: `${TREATMENT_CATEGORIES.find(c => c.id === category)?.name} settings have been reset to defaults.`
    });
  };

  // Handle export
  const handleExport = () => {
    exportSettings();
    toast({
      title: "Settings Exported",
      description: "Treatment settings have been exported to a JSON file."
    });
  };

  // Handle import
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const success = await importSettings(file);
      if (success) {
        toast({
          title: "Settings Imported",
          description: "Treatment settings have been imported successfully."
        });
      } else {
        toast({
          title: "Import Failed",
          description: "Failed to import settings. Please check the file format.",
          variant: "destructive"
        });
      }
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

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
          <Button variant="outline" onClick={handleExport} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => document.getElementById('import-file')?.click()} size="sm" disabled={isImporting}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <input
            id="import-file"
            type="file"
            accept=".json"
            onChange={handleImport}
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
            {filteredTreatments.map((treatment) => {
              const setting = settings[treatment.value];
              return (
                <TreatmentSettingCard
                  key={treatment.value}
                  treatment={treatment}
                  setting={setting}
                  onDurationChange={(duration) => handleDurationChange(treatment.value, duration)}
                  onPriceChange={(price) => handlePriceChange(treatment.value, price)}
                />
              );
            })}
          </div>
        </div>
      ) : (
        // Category Tabs
        <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as TreatmentCategory)}>
          <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10">
            {TREATMENT_CATEGORIES.map((category) => (
              <TabsTrigger key={category.id} value={category.id} className="text-xs">
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {TREATMENT_CATEGORIES.map((category) => (
            <TabsContent key={category.id} value={category.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCategoryReset(category.id)}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Category
                </Button>
              </div>

              <div className="grid gap-4">
                {category.treatments.map((treatment) => {
                  const setting = settings[treatment.value];
                  return (
                    <TreatmentSettingCard
                      key={treatment.value}
                      treatment={treatment}
                      setting={setting}
                      onDurationChange={(duration) => handleDurationChange(treatment.value, duration)}
                      onPriceChange={(price) => handlePriceChange(treatment.value, price)}
                    />
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset All to Defaults
        </Button>
        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
          <Button onClick={handleSave} disabled={!hasUnsavedChanges}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

// Individual treatment setting card component
interface TreatmentSettingCardProps {
  treatment: {
    value: string;
    label: string;
    defaultDuration: number;
    defaultPrice: number;
  };
  setting: {
    duration: number;
    price: number;
  };
  onDurationChange: (duration: number) => void;
  onPriceChange: (price: number) => void;
}

function TreatmentSettingCard({ treatment, setting, onDurationChange, onPriceChange }: TreatmentSettingCardProps) {
  const isCustomDuration = setting.duration !== treatment.defaultDuration;
  const isCustomPrice = setting.price !== treatment.defaultPrice;

  return (
    <Card className={`transition-all duration-200 ${(isCustomDuration || isCustomPrice) ? 'border-blue-200 bg-blue-50/50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="font-medium">{treatment.label}</h4>
            <p className="text-sm text-muted-foreground">{treatment.value}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor={`duration-${treatment.value}`} className="text-sm font-medium">
                Duration (min)
              </Label>
              <Input
                id={`duration-${treatment.value}`}
                type="number"
                value={setting.duration}
                onChange={(e) => onDurationChange(parseInt(e.target.value) || 0)}
                min={TREATMENT_LIMITS.DURATION.MIN}
                max={TREATMENT_LIMITS.DURATION.MAX}
                step={TREATMENT_LIMITS.DURATION.STEP}
                className={`w-20 ${isCustomDuration ? 'border-blue-300 bg-blue-50' : ''}`}
              />
              {isCustomDuration && (
                <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">
                  Custom
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor={`price-${treatment.value}`} className="text-sm font-medium">
                Price ($)
              </Label>
              <Input
                id={`price-${treatment.value}`}
                type="number"
                value={setting.price}
                onChange={(e) => onPriceChange(parseInt(e.target.value) || 0)}
                min={TREATMENT_LIMITS.PRICE.MIN}
                max={TREATMENT_LIMITS.PRICE.MAX}
                step={TREATMENT_LIMITS.PRICE.STEP}
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
      </CardContent>
    </Card>
  );
}
