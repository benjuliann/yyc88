import { useParams } from 'react-router-dom'

export default function GamePage() {
  const { room } = useParams()
  return <h1>Ski Jump - room {room}</h1>
}
