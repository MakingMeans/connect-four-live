import { ThemeToggle } from '@/components/ThemeToggle';
import { useRoom } from '@/hooks/use-room';
import { useTheme } from '@/hooks/use-theme';
import { GamePage } from '@/pages/GamePage';
import { HomePage } from '@/pages/HomePage';
import { LobbyPage } from '@/pages/LobbyPage';

export function App() {
  const roomApi = useRoom();
  const { theme, toggle: toggleTheme } = useTheme();
  const { session } = roomApi;

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">Connect Four Live</h1>
        <div className="app__tools">
          <span className={`app__status ${roomApi.isConnected ? 'app__status--on' : ''}`} aria-live="polite">
            {roomApi.isConnected ? 'Conectado' : 'Conectando…'}
          </span>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      {session && session.room.phase !== 'lobby' && (
        <GamePage
          room={session.room}
          playerId={session.playerId}
          isBusy={roomApi.isBusy}
          error={roomApi.error}
          onPlay={roomApi.playMove}
          onNextGame={roomApi.startGame}
          onReset={roomApi.resetSeries}
          onLeave={roomApi.leaveRoom}
          onDismissError={roomApi.clearError}
        />
      )}
      {session && session.room.phase === 'lobby' && (
        <LobbyPage
          room={session.room}
          playerId={session.playerId}
          isBusy={roomApi.isBusy}
          error={roomApi.error}
          onLeave={roomApi.leaveRoom}
          onChooseColor={roomApi.chooseColor}
          onStart={roomApi.startGame}
          onDismissError={roomApi.clearError}
        />
      )}
      {!session && (
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
