import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: () => void;
  title?: string;
}

const Switch: React.FC<SwitchProps> = ({ checked, onChange, title }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    title={title}
    onClick={onChange}
    className="relative w-[46px] h-[27px] rounded-full p-[3px] shrink-0 flex transition-colors"
    style={{
      background: checked ? 'var(--accent)' : 'var(--surface-2)',
      boxShadow: 'inset 0 0 0 1px var(--border)',
    }}
  >
    <span
      className="w-[21px] h-[21px] rounded-full transition-transform"
      style={{
        background: checked ? 'var(--accent-ink)' : 'var(--text-3)',
        transform: checked ? 'translateX(19px)' : 'translateX(0)',
      }}
    />
  </button>
);

export default Switch;
