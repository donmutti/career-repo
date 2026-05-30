import {createContext, useContext} from 'react'
import {SidebarButton} from './Sidebar'
import {ActionIntent} from '@/shared/types'

interface SystemStatus {
  profile_exists: boolean
  version: string
  db_ok?: boolean
  active_agent_runs: number
}

interface AppContextValue {
  status: SystemStatus
  isLoading: boolean
  flashSidebarButton: (button: SidebarButton, intent: ActionIntent) => void
}

export const AppContext = createContext<AppContextValue>({} as AppContextValue)

export function useAppContext() {
  return useContext(AppContext)
}
