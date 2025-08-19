import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Brain, ArrowLeft, Settings as SettingsIcon, Building2, DollarSign } from 'lucide-react'
import { ClinicBranding } from '@/components/ClinicBranding'
import { PricingManagement } from '@/components/PricingManagement'
import { LanguageToggle } from '@/components/LanguageToggle'
import { useTranslation } from '@/contexts/TranslationContext'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/services/api'

const Settings = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('branding')
  const [toothNumberingSystem, setToothNumberingSystem] = useState<'FDI' | 'Universal'>(() => {
    const saved = localStorage.getItem('toothNumberingSystem');
    return (saved as 'FDI' | 'Universal') || 'FDI';
  });

  const handleBrandingSave = async (brandingData: any) => {
    try {
      await api.saveClinicBranding(brandingData)
      toast({
        title: "Settings Saved",
        description: "Your clinic branding has been saved successfully.",
      })
    } catch (error) {
      console.error('Error saving branding:', error)
      toast({
        title: "Error",
        description: "Failed to save clinic branding. Please try again.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                Scanwise
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.nav.dashboard}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <SettingsIcon className="mr-3 h-8 w-8" />
              {t.settings.title}
            </h1>
            <p className="text-gray-600">
              Configure your clinic settings, branding, and preferences
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="branding" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Clinic Branding
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Pricing Management
              </TabsTrigger>
              <TabsTrigger value="general" className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4" />
                General Settings
              </TabsTrigger>
            </TabsList>

            {/* Clinic Branding Tab */}
            <TabsContent value="branding" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Clinic Branding & Report Customization</CardTitle>
                  <p className="text-sm text-gray-600">
                    Customize how your clinic appears on patient reports. Upload your logo, 
                    set your colors, and configure contact information.
                  </p>
                </CardHeader>
                <CardContent>
                  <ClinicBranding onSave={handleBrandingSave} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pricing Management Tab */}
            <TabsContent value="pricing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Treatment Pricing Management</CardTitle>
                  <p className="text-sm text-gray-600">
                    Manage your clinic's treatment pricing. Upload price lists, set custom prices,
                    and ensure accurate pricing for all treatments in your reports.
                  </p>
                </CardHeader>
                <CardContent>
                  <PricingManagement />
                </CardContent>
              </Card>
            </TabsContent>

            {/* General Settings Tab */}
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <p className="text-sm text-gray-600">
                    Configure general application preferences and defaults.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Default Tooth Numbering System</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Choose your preferred tooth numbering system. This will be the default 
                        selection when creating new reports.
                      </p>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-3">
                          <input 
                            type="radio" 
                            name="tooth-system" 
                            value="FDI" 
                            checked={toothNumberingSystem === 'FDI'}
                            onChange={(e) => setToothNumberingSystem(e.target.value as 'FDI' | 'Universal')}
                            className="text-blue-600"
                          />
                          <div>
                            <span className="font-medium">FDI Notation</span>
                            <p className="text-sm text-gray-500">Australian standard (11-48)</p>
                          </div>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input 
                            type="radio" 
                            name="tooth-system" 
                            value="Universal" 
                            checked={toothNumberingSystem === 'Universal'}
                            onChange={(e) => setToothNumberingSystem(e.target.value as 'FDI' | 'Universal')}
                            className="text-blue-600"
                          />
                          <div>
                            <span className="font-medium">Universal Notation</span>
                            <p className="text-sm text-gray-500">U.S. standard (1-32)</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <h4 className="font-medium text-gray-900 mb-3">Report Preferences</h4>
                      <div className="space-y-4">
                        <label className="flex items-center space-x-3">
                          <input 
                            type="checkbox" 
                            defaultChecked 
                            className="text-blue-600"
                          />
                          <div>
                            <span className="font-medium">Show AI confidence scores by default</span>
                            <p className="text-sm text-gray-500">Display AI detection confidence levels in reports</p>
                          </div>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input 
                            type="checkbox" 
                            defaultChecked 
                            className="text-blue-600"
                          />
                          <div>
                            <span className="font-medium">Generate patient videos automatically</span>
                            <p className="text-sm text-gray-500">Create educational videos for patients when analyzing X-rays</p>
                          </div>
                        </label>
                        <label className="flex items-center space-x-3">
                          <input 
                            type="checkbox" 
                            defaultChecked 
                            className="text-blue-600"
                          />
                          <div>
                            <span className="font-medium">Auto-suggest treatments based on conditions</span>
                            <p className="text-sm text-gray-500">Automatically suggest relevant treatments when conditions are selected</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end pt-6">
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          localStorage.setItem('toothNumberingSystem', toothNumberingSystem);
                          toast({
                            title: "Settings Saved",
                            description: "Your general settings have been saved successfully.",
                          });
                        }}
                      >
                        Save General Settings
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default Settings