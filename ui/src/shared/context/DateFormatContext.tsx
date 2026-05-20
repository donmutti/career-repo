import {createContext, ReactNode, useContext, useState} from 'react'

interface DateFormatContextValue {
  absolute: boolean
  toggle: () => void
}

const DateFormatContext = createContext<DateFormatContextValue>({
  absolute: false,
  toggle: () => {},
})

export function DateFormatProvider({children}: { children: ReactNode }) {
  const [absolute, setAbsolute] = useState(() => localStorage.getItem('dateFormat') === 'absolute')

  function toggle() {
    setAbsolute(v => {
      const next = !v
      localStorage.setItem('dateFormat', next ? 'absolute' : 'relative')
      return next
    })
  }

  return (
    <DateFormatContext.Provider value={{absolute, toggle}}>
      {children}
    </DateFormatContext.Provider>
  )
}

export function useDateFormat() {
  return useContext(DateFormatContext)
}
