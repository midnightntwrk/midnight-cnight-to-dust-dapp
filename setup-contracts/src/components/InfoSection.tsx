'use client';

import contractService from '@/services/contractService';
import { getCurrentNetwork, getCardanoScanUrl, BLOCKFROST_KEY } from '@/config/network';

interface InfoSectionProps {
    walletAddress: string;
    walletPKH: string;
}

export default function InfoSection({ walletAddress, walletPKH }: InfoSectionProps) {
    return (
        <div className="space-y-6">
            {/* Environment Configuration Section */}
            <div className="bg-white/5 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">Environment Configuration</h2>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-400">Network:</span>
                        <span className="text-white">{getCurrentNetwork()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Genesis UTxO:</span>
                        <span className="text-white">{process.env.NEXT_PUBLIC_GENESIS_UTXO_TX_ID ? 'Configured' : 'Not configured'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Blockfrost:</span>
                        <span className="text-white">{BLOCKFROST_KEY ? 'Configured' : 'Not configured'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Midnight DUST Wallet PKH:</span>
                        <span className="text-white">{process.env.NEXT_PUBLIC_MIDNIGHT_DUST_PKH ? 'Configured' : 'Not configured'}</span>
                    </div>
                </div>
            </div>

            {/* Smart Contract Details Section */}
            <div className="bg-white/5 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">Smart Contract Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contractService.getAllContracts() && Object.entries(contractService.getAllContracts()).map(([name, contract]) => (
                        <div key={name} className="bg-blue-500/10 p-4 rounded-lg">
                            <div className="text-sm text-blue-200 mb-1">{name}</div>
                            {contract.address && (
                                <div className="mb-2">
                                    <div className="text-xs text-gray-400">Validator Address:</div>
                                    <div className="text-white font-mono text-sm break-all">{contract.address}</div>
                                    <a
                                        href={getCardanoScanUrl('address', contract.address)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-green-400 hover:text-green-300 text-xs underline"
                                    >
                                        View on CardanoScan →
                                    </a>
                                </div>
                            )}
                            {contract.policyId && (
                                <div className="mb-2">
                                    <div className="text-xs text-gray-400">Policy ID:</div>
                                    <div className="text-white font-mono text-sm break-all">{contract.policyId}</div>
                                    <a
                                        href={getCardanoScanUrl('policy', contract.policyId)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-green-400 hover:text-green-300 text-xs underline"
                                    >
                                        View on CardanoScan →
                                    </a>
                                </div>
                            )}
                            {contract.scriptHash && !contract.policyId && (
                                <div>
                                    <div className="text-xs text-gray-400">Script Hash:</div>
                                    <div className="text-white font-mono text-sm break-all">{contract.scriptHash}</div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Wallet Details Section */}
            <div className="bg-white/5 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">Wallet Details</h2>
                <div className="space-y-2">
                    <div>
                        <div className="text-sm text-blue-200">Address:</div>
                        <div className="text-white font-mono text-sm break-all">{walletAddress}</div>
                        <a
                            href={getCardanoScanUrl('address', walletAddress)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-400 hover:text-green-300 text-xs underline"
                        >
                            View on CardanoScan →
                        </a>
                    </div>
                    <div>
                        <div className="text-sm text-blue-200">Payment Public Key Hash:</div>
                        <div className="text-white font-mono text-sm break-all">{walletPKH}</div>
                    </div>
                    <div>
                        <div className="text-sm text-blue-200">Midnight DUST Wallet PKH:</div>
                        <div className="text-white font-mono text-sm break-all">{process.env.NEXT_PUBLIC_MIDNIGHT_DUST_PKH}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
