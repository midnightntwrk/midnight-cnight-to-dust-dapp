'use client';

import { logContractAddresses } from '@/lib/contractUtils';
import { HeroUIProvider } from '@heroui/react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useEffect, useRef } from 'react';
import { TransactionProvider } from './TransactionContext';
import { WalletProvider } from './WalletContext';

export function Providers({ children }: { children: React.ReactNode }) {
    const hasLoggedRef = useRef(false);

    useEffect(() => {
        // Log contract addresses only once at startup
        if (!hasLoggedRef.current) {
            hasLoggedRef.current = true;
            logContractAddresses();
        }
    }, []);

    return (
        <HeroUIProvider>
            <NextThemesProvider attribute="class" defaultTheme="dark">
                <WalletProvider>
                    <TransactionProvider>{children}</TransactionProvider>
                </WalletProvider>
            </NextThemesProvider>
        </HeroUIProvider>
    );
}
