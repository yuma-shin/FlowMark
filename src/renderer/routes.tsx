import { createHashRouter, RouterProvider } from 'react-router-dom'

import { MainScreen } from './screens/main'
import { EditorScreen } from './screens/editor'
import { SettingsScreen } from './screens/settings'

const router = createHashRouter([
  { path: '/', element: <MainScreen /> },
  { path: '/editor', element: <EditorScreen /> },
  { path: '/settings', element: <SettingsScreen /> },
])

export function AppRoutes() {
  return <RouterProvider router={router} />
}
