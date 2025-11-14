import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { api } from '@/services/api'
import { useToast } from '@/hooks/use-toast'

interface CreateCustomTreatmentDialogProps {
  isOpen: boolean
  onClose: () => void
  onTreatmentCreated: (treatmentId: string) => void
}

export function CreateCustomTreatmentDialog({
  isOpen,
  onClose,
  onTreatmentCreated
}: CreateCustomTreatmentDialogProps) {
  const { toast } = useToast()
  const [isCreating, setIsCreating] = useState(false)
  
  // Form state
  const [treatmentName, setTreatmentName] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('')
  const [itemCode, setItemCode] = useState('')
  const [category, setCategory] = useState('general')
  
  const handleCreate = async () => {
    // Validation
    if (!treatmentName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a treatment name.",
        variant: "destructive"
      })
      return
    }
    
    if (!price || parseFloat(price) <= 0) {
      toast({
        title: "Price Required",
        description: "Please enter a valid price.",
        variant: "destructive"
      })
      return
    }
    
    if (!duration || parseInt(duration) <= 0) {
      toast({
        title: "Duration Required",
        description: "Please enter a valid duration in minutes.",
        variant: "destructive"
      })
      return
    }
    
    setIsCreating(true)
    
    try {
      const customTreatment = {
        clinic_name: treatmentName.trim(),
        display_name: treatmentName.trim(),
        friendly_name: treatmentName.trim(),
        category,
        description: `Custom treatment: ${treatmentName}`,
        price: parseFloat(price),
        duration: parseInt(duration),
        insurance_code: itemCode.trim() || null
      }
      
      console.log('➕ Creating custom treatment:', customTreatment)
      
      const result = await api.createCustomTreatment(customTreatment)
      
      console.log('✅ Custom treatment created:', result.treatment)
      
      toast({
        title: "Treatment Created",
        description: `"${treatmentName}" has been added to your custom treatments.`,
      })
      
      // Return the custom treatment ID to the parent
      onTreatmentCreated(`custom_${result.treatment.id}`)
      
      // Reset form
      setTreatmentName('')
      setPrice('')
      setDuration('')
      setItemCode('')
      setCategory('general')
      
      onClose()
    } catch (error: any) {
      console.error('❌ Error creating custom treatment:', error)
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create custom treatment. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Custom Treatment</DialogTitle>
          <DialogDescription>
            Add a new treatment specific to your clinic. This will be available for future use.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Treatment Name */}
          <div className="space-y-2">
            <Label htmlFor="treatment-name" className="text-sm font-medium">
              Treatment Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="treatment-name"
              placeholder="e.g., Custom Crown Procedure"
              value={treatmentName}
              onChange={(e) => setTreatmentName(e.target.value)}
              disabled={isCreating}
            />
          </div>
          
          {/* Price and Duration Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price" className="text-sm font-medium">
                Price (AUD) <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="price"
                  type="number"
                  placeholder="0.00"
                  className="pl-7"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={isCreating}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-sm font-medium">
                Duration (mins) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="duration"
                type="number"
                placeholder="30"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                disabled={isCreating}
                min="1"
                step="1"
              />
            </div>
          </div>
          
          {/* Item Code (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="item-code" className="text-sm font-medium">
              Insurance Item Code <span className="text-gray-400">(Optional)</span>
            </Label>
            <Input
              id="item-code"
              placeholder="e.g., 415"
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
              disabled={isCreating}
            />
          </div>
          
          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">
              Category
            </Label>
            <Select value={category} onValueChange={setCategory} disabled={isCreating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="endodontics">Endodontics</SelectItem>
                <SelectItem value="restorative">Restorative</SelectItem>
                <SelectItem value="oral-surgery">Oral Surgery</SelectItem>
                <SelectItem value="prosthodontics">Prosthodontics</SelectItem>
                <SelectItem value="periodontics">Periodontics</SelectItem>
                <SelectItem value="preventive">Preventive</SelectItem>
                <SelectItem value="orthodontics">Orthodontics</SelectItem>
                <SelectItem value="cosmetic">Cosmetic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create and Use'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

