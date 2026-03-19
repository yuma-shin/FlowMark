import { createHashRouter, RouterProvider } from 'react-router-dom'

import { MainScreen } from './screens/main'
import { EditorScreen } from './screens/editor'

const router = createHashRouter([
  { path: '/', element: <MainScreen /> },
  { path: '/editor', element: <EditorScreen /> },
])

export function AppRoutes() {
  return <RouterProvider router={router} />
}
