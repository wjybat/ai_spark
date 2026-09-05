"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "./icons";

export interface DropdownOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
}

export function DropdownSelect({
  value,
  options,
  onChange,
  leading,
  buttonClassName,
  wrapperClassName,
  menuAlign = "left",
  ariaLabel,
}: {
  value: string;
  options: readonly DropdownOption[];
  onChange: (value: string) => void;
  leading: ReactNode;
  buttonClassName: string;
  wrapperClassName?: string;
  menuAlign?: "left" | "right";
  ariaLabel: string;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    function closeOnOutside(event: PointerEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className={`dropdown-shell${wrapperClassName !== undefined ? ` ${wrapperClassName}` : ""}`}>
      <button
        type="button"
        className={buttonClassName}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-controls={menuId}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {leading}
        <span className="filter-value">{selected?.label ?? value}</span>
        <Icon name="chevronDown" size={13} className={`ic-muted dropdown-chevron${open ? " open" : ""}`} />
      </button>
      {open && (
        <div id={menuId} className={`dropdown-menu dropdown-menu-${menuAlign}`} role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                type="button"
                role="option"
                aria-selected={active}
                className={`dropdown-option${active ? " selected" : ""}`}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>
                  <strong>{option.label}</strong>
                  {option.description !== undefined && <small>{option.description}</small>}
                </span>
                <span className="dropdown-check" aria-hidden="true">{active ? "✓" : ""}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
