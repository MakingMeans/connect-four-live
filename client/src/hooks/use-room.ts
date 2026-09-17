import type { GameConfig, RoomState } from '@c4/shared';
import { useCallback, useEffect, useState } from 'react';

import { request, socket, SocketRequestError } from '@/lib/socket';

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

/** Conexión al servidor y estado de la sala actual, sincronizado por `room:state`. */
export function useRoom(): UseRoom {
  const [session, setSession] = useState<RoomSession | null>(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closedReason, setClosedReason] = useState<string | null>(null);

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleState = (room: RoomState) => {
      setSession((current) => (current ? { ...current, room } : current));
    };
    const handleClosed = (reason: string) => {
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

  const createRoom = useCallback(
    (username: string, config: GameConfig) =>
      run(async () => {
        const joined = await request('room:create', { username, config });
        setSession(joined);
      }),
    [run],
  );

  const joinRoom = useCallback(
    (username: string, code: string) =>
      run(async () => {
        const joined = await request('room:join', { username, code });
        setSession(joined);
      }),
    [run],
  );

  const leaveRoom = useCallback(
    () =>
      run(async () => {
        await request('room:leave');
        setSession(null);
      }),
    [run],
  );

  const clearError = useCallback(() => setError(null), []);

  return { session, isConnected, isBusy, error, closedReason, createRoom, joinRoom, leaveRoom, clearError };
}
