import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Menu from './pages/Menu'
import GamePage from './pages/GamePage'
import Controller from './pages/Controller'
import Bricks from './pages/Bricks'
import AddBrick from './pages/AddBrick'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/game/:room" element={<GamePage />} />
        <Route path="/play/:room" element={<Controller />} />
        <Route path="/bricks" element={<Bricks />} />
        <Route path="/bricks/add" element={<AddBrick />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
