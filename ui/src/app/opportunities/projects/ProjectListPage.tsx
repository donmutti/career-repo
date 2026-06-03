import {useEffect} from 'react'
import {useOutletContext} from 'react-router'
import {EmptyState} from '@/shared/controls/views/EmptyState'
import {Folder} from 'lucide-react'
import type {OpportunityContext} from '@/app/opportunities/OpportunityPage'

export default function ProjectListPage() {
  const {setActiveType} = useOutletContext<OpportunityContext>()
  useEffect(() => { setActiveType('project'); return () => setActiveType(null) }, [setActiveType])
  return <EmptyState icon={Folder} title="Projects" description="Coming soon"/>
}
