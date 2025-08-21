import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/contexts/Providers";
import MidnightNavbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Midnight vs Cardano",
  description: "Midnight vs Cardano",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <main>
            <MidnightNavbar />
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
