import { lazy } from 'react';

export const LazyWallet = lazy(() => import('@/pages/Wallet'));
export const LazyTerms = lazy(() => import('@/pages/Terms'));
export const LazySupport = lazy(() => import('@/pages/Support'));
export const LazyChatRoom = lazy(() => import('@/pages/ChatRoom'));