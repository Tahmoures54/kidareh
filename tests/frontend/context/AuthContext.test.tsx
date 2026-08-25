// src/context/__tests__/AuthContext.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { apiRequest } from '../../utils/api';

// Mock the entire api module
vi.mock('../../utils/api', () => ({
  apiRequest: vi.fn(),
  ApiError: class extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('initial state: no user, not authenticated, loading true at first', async () => {
    // Mock refreshMe to return null (user not logged in)
    (apiRequest as any).mockRejectedValueOnce(new Error('No token'));

    const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Initially loading is true
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();

    // After effect finishes, loading becomes false
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('sendOtp calls the correct API', async () => {
    // First call: refreshMe fails (no user)
    (apiRequest as any).mockRejectedValueOnce(new Error('No token'));

    const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Now test sendOtp
    (apiRequest as any).mockResolvedValueOnce({}); // success, no data needed
    await result.current.sendOtp('09123456789');

    expect(apiRequest).toHaveBeenCalledWith(
      '/api/auth/send-otp',
      expect.objectContaining({
        method: 'POST',
        body: { phone: '09123456789' },
        auth: false,
      })
    );
  });

  it('verifyOtp returns user and sets token', async () => {
    // refreshMe fails
    (apiRequest as any).mockRejectedValueOnce(new Error('No token'));

    const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const fakeUser = { id: 1, phone: '09123456789', role: 'buyer', is_profile_complete: false };
    const fakeToken = 'jwt-token-123';

    (apiRequest as any).mockResolvedValueOnce({
      token: fakeToken,
      user: fakeUser,
    });

    const user = await result.current.verifyOtp('09123456789', '12345');

    expect(user).toEqual(fakeUser);
    expect(localStorage.getItem('token')).toBe(fakeToken);
    expect(result.current.user).toEqual(fakeUser);
  });

  it('logout clears token and user', async () => {
    // refreshMe returns a user to simulate logged in state
    const fakeUser = { id: 1, phone: '09123456789', role: 'buyer' };
    (apiRequest as any).mockResolvedValueOnce(fakeUser); // refreshMe success
    localStorage.setItem('token', 'existing-token');

    const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user).toEqual(fakeUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    // logout
    (apiRequest as any).mockResolvedValueOnce({}); // logout API call
    await result.current.logout();

    expect(localStorage.getItem('token')).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});