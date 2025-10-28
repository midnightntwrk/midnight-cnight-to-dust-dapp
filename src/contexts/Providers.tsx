'use client';

import { HeroUIProvider } from '@heroui/react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { WalletProvider } from './WalletContext';
// import { DustProtocolProvider } from './DustProtocolContext';
import { TransactionProvider } from './TransactionContext';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <HeroUIProvider>
            <NextThemesProvider attribute="class" defaultTheme="dark">
                {/* <DustProtocolProvider> */}
                    <WalletProvider>
                        <TransactionProvider>{children}</TransactionProvider>
                    </WalletProvider>
                {/* </DustProtocolProvider> */}
            </NextThemesProvider>
        </HeroUIProvider>
    );
}
