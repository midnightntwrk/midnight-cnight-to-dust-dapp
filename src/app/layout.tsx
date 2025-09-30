import type { Metadata } from "next";
import "./globals.css";
import ClientWrapper from "@/components/ui/ClientWrapper";

export const metadata: Metadata = {
  title: "Midnight vs Cardano",
  description: "Midnight vs Cardano",
};

// Force dynamic rendering for all pages - prevents WASM/wallet API issues during build
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ClientWrapper>
          {children}
        </ClientWrapper>
      </body>
    </html>
  );
}
