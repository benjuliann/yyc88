import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import QRCode from 'react-qr-code'
import Logo from '../components/Logo'
import JoinRaceButton from '../components/JoinRaceButton'
import { deleteRoom, startRace, watchPlayers, watchRoom, type Phase, type Player } from '../lib/room'
import '../styles/game.css'

export default function GamePage() {
  const { room = '' } = useParams()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase | null | undefined>(undefined)
  const [players, setPlayers] = useState<Player[]>([])

  useEffect(() => watchRoom(room, setPhase), [room])
  useEffect(() => watchPlayers(room, setPlayers), [room])

  const closeRoom = async (question: string) => {
    if (!window.confirm(question)) return
    try {
      await deleteRoom(room)
      navigate('/')
    } catch (err) {
      console.error(err)
      window.alert("Couldn't close the room. Try again.")
    }
  }

  if (phase === undefined) return <main className="lobby" />
  if (phase === null) {
    return (
      <main className="lobby lobby--center">
        <p className="lobby__label">Room {room} doesn't exist.</p>
      </main>
    )
  }

  if (phase === 'playing') {
    // TODO: mount the ski jump game here.
    return (
      <main className="lobby lobby--center">
        <p className="lobby__code">Race on!</p>
        <div className="lobby__actions">
          <JoinRaceButton variant="outline" label="End race" onClick={() => closeRoom('End the race and close this room?')} />
        </div>
      </main>
    )
  }

  const host = window.location.host
  return (
    <main className="lobby">
      <header className="lobby__header">
        <Logo />
        <span className="lobby__count">
          {players.length} {players.length === 1 ? 'player' : 'players'}
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
