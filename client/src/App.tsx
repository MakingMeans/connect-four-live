import { useRoom } from '@/hooks/use-room';
import { HomePage } from '@/pages/HomePage';
import { LobbyPage } from '@/pages/LobbyPage';

export function App() {
  const roomApi = useRoom();
  const { session } = roomApi;

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">Connect Four Live</h1>
        <span className={`app__status ${roomApi.isConnected ? 'app__status--on' : ''}`} aria-live="polite">
          {roomApi.isConnected ? 'Conectado' : 'Conectando…'}
        </span>
      </header>

      {session ? (
        <LobbyPage room={session.room} playerId={session.playerId} onLeave={roomApi.leaveRoom} isBusy={roomApi.isBusy} />
      ) : (
        <HomePage
          isBusy={roomApi.isBusy}
          error={roomApi.error}
          closedReason={roomApi.closedReason}
          onCreate={roomApi.createRoom}
          onJoin={roomApi.joinRoom}
          onDismissError={roomApi.clearError}
        />
      )}
    </main>
  );
}
