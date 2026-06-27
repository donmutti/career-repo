import {useMutation, useQuery} from '@tanstack/react-query'
import {settings, GeneralSettings} from '@/services/client'
import {queryKeys} from '@/services/queryKeys'
import {queryClient} from '@/services/queryClient'
import {DropdownEdit} from '@/shared/controls/edits/DropdownEdit'
import {Spinner} from '@/shared/controls/Spinner'

const DEFAULT_VALUE = '__default__'

export function RuntimeTab() {
  const {data, isLoading} = useQuery({
    queryKey: queryKeys.settingsGeneral,
    queryFn: settings.general.get,
  })

  const updateModel = useMutation({
    mutationFn: (model: string | null) => settings.general.update({model}),
    onSuccess: next => queryClient.setQueryData<GeneralSettings>(queryKeys.settingsGeneral, next),
  })

  if (isLoading || !data) return <div className="flex justify-center p-6"><Spinner/></div>

  const isOnline = data.claude_code_status === 'online'

  const options = [
    {value: DEFAULT_VALUE, label: 'Default'},
    ...data.available_models.map(m => ({value: m, label: m})),
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md bg-panel-lightest p-4 flex flex-col gap-3">
        <Row label="Status">
          <span className={`inline-flex items-center gap-2 ${isOnline ? 'text-intent-success' : 'text-label-medium'}`}>
            <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-intent-success' : 'bg-frame-medium'}`}/>
            {isOnline ? 'Connected' : 'Not connected'}
          </span>
        </Row>

        <Row label="Agent">
          <span className="text-label-darker">Claude Code</span>
        </Row>

        <Row label="Model">
          <div className="w-[240px]">
            <DropdownEdit
              value={data.model ?? DEFAULT_VALUE}
              options={options}
              placeholder="Select model"
              selectOnly
              filterMode="jump"
              onChange={v => updateModel.mutate(v === DEFAULT_VALUE ? null : v)}
            />
          </div>
        </Row>
      </div>
    </div>
  )
}

function Row({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div className="flex items-center justify-between min-h-[32px]">
      <span className="text-label-darker">{label}</span>
      {children}
    </div>
  )
}
