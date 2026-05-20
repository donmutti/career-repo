import {Suspense} from 'react'
import {ToastContainer} from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import {Navigate, Outlet, ScrollRestoration, useLocation} from 'react-router'
import {QueryClientProvider, useQuery} from '@tanstack/react-query'
import * as RadixTooltip from '@radix-ui/react-tooltip'
import {queryClient} from '@/services/queryClient'
import {AppContext} from './AppContext'
import {Sidebar} from './Sidebar'
import {system} from '@/services/client'
import {queryKeys} from '@/services/queryKeys'
import {Spinner} from '@/shared/controls/Spinner'

function FullScreenSpinner() {
  return (
    <div className="h-screen flex items-center justify-center bg-panel-lighter">
      <Spinner/>
    </div>
  )
}

function AppShell() {
  const location = useLocation()
  const {data: status, isLoading} = useQuery({
    queryKey: queryKeys.systemStatus,
    queryFn: system.status,
  })

  if (isLoading || !status) return <FullScreenSpinner/>

  if (location.pathname === '/onboarding') {
    if (status.profile_exists) return <Navigate to="/" replace/>
    return (
      <Suspense fallback={<FullScreenSpinner/>}>
        <Outlet/>
      </Suspense>
    )
  }

  if (!status.profile_exists) return <Navigate to="/onboarding" replace/>

  return (
    <AppContext.Provider value={{status, isLoading}}>
      <ScrollRestoration/>
      <div className="flex h-screen overflow-hidden">
        <Sidebar/>
        <main className="flex-1 overflow-hidden flex flex-col">
          <Suspense fallback={<FullScreenSpinner/>}>
            <Outlet/>
          </Suspense>
        </main>
      </div>
    </AppContext.Provider>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RadixTooltip.Provider>
        <AppShell/>
        <ToastContainer position="bottom-center" autoClose={3000} theme="colored" hideProgressBar/>
      </RadixTooltip.Provider>
    </QueryClientProvider>
  )
}
