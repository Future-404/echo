import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

const Bomb = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) throw new Error('test explosion');
  return <div>OK</div>;
};

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(<ErrorBoundary><Bomb shouldThrow={false} /></ErrorBoundary>);
    expect(screen.getByText('OK')).toBeTruthy();
  });

  it('renders fallback UI on error', () => {
    // suppress console.error noise in test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Bomb shouldThrow={true} /></ErrorBoundary>);
    expect(screen.getByRole('button', { name: /重新載入/i })).toBeTruthy();
    // must NOT expose internal error message
    expect(screen.queryByText('test explosion')).toBeNull();
  });

  it('calls onError prop when error is caught', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();
    render(<ErrorBoundary onError={onError}><Bomb shouldThrow={true} /></ErrorBoundary>);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
  });
});
