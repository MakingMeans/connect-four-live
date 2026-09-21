import type { GameConfig, RoomState } from '@c4/shared';
import { useCallback, useEffect, useState } from 'react';

import { request, socket, SocketRequestError } from '@/lib/socket';
import { clearSession, loadSession, saveSession } from '@/lib/storage';

interface RoomSession {
  playerId: string;
  room: RoomState;
}

export interface UseRoom {
  session: RoomSession | null;
  isConnected: boolean;
  isBusy: boolean;
  error: string | null;
  closedReason: string | null;
  createRoom: (username: string, config: GameConfig) => Promise<void>;
  joinRoom: (username: string, code: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  chooseColor: (colorId: string) => Promise<void>;
  startGame: () => Promise<void>;
  playMove: (col: number) => Promise<void>;
  resetSeries: () => Promise<void>;
  clearError: () => void;
}

function toMessage(error: unknown): string {
  if (error instanceof SocketRequestError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Algo salió mal.';
}

/**
 * Conexión al servidor y estado de la sala actual, sincronizado por `room:state`.
 * Al (re)conectar intenta volver a la sala guardada en `sessionStorage`.
 */
export function useRoom(): UseRoom {
  const [session, setSession] = useState<RoomSession | null>(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closedReason, setClosedReason] = useState<string | null>(null);

  useEffect(() => {
    const rejoin = async () => {
      const stored = loadSession();
      if (!stored) return;
      try {
        const joined = await request('room:rejoin', stored);
        setSession(joined);
      } catch (rejoinError: unknown) {
        clearSession();
        setSession(null);
        setClosedReason(toMessage(rejoinError));
      }
    };

    const handleConnect = () => {
      setIsConnected(true);
      void rejoin();
    };
    const handleDisconnect = () => setIsConnected(false);
    const handleState = (room: RoomState) => {
      setSession((current) => (current ? { ...current, room } : current));
    };
    const handleClosed = (reason: string) => {
      clearSession();
      setSession(null);
      setClosedReason(reason);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('room:state', handleState);
    socket.on('room:closed', handleClosed);
    socket.connect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room:state', handleState);
      socket.off('room:closed', handleClosed);
      socket.disconnect();
    };
  }, []);

  const run = useCallback(async (action: () => Promise<void>) => {
    setIsBusy(true);
    setError(null);
    setClosedReason(null);
    try {
      await action();
    } catch (requestError: unknown) {
      setError(toMessage(requestError));
    } finally {
      setIsBusy(false);
    }
  }, []);

  const enterRoom = useCallback((joined: RoomSession) => {
    saveSession({ code: joined.room.code, playerId: joined.playerId });
    setSession(joined);
  }, []);

  const createRoom = useCallback(
    (username: string, config: GameConfig) =>
      run(async () => enterRoom(await request('room:create', { username, config }))),
    [run, enterRoom],
  );

  const joinRoom = useCallback(
    (username: string, code: string) => run(async () => enterRoom(await request('room:join', { username, code }))),
    [run, enterRoom],
  );

  const leaveRoom = useCallback(
    () =>
      run(async () => {
        await request('room:leave');
        clearSession();
        setSession(null);
      }),
    [run],
  );

  const chooseColor = useCallback((colorId: string) => run(() => request('room:choose-color', colorId)), [run]);
  const startGame = useCallback(() => run(() => request('game:start')), [run]);
  const playMove = useCallback((col: number) => run(() => request('game:move', col)), [run]);
  const resetSeries = useCallback(() => run(() => request('room:reset')), [run]);
  const clearError = useCallback(() => setError(null), []);

  return {
    session,
    isConnected,
    isBusy,
    error,
    closedReason,
    createRoom,
    joinRoom,
    leaveRoom,
    chooseColor,
    startGame,
    playMove,
    resetSeries,
    clearError,
  };
}
