import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DollarSign, AlertCircle } from 'lucide-react'
import { ALL_TREATMENTS } from '@/data/dental-data'

interface MissingPrice {
  treatment: string
  treatmentLabel: string
}

interface PriceValidationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  missingPrices: string[]
  onPricesProvided: (prices: Record<string, number>) => void
  onCancel: () => void
}

export function PriceValidationDialog({
  open,
  onOpenChange,
  missingPrices,
  onPricesProvided,
  onCancel
}: PriceValidationDialogProps) {
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Get treatment labels for missing prices
  const missingPriceData: MissingPrice[] = missingPrices.map(treatment => ({
    treatment,
    treatmentLabel: ALL_TREATMENTS.find(t => t.value === treatment)?.label || treatment
  }))

  const handlePriceChange = (treatment: string, value: string) => {
    setPrices(prev => ({ ...prev, [treatment]: value }))
    
    // Clear error when user starts typing
    if (errors[treatment]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[treatment]
        return newErrors
      })
    }
  }

  const validatePrices = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    missingPrices.forEach(treatment => {
      const priceStr = prices[treatment]
      if (!priceStr || priceStr.trim() === '') {
        newErrors[treatment] = 'Price is required'
      } else {
        const price = parseFloat(priceStr)
        if (isNaN(price) || price <= 0) {
          newErrors[treatment] = 'Please enter a valid price greater than 0'
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validatePrices()) {
      return
    }

    const numericPrices: Record<string, number> = {}
    Object.entries(prices).forEach(([treatment, priceStr]) => {
      const price = parseFloat(priceStr)
      if (!isNaN(price) && price > 0) {
        numericPrices[treatment] = price
      }
    })

    onPricesProvided(numericPrices)
  }

  const handleCancel = () => {
    setPrices({})
    setErrors({})
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Missing Treatment Prices
          </DialogTitle>
          <DialogDescription>
            The following treatments don't have prices set. Please enter prices to continue with report generation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <DollarSign className="h-4 w-4" />
            <AlertDescription>
              These prices will be saved to your clinic pricing for future use.
            </AlertDescription>
          </Alert>

          <div className="space-y-4 max-h-60 overflow-y-auto">
            {missingPriceData.map(({ treatment, treatmentLabel }) => (
              <div key={treatment} className="space-y-2">
                <Label htmlFor={`price-${treatment}`} className="text-sm font-medium">
                  {treatmentLabel}
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id={`price-${treatment}`}
                    type="number"
                    value={prices[treatment] || ''}
                    onChange={(e) => handlePriceChange(treatment, e.target.value)}
                    placeholder="Enter price"
                    className={`pl-8 ${errors[treatment] ? 'border-red-500' : ''}`}
                    min="0"
                    step="0.01"
                  />
                </div>
                {errors[treatment] && (
                  <p className="text-sm text-red-500">{errors[treatment]}</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
              Save Prices & Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}