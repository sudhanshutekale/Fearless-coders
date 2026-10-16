import type { Metadata } from 'next';
import './globals.css';
import { getSessionUser } from '@/lib/rbac/auth';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'InstiPilot — Institute Operations & AI Copilot',
  description: 'Autonomous operations platform for coaching institutes and training centres with an AST-guarded AI copilot at its core.',
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();

  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-command-darkest text-slate-100 antialiased font-sans">
        <AppShell currentUser={user}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
