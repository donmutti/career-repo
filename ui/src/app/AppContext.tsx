import {createContext, useContext} from 'react'

interface SystemStatus {
  profile_exists: boolean
  version: string
  db_ok?: boolean
  active_agent_runs: number
}

interface AppContextValue {
  status: SystemStatus
  isLoading: boolean
}

export const AppContext = createContext<AppContextValue>({} as AppContextValue)

export function useAppContext() {
  return useContext(AppContext)
}
