import { BrowserRouter, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import GamePage from "./pages/GamePage";
import Controller from "./pages/ControllerPage";
import MemorialPage from "./pages/MemorialPage";
import Menu from "./pages/Menu";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/game/:room" element={<GamePage />} />
        <Route path="/play" element={<Controller />} />
        <Route path="/play/:room" element={<Controller />} />
        <Route path="/bricks" element={<MemorialPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
