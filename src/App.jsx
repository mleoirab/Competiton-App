import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import CreateCompetition from './pages/CreateCompetition'
import JoinCompetition from './pages/JoinCompetition'

import CompetitionLayout from './pages/competition/CompetitionLayout'
import Standings from './pages/competition/Standings'
import Fixtures from './pages/competition/Fixtures'
import Teams from './pages/competition/Teams'

import ManageDashboard from './pages/competition/manage/ManageDashboard'
import ManageTeams from './pages/competition/manage/ManageTeams'
import ManagePlayers from './pages/competition/manage/ManagePlayers'
import ManageGames from './pages/competition/manage/ManageGames'
import ManageFixtures from './pages/competition/manage/ManageFixtures'
import ManageAdmins from './pages/competition/manage/ManageAdmins'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Home + player join (no account) */}
        <Route path="/" element={<Landing />} />
        <Route path="/join" element={<JoinCompetition />} />

        {/* Host accounts */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/new" element={<ProtectedRoute><CreateCompetition /></ProtectedRoute>} />

        {/* A competition, addressed by its player code */}
        <Route path="/c/:code" element={<CompetitionLayout />}>
          <Route index element={<Standings />} />
          <Route path="fixtures" element={<Fixtures />} />
          <Route path="teams" element={<Teams />} />

          {/* Admin-only (guarded inside the layout) */}
          <Route path="manage" element={<ManageDashboard />} />
          <Route path="manage/teams" element={<ManageTeams />} />
          <Route path="manage/players" element={<ManagePlayers />} />
          <Route path="manage/games" element={<ManageGames />} />
          <Route path="manage/fixtures" element={<ManageFixtures />} />
          <Route path="manage/admins" element={<ManageAdmins />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
