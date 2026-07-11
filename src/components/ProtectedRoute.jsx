import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'

// Requires a logged-in account. Sends guests to /login and remembers where
// they were headed so login can bounce them back.
export default function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth()
  const location = useLocation()

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return children
}
