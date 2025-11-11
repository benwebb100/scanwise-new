import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload, Building2, Phone, Mail, MapPin, FileImage, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/services/api'

interface ClinicBrandingData {
  clinicName: string
  address: string
  phone: string
  email: string
  website?: string
  logoUrl?: string
  headerTemplate: string
  footerTemplate: string
  primaryColor: string
  secondaryColor: string
}

interface ClinicBrandingProps {
  onSave?: (brandingData: ClinicBrandingData) => void
  initialData?: Partial<ClinicBrandingData>
}

export function ClinicBranding({ onSave, initialData }: ClinicBrandingProps) {
  const { toast } = useToast()
  const [brandingData, setBrandingData] = useState<ClinicBrandingData>({
    clinicName: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logoUrl: '',
    headerTemplate: '',
    footerTemplate: '',
    primaryColor: '#1e88e5',
    secondaryColor: '#666666',
    ...initialData
  })

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Load saved branding data from localStorage
    const saved = localStorage.getItem('clinic-branding')
    if (saved) {
      try {
        const parsedData = JSON.parse(saved)
        setBrandingData(prev => ({ ...prev, ...parsedData }))
      } catch (error) {
        console.error('Error loading clinic branding:', error)
      }
    }
    
    // Also load from backend
    loadBrandingFromBackend()
  }, [])
  
  const loadBrandingFromBackend = async () => {
    try {
      const response = await api.getClinicBranding()
      if (response.branding_data && Object.keys(response.branding_data).length > 0) {
        setBrandingData(prev => ({ ...prev, ...response.branding_data }))
      }
    } catch (error) {
      console.error('Error loading branding from backend:', error)
    }
  }

  useEffect(() => {
    // Generate templates when basic info changes
    if (brandingData.clinicName) {
      generateTemplates()
    }
  }, [brandingData.clinicName, brandingData.address, brandingData.phone, brandingData.email, brandingData.logoUrl, brandingData.primaryColor])

  const generateTemplates = () => {
    const headerTemplate = `
      <div style="background-color: ${brandingData.primaryColor}; color: white; padding: 20px; display: flex; align-items: center; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 15px;">
          ${brandingData.logoUrl ? `
            <img src="${brandingData.logoUrl}" alt="${brandingData.clinicName} Logo" style="height: 50px; width: auto;" />
          ` : `
            <div style="width: 50px; height: 50px; background-color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
              <span style="color: ${brandingData.primaryColor}; font-size: 24px;">🦷</span>
            </div>
          `}
          <div>
            <h1 style="font-size: 28px; font-weight: bold; margin: 0;">${brandingData.clinicName}</h1>
            ${brandingData.address ? `<p style="margin: 5px 0 0 0; opacity: 0.9;">${brandingData.address}</p>` : ''}
          </div>
        </div>
      </div>
    `

    const footerTemplate = `
      <div style="background-color: #f8f9fa; padding: 30px 20px; margin-top: 40px; border-top: 3px solid ${brandingData.primaryColor};">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
          <div>
            <h3 style="color: ${brandingData.primaryColor}; margin: 0 0 10px 0;">${brandingData.clinicName}</h3>
            <div style="color: ${brandingData.secondaryColor}; font-size: 14px;">
              ${brandingData.address ? `<p style="margin: 2px 0;"><strong>Address:</strong> ${brandingData.address}</p>` : ''}
              ${brandingData.phone ? `<p style="margin: 2px 0;"><strong>Phone:</strong> ${brandingData.phone}</p>` : ''}
              ${brandingData.email ? `<p style="margin: 2px 0;"><strong>Email:</strong> ${brandingData.email}</p>` : ''}
              ${brandingData.website ? `<p style="margin: 2px 0;"><strong>Website:</strong> ${brandingData.website}</p>` : ''}
            </div>
          </div>
          <div style="text-align: center;">
            <button style="background-color: ${brandingData.primaryColor}; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">
              📅 Book Your Next Appointment
            </button>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: ${brandingData.secondaryColor};">
              Generated by Scanwise AI • ${new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    `

    setBrandingData(prev => ({
      ...prev,
      headerTemplate,
      footerTemplate
    }))
  }

  const handleInputChange = (field: keyof ClinicBrandingData, value: string) => {
    setBrandingData(prev => ({ ...prev, [field]: value }))
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setLogoFile(file)
      setIsUploadingLogo(true)
      
      try {
        // Upload logo to Supabase storage
        console.log('📤 Uploading logo to Supabase...')
        const response = await api.uploadClinicLogo(file)
        
        if (response.logo_url) {
          // Update brandingData with the permanent Supabase URL
          handleInputChange('logoUrl', response.logo_url)
          
          toast({
            title: "Logo uploaded",
            description: "Logo uploaded successfully. Click Save to apply changes.",
          })
          
          console.log('✅ Logo uploaded successfully:', response.logo_url)
        }
      } catch (error) {
        console.error('❌ Failed to upload logo:', error)
        toast({
          title: "Upload failed",
          description: "Failed to upload logo. Please try again.",
          variant: "destructive"
        })
      } finally {
        setIsUploadingLogo(false)
      }
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      // Save to localStorage
      localStorage.setItem('clinic-branding', JSON.stringify(brandingData))
      
      // Call parent callback (which saves to backend)
      if (onSave) {
        await onSave(brandingData)
      }

      toast({
        title: "Branding saved",
        description: "Your clinic branding has been saved successfully.",
      })
    } catch (error) {
      console.error('❌ Failed to save branding:', error)
      toast({
        title: "Save failed",
        description: "Failed to save branding. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="mr-2 h-5 w-5" />
            Clinic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clinic-name">Clinic Name *</Label>
              <Input
                id="clinic-name"
                value={brandingData.clinicName}
                onChange={(e) => handleInputChange('clinicName', e.target.value)}
                placeholder="Enter clinic name"
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={brandingData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="(03) 1234 5678"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={brandingData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="123 Main Street, City, State, Postcode"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={brandingData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="info@yourclinic.com"
              />
            </div>
            
            <div>
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                value={brandingData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="www.yourclinic.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileImage className="mr-2 h-5 w-5" />
            Logo & Colors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="logo-upload">Clinic Logo</Label>
            <div className="mt-2">
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('logo-upload')?.click()}
                className="flex items-center gap-2"
                disabled={isUploadingLogo}
              >
                {isUploadingLogo ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload Logo
                  </>
                )}
              </Button>
              {brandingData.logoUrl && (
                <div className="mt-2">
                  <img
                    src={brandingData.logoUrl}
                    alt="Logo preview"
                    className="h-16 w-auto border rounded"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={brandingData.primaryColor}
                  onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={brandingData.primaryColor}
                  onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                  placeholder="#1e88e5"
                  className="flex-1"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="secondary-color">Secondary Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={brandingData.secondaryColor}
                  onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={brandingData.secondaryColor}
                  onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                  placeholder="#666666"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Template Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Header Preview</Label>
              <div 
                className="border rounded p-4 bg-gray-50"
                dangerouslySetInnerHTML={{ __html: brandingData.headerTemplate }}
              />
            </div>
            
            <div>
              <Label>Footer Preview</Label>
              <div 
                className="border rounded p-4 bg-gray-50"
                dangerouslySetInnerHTML={{ __html: brandingData.footerTemplate }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          className="bg-blue-600 hover:bg-blue-700"
          disabled={isSaving || isUploadingLogo}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            'Save Clinic Branding'
          )}
        </Button>
      </div>
    </div>
  )
}

// Hook for using clinic branding
export function useClinicBranding() {
  const [brandingData, setBrandingData] = useState<ClinicBrandingData | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('clinic-branding')
    if (saved) {
      try {
        setBrandingData(JSON.parse(saved))
      } catch (error) {
        console.error('Error loading clinic branding:', error)
      }
    }
  }, [])

  const applyBrandingToReport = (reportHtml: string): string => {
    console.log('🎨 BRANDING: Starting applyBrandingToReport');
    console.log('🎨 BRANDING: Input HTML length:', reportHtml?.length || 0);
    console.log('🎨 BRANDING: Has branding data:', !!brandingData);
    
    // If no branding data or empty HTML, return the original HTML
    if (!brandingData || !reportHtml || reportHtml.trim().length === 0) {
      console.log('🎨 BRANDING: No branding data or empty HTML, returning original');
      return reportHtml || '';
    }

    try {
      // Replace the default header and footer with clinic branding
      let brandedReport = reportHtml;

      // Only try to replace header if we have header template
      if (brandingData.headerTemplate) {
        console.log('🎨 BRANDING: Attempting to replace header');
        // Updated regex to match any hex color (not just #1e88e5)
        const headerRegex = /<div[^>]*class="report-container"[^>]*>[\s\S]*?<div[^>]*background-color:\s*#[0-9a-fA-F]{6}[^>]*>[\s\S]*?<\/div>/;
        if (headerRegex.test(brandedReport)) {
          brandedReport = brandedReport.replace(headerRegex, `<div class="report-container" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">${brandingData.headerTemplate}`);
          console.log('🎨 BRANDING: Header replaced successfully');
        } else {
          console.log('🎨 BRANDING: Header pattern not found, skipping header replacement');
        }
      }

      // Only add footer if we have footer template
      if (brandingData.footerTemplate) {
        console.log('🎨 BRANDING: Attempting to add footer');
        const footerInsertPoint = brandedReport.lastIndexOf('</div>');
        if (footerInsertPoint !== -1) {
          brandedReport = brandedReport.slice(0, footerInsertPoint) + brandingData.footerTemplate + brandedReport.slice(footerInsertPoint);
          console.log('🎨 BRANDING: Footer added successfully');
        } else {
          console.log('🎨 BRANDING: Could not find insertion point for footer');
        }
      }

      console.log('🎨 BRANDING: Output HTML length:', brandedReport?.length || 0);
      return brandedReport || reportHtml;
    } catch (error) {
      console.error('🎨 BRANDING: Error applying branding:', error);
      // Return original HTML if branding fails
      return reportHtml || '';
    }
  }

  return {
    brandingData,
    applyBrandingToReport,
    setBrandingData
  }
}