import { AnimatePresence } from 'motion/react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import FadePage from './components/FadePage'
import LandingPage from './pages/LandingPage'
import GamePage from './pages/GamePage'
import Controller, { CustomizeSkier } from './pages/ControllerPage'
import MemorialPage from './pages/MemorialPage'
import ModelTestPage from './pages/ModelTestPage'
import SkiJumpPage from './pages/SkiJumpPage'
import ControllerTestPage from './pages/ControllerTestPage'

function AppRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<FadePage><LandingPage /></FadePage>} />
        <Route path="/game/:room" element={<GamePage />} />
        <Route path="/play" element={<Controller />} />
        <Route path="/play/:room" element={<Controller />} />
        <Route path="/play/:room/customize" element={<CustomizeSkier />} />
        <Route path="/bricks" element={<FadePage><MemorialPage /></FadePage>} />
        <Route path="/model-test" element={<ModelTestPage />} />
        <Route path="/jump" element={<SkiJumpPage />} />
        <Route path="/controller-test/:room" element={<ControllerTestPage />} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
