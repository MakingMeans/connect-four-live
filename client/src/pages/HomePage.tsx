import {
  BEST_OF_MAX,
  BEST_OF_MIN,
  BOARD_SIZE_MAX,
  BOARD_SIZE_MIN,
  DEFAULT_GAME_CONFIG,
  normalizeRoomCode,
  ROOM_CODE_LENGTH,
  TIMEOUT_RULES,
  TURN_SECONDS_MAX,
  TURN_SECONDS_MIN,
  USERNAME_MAX,
  USERNAME_MIN,
  type GameConfig,
  type TimeoutRule,
} from '@c4/shared';
import { useState, type FormEvent } from 'react';

import { loadUsername, saveUsername } from '@/lib/storage';
import { TIMEOUT_RULE_LABELS } from '@/lib/labels';

type Props = {
  isBusy: boolean;
  error: string | null;
  closedReason: string | null;
  onCreate: (username: string, config: GameConfig) => Promise<void>;
  onJoin: (username: string, code: string) => Promise<void>;
  onDismissError: () => void;
};

export function HomePage({ isBusy, error, closedReason, onCreate, onJoin, onDismissError }: Props) {
  const [username, setUsername] = useState(loadUsername);
  const [config, setConfig] = useState<GameConfig>(DEFAULT_GAME_CONFIG);
  const [code, setCode] = useState('');

  const trimmedUsername = username.trim();
  const canSubmit = !isBusy && trimmedUsername.length >= USERNAME_MIN;

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    saveUsername(value.trim());
  };

  const handleConfigChange = (key: 'boardSize' | 'turnSeconds' | 'bestOf', value: string) => {
    setConfig((current) => ({ ...current, [key]: Number(value) }));
  };

  const handleTimeoutRuleChange = (value: string) => {
    if (TIMEOUT_RULES.includes(value as TimeoutRule)) {
      setConfig((current) => ({ ...current, timeoutRule: value as TimeoutRule }));
    }
  };

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    void onCreate(trimmedUsername, config);
  };

  const handleJoin = (event: FormEvent) => {
    event.preventDefault();
    void onJoin(trimmedUsername, normalizeRoomCode(code));
  };

  return (
    <div className="home">
      {closedReason && <p className="notice">{closedReason}</p>}
      {error && (
        <p className="notice notice--error" role="alert">
          {error}{' '}
          <button type="button" className="link" onClick={onDismissError}>
            cerrar
          </button>
        </p>
      )}

      <section className="panel">
        <h2>Tu perfil</h2>
        <label className="field">
          <span>Nombre de usuario</span>
          <input
            type="text"
            value={username}
            onChange={(event) => handleUsernameChange(event.target.value)}
            minLength={USERNAME_MIN}
            maxLength={USERNAME_MAX}
            autoComplete="nickname"
            required
          />
        </label>
      </section>

      <div className="home__columns">
        <form className="panel" onSubmit={handleCreate}>
          <h2>Crear sala privada</h2>
          <label className="field">
            <span>Tamaño del tablero ({config.boardSize}×{config.boardSize})</span>
            <input
              type="range"
              min={BOARD_SIZE_MIN}
              max={BOARD_SIZE_MAX}
              value={config.boardSize}
              onChange={(event) => handleConfigChange('boardSize', event.target.value)}
            />
          </label>
          <label className="field">
            <span>Segundos por turno</span>
            <input
              type="number"
              min={TURN_SECONDS_MIN}
              max={TURN_SECONDS_MAX}
              value={config.turnSeconds}
              onChange={(event) => handleConfigChange('turnSeconds', event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Si se agota el tiempo</span>
            <select value={config.timeoutRule} onChange={(event) => handleTimeoutRuleChange(event.target.value)}>
              {TIMEOUT_RULES.map((rule) => (
                <option key={rule} value={rule}>
                  {TIMEOUT_RULE_LABELS[rule]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Mejor de</span>
            <select value={config.bestOf} onChange={(event) => handleConfigChange('bestOf', event.target.value)}>
              {Array.from({ length: BEST_OF_MAX - BEST_OF_MIN + 1 }, (_, index) => BEST_OF_MIN + index).map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? 'Una partida' : `Mejor de ${n}`}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="button button--primary" disabled={!canSubmit}>
            Crear sala
          </button>
        </form>

        <form className="panel" onSubmit={handleJoin}>
          <h2>Unirse con código</h2>
          <label className="field">
            <span>Código de sala</span>
            <input
              type="text"
              className="input--code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              maxLength={ROOM_CODE_LENGTH + 1}
              placeholder="ABC234"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </label>
          <button
            type="submit"
            className="button"
            disabled={!canSubmit || normalizeRoomCode(code).length !== ROOM_CODE_LENGTH}
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
