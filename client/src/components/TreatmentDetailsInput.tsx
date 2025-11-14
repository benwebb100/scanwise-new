import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { InfoIcon, DollarSign, Clock, Edit2, Check, X } from 'lucide-react'
import { TreatmentService } from '@/lib/treatment-service'
import { useTreatmentSettings } from '@/hooks/useTreatmentSettings'

interface TreatmentDetailsInputProps {
  treatment: string
  priceValue?: number
  durationValue?: number
  onPriceChange: (price: number) => void
  onDurationChange: (duration: number) => void
  onPriceSave?: (treatment: string, price: number) => void
  onDurationSave?: (treatment: string, duration: number) => void
  disabled?: boolean
}

export function TreatmentDetailsInput({
  treatment,
  priceValue,
  durationValue,
  onPriceChange,
  onDurationChange,
  onPriceSave,
  onDurationSave,
  disabled = false
}: TreatmentDetailsInputProps) {
  const { getTreatmentSetting, updateTreatmentSetting, saveChanges, reloadSettings } = useTreatmentSettings();
  
  // Price state
  const [priceInput, setPriceInput] = useState<string>('')
  const [isEditingPrice, setIsEditingPrice] = useState(false)
  const [showPriceDialog, setShowPriceDialog] = useState(false)
  const [pendingPrice, setPendingPrice] = useState<number | null>(null)
  
  // Duration state
  const [durationInput, setDurationInput] = useState<string>('')
  const [isEditingDuration, setIsEditingDuration] = useState(false)
  const [showDurationDialog, setShowDurationDialog] = useState(false)
  const [pendingDuration, setPendingDuration] = useState<number | null>(null)
  
  // Get treatment settings
  const treatmentSetting = getTreatmentSetting(treatment)
  const clinicPrice = treatmentSetting.price
  const clinicDuration = treatmentSetting.duration
  
  // Get defaults from master database
  const defaultPrice = TreatmentService.getDefaultPrice(treatment) || 0
  const defaultDuration = TreatmentService.getDefaultDuration(treatment) || 30
  
  // Use clinic settings if available, otherwise use defaults
  const knownPrice = (clinicPrice && clinicPrice > 0) ? clinicPrice : defaultPrice
  const knownDuration = (clinicDuration && clinicDuration > 0) ? clinicDuration : defaultDuration
  
  // Auto-fill price and duration when treatment changes
  useEffect(() => {
    if (treatment && !disabled) {
      if (priceValue === undefined || priceValue === 0) {
        onPriceChange(knownPrice)
      }
      if (durationValue === undefined || durationValue === 0) {
        onDurationChange(knownDuration)
      }
    }
  }, [treatment, knownPrice, knownDuration, disabled])
  
  // Update inputs when values change
  useEffect(() => {
    if (priceValue !== undefined && !isEditingPrice) {
      setPriceInput(priceValue.toString())
    }
  }, [priceValue, isEditingPrice])
  
  useEffect(() => {
    if (durationValue !== undefined && !isEditingDuration) {
      setDurationInput(durationValue.toString())
    }
  }, [durationValue, isEditingDuration])

  // ===== PRICE HANDLERS =====
  const handlePriceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setPriceInput(newValue)
    
    if (newValue === '' || newValue === '.') return
    
    const numericValue = parseFloat(newValue)
    if (!isNaN(numericValue) && numericValue >= 0 && numericValue !== priceValue) {
      onPriceChange(numericValue)
    }
  }

  const handlePriceEditClick = () => {
    setIsEditingPrice(true)
    setPriceInput(priceValue?.toString() || '')
  }

  const handlePriceSaveClick = () => {
    const numericValue = parseFloat(priceInput)
    if (!isNaN(numericValue) && numericValue > 0) {
      setPendingPrice(numericValue)
      setShowPriceDialog(true)
    }
  }

  const handlePriceCancelEdit = () => {
    setIsEditingPrice(false)
    setPriceInput(priceValue?.toString() || '')
  }

  const handlePriceConfirmSave = async (updateSettings: boolean) => {
    if (pendingPrice) {
      onPriceChange(pendingPrice)
      
      if (updateSettings) {
        updateTreatmentSetting(treatment, { price: pendingPrice })
        try {
          await saveChanges()
          console.log(`✅ Successfully saved price for ${treatment}: $${pendingPrice}`)
          // ✅ Reload settings to refresh cache after permanent save
          await reloadSettings()
        } catch (error) {
          console.error(`❌ Failed to save price for ${treatment}:`, error)
        }
        
        if (onPriceSave) {
          onPriceSave(treatment, pendingPrice)
        }
      }
    }
    
    setIsEditingPrice(false)
    setShowPriceDialog(false)
    setPendingPrice(null)
  }

  // ===== DURATION HANDLERS =====
  const handleDurationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setDurationInput(newValue)
    
    if (newValue === '') return
    
    const numericValue = parseInt(newValue)
    if (!isNaN(numericValue) && numericValue > 0 && numericValue !== durationValue) {
      onDurationChange(numericValue)
    }
  }

  const handleDurationEditClick = () => {
    setIsEditingDuration(true)
    setDurationInput(durationValue?.toString() || '')
  }

  const handleDurationSaveClick = () => {
    const numericValue = parseInt(durationInput)
    if (!isNaN(numericValue) && numericValue > 0) {
      setPendingDuration(numericValue)
      setShowDurationDialog(true)
    }
  }

  const handleDurationCancelEdit = () => {
    setIsEditingDuration(false)
    setDurationInput(durationValue?.toString() || '')
  }

  const handleDurationConfirmSave = async (updateSettings: boolean) => {
    if (pendingDuration) {
      onDurationChange(pendingDuration)
      
      if (updateSettings) {
        updateTreatmentSetting(treatment, { duration: pendingDuration })
        try {
          await saveChanges()
          console.log(`✅ Successfully saved duration for ${treatment}: ${pendingDuration} mins`)
          // ✅ Reload settings to refresh cache after permanent save
          await reloadSettings()
        } catch (error) {
          console.error(`❌ Failed to save duration for ${treatment}:`, error)
        }
        
        if (onDurationSave) {
          onDurationSave(treatment, pendingDuration)
        }
      }
    }
    
    setIsEditingDuration(false)
    setShowDurationDialog(false)
    setPendingDuration(null)
  }

  const handleKeyPress = (e: React.KeyboardEvent, type: 'price' | 'duration') => {
    if (e.key === 'Enter') {
      if (type === 'price') handlePriceSaveClick()
      else handleDurationSaveClick()
    } else if (e.key === 'Escape') {
      if (type === 'price') handlePriceCancelEdit()
      else handleDurationCancelEdit()
    }
  }

  if (!treatment || disabled || treatment.trim() === '') {
    return null
  }

  return (
    <div className="space-y-4">
      {/* PRICE INPUT */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Price</Label>
        
        {isEditingPrice ? (
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="number"
                value={priceInput}
                onChange={handlePriceInputChange}
                onKeyPress={(e) => handleKeyPress(e, 'price')}
                placeholder="Enter price"
                className="pl-8"
                min="0"
                step="0.01"
                autoFocus
              />
            </div>
            
            <Button type="button" size="sm" variant="outline" onClick={handlePriceCancelEdit}>
              <X className="h-4 w-4" />
            </Button>
            
            <Button
              type="button"
              size="sm"
              onClick={handlePriceSaveClick}
              disabled={!priceInput || isNaN(parseFloat(priceInput)) || parseFloat(priceInput) <= 0}
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-800">
                ${priceValue !== undefined ? priceValue.toFixed(2) : knownPrice.toFixed(2)}
              </span>
              <span className="text-xs text-green-600">
                {(clinicPrice && clinicPrice > 0) ? '(Clinic price)' : '(Default)'}
              </span>
            </div>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePriceEditClick}
              className="text-green-700 hover:text-green-800 hover:bg-green-100"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* DURATION INPUT */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Duration</Label>
        
        {isEditingDuration ? (
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="number"
                value={durationInput}
                onChange={handleDurationInputChange}
                onKeyPress={(e) => handleKeyPress(e, 'duration')}
                placeholder="Enter duration"
                className="pl-8"
                min="1"
                step="1"
                autoFocus
              />
            </div>
            
            <Button type="button" size="sm" variant="outline" onClick={handleDurationCancelEdit}>
              <X className="h-4 w-4" />
            </Button>
            
            <Button
              type="button"
              size="sm"
              onClick={handleDurationSaveClick}
              disabled={!durationInput || isNaN(parseInt(durationInput)) || parseInt(durationInput) <= 0}
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">
                {durationValue !== undefined ? durationValue : knownDuration} mins
              </span>
              <span className="text-xs text-blue-600">
                {(clinicDuration && clinicDuration > 0) ? '(Clinic)' : '(Default)'}
              </span>
            </div>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDurationEditClick}
              className="text-blue-700 hover:text-blue-800 hover:bg-blue-100"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* PRICE CONFIRMATION DIALOG */}
      <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Treatment Price</DialogTitle>
            <DialogDescription>
              You've updated the price for <strong>{TreatmentService.getFriendlyName(treatment)}</strong> to <strong>${pendingPrice}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-2">
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
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handlePriceConfirmSave(false)}
              className="w-full sm:w-auto"
            >
              One-time Use
            </Button>
            <Button
              onClick={() => handlePriceConfirmSave(true)}
              className="w-full sm:w-auto"
            >
              Update Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DURATION CONFIRMATION DIALOG */}
      <Dialog open={showDurationDialog} onOpenChange={setShowDurationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Treatment Duration</DialogTitle>
            <DialogDescription>
              You've updated the duration for <strong>{TreatmentService.getFriendlyName(treatment)}</strong> to <strong>{pendingDuration} minutes</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-2">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm font-medium text-blue-800">Update Settings</p>
              <p className="text-xs text-blue-600">
                This duration will be saved permanently and used for all future reports.
              </p>
            </div>
            
            <div className="p-3 bg-gray-50 border border-gray-200 rounded">
              <p className="text-sm font-medium text-gray-800">One-time Use</p>
              <p className="text-xs text-gray-600">
                Use this duration only for this report. Your clinic settings will remain unchanged.
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handleDurationConfirmSave(false)}
              className="w-full sm:w-auto"
            >
              One-time Use
            </Button>
            <Button
              onClick={() => handleDurationConfirmSave(true)}
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

