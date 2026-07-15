import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import './index.css'
import App from './App'
import Landing from "./pages/Landing"
import Room from "./pages/Room"
import Signup from "./pages/Signup"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import NotFound from "./pages/NotFound"
import { ThemeProvider } from "./contexts/ThemeContext"

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element was not found')
}

createRoot(rootElement).render(
  <ThemeProvider>
    <Router>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Landing />} />
          <Route path="signup" element={<Signup />} />
          <Route path="login" element={<Login />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="room/:roomId" element={<Room />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  </ThemeProvider>,
)
