import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  Upload, 
  FileSpreadsheet, 
  FileImage, 
  DollarSign, 
  Edit, 
  Trash2, 
  Download, 
  Plus,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { ALL_TREATMENTS, DEFAULT_TREATMENT_PRICES } from '@/data/dental-data'
import { api } from '@/services/api'

interface PriceEntry {
  treatment: string
  treatmentLabel: string
  price: number
  isCustom: boolean
  lastUpdated?: string
}

interface PricingManagementProps {
  onPricingUpdate?: () => void
}

export function PricingManagement({ onPricingUpdate }: PricingManagementProps) {
  const { toast } = useToast()
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [editingPrice, setEditingPrice] = useState<{ treatment: string; price: number } | null>(null)
  const [newPrice, setNewPrice] = useState('')
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [ocrProcessing, setOcrProcessing] = useState(false)

  // Load pricing data on mount
  useEffect(() => {
    loadPricing()
  }, [])

  const loadPricing = async () => {
    try {
      setLoading(true)
      const response = await api.getClinicPricing()
      if (response.status === 'success') {
        setPrices(response.pricing_data || {})
      }
    } catch (error) {
      console.error('Error loading pricing:', error)
      toast({
        title: "Error",
        description: "Failed to load pricing data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const savePricing = async (updatedPrices: Record<string, number>) => {
    try {
      await api.saveClinicPricing(updatedPrices)
      setPrices(updatedPrices)
      onPricingUpdate?.()
      toast({
        title: "Success",
        description: "Pricing data saved successfully"
      })
    } catch (error) {
      console.error('Error saving pricing:', error)
      toast({
        title: "Error",
        description: "Failed to save pricing data",
        variant: "destructive"
      })
    }
  }

  const handlePriceEdit = (treatment: string, currentPrice: number) => {
    setEditingPrice({ treatment, price: currentPrice })
    setNewPrice(currentPrice.toString())
  }

  const handlePriceSave = async () => {
    if (!editingPrice) return
    
    const price = parseFloat(newPrice)
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0",
        variant: "destructive"
      })
      return
    }

    const updatedPrices = { ...prices, [editingPrice.treatment]: price }
    await savePricing(updatedPrices)
    setEditingPrice(null)
    setNewPrice('')
  }

  const handlePriceDelete = async (treatment: string) => {
    const updatedPrices = { ...prices }
    delete updatedPrices[treatment]
    await savePricing(updatedPrices)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const fileType = file.type
      let parsedPrices: Record<string, number> = {}

      if (fileType.includes('csv') || fileType.includes('spreadsheet')) {
        parsedPrices = await parseCSVFile(file)
      } else if (fileType.includes('image')) {
        setOcrProcessing(true)
        parsedPrices = await processImageWithOCR(file)
      } else {
        throw new Error('Unsupported file type')
      }

      if (Object.keys(parsedPrices).length > 0) {
        const mergedPrices = { ...prices, ...parsedPrices }
        await savePricing(mergedPrices)
        toast({
          title: "Upload Successful",
          description: `Imported ${Object.keys(parsedPrices).length} treatment prices`
        })
        setUploadDialogOpen(false)
      } else {
        toast({
          title: "No Data Found",
          description: "No valid treatment prices found in the file",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to process file",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
      setOcrProcessing(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const parseCSVFile = (file: File): Promise<Record<string, number>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const lines = text.split('\n')
          const prices: Record<string, number> = {}

          for (let i = 1; i < lines.length; i++) { // Skip header
            const line = lines[i].trim()
            if (!line) continue

            const [treatmentName, priceStr] = line.split(',').map(s => s.trim().replace(/"/g, ''))
            const price = parseFloat(priceStr)

            if (treatmentName && !isNaN(price) && price > 0) {
              // Try to match treatment name to our known treatments
              const matchedTreatment = ALL_TREATMENTS.find(t => 
                t.label.toLowerCase().includes(treatmentName.toLowerCase()) ||
                treatmentName.toLowerCase().includes(t.label.toLowerCase())
              )
              
              if (matchedTreatment) {
                prices[matchedTreatment.value] = price
              }
            }
          }

          resolve(prices)
        } catch (error) {
          reject(new Error('Failed to parse CSV file'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  const processImageWithOCR = async (file: File): Promise<Record<string, number>> => {
    // Convert image to base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    try {
      // Call OCR API endpoint
      const response = await api.processImageOCR(base64)
      return response.extracted_prices || {}
    } catch (error) {
      throw new Error('OCR processing failed. Please try a clearer image or use CSV/Excel format.')
    }
  }

  const exportPricing = () => {
    const csvContent = [
      'Treatment,Price',
      ...Object.entries(prices).map(([treatment, price]) => {
        const treatmentLabel = ALL_TREATMENTS.find(t => t.value === treatment)?.label || treatment
        return `"${treatmentLabel}",${price}`
      })
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clinic-pricing.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const getPriceEntries = (): PriceEntry[] => {
    const entries: PriceEntry[] = []
    
    // Add all treatments with their prices (custom or default)
    ALL_TREATMENTS.forEach(treatment => {
      const customPrice = prices[treatment.value]
      const defaultPrice = DEFAULT_TREATMENT_PRICES[treatment.value]
      const price = customPrice || defaultPrice
      
      if (price) {
        entries.push({
          treatment: treatment.value,
          treatmentLabel: treatment.label,
          price,
          isCustom: !!customPrice
        })
      }
    })

    return entries.sort((a, b) => a.treatmentLabel.localeCompare(b.treatmentLabel))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading pricing data...</span>
      </div>
    )
  }

  const priceEntries = getPriceEntries()
  const customPricesCount = Object.keys(prices).length
  const totalTreatments = ALL_TREATMENTS.length

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Custom Prices</p>
                <p className="text-2xl font-bold">{customPricesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Treatments</p>
                <p className="text-2xl font-bold">{totalTreatments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Using Defaults</p>
                <p className="text-2xl font-bold">{totalTreatments - customPricesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Price List
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Price List</DialogTitle>
              <DialogDescription>
                Upload your treatment prices from CSV, Excel, or image files
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Supported formats: CSV, Excel (.xlsx), and images (JPG, PNG) with OCR processing
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="csv-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                      <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-sm font-medium">CSV/Excel Upload</p>
                      <p className="text-xs text-gray-500">Click to select CSV or Excel file</p>
                    </div>
                  </Label>
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </div>

                <div>
                  <Label htmlFor="image-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                      <FileImage className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-sm font-medium">Image Upload (OCR)</p>
                      <p className="text-xs text-gray-500">Click to select image file</p>
                      {ocrProcessing && (
                        <div className="mt-2 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-xs">Processing with OCR...</span>
                        </div>
                      )}
                    </div>
                  </Label>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading || ocrProcessing}
                  />
                </div>
              </div>

              {uploading && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Processing file...</span>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={exportPricing} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Prices
        </Button>
      </div>

      {/* Pricing Table */}
      <Card>
        <CardHeader>
          <CardTitle>Treatment Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Treatment</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceEntries.map((entry) => (
                  <TableRow key={entry.treatment}>
                    <TableCell className="font-medium">
                      {entry.treatmentLabel}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span>${entry.price}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.isCustom ? "default" : "secondary"}>
                        {entry.isCustom ? "Custom" : "Default"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePriceEdit(entry.treatment, entry.price)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {entry.isCustom && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePriceDelete(entry.treatment)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Price Dialog */}
      <Dialog open={!!editingPrice} onOpenChange={() => setEditingPrice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Price</DialogTitle>
            <DialogDescription>
              Update the price for {editingPrice && ALL_TREATMENTS.find(t => t.value === editingPrice.treatment)?.label}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="price-input">Price ($)</Label>
              <Input
                id="price-input"
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Enter price"
                min="0"
                step="0.01"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingPrice(null)}>
                Cancel
              </Button>
              <Button onClick={handlePriceSave}>
                Save Price
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}