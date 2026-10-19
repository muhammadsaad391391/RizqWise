import type { Metadata, Viewport } from 'next';
import './globals.css';
import { FinanceProvider } from '@/lib/context/finance-context';
import { AppLayout } from '@/components/layout/app-layout';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F59E0B',
};

export const metadata: Metadata = {
  title: 'RizqWise — Know where your money goes',
  description: 'A Modern Islamic-Inspired Personal Finance Management and Fund Allocation Application',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FBFBFA]">
        <FinanceProvider>
          <AppLayout>{children}</AppLayout>
        </FinanceProvider>
      </body>
    </html>
  );
}
