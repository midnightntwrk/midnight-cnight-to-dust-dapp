'use client';

import { getCardanoScanUrl } from '@/config/network';


interface SetupStatusProps {
    setupStep: number;
    txHashes?: Record<number, string>;
}

export default function SetupStatus({ setupStep, txHashes = {} }: SetupStatusProps) {
    const steps = [
        { id: 1, title: 'Initialize Versioning System', description: 'STEP 01: Create Version Oracle UTxO' },
        { id: 2, title: 'Initialize DUST Production', description: 'STEP 02: Deploy governance and auth policies' },
        { id: 3, title: 'Register Midnight DUST Address', description: 'STEP 03: Register midnight dust address' },
        { id: 4, title: 'Setup Complete', description: 'DUST system ready for user registrations' },
    ];

    const getStepStatus = (stepId: number) => {
        if (stepId < setupStep) return 'completed';
        if (stepId === setupStep) return 'current';
        return 'pending';
    };

    const getStepIcon = (stepId: number) => {
        const status = getStepStatus(stepId);
        if (status === 'completed') return '✅';
        if (status === 'current') return '🔄';
        return '⏳';
    };

    return (
        <div className="bg-white/5 rounded-lg p-6">
            

            <h2 className="text-xl font-bold text-white mb-4">Setup Progress</h2>

            <div className="space-y-4">
                {steps.map((step, index) => {
                    const status = getStepStatus(step.id);
                    return (
                        <div
                            key={step.id}
                            className={`flex items-start space-x-4 p-4 rounded-lg transition-all ${
                                status === 'current'
                                    ? 'bg-blue-500/20 border-2 border-blue-400'
                                    : status === 'completed'
                                    ? 'bg-green-500/20 border border-green-400'
                                    : 'bg-white/5 border border-white/10'
                            }`}
                        >
                            <div className="text-2xl">{getStepIcon(step.id)}</div>
                            <div className="flex-1">
                                <h3 className={`font-semibold ${status === 'current' ? 'text-blue-200' : status === 'completed' ? 'text-green-200' : 'text-gray-300'}`}>
                                    {step.title}
                                </h3>
                                <p className={`text-sm ${status === 'current' ? 'text-blue-300' : status === 'completed' ? 'text-green-300' : 'text-gray-400'}`}>
                                    {step.description}
                                </p>
                                {status === 'completed' && txHashes[step.id] && (
                                    <div className="mt-2">
                                        <div className="text-xs text-gray-400">Transaction Hash:</div>
                                        <div className="text-white font-mono text-xs break-all mb-1">{txHashes[step.id]}</div>
                                        <a
                                            href={getCardanoScanUrl('transaction', txHashes[step.id])}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-green-400 hover:text-green-300 text-xs underline"
                                        >
                                            View on CardanoScan →
                                        </a>
                                    </div>
                                )}
                            </div>
                            {index < steps.length - 1 && <div className={`w-px h-8 mt-8 ${status === 'completed' ? 'bg-green-400' : 'bg-white/20'}`} />}
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 text-center">
                <div className="text-sm text-blue-200">Step {Math.min(setupStep, 4)} of 4</div>
                <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                    <div className="bg-blue-400 h-2 rounded-full transition-all" style={{ width: `${(Math.min(setupStep, 4) / 4) * 100}%` }} />
                </div>
            </div>
        </div>
    );
}
