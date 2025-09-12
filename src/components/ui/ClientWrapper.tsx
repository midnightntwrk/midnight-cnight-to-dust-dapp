'use client';

import { Providers } from "@/contexts/Providers";
import MidnightNavbar from "@/components/Navbar";
import Footer from "@/components/ui/Footer";
import { ReactNode } from "react";

interface ClientWrapperProps {
  children: ReactNode;
}

export default function ClientWrapper({ children }: ClientWrapperProps) {
  return (
    <Providers>
      <main>
        <MidnightNavbar />
        {children}
        <Footer />
      </main>
    </Providers>
  );
}
