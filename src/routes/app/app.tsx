// @ts-nocheck
import { createFileRoute, redirect } from '@tanstack/react-router';
import { AppLayout } from '~/components/layout/AppLayout';
import { useAuthStore } from '~/lib/auth';

export const Route = createFileRoute('/app/app')({
  beforeLoad: () => {
    const { user, isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated || !user) {
      throw redirect({ to: '/login' });
    }
    if (user.role === 'developer') {
      throw redirect({ to: '/dev' });
    }
  },
  component: AppLayout,
});