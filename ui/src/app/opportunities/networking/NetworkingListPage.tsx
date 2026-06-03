import {useEffect} from 'react'
import {useOutletContext} from 'react-router'
import {EmptyState} from '@/shared/controls/views/EmptyState'
import {Users} from 'lucide-react'
import type {OpportunityContext} from '@/app/opportunities/OpportunityPage'

export default function NetworkingListPage() {
  const {setActiveType} = useOutletContext<OpportunityContext>()
  useEffect(() => { setActiveType('networking'); return () => setActiveType(null) }, [setActiveType])
  return <EmptyState icon={Users} title="Networking" description="Coming soon"/>
}
