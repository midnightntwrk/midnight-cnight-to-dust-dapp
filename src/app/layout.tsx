import type { Metadata } from 'next';
import './globals.css';
import ClientWrapper from '@/components/ui/ClientWrapper';

export const metadata: Metadata = {
  title: 'Midnight to Cardano - Mapping Validator',
  description: 'Midnight to Cardano - Mapping Validation',
};

// Force dynamic rendering for all pages - prevents WASM/wallet API issues during build
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // NOTE:
    // suppressHydrationWarning prevents hydration mismatch errors from next-themes
    // next-themes adds className="dark" and style={{color-scheme:"dark"}} during client-side hydration
    // which differs from server-rendered HTML, causing React hydration warnings
    <html lang="en" suppressHydrationWarning>
      <body>
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
