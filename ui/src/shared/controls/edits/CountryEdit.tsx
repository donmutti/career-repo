import {useMemo} from 'react'
import {DropdownEdit} from './DropdownEdit'
import {COUNTRIES, countryFlag} from '@/shared/utils/Countries'

interface CountryEditProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
}

export function CountryEdit({value, onChange, placeholder = 'Search country…', autoFocus}: CountryEditProps) {
  const options = useMemo(() =>
    COUNTRIES.map(c => ({value: c.code, label: c.name, icon: countryFlag(c.code)})),
    []
  )

  return (
    <DropdownEdit
      value={value}
      options={options}
      placeholder={placeholder}
      onChange={onChange}
      filterMode="filter"
      autoFocus={autoFocus}
    />
  )
}
