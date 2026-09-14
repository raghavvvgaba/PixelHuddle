import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import './index.css'
import App from './App'
import Landing from "./pages/Landing"
import Office from "./pages/Office"
import Invitation from "./pages/Invitation"
import Signup from "./pages/Signup"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import NotFound from "./pages/NotFound"
import ProtectedRoute from "./components/ProtectedRoute"
import { ThemeProvider } from "./contexts/ThemeContext"

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element was not found')
}

createRoot(rootElement).render(
  <ThemeProvider>
    <Router>
      <Routes>
        {/* Landing gets its own full-width shell — no sidebar */}
        <Route path="/" element={<Landing />} />
        {/* All inner pages use App layout (with AppSidebar) */}
        <Route element={<App />}>
          <Route path="signup" element={<Signup />} />
          <Route path="login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="offices/:officeSlug" element={<Office />} />
            <Route path="invitations/:token" element={<Invitation />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  </ThemeProvider>,
)
