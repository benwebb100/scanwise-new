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
  const [searchValue, setSearchValue] = React.useState("")

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options
    return options.filter(option => 
      option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
      option.value.toLowerCase().includes(searchValue.toLowerCase())
    )
  }, [options, searchValue])

  // Separate pinned and regular options from filtered results
  const pinnedOptions = filteredOptions.filter(option => option.pinned)
  const regularOptions = filteredOptions.filter(option => !option.pinned)

  const selectedOption = options.find(option => option.value === value)

  const handleSelect = (selectedValue: string) => {
    console.log('SearchableSelect: handleSelect called with:', selectedValue)
    console.log('SearchableSelect: Current value:', value)
    console.log('SearchableSelect: Available options:', options.map(o => o.value))
    
    // Find the option by value (not label)
    const option = options.find(opt => opt.value === selectedValue)
    console.log('SearchableSelect: Found option:', option)
    
    if (option) {
      const newValue = selectedValue === value ? "" : selectedValue
      console.log('SearchableSelect: Setting new value:', newValue)
      onValueChange?.(newValue)
      setOpen(false)
      setSearchValue("") // Clear search when selecting
    } else {
      console.error('SearchableSelect: Option not found for value:', selectedValue)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSearchValue("") // Clear search when closing
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
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
        className="w-auto min-w-[var(--radix-popover-trigger-width)] max-w-[500px] p-0"
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            className="h-9"
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>{emptyText}</CommandEmpty>
            
            {/* Pinned Options */}
            {pinnedOptions.length > 0 && (
              <CommandGroup heading="Most Common">
                {pinnedOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => {
                      console.log('SearchableSelect: Pinned option selected via onSelect:', option.value);
                      handleSelect(option.value);
                    }}
                    onMouseDown={(e) => {
                      // Prevent default to avoid focus issues but don't trigger selection here
                      e.preventDefault();
                      console.log('SearchableSelect: Pinned option mousedown:', option.value);
                    }}
                    className="cursor-pointer data-[disabled]:pointer-events-auto data-[disabled]:opacity-100 hover:bg-accent hover:text-accent-foreground min-h-[40px] py-2"
                    disabled={false}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="whitespace-nowrap">{option.label}</span>
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
                    value={option.value}
                    onSelect={() => {
                      console.log('SearchableSelect: Regular option selected via onSelect:', option.value);
                      handleSelect(option.value);
                    }}
                    onMouseDown={(e) => {
                      // Prevent default to avoid focus issues but don't trigger selection here
                      e.preventDefault();
                      console.log('SearchableSelect: Regular option mousedown:', option.value);
                    }}
                    className="cursor-pointer data-[disabled]:pointer-events-auto data-[disabled]:opacity-100 hover:bg-accent hover:text-accent-foreground min-h-[40px] py-2"
                    disabled={false}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="whitespace-nowrap">{option.label}</span>
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