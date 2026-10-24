import { useParams } from 'react-router-dom'

export default function Controller() {
  const { room } = useParams()
  return <h1>Controller - room {room}</h1>
}
