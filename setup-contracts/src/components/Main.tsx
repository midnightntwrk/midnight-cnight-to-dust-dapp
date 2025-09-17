'use client';

import dynamic from 'next/dynamic';

// Dynamically import components that use WASM with SSR disabled
const DynamicSetupApp = dynamic(() => import('./SetupApp'), { ssr: false });

export default function Main() {
    return (
            <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
                <div className="container mx-auto px-4 py-8">
                    <header className="text-center mb-12">
                        <h1 className="text-4xl font-bold text-white mb-4">MIDNIGHT DUST Setup Tool</h1>
                        <p className="text-blue-200 text-lg">Initialize your DUST smart contract system on Cardano</p>
                    </header>

                    <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur-sm rounded-xl p-8 shadow-2xl space-y-6">
                        <DynamicSetupApp />
                    </div>

                    <footer className="text-center mt-12 text-blue-200">
                        <p> 2025 MIDNIGHT DUST Protocol</p>
                    </footer>
                </div>
            </div>
    );
}
