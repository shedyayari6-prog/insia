import { useState } from 'react'
import { PageHeader } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Feedback'
import { Tabs } from '@/components/ui/Tabs'
import FactsTab from './knowledge/FactsTab'
import QuestionsTab from './knowledge/QuestionsTab'
import InstructionsTab from './knowledge/InstructionsTab'
import VocabularyTab from './knowledge/VocabularyTab'
import CatalogTab from './knowledge/CatalogTab'

type TabId = 'facts' | 'catalog' | 'questions' | 'instructions' | 'vocabulary'
const TABS: { id: TabId; label: string }[] = [
  { id: 'facts', label: 'Business facts' },
  { id: 'catalog', label: 'Products & services' },
  { id: 'questions', label: 'Questions & answers' },
  { id: 'instructions', label: 'Instructions' },
  { id: 'vocabulary', label: 'Vocabulary' },
]

export default function KnowledgeCenter() {
  const [tab, setTab] = useState<TabId>('facts')
  return (
    <>
      <PageHeader title="Knowledge Center" description="What INSIA knows about your business. Only what you enter here is used." />
      <div className="mb-6">
        <Alert tone="info">Everything here is used by the chatbot engine. Try it in “Test your chatbot”. It is not connected to customers yet: channels and the website widget come in later phases.</Alert>
      </div>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'facts' && <FactsTab />}
      {tab === 'catalog' && <CatalogTab />}
      {tab === 'questions' && <QuestionsTab />}
      {tab === 'instructions' && <InstructionsTab />}
      {tab === 'vocabulary' && <VocabularyTab />}
    </>
  )
}
