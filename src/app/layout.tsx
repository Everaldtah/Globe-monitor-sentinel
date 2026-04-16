import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sentinel Globe | Global Intelligence Observatory',
  description: 'Real-time geopolitical and market intelligence platform',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
