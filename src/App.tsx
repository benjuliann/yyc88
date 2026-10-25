import { BrowserRouter, Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import GamePage from './pages/GamePage'
import Controller from './pages/ControllerPage'
import MemorialPage from './pages/MemorialPage'
import ModelTestPage from './pages/ModelTestPage'
import SkiJumpPage from './pages/SkiJumpPage'
import ControllerTestPage from './pages/ControllerTestPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/game/:room" element={<GamePage />} />
        <Route path="/play" element={<Controller />} />
        <Route path="/play/:room" element={<Controller />} />
        <Route path="/bricks" element={<MemorialPage />} />
        <Route path="/model-test" element={<ModelTestPage />} />
        <Route path="/jump" element={<SkiJumpPage />} />
        <Route path="/controller-test/:room" element={<ControllerTestPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
