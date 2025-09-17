'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

interface AddressSuggestion {
  address: string
  city: string
  state: string
  zip_code: string
  formatted_address: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (address: string) => void
  onAddressSelect: (suggestion: AddressSuggestion) => void
  error?: string
  placeholder?: string
  id?: string
}

// Mock geocoding service - in production, you'd use a real service like Google Places API
const mockGeocodingService = async (query: string): Promise<AddressSuggestion[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // Comprehensive mock data for common addresses
  const mockAddresses: AddressSuggestion[] = [
    // Austin, TX addresses
    {
      address: "123 Main Street",
      city: "Austin",
      state: "TX",
      zip_code: "78701",
      formatted_address: "123 Main Street, Austin, TX 78701"
    },
    {
      address: "456 Oak Avenue",
      city: "Austin",
      state: "TX",
      zip_code: "78702",
      formatted_address: "456 Oak Avenue, Austin, TX 78702"
    },
    {
      address: "789 Pine Street",
      city: "Austin",
      state: "TX",
      zip_code: "78703",
      formatted_address: "789 Pine Street, Austin, TX 78703"
    },
    {
      address: "1000 Congress Avenue",
      city: "Austin",
      state: "TX",
      zip_code: "78701",
      formatted_address: "1000 Congress Avenue, Austin, TX 78701"
    },
    {
      address: "2000 Guadalupe Street",
      city: "Austin",
      state: "TX",
      zip_code: "78705",
      formatted_address: "2000 Guadalupe Street, Austin, TX 78705"
    },
    {
      address: "3000 South Lamar Boulevard",
      city: "Austin",
      state: "TX",
      zip_code: "78704",
      formatted_address: "3000 South Lamar Boulevard, Austin, TX 78704"
    },
    {
      address: "4000 Burnet Road",
      city: "Austin",
      state: "TX",
      zip_code: "78757",
      formatted_address: "4000 Burnet Road, Austin, TX 78757"
    },
    {
      address: "5000 West Anderson Lane",
      city: "Austin",
      state: "TX",
      zip_code: "78757",
      formatted_address: "5000 West Anderson Lane, Austin, TX 78757"
    },
    {
      address: "6000 East Riverside Drive",
      city: "Austin",
      state: "TX",
      zip_code: "78741",
      formatted_address: "6000 East Riverside Drive, Austin, TX 78741"
    },
    {
      address: "7000 North Lamar Boulevard",
      city: "Austin",
      state: "TX",
      zip_code: "78752",
      formatted_address: "7000 North Lamar Boulevard, Austin, TX 78752"
    },
    // Dallas, TX addresses
    {
      address: "1000 Commerce Street",
      city: "Dallas",
      state: "TX",
      zip_code: "75201",
      formatted_address: "1000 Commerce Street, Dallas, TX 75201"
    },
    {
      address: "2000 Main Street",
      city: "Dallas",
      state: "TX",
      zip_code: "75201",
      formatted_address: "2000 Main Street, Dallas, TX 75201"
    },
    {
      address: "3000 McKinney Avenue",
      city: "Dallas",
      state: "TX",
      zip_code: "75204",
      formatted_address: "3000 McKinney Avenue, Dallas, TX 75204"
    },
    {
      address: "4000 Greenville Avenue",
      city: "Dallas",
      state: "TX",
      zip_code: "75206",
      formatted_address: "4000 Greenville Avenue, Dallas, TX 75206"
    },
    // New York, NY addresses
    {
      address: "2000 Broadway",
      city: "New York",
      state: "NY",
      zip_code: "10023",
      formatted_address: "2000 Broadway, New York, NY 10023"
    },
    {
      address: "1000 5th Avenue",
      city: "New York",
      state: "NY",
      zip_code: "10028",
      formatted_address: "1000 5th Avenue, New York, NY 10028"
    },
    {
      address: "500 Park Avenue",
      city: "New York",
      state: "NY",
      zip_code: "10022",
      formatted_address: "500 Park Avenue, New York, NY 10022"
    },
    {
      address: "1500 Madison Avenue",
      city: "New York",
      state: "NY",
      zip_code: "10029",
      formatted_address: "1500 Madison Avenue, New York, NY 10029"
    },
    // Los Angeles, CA addresses
    {
      address: "3000 Sunset Boulevard",
      city: "Los Angeles",
      state: "CA",
      zip_code: "90028",
      formatted_address: "3000 Sunset Boulevard, Los Angeles, CA 90028"
    },
    {
      address: "1000 Wilshire Boulevard",
      city: "Los Angeles",
      state: "CA",
      zip_code: "90017",
      formatted_address: "1000 Wilshire Boulevard, Los Angeles, CA 90017"
    },
    {
      address: "2000 Santa Monica Boulevard",
      city: "Los Angeles",
      state: "CA",
      zip_code: "90404",
      formatted_address: "2000 Santa Monica Boulevard, Los Angeles, CA 90404"
    },
    // Chicago, IL addresses
    {
      address: "4000 Michigan Avenue",
      city: "Chicago",
      state: "IL",
      zip_code: "60611",
      formatted_address: "4000 Michigan Avenue, Chicago, IL 60611"
    },
    {
      address: "1000 North State Street",
      city: "Chicago",
      state: "IL",
      zip_code: "60610",
      formatted_address: "1000 North State Street, Chicago, IL 60610"
    },
    {
      address: "2000 West Chicago Avenue",
      city: "Chicago",
      state: "IL",
      zip_code: "60622",
      formatted_address: "2000 West Chicago Avenue, Chicago, IL 60622"
    },
    // Atlanta, GA addresses
    {
      address: "5000 Peachtree Street",
      city: "Atlanta",
      state: "GA",
      zip_code: "30309",
      formatted_address: "5000 Peachtree Street, Atlanta, GA 30309"
    },
    {
      address: "1000 Peachtree Road",
      city: "Atlanta",
      state: "GA",
      zip_code: "30309",
      formatted_address: "1000 Peachtree Road, Atlanta, GA 30309"
    },
    {
      address: "2000 Piedmont Road",
      city: "Atlanta",
      state: "GA",
      zip_code: "30324",
      formatted_address: "2000 Piedmont Road, Atlanta, GA 30324"
    },
    // Houston, TX addresses
    {
      address: "1000 Main Street",
      city: "Houston",
      state: "TX",
      zip_code: "77002",
      formatted_address: "1000 Main Street, Houston, TX 77002"
    },
    {
      address: "2000 Westheimer Road",
      city: "Houston",
      state: "TX",
      zip_code: "77098",
      formatted_address: "2000 Westheimer Road, Houston, TX 77098"
    },
    {
      address: "3000 Kirby Drive",
      city: "Houston",
      state: "TX",
      zip_code: "77098",
      formatted_address: "3000 Kirby Drive, Houston, TX 77098"
    },
    // San Francisco, CA addresses
    {
      address: "1000 Market Street",
      city: "San Francisco",
      state: "CA",
      zip_code: "94102",
      formatted_address: "1000 Market Street, San Francisco, CA 94102"
    },
    {
      address: "2000 California Street",
      city: "San Francisco",
      state: "CA",
      zip_code: "94109",
      formatted_address: "2000 California Street, San Francisco, CA 94109"
    },
    {
      address: "3000 Fillmore Street",
      city: "San Francisco",
      state: "CA",
      zip_code: "94123",
      formatted_address: "3000 Fillmore Street, San Francisco, CA 94123"
    }
  ]
  
  if (!query || query.length < 3) return []
  
  const searchQuery = query.toLowerCase().trim()
  console.log('Searching for:', searchQuery) // Debug log
  
  const results = mockAddresses.filter(addr => {
    const matches = 
      addr.formatted_address.toLowerCase().includes(searchQuery) ||
      addr.address.toLowerCase().includes(searchQuery) ||
      addr.city.toLowerCase().includes(searchQuery) ||
      addr.state.toLowerCase().includes(searchQuery) ||
      addr.zip_code.includes(searchQuery)
    
    if (matches) {
      console.log('Found match:', addr.formatted_address) // Debug log
    }
    
    return matches
  })
  
  console.log(`Found ${results.length} results for "${searchQuery}"`) // Debug log
  return results
}

