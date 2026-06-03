import {useEffect} from 'react'
import {useOutletContext} from 'react-router'
import {EmptyState} from '@/shared/controls/views/EmptyState'
import {BookOpen} from 'lucide-react'
import type {OpportunityContext} from '@/app/opportunities/OpportunityPage'

export default function LearningListPage() {
  const {setActiveType} = useOutletContext<OpportunityContext>()
  useEffect(() => { setActiveType('learning'); return () => setActiveType(null) }, [setActiveType])
  return <EmptyState icon={BookOpen} title="Learning" description="Coming soon"/>
}
