import {useState} from 'react'
import {useNavigate} from 'react-router'
import {useMutation} from '@tanstack/react-query'
import {Spinner} from '@/shared/controls/Spinner'
import {profile as profileApi} from '@/services/client'
import {queryClient} from '@/services/queryClient'
import {queryKeys} from '@/services/queryKeys'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [jobPreferences, setJobPreferences] = useState('')
  const [voiceSettings, setVoiceSettings] = useState('')

  const mutation = useMutation({
    mutationFn: () => profileApi.create({
      full_name: fullName,
      job_preferences: jobPreferences || undefined,
      voice_settings: voiceSettings,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: queryKeys.systemStatus})
      navigate('/profile')
    },
  })

  const canSubmit = fullName.trim().length > 0

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-panel-lighter p-6">
      <div className="w-full max-w-[480px] bg-panel-white rounded-[10px] overflow-hidden shade-md">
        <div className="px-8 pt-8 pb-7">
          <h1 className="text-xl font-semibold mb-1 text-label-darker">Career Repo</h1>
          <p className="text-label-medium mb-6">
            Let's set up your profile.
          </p>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="full_name">Full name</label>
              <input
                id="full_name"
                type="text"
                autoFocus
                placeholder="Jane Smith"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && canSubmit && mutation.mutate()}
                className="text-base px-3 py-2"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="job_preferences">Job preferences</label>
              <textarea
                id="job_preferences"
                placeholder="e.g., Remote-first, EU timezone, senior IC roles in distributed systems or platform engineering."
                value={jobPreferences}
                onChange={e => setJobPreferences(e.target.value)}
                rows={3}
                className="px-3 py-2 resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="voice_settings">Writing style</label>
              <textarea
                id="voice_settings"
                placeholder="e.g., Warm but professional. Concise. Avoid buzzwords. Close with 'Kind regards'."
                value={voiceSettings}
                onChange={e => setVoiceSettings(e.target.value)}
                rows={3}
                className="px-3 py-2 resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end px-8 py-4 border-t border-frame-lighter">
          <button
            className="primary"
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
          >
            {mutation.isPending ? <Spinner/> : 'Get started'}
          </button>
        </div>

        {mutation.isError && (
          <p className="px-8 pb-4 text-sm text-intent-danger m-0">
            Failed to create profile. Please try again.
          </p>
        )}
      </div>
    </div>
  )
}
