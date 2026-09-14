// @ts-nocheck
import { createFileRoute, redirect } from '@tanstack/react-router';
import { AdminLayout } from '~/components/layout/AdminLayout';
import { useAuthStore } from '~/lib/auth';

export const Route = createFileRoute('/admin/admin')({
  beforeLoad: () => {
    const { user, isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated || !user) {
      throw redirect({ to: '/login' });
    }
    if (!['developer', 'company_admin', 'supervisor'].includes(user.role)) {
      throw redirect({ to: '/app' });
    }
  },
  component: AdminLayout,
});