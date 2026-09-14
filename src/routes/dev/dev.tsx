// @ts-nocheck
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';
import { DevLayout } from '~/components/layout/DevLayout';
import { useAuthStore } from '~/lib/auth';

export const Route = createFileRoute('/dev/dev')({
  beforeLoad: () => {
    const { user, isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated || !user) {
      throw redirect({ to: '/login' });
    }
    if (user.role !== 'developer') {
      throw redirect({ to: '/app' });
    }
  },
  component: DevLayout,
});