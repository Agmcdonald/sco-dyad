import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
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

export interface ComboboxOption {
  label: string
  value: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  allowCustomValue?: boolean
  searchPlaceholder?: string
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  emptyText = "No option found.",
  className,
  disabled = false,
  allowCustomValue = true,
  searchPlaceholder,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  const selectedOption = options.find((option) => option.value === value)
  
  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options;
    
    return options.filter(option =>
      option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
      option.value.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [options, searchValue]);

  // Check if current value is a custom value (not in options)
  const isCustomValue = value && !options.find(option => option.value === value);

  const handleSelect = (selectedValue: string) => {
    const newValue = selectedValue === value ? "" : selectedValue;
    onValueChange?.(newValue);
    setOpen(false);
    setSearchValue("");
  };

  const handleCustomValue = () => {
    if (searchValue && allowCustomValue) {
      onValueChange?.(searchValue);
      setOpen(false);
      setSearchValue("");
    }
  };

  const clearValue = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange?.("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : (isCustomValue ? value : placeholder)}
          </span>
          <div className="flex items-center gap-1">
            {value && (
              <X 
                className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100" 
                onClick={clearValue}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={searchPlaceholder || `Search ${placeholder.toLowerCase()}...`}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {filteredOptions.length === 0 && !searchValue && (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            
            {filteredOptions.length === 0 && searchValue && allowCustomValue && (
              <CommandItem onSelect={handleCustomValue} className="text-muted-foreground">
                Create "{searchValue}"
              </CommandItem>
            )}
            
            {filteredOptions.length === 0 && searchValue && !allowCustomValue && (
              <CommandEmpty>No results found for "{searchValue}"</CommandEmpty>
            )}
            
            {filteredOptions.length > 0 && (
              <CommandGroup>
                {searchValue && allowCustomValue && !filteredOptions.find(opt => opt.value === searchValue) && (
                  <CommandItem onSelect={handleCustomValue} className="text-muted-foreground border-b">
                    Create "{searchValue}"
                  </CommandItem>
                )}
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={handleSelect}
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