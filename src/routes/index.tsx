// @ts-nocheck
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useAuthStore } from '~/lib/auth';
import { getDefaultRoute } from '~/lib/auth/roles';
import type { Role } from '~/lib/types';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const { user, isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated || !user) {
      throw redirect({ to: '/login' });
    }
    const route = getDefaultRoute(user.role as Role);
    throw redirect({ to: route });
  },
  component: () => null,
});