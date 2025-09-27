import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
