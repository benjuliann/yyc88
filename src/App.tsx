import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Menu from './pages/Menu'
import GamePage from './pages/GamePage'
import Controller from './pages/ControllerPage'
import Bricks from './memorial/Bricks'
import AddBrick from './memorial/AddBrick'
import ModelTestPage from './pages/ModelTestPage'
import SkiJumpPage from './pages/SkiJumpPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/game/:room" element={<GamePage />} />
        <Route path="/play/:room" element={<Controller />} />
        <Route path="/bricks" element={<Bricks />} />
        <Route path="/bricks/add" element={<AddBrick />} />
        <Route path="/model-test" element={<ModelTestPage />} />
        <Route path="/jump" element={<SkiJumpPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
