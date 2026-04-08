import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GateScreen } from '../GateScreen';

describe('GateScreen', () => {
  it('calls onUnlock with entered password', async () => {
    const onUnlock = vi.fn().mockResolvedValue(undefined);
    render(<GateScreen onUnlock={onUnlock} />);
    fireEvent.change(screen.getByPlaceholderText('AUTHENTICATION TOKEN'), { target: { value: 'mypassword' } });
    fireEvent.click(screen.getByText('Decrypt'));
    await waitFor(() => expect(onUnlock).toHaveBeenCalledWith('mypassword'));
  });

  it('shows error on failed unlock', async () => {
    const onUnlock = vi.fn().mockRejectedValue(new Error('bad'));
    render(<GateScreen onUnlock={onUnlock} />);
    fireEvent.change(screen.getByPlaceholderText('AUTHENTICATION TOKEN'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('Decrypt'));
    await waitFor(() => expect(screen.getByText(/ACCESS DENIED/i)).toBeTruthy());
  });

  it('locks out after 5 failed attempts', async () => {
    const onUnlock = vi.fn().mockRejectedValue(new Error('bad'));
    render(<GateScreen onUnlock={onUnlock} />);
    const input = screen.getByPlaceholderText('AUTHENTICATION TOKEN');

    for (let i = 0; i < 5; i++) {
      fireEvent.change(input, { target: { value: 'wrong' } });
      // wait for button to be re-enabled (loading=false) before clicking
      const btn = await waitFor(() => {
        const b = screen.getByText('Decrypt').closest('button')!;
        expect(b).not.toBeDisabled();
        return b;
      });
      fireEvent.click(btn);
      // wait for the error message to appear (loading finished)
      await waitFor(() => expect(screen.getByText(/ACCESS DENIED|LOCKED/i)).toBeTruthy());
    }

    await waitFor(() => expect(screen.getByText(/LOCKED/i)).toBeTruthy());
    expect(screen.getByText('Decrypt').closest('button')).toBeDisabled();
  });

  it('submits on Enter key', async () => {
    const onUnlock = vi.fn().mockResolvedValue(undefined);
    render(<GateScreen onUnlock={onUnlock} />);
    const input = screen.getByPlaceholderText('AUTHENTICATION TOKEN');
    fireEvent.change(input, { target: { value: 'pass' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(onUnlock).toHaveBeenCalledWith('pass'));
  });
});
