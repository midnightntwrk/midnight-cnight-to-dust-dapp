'use client'

import { HeroUIProvider } from '@heroui/react'
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { WalletProvider } from './WalletContext';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <HeroUIProvider>
            <NextThemesProvider attribute="class" defaultTheme="dark">
                <WalletProvider>
                    {children}
                </WalletProvider>
            </NextThemesProvider>
        </HeroUIProvider>
    )
}