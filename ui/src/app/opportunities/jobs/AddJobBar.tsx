import {useState} from 'react'
import {useNavigate} from 'react-router'
import {InlineEdit} from '@/shared/controls/edits/InlineEdit'
import {useOpportunities} from '@/app/opportunities/useOpportunities'
import {ApiError, opportunities as opApi} from '@/services/client'
import {queryClient} from '@/services/queryClient'
import {queryKeys} from '@/services/queryKeys'
import {toastInfo} from '@/shared/utils/ToastUtils'

export function AddJobBar() {
  const navigate = useNavigate()
  const {createMutation} = useOpportunities()
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)

  function handleSubmit(v: string) {
    if (!v.trim()) return
    createMutation.mutate(v, {
      onSuccess: (data: unknown) => {
        setValue('')
        setFocused(false)
        const id = (data as {id?: string})?.id
        if (id) {
          navigate(`/opportunities/jobs/${id}`)
          opApi.source(id).then(() => {
            queryClient.invalidateQueries({queryKey: queryKeys.opportunities})
          })
        }
      },
      onError: (error: unknown) => {
        if (error instanceof ApiError && error.status === 409) {
          const id = (error.details as {id?: string})?.id
          if (id) {
            setValue('')
            setFocused(false)
            navigate(`/opportunities/jobs/${id}`)
            toastInfo('Already in your list')
          }
        }
      },
    })
  }

  return (
    <div className="h-14 flex items-center px-3">
      <div className={`flex-1 rounded ${focused ? 'bg-transparent' : 'bg-panel-lightest'}`}>
        <InlineEdit
          value={value}
          placeholder="+ Add job opportunity"
          allowEmpty
          submitOnBlur={false}
          onSubmit={handleSubmit}
          className="pl-4"
          onFocusChange={setFocused}
        />
      </div>
    </div>
  )
}
