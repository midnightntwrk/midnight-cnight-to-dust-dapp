'use client';

import { Providers } from '@/contexts/Providers';
import MidnightNavbar from '@/components/Navbar';
import Footer from '@/components/ui/Footer';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { ReactNode } from 'react';

interface ClientWrapperProps {
    children: ReactNode;
}

export default function ClientWrapper({ children }: ClientWrapperProps) {
    return (
        <ErrorBoundary>
            <Providers>
                <main>
                    <MidnightNavbar />
                    {children}
                    <Footer />
                </main>
            </Providers>
        </ErrorBoundary>
    );
}
