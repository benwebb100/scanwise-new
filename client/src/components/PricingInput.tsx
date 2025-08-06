import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { InfoIcon, DollarSign, Edit2, Check, X } from 'lucide-react'
import { DEFAULT_TREATMENT_PRICES } from '@/data/dental-data'
import { api } from '@/services/api'

interface PricingInputProps {
  treatment: string
  value?: number
  onChange: (price: number) => void
  clinicPrices?: Record<string, number>
  onPriceSave?: (treatment: string, price: number) => void
  disabled?: boolean
}

export function PricingInput({
  treatment,
  value,
  onChange,
  clinicPrices = {},
  onPriceSave,
  disabled = false
}: PricingInputProps) {
  const [inputValue, setInputValue] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingPrice, setPendingPrice] = useState<number | null>(null)
  const [isNewPrice, setIsNewPrice] = useState(false)

  // Check if we have a price for this treatment
  const clinicPrice = clinicPrices[treatment]
  const defaultPrice = DEFAULT_TREATMENT_PRICES[treatment]
  const knownPrice = clinicPrice || defaultPrice

  useEffect(() => {
    if (treatment && !disabled) {
      if (knownPrice) {
        // Auto-fill with known price
        onChange(knownPrice)
        setIsNewPrice(false)
      } else {
        // No price found, show as new price
        setIsNewPrice(true)
        setInputValue('')
      }
    }
  }, [treatment, knownPrice, onChange, disabled])

  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value.toString())
    }
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    console.log('Input change:', newValue)
    setInputValue(newValue)
    
    const numericValue = parseFloat(newValue)
    if (!isNaN(numericValue) && numericValue >= 0) {
      console.log('Calling onChange with:', numericValue)
      onChange(numericValue)
    }
  }

  const handleEditClick = () => {
    setIsEditing(true)
    setInputValue(value?.toString() || '')
  }

  const handleSaveClick = () => {
    const numericValue = parseFloat(inputValue)
    if (!isNaN(numericValue) && numericValue > 0) {
      setPendingPrice(numericValue)
      setShowConfirmDialog(true)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setInputValue(value?.toString() || '')
  }

  const handleConfirmSave = (updateSettings: boolean) => {
    if (pendingPrice && onPriceSave) {
      onChange(pendingPrice)
      
      if (updateSettings) {
        // Update clinic settings permanently
        onPriceSave(treatment, pendingPrice)
      }
      // If updateSettings is false, just use the price for this report only
    }
    
    setIsEditing(false)
    setShowConfirmDialog(false)
    setPendingPrice(null)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveClick()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  if (!treatment || disabled) {
    return null
  }

  return (
    <div className="space-y-2">
      {isNewPrice && !isEditing ? (
        <div className="space-y-2">
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              No price found for this treatment. Please enter it here to proceed:
            </AlertDescription>
          </Alert>
          
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Enter price"
                className="pl-8"
                min="0"
                step="0.01"
              />
            </div>
            
            <Button
              type="button"
              size="sm"
              onClick={handleSaveClick}
              disabled={!inputValue || isNaN(parseFloat(inputValue))}
            >
              Save
            </Button>
          </div>
          
          <p className="text-xs text-gray-500">
            This price will be saved for future use in your clinic.
          </p>
        </div>
      ) : isEditing ? (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Enter price"
                className="pl-8"
                min="0"
                step="0.01"
                autoFocus
              />
            </div>
            
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCancelEdit}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <Button
              type="button"
              size="sm"
              onClick={handleSaveClick}
              disabled={!inputValue || isNaN(parseFloat(inputValue))}
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-xs text-gray-500">
            Press Enter to save, Escape to cancel
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              ${value || knownPrice}
            </span>
            <span className="text-xs text-green-600">
              {clinicPrice ? '(Clinic price)' : '(Default price)'}
            </span>
          </div>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleEditClick}
            className="text-green-700 hover:text-green-800"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Treatment Price</DialogTitle>
            <DialogDescription>
              You've updated the price for <strong>{treatment}</strong> to <strong>${pendingPrice}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              Would you like to update this price in your clinic settings for future use?
            </p>
            
            <div className="space-y-2">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm font-medium text-blue-800">Update Settings</p>
                <p className="text-xs text-blue-600">
                  This price will be saved permanently and used for all future reports.
                </p>
              </div>
              
              <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                <p className="text-sm font-medium text-gray-800">One-time Use</p>
                <p className="text-xs text-gray-600">
                  Use this price only for this report. Your clinic settings will remain unchanged.
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handleConfirmSave(false)}
              className="w-full sm:w-auto"
            >
              One-time Use
            </Button>
            <Button
              onClick={() => handleConfirmSave(true)}
              className="w-full sm:w-auto"
            >
              Update Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Hook for managing clinic pricing
export function useClinicPricing() {
  const [clinicPrices, setClinicPrices] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  // Load clinic prices from database on mount
  useEffect(() => {
    loadPrices()
  }, [])

  const loadPrices = async () => {
    try {
      setLoading(true)
      const response = await api.getClinicPricing()
      if (response.status === 'success') {
        setClinicPrices(response.pricing_data || {})
      }
    } catch (error) {
      console.error('Error loading clinic prices:', error)
      // Fallback to localStorage for backward compatibility
      const saved = localStorage.getItem('clinic-prices')
      if (saved) {
        try {
          setClinicPrices(JSON.parse(saved))
        } catch (parseError) {
          console.error('Error parsing saved prices:', parseError)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  // Save a new price for a treatment
  const savePrice = async (treatment: string, price: number) => {
    const updated = { ...clinicPrices, [treatment]: price }
    
    try {
      await api.saveClinicPricing(updated)
      setClinicPrices(updated)
      // Also save to localStorage as backup
      localStorage.setItem('clinic-prices', JSON.stringify(updated))
    } catch (error) {
      console.error('Error saving price to database:', error)
      // Fallback to localStorage only
      setClinicPrices(updated)
      localStorage.setItem('clinic-prices', JSON.stringify(updated))
    }
  }

  // Save multiple prices at once
  const savePrices = async (prices: Record<string, number>) => {
    const updated = { ...clinicPrices, ...prices }
    
    try {
      await api.saveClinicPricing(updated)
      setClinicPrices(updated)
      localStorage.setItem('clinic-prices', JSON.stringify(updated))
    } catch (error) {
      console.error('Error saving prices to database:', error)
      // Fallback to localStorage only
      setClinicPrices(updated)
      localStorage.setItem('clinic-prices', JSON.stringify(updated))
    }
  }

  // Get price for a treatment (clinic price or default)
  const getPrice = (treatment: string): number | undefined => {
    return clinicPrices[treatment] || DEFAULT_TREATMENT_PRICES[treatment]
  }

  // Check if all treatments in a list have prices
  const validatePricing = (treatments: string[]): { valid: boolean; missing: string[] } => {
    const missing = treatments.filter(treatment => !getPrice(treatment))
    return {
      valid: missing.length === 0,
      missing
    }
  }

  return {
    clinicPrices,
    loading,
    savePrice,
    savePrices,
    getPrice,
    validatePricing,
    refreshPrices: loadPrices
  }
}