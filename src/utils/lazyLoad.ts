import { lazy } from 'react';

export const LazyReferral = lazy(() => import('@/pages/Referral'));
export const LazySupport = lazy(() => import('@/pages/Support'));
export const LazyChatRoom = lazy(() => import('@/pages/ChatRoom'));
export const LazyTermsAndGuide = lazy(() => import('@/pages/TermsAndGuide'));