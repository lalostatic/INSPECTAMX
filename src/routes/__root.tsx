import { createRootRoute, Outlet, redirect } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '~/components/ui/toaster';
import { useAuthStore } from '~/lib/auth';
import { useEffect } from 'react';
import { registerServiceWorker } from '~/lib/offline/sw-registration';
import { startAutoSync } from '~/lib/offline/sync';
import '~/lib/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function RootComponent() {
  const { fetchMe } = useAuthStore();

  useEffect(() => {
    fetchMe();
    registerServiceWorker();
    startAutoSync();
  }, [fetchMe]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
