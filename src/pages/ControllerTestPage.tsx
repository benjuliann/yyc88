import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { watchPlayers, type Player } from '../lib/room'
import { watchInput } from '../lib/input'
import '../styles/game.css'

type Event = { playerId: string; key: string; at: number; tilt?: number; lag: number }
type Reading = { tilt: number; up: boolean }

// Dev page: proves the phone → screen round trip. The lobby sends the host here when the race starts.
export default function ControllerTestPage() {
  const { room = '' } = useParams()
  const [players, setPlayers] = useState<Player[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [readings, setReadings] = useState<Record<string, Reading>>({})

  useEffect(() => watchPlayers(room, setPlayers), [room])
  useEffect(
    () =>
      watchInput(room, (playerId, input) => {
        setEvents((list) => [{ playerId, ...input, lag: Date.now() - input.at }, ...list].slice(0, 15))

        const update = (change: Partial<Reading>) =>
          setReadings((all) => ({ ...all, [playerId]: { ...(all[playerId] ?? { tilt: 0, up: false }), ...change } }))
        if (input.key === 'tilt') update({ tilt: input.tilt ?? 0 })
        if (input.key === 'jump') {
          update({ up: true })
          setTimeout(() => update({ up: false }), 300) // a jump is a moment, so flash it
        }
      }),
    [room],
  )

  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id
  return (
    <main className="lobby">
      <p className="lobby__code">{room}</p>
      <p className="lobby__label">Players: {players.map((p) => p.name).join(', ') || 'none'}</p>

      {players.map((p) => {
        const { tilt, up } = readings[p.id] ?? { tilt: 0, up: false }
        return (
          <div key={p.id} className="lobby__label" style={{ margin: '16px 0' }}>
            <strong>{p.name}</strong>
            <Meter label="Left" value={Math.max(0, -tilt)} />
            <Meter label="Right" value={Math.max(0, tilt)} />
            <Meter label="Up" value={up ? 1 : 0} />
          </div>
        )
      })}

      <ul className="lobby__label">
        {events.map((e) => (
          <li key={`${e.playerId}-${e.at}`}>
            {new Date(e.at).toLocaleTimeString()} · {nameOf(e.playerId)} · {e.key}{e.tilt != null && ` ${e.tilt}`} · {e.lag} ms
          </li>
        ))}
      </ul>
    </main>
  )
}

// A labelled bar filled from 0 to 1, with the value printed beside it.
function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
      <span style={{ width: 48 }}>{label}</span>
      <div style={{ width: 200, height: 12, borderRadius: 6, background: 'rgba(244, 236, 224, 0.15)' }}>
        <div style={{ width: `${value * 100}%`, height: '100%', borderRadius: 6, background: '#f4ece0' }} />
      </div>
      <span>{value.toFixed(1)}</span>
    </div>
  )
}
