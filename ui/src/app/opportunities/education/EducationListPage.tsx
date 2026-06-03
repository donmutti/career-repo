import {useEffect} from 'react'
import {useOutletContext} from 'react-router'
import {EmptyState} from '@/shared/controls/views/EmptyState'
import {GraduationCap} from 'lucide-react'
import type {OpportunityContext} from '@/app/opportunities/OpportunityPage'

export default function EducationListPage() {
  const {setActiveType} = useOutletContext<OpportunityContext>()
  useEffect(() => { setActiveType('education'); return () => setActiveType(null) }, [setActiveType])
  return <EmptyState icon={GraduationCap} title="Education" description="Coming soon"/>
}
