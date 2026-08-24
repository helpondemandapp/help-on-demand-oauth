import React from 'react';
import { createRoot } from 'react-dom/client';
import Layout from '@/containers/Layout/Layout.tsx';
import '@/styles/main.scss';
import 'bootstrap-icons/font/bootstrap-icons.css';
import SystemThemeContextProvider from '@/contexts/SystemTheme';
import { BrowserRouter } from 'react-router';
import MainRouter from '@/containers/MainRouter/MainRouter.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <SystemThemeContextProvider>
          <Layout>
            <MainRouter />
          </Layout>
        </SystemThemeContextProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
