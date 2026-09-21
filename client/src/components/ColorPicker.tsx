import { PALETTE } from '@c4/shared';

type Props = {
  selectedId: string | null;
  /** Colores que ya tiene el rival y no se pueden elegir. */
  takenIds: readonly string[];
  isBusy?: boolean;
  onSelect: (colorId: string) => void;
};

export function ColorPicker({ selectedId, takenIds, isBusy = false, onSelect }: Props) {
  return (
    <div className="color-picker" role="group" aria-label="Elige tu color">
      {PALETTE.map((color) => {
        const isSelected = color.id === selectedId;
        const isTaken = takenIds.includes(color.id);
        return (
          <button
            key={color.id}
            type="button"
            className={`color-picker__swatch${isSelected ? ' color-picker__swatch--selected' : ''}`}
            style={{ backgroundColor: color.hex }}
            aria-label={color.name}
            aria-pressed={isSelected}
            title={isTaken ? `${color.name} (lo tiene tu rival)` : color.name}
            disabled={isBusy || isTaken}
            onClick={() => onSelect(color.id)}
          />
        );
      })}
    </div>
  );
}
