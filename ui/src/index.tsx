import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {createBrowserRouter, RouterProvider} from 'react-router'
import {AppRoutes} from './app/AppRoutes'
import {DateFormatProvider} from './shared/context/DateFormatContext'
import './index.css'

const router = createBrowserRouter(AppRoutes)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DateFormatProvider>
      <RouterProvider router={router}/>
    </DateFormatProvider>
  </StrictMode>
)
