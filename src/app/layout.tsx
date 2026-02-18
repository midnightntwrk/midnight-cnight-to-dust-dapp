import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import ClientWrapper from '@/components/ui/ClientWrapper';

export const metadata: Metadata = {
  title: 'Midnight to Cardano - Mapping Validator',
  description: 'Midnight to Cardano - Mapping Validation',
};

// Force dynamic rendering for all pages - prevents WASM/wallet API issues during build
export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerssLIst = await headers();
  const nonce = headerssLIst.get('x-nonce') ?? undefined;

  return (
    // NOTE:
    // suppressHydrationWarning prevents hydration mismatch errors from next-themes
    // next-themes adds className="dark" and style={{color-scheme:"dark"}} during client-side hydration
    // which differs from server-rendered HTML, causing React hydration warnings
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Do NOT add inline <script> without nonce */}
        {/* If you have any <Script />, pass nonce={nonce} */}
      </head>
      <body>
        <ClientWrapper nonce={nonce}>{children}</ClientWrapper>
      </body>
    </html>
  );
}
