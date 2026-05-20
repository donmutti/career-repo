import {NavLink, Outlet} from 'react-router'
import {useMutation, useQuery} from '@tanstack/react-query'
import {Briefcase, CircleUser, Feather, SlidersHorizontal} from 'lucide-react'
import {ComponentType, useState} from 'react'
import {queryKeys} from '@/services/queryKeys'
import {profile as profileApi} from '@/services/client'
import {queryClient} from '@/services/queryClient'
import {PaneBody, PaneResizeHandle, Panes} from '@/shared/controls/panes/Panes'
import {ListView} from '@/shared/controls/views/ListView'
import {LocalStorageUtils} from '@/shared/utils/LocalStorageUtils'
import {AvatarUpload} from './AvatarUpload'

type Section = 'info' | 'work-experience' | 'job-preferences' | 'voice-settings'

interface SectionItem {
  key: Section
  label: string
  icon: ComponentType<{ size?: number; className?: string }>
}

const SECTIONS: SectionItem[] = [
  {key: 'info', label: 'About', icon: CircleUser},
  {key: 'work-experience', label: 'Work experience', icon: Briefcase},
  {key: 'job-preferences', label: 'Job preferences', icon: SlidersHorizontal},
  {key: 'voice-settings', label: 'Writing style', icon: Feather},
]

interface ProfileVersion {
  full_name: string
  avatar_file_name?: string
}

interface ProfileData {
  id: string
  active_version: ProfileVersion
}

export default function ProfilePage() {
  const [listWidth, setListWidth] = useState(() => LocalStorageUtils.get('pane.profile.list', 240))

  const {data: profileData} = useQuery({
    queryKey: queryKeys.profile,
    queryFn: profileApi.get,
  })

  const pd = profileData as ProfileData | undefined
  const fullName = pd?.active_version?.full_name ?? 'Profile'
  const avatarFileName = pd?.active_version?.avatar_file_name

  const avatarMutation = useMutation({
    mutationFn: (file: File) => profileApi.uploadAvatar(file),
    onSuccess: () => queryClient.invalidateQueries({queryKey: queryKeys.profile}),
  })

  return (
    <Panes>
      {/* Left pane */}
      <div className="flex flex-col overflow-hidden shrink-0 min-w-[200px]" style={{width: listWidth}}>
        <PaneBody>
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3 py-6 px-4">
            <AvatarUpload
              avatarFileName={avatarFileName}
              onUpload={file => avatarMutation.mutate(file)}
              onClear={() => profileApi.patch({avatar_file_name: null}).then(() => queryClient.invalidateQueries({queryKey: queryKeys.profile}))}
              isUploading={avatarMutation.isPending}
            />
            <span className="text-xl font-semibold text-label-darker text-center one-liner w-full">{fullName}</span>
          </div>

          {/* Section list */}
          <div className="py-2 px-1">
            <ListView
              items={SECTIONS}
              getItemKey={(s) => s.key}
              renderItem={(s) => {
                const Icon = s.icon
                return (
                  <NavLink
                    to={`/profile/${s.key}`}
                    end={false}
                    className={({isActive}) => `no-underline flex items-center gap-2 w-full px-3 py-2 text-left rounded-md ${isActive ? 'text-action hovered' : 'text-label-dark hoverable'}`}
                  >
                    <Icon size={16} className="shrink-0"/>
                    <span className="flex-1 text-base text-label-darker">{s.label}</span>
                  </NavLink>
                )
              }}
            />
          </div>
        </PaneBody>
      </div>

      <PaneResizeHandle onResize={(d) => setListWidth(w => {
        const n = Math.max(200, w + d)
        LocalStorageUtils.set('pane.profile.list', n)
        return n
      })}/>

      {/* Detail pane */}
      <div className="flex-1 flex overflow-hidden bg-panel-white">
        <Outlet/>
      </div>
    </Panes>
  )
}
