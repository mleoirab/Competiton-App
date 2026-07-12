import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function Layout() {
  const { isLoggedIn, user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="app">
      <header className="topbar">
        <Link to={isLoggedIn ? '/dashboard' : '/'} className="brand">
          <span className="brand-icon">🏆</span>
          <span className="brand-name">Competition Manager</span>
        </Link>
        <nav className="nav">
          {isLoggedIn ? (
            <>
              <NavLink to="/dashboard">My competitions</NavLink>
              <NavLink to="/new" className="nav-cta">New competition</NavLink>
              <button className="link-btn" onClick={handleLogout} title={user?.username}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/join">Join a competition</NavLink>
              <NavLink to="/login" className="nav-cta">Host log in</NavLink>
            </>
          )}
        </nav>
      </header>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
