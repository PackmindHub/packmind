import type { CSSProperties, InputHTMLAttributes } from 'react';

type Variant = 'bare' | 'filled' | 'filled-dark' | 'outline';

const VARIANT_STYLES: Record<Variant, CSSProperties> = {
  bare: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--pm-colors-text-primary)',
    fontFamily: 'inherit',
    fontSize: '14px',
    padding: 0,
    width: '100%',
  },
  filled: {
    background: 'var(--pm-colors-background-tertiary)',
    border: '1px solid var(--pm-colors-border-tertiary)',
    outline: 'none',
    color: 'var(--pm-colors-text-primary)',
    fontFamily: 'inherit',
    fontSize: '14px',
    borderRadius: '6px',
    padding: '6px 10px',
    width: '100%',
  },
  'filled-dark': {
    background: 'var(--pm-colors-background-primary)',
    border: '1px solid var(--pm-colors-border-tertiary)',
    outline: 'none',
    color: 'var(--pm-colors-text-primary)',
    fontFamily: 'inherit',
    fontSize: '13px',
    borderRadius: '4px',
    padding: '4px 8px',
    width: '100%',
  },
  outline: {
    background: 'transparent',
    border: '1px solid var(--pm-colors-border-tertiary)',
    outline: 'none',
    color: 'var(--pm-colors-text-primary)',
    fontFamily: 'inherit',
    fontSize: '14px',
    borderRadius: '6px',
    padding: '6px 10px',
    width: '100%',
  },
};

type WireInputProps = InputHTMLAttributes<HTMLInputElement> & {
  variant?: Variant;
};

export function WireInput({
  variant = 'bare',
  style,
  ...rest
}: Readonly<WireInputProps>) {
  const merged = { ...VARIANT_STYLES[variant], ...style };
  return <input {...rest} style={merged} />;
}
