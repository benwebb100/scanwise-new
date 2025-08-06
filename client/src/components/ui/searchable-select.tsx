import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface SearchableSelectOption {
  value: string
  label: string
  pinned?: boolean
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)

  // Separate pinned and regular options
  const pinnedOptions = options.filter(option => option.pinned)
  const regularOptions = options.filter(option => !option.pinned)

  const selectedOption = options.find(option => option.value === value)

  const handleSelect = (selectedValue: string) => {
    // Find the option by value (not label)
    const option = options.find(opt => opt.value === selectedValue)
    if (option) {
      const newValue = selectedValue === value ? "" : selectedValue
      onValueChange?.(newValue)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between text-left", className)}
          disabled={disabled}
          type="button"
        >
          <span className={cn("truncate", !selectedOption && "text-muted-foreground")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0" 
        align="start"
        sideOffset={4}
      >
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            className="h-9"
          />
          <CommandList className="max-h-[200px]">
            <CommandEmpty>{emptyText}</CommandEmpty>
            
            {/* Pinned Options */}
            {pinnedOptions.length > 0 && (
              <CommandGroup heading="Most Common">
                {pinnedOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={(currentValue) => {
                      // The Command component passes the value prop (label) to onSelect
                      // We need to find the corresponding option.value
                      const selectedOption = options.find(opt => opt.label === currentValue)
                      if (selectedOption) {
                        handleSelect(selectedOption.value)
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            
            {/* Regular Options */}
            {regularOptions.length > 0 && (
              <CommandGroup heading={pinnedOptions.length > 0 ? "All Options" : undefined}>
                {regularOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={(currentValue) => {
                      // The Command component passes the value prop (label) to onSelect
                      // We need to find the corresponding option.value
                      const selectedOption = options.find(opt => opt.label === currentValue)
                      if (selectedOption) {
                        handleSelect(selectedOption.value)
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}