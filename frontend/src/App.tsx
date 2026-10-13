import { Navigate, Route, Routes } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { Backdrop } from './components/Backdrop'
import { GuestOnly, RequireAuth } from './components/RequireAuth'
import { Dashboard } from './pages/Dashboard'
import { Landing } from './pages/Landing'
import { LibraryPage } from './pages/LibraryPage'
import { Login } from './pages/Login'
import { Register } from './pages/Register'

export default function App() {
  return (
    <>
      <Backdrop />
      <Routes>
        <Route path="/" element={<GuestOnly><Landing /></GuestOnly>} />
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="films" element={<LibraryPage kind="FILM" />} />
          <Route path="anime" element={<LibraryPage kind="ANIME" />} />
          <Route path="games" element={<LibraryPage kind="GAME" />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
