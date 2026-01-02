'use client';

import ConnectCardanoWallet from './wallet-connect/ConnectCardanoWallet';
import ConnectMidnightWallet from './wallet-connect/ConnectMidnightWallet';

export default function ConnectMain() {
    return (
        <div className="font-sans min-h-screen p-8 pb-20 sm:p-20">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-center mb-8">Cardano vs Midnight Wallet Compatibility Test</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h2 className="text-xl font-semibold mb-4 text-center text-blue-600">Cardano Ecosystem</h2>
                        <ConnectCardanoWallet />
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold mb-4 text-center text-purple-600">Midnight Ecosystem</h2>
                        <ConnectMidnightWallet />
                    </div>
                </div>

                <div className="mt-8 p-6 bg-gray-100 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Compatibility Analysis Results:</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-500">
                            <h4 className="font-semibold text-blue-700 mb-2">Cardano Ecosystem</h4>
                            <ul className="text-blue-600 space-y-1">
                                <li>
                                    • Namespace: <code>window.cardano</code>
                                </li>
                                <li>• Multi-wallet support (Nami, Eternl, Lace, etc.)</li>
                                <li>• UTxO-based balance queries</li>
                                <li>• Public addresses</li>
                                <li>• Rich API with UTxO management</li>
                            </ul>
                        </div>

                        <div className="bg-purple-50 p-4 rounded border-l-4 border-purple-500">
                            <h4 className="font-semibold text-purple-700 mb-2">Midnight Ecosystem</h4>
                            <ul className="text-purple-600 space-y-1">
                                <li>
                                    • Namespace: <code>window.midnight</code>
                                </li>
                                <li>
                                    • Identifier: <code>mnLace</code> (not <code>lace</code>)
                                </li>
                                <li>• State-based API with shield addresses</li>
                                <li>• Enhanced privacy features</li>
                                <li>• Simplified API focused on privacy</li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
                        <p className="text-green-700 font-medium">
                            🎯 <strong>Compatibility Conclusion:</strong> While the wallet interfaces follow similar patterns, they serve different purposes - Cardano for
                            transparent transactions and Midnight for private operations. The programming patterns are transferable, making development across both ecosystems
                            feasible.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