export function AddressAutocomplete({ 
  value, 
  onChange, 
  onAddressSelect, 
  error, 
  placeholder = "123 Main Street",
  id = "address"
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (value.length >= 3) {
        setIsLoading(true)
        try {
          const results = await mockGeocodingService(value)
          setSuggestions(results)
          setShowSuggestions(true)
        } catch (error) {
          console.error('Error fetching address suggestions:', error)
          setSuggestions([])
        } finally {
          setIsLoading(false)
        }
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setSelectedIndex(-1)
  }

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    onChange(suggestion.formatted_address)
    onAddressSelect(suggestion)
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleBlur = (e: React.FocusEvent) => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false)
      setSelectedIndex(-1)
    }, 200)
  }

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          id={id}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={handleFocus}
          className={`input pr-10 ${error ? 'input-error' : ''}`}
          placeholder={placeholder}
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <MapPin className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.address}-${suggestion.zip_code}`}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ${
                index === selectedIndex ? 'bg-primary-50 border-l-4 border-primary-500' : ''
              } ${index === 0 ? 'rounded-t-lg' : ''} ${
                index === suggestions.length - 1 ? 'rounded-b-lg' : 'border-b border-gray-100'
              }`}
            >
              <div className="flex items-start">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {suggestion.address}
                  </div>
                  <div className="text-sm text-gray-500">
                    {suggestion.city}, {suggestion.state} {suggestion.zip_code}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showSuggestions && !isLoading && suggestions.length === 0 && value.length >= 3 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
          <div className="text-sm text-gray-500 text-center">
            <div className="mb-2">No exact matches found for "{value}"</div>
            <div className="text-xs text-gray-400">
              Try searching for: "Main Street", "Austin", "TX", or "78701"
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
