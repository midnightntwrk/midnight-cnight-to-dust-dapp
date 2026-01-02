import { useWalletContext } from '@/contexts/WalletContext';
import { Chip, Progress } from '@heroui/react';
import React from 'react';

const ConnectionStatus = () => {
    const { cardano, midnight } = useWalletContext();

    // Calculate wallet connection status
    const getConnectionStatus = () => {
        const cardanoConnected = cardano.isConnected;
        const midnightConnected = midnight.isConnected;

        if (cardanoConnected && midnightConnected) return { status: 'Both Connected', color: 'success', percentage: 100 };
        if (cardanoConnected || midnightConnected) return { status: 'Partially Connected', color: 'warning', percentage: 50 };
        return { status: 'Not Connected', color: 'danger', percentage: 0 };
    };

    const connectionStatus = getConnectionStatus();

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Overall Connection Progress</span>
                <span className="text-sm font-medium">{connectionStatus.percentage}%</span>
            </div>
            <Progress
                value={connectionStatus.percentage}
                color={connectionStatus.color as 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'}
                className="mb-4"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${cardano.isConnected ? 'bg-success' : 'bg-default-300'}`} />
                    <span className="text-sm">Cardano Wallet</span>
                    <Chip size="sm" color={cardano.isConnected ? 'success' : 'default'} variant="flat">
                        {cardano.isConnected ? 'Connected' : 'Disconnected'}
                    </Chip>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${midnight.isConnected ? 'bg-secondary' : 'bg-default-300'}`} />
                    <span className="text-sm">Midnight Wallet</span>
                    <Chip size="sm" color={midnight.isConnected ? 'secondary' : 'default'} variant="flat">
                        {midnight.isConnected ? 'Connected' : 'Disconnected'}
                    </Chip>
                </div>
            </div>
        </div>
    );
};

export default ConnectionStatus;
