import { lazy, Suspense } from 'react'
import Descent from './features/descent/Descent'

// The admin portal is its own bundle; visitors never download it.
const Admin = lazy(() => import('./features/admin/Admin'))

export default function App() {
  if (window.location.pathname.startsWith('/admin')) {
    return (
      <Suspense fallback={null}>
        <Admin />
      </Suspense>
    )
  }
  return <Descent />
}
