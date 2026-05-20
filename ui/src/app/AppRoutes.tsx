import {lazy} from 'react'
import type {RouteObject} from 'react-router'
import {Navigate} from 'react-router'
import {App} from './App'

const OnboardingPage = lazy(() => import('./onboarding/OnboardingPage'))
const OpportunityPage = lazy(() => import('./opportunities/OpportunityPage'))
const JobListPage = lazy(() => import('./opportunities/jobs/JobListPage'))
const ProjectListPage = lazy(() => import('./opportunities/projects/ProjectListPage'))
const EducationListPage = lazy(() => import('./opportunities/education/EducationListPage'))
const NetworkingListPage = lazy(() => import('./opportunities/networking/NetworkingListPage'))
const LearningListPage = lazy(() => import('./opportunities/learning/LearningListPage'))
const InboxPage = lazy(() => import('./inbox/InboxPage'))
const InboxListPage = lazy(() => import('./inbox/InboxListPage'))
const ProfilePage = lazy(() => import('./profile/ProfilePage'))
const ProfileIdentityPage = lazy(() => import('./profile/ProfileIdentityPage'))
const ProfileWorkExperiencePage = lazy(() => import('./profile/ProfileWorkExperiencePage'))
const ResumeDetailPane = lazy(() => import('./profile/ProfileWorkExperiencePage').then(m => ({default: m.ResumeDetailPane})))
const WorkExperienceDetailPane = lazy(() => import('./profile/ProfileWorkExperiencePage').then(m => ({default: m.WorkExperienceDetailPane})))
const ProfileJobPreferencesPage = lazy(() => import('./profile/ProfileJobPreferencesPage'))
const ProfileVoiceSettingsPage = lazy(() => import('./profile/ProfileVoiceSettingsPage'))

export const AppRoutes: RouteObject[] = [
  {
    path: '/',
    element: <App/>,
    children: [
      {index: true, element: <Navigate to="/opportunities/jobs" replace/>},
      {path: 'onboarding', element: <OnboardingPage/>},
      {
        path: 'opportunities',
        element: <OpportunityPage/>,
        children: [
          {index: true, element: <Navigate to="jobs" replace/>},
          {path: 'jobs', element: <JobListPage/>},
          {path: 'jobs/:id', element: <JobListPage/>},
          {path: 'projects', element: <ProjectListPage/>},
          {path: 'education', element: <EducationListPage/>},
          {path: 'networking', element: <NetworkingListPage/>},
          {path: 'learning', element: <LearningListPage/>},
        ],
      },
      {
        path: 'inbox',
        element: <InboxPage/>,
        children: [
          {index: true, element: <InboxListPage/>},
          {path: ':id', element: <InboxListPage/>},
        ],
      },
      {
        path: 'profile',
        element: <ProfilePage/>,
        children: [
          {index: true, element: <Navigate to="info" replace/>},
          {path: 'info', element: <ProfileIdentityPage/>},
          {
            path: 'work-experience',
            element: <ProfileWorkExperiencePage/>,
            children: [
              {index: true, element: <Navigate to="resume" replace/>},
              {path: 'resume', element: <ResumeDetailPane/>},
              {path: ':id', element: <WorkExperienceDetailPane/>},
            ],
          },
          {path: 'job-preferences', element: <ProfileJobPreferencesPage/>},
          {path: 'voice-settings', element: <ProfileVoiceSettingsPage/>},
        ],
      },
      {path: '*', element: <Navigate to="/opportunities/jobs" replace/>},
    ],
  },
  {path: '*', element: <Navigate to="/onboarding" replace/>},
]
