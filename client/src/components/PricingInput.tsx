import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoIcon, DollarSign } from 'lucide-react'
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
  const [showManualInput, setShowManualInput] = useState(false)
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
        setShowManualInput(false)
        setIsNewPrice(false)
      } else {
        // No price found, show manual input
        setShowManualInput(true)
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
    setInputValue(newValue)
    
    const numericValue = parseFloat(newValue)
    if (!isNaN(numericValue) && numericValue > 0) {
      onChange(numericValue)
    }
  }

  const handleSavePrice = () => {
    const numericValue = parseFloat(inputValue)
    if (!isNaN(numericValue) && numericValue > 0 && onPriceSave) {
      onPriceSave(treatment, numericValue)
      setIsNewPrice(false)
    }
  }

  if (!treatment || disabled) {
    return null
  }

  return (
    <div className="space-y-2">
      {showManualInput ? (
        <div className="space-y-2">
          {isNewPrice && (
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                No price found for this treatment. Please enter it here to proceed:
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Enter price"
                className="pl-8"
                min="0"
                step="0.01"
              />
            </div>
            
            {isNewPrice && onPriceSave && (
              <Button
                type="button"
                size="sm"
                onClick={handleSavePrice}
                disabled={!inputValue || isNaN(parseFloat(inputValue))}
              >
                Save
              </Button>
            )}
          </div>
          
          {isNewPrice && (
            <p className="text-xs text-gray-500">
              This price will be saved for future use in your clinic.
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              ${knownPrice}
            </span>
            <span className="text-xs text-green-600">
              {clinicPrice ? '(Clinic price)' : '(Default price)'}
            </span>
          </div>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowManualInput(true)}
            className="text-green-700 hover:text-green-800"
          >
            Edit
          </Button>
        </div>
      )}
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