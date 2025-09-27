"use client";

import React from 'react';
import { Spinner, Button } from '@heroui/react';
import { useDustProtocol } from '@/contexts/DustProtocolContext';
import { useWalletContext } from '@/contexts/WalletContext';
import type { LucidEvolution } from '@lucid-evolution/lucid';

export default function DustProtocolStatus() {
    const { 
        protocolStatus: status, 
        isProtocolStatusLoading: isChecking,
        refreshProtocolStatus 
    } = useDustProtocol();
    
    const { cardano } = useWalletContext();
    
    if (isChecking) {
        return (
            <div className="bg-white/5 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-3">
                    <Spinner size="sm" color="primary" />
                    <p className="text-white/80">Checking DUST protocol status...</p>
                </div>
            </div>
        );
    }

    if (!status) return null;

    const getStatusIcon = () => {
        if (status.isReady) return '✅';
        if (status.error) return '❌';
        return '⚠️';
    };

    const getStatusMessage = () => {
        if (status.isReady) {
            return 'DUST protocol is ready for registration';
        }
        if (status.error) {
            return `Protocol check failed: ${status.error}`;
        }
        return `DUST protocol setup incomplete (Step ${status.currentStep} needed)`;
    };

    const getStatusColor = () => {
        if (status.isReady) return 'bg-green-500/20 border-green-400';
        if (status.error) return 'bg-red-500/20 border-red-400';
        return 'bg-yellow-500/20 border-yellow-400';
    };

    const getTextColor = () => {
        if (status.isReady) return 'text-green-200';
        if (status.error) return 'text-red-200';
        return 'text-yellow-200';
    };

    return (
        <div className={`rounded-lg p-4 mb-4 border ${getStatusColor()}`}>
            <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                    <span className="text-lg">{getStatusIcon()}</span>
                    <div>
                        <h4 className={`font-semibold ${getTextColor()} mb-1`}>
                            DUST Protocol Status
                        </h4>
                        <p className={`text-sm ${getTextColor()}/80`}>
                            {getStatusMessage()}
                        </p>
                        
                        {!status.isReady && !status.error && (
                            <div className="mt-2 space-y-1">
                                <div className="flex items-center space-x-2">
                                    <span className={status.InitVersioningCommand ? '✅' : '❌'}></span>
                                    <span className="text-xs text-white/70">InitVersioningCommand</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className={status.InitDustProductionCommand ? '✅' : '❌'}></span>
                                    <span className="text-xs text-white/70">InitDustProductionCommand</span>
                                </div>
                            </div>
                        )}
                        
                        {status.error && (
                            <p className="text-xs text-red-300/80 mt-2 font-mono">
                                {status.error}
                            </p>
                        )}
                    </div>
                </div>
                
                {(status.error || !status.isReady) && cardano?.lucid ? (
                    <Button
                        size="sm"
                        color="primary"
                        variant="flat"
                        onPress={() => refreshProtocolStatus(cardano.lucid as LucidEvolution)}
                        isDisabled={isChecking}
                    >
                        Retry
                    </Button>
                ) : null}
            </div>
            
            {!status.isReady && !status.error && (
                <div className="mt-3 p-3 bg-white/5 rounded border-l-4 border-yellow-400">
                    <p className="text-xs text-white/70">
                        📝 The DUST protocol requires setup steps 1 & 2 to be completed before user registration. 
                        Please run the setup tool first to initialize the protocol.
                    </p>
                </div>
            )}
        </div>
    );
}
