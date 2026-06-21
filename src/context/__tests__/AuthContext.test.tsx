import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

describe('AuthContext', () => {
  it('ÈÇíÏ æÖÚíÊ ÇÍÑÇÒ åæíÊ ÑÇ ãÏíÑíÊ ˜äÏ', async () => {
    const wrapper = ({ children }: any) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});