import {ComponentType} from 'react'
import {useLocation, useNavigate} from 'react-router'
import {Cpu, Database, Mail, Server} from 'lucide-react'
import {BaseDialog} from '@/shared/controls/dialogs/BaseDialog'
import {ListView} from '@/shared/controls/views/ListView'
import {ServerTab} from './settings/ServerTab'
import {RuntimeTab} from './settings/RuntimeTab'
import {DatabaseTab} from './settings/DatabaseTab'
import {InboxTab} from './settings/InboxTab'

type TabKey = 'server' | 'runtime' | 'database' | 'inbox'

interface TabItem {
  key: TabKey
  label: string
  icon: ComponentType<{ size?: number; className?: string }>
  Component: ComponentType
}

const TABS: TabItem[] = [
  {key: 'server', label: 'Server', icon: Server, Component: ServerTab},
  {key: 'runtime', label: 'Agent', icon: Cpu, Component: RuntimeTab},
  {key: 'inbox', label: 'Inbox', icon: Mail, Component: InboxTab},
  {key: 'database', label: 'Database', icon: Database, Component: DatabaseTab},
]

const DEFAULT_TAB: TabKey = 'server'

export function SettingsDialog() {
  const location = useLocation()
  const navigate = useNavigate()

  const params = new URLSearchParams(location.search)
  const open = params.has('settings')
  const raw = params.get('settings') ?? ''
  const activeKey: TabKey = TABS.some(t => t.key === raw) ? (raw as TabKey) : DEFAULT_TAB

  const setActiveKey = (key: TabKey) => {
    const next = new URLSearchParams(location.search)
    next.set('settings', key)
    navigate(`${location.pathname}?${next.toString()}${location.hash}`, {replace: true})
  }

  const onOpenChange = (next: boolean) => {
    if (next) return
    const nextParams = new URLSearchParams(location.search)
    nextParams.delete('settings')
    const search = nextParams.toString()
    navigate(`${location.pathname}${search ? `?${search}` : ''}${location.hash}`, {replace: true})
  }

  const ActiveComponent = TABS.find(t => t.key === activeKey)!.Component

  return (
    <BaseDialog open={open} onOpenChange={onOpenChange} title="Settings" width="w-[810px]">
      <div className="flex h-[600px]">
        <div className="w-[208px] shrink-0 border-r border-frame-lighter px-1 py-3 overflow-y-auto bg-panel-lighter">
          <ListView
            items={TABS}
            getItemKey={t => t.key}
            onSelectItem={t => setActiveKey(t.key)}
            renderItem={t => {
              const Icon = t.icon
              const isActive = t.key === activeKey
              return (
                <button
                  className={`flex items-center gap-2 w-full px-3 py-2 text-left rounded-md ${isActive ? 'text-action hovered' : 'text-label-dark hoverable'}`}
                >
                  <Icon size={16} className="shrink-0"/>
                  <span className="flex-1 text-base text-label-darker">{t.label}</span>
                </button>
              )
            }}
          />
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <ActiveComponent/>
        </div>
      </div>
    </BaseDialog>
  )
}
