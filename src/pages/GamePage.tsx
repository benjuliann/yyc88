import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import QRCode from 'react-qr-code'
import Logo from '../components/Logo'
import JoinRaceButton from '../components/JoinRaceButton'
import { MAX_PLAYERS, deleteRoom, startRace, watchPlayers, watchRoom, type Phase, type Player } from '../lib/room'
import PlazaCeremony from '../memorial/PlazaCeremony'
import { addBricks, type Brick } from '../memorial/bricks'
import SkiJumpPage from './SkiJumpPage'
import '../styles/game.css'

export default function GamePage() {
  const { room = '' } = useParams()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase | null | undefined>(undefined)
  const [players, setPlayers] = useState<Player[]>([])
  const [laid, setLaid] = useState<Brick[] | null>(null)

  useEffect(() => watchRoom(room, setPhase), [room])
  useEffect(() => watchPlayers(room, setPlayers), [room])

  const finish = async () => {
    try {
      await deleteRoom(room)
      navigate('/')
    } catch (err) {
      console.error(err)
      window.alert("Couldn't close the room. Try again.")
    }
  }

  const closeRoom = (question: string) => {
    if (window.confirm(question)) finish()
  }

  // Lays a brick for every racer, then shows the plaza ceremony.
  const endRace = async () => {
    if (players.length === 0) return finish()
    try {
      setLaid(await addBricks(players.map((player) => player.name)))
    } catch (err) {
      console.error(err)
      window.alert("Couldn't lay the bricks. Try again.")
    }
  }

  if (laid) return <PlazaCeremony laid={laid} onFinish={finish} />

  if (phase === undefined) return <main className="lobby" />
  if (phase === null) {
    return (
      <main className="lobby lobby--center">
        <p className="lobby__label">Room {room} doesn't exist.</p>
      </main>
    )
  }

  if (phase === 'playing') return <SkiJumpPage onFinish={endRace} contestants={players} />

  const host = window.location.host
  return (
    <main className="lobby">
      <header className="lobby__header">
        <Logo />
        <span className="lobby__count">
          {players.length} / {MAX_PLAYERS} players
        </span>
      </header>

      <section className="lobby__join">
        <div className="lobby__qr">
          <QRCode value={`${window.location.origin}/play/${room}`} size={160} />
        </div>
        <div>
          <p className="lobby__label">
            Join at <strong>{host}/play</strong> with code
          </p>
          <p className="lobby__code">{room}</p>
        </div>
      </section>

      {players.length === 0 ? (
        <p className="lobby__waiting">Waiting for players…</p>
      ) : (
        <ul className="lobby__players">
          {players.map((player) => (
            <li key={player.id} className="lobby__player">
              {player.name}
            </li>
          ))}
        </ul>
      )}

      <div className="lobby__actions">
        <JoinRaceButton
          variant="outline"
          label="Disband room"
          onClick={() => closeRoom('Disband this room? Everyone in it will be removed.')}
        />
        {players.length > 0 && <JoinRaceButton label="Start race" onClick={() => startRace(room)} />}
      </div>
    </main>
  )
}
