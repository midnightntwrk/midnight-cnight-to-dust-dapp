'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { LucidEvolution } from '@lucid-evolution/lucid';
import { contractService, ContractsRegistry } from '@/services/contractService';
import { dustProtocolService, DustProtocolStatus } from '@/services/dustProtocolService';

// Types
interface DustProtocolContextType {
    // Contract loading state
    contracts: ContractsRegistry;
    isContractsLoaded: boolean;
    isContractsLoading: boolean;
    contractsError: string | null;
    
    // Protocol status state
    protocolStatus: DustProtocolStatus | null;
    isProtocolStatusLoaded: boolean;
    isProtocolStatusLoading: boolean;
    
    // Methods
    loadContracts: () => Promise<void>;
    checkProtocolStatus: (lucid: LucidEvolution) => Promise<void>;
    refreshProtocolStatus: (lucid: LucidEvolution) => Promise<void>;
}

// Create context
const DustProtocolContext = createContext<DustProtocolContextType | undefined>(undefined);

// Provider component
export const DustProtocolProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Contract loading state
    const [contracts, setContracts] = useState<ContractsRegistry>({});
    const [isContractsLoaded, setIsContractsLoaded] = useState(false);
    const [isContractsLoading, setIsContractsLoading] = useState(false);
    const [contractsError, setContractsError] = useState<string | null>(null);
    
    // Protocol status state
    const [protocolStatus, setProtocolStatus] = useState<DustProtocolStatus | null>(null);
    const [isProtocolStatusLoaded, setIsProtocolStatusLoaded] = useState(false);
    const [isProtocolStatusLoading, setIsProtocolStatusLoading] = useState(false);

    // Load contracts method
    const loadContracts = useCallback(async () => {
        if (isContractsLoading || isContractsLoaded) return;
        
        try {
            setIsContractsLoading(true);
            setContractsError(null);
            
            console.log('🔄 Loading DUST protocol contracts...');
            const loadedContracts = await contractService.loadAllContracts();
            
            setContracts(loadedContracts);
            setIsContractsLoaded(true);
            console.log('✅ DUST protocol contracts loaded successfully');
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load contracts';
            console.error('❌ Failed to load contracts:', errorMessage);
            setContractsError(errorMessage);
        } finally {
            setIsContractsLoading(false);
        }
    }, [isContractsLoading, isContractsLoaded]);

    // Check protocol status method
    const checkProtocolStatus = async (lucid: LucidEvolution) => {
        if (!isContractsLoaded) {
            console.warn('⚠️ Contracts not loaded yet, cannot check protocol status');
            return;
        }
        
        try {
            setIsProtocolStatusLoading(true);
            
            console.log('🔄 Checking DUST protocol status...');
            const status = await dustProtocolService.checkSetupStatus(lucid);
            
            setProtocolStatus(status);
            setIsProtocolStatusLoaded(true);
            console.log('✅ DUST protocol status checked:', status);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to check protocol status';
            console.error('❌ Failed to check protocol status:', errorMessage);
            
            // Set protocol status with error
            setProtocolStatus({
                isReady: false,
                currentStep: 1,
                InitVersioningCommand: false,
                InitDustProductionCommand: false,
                error: errorMessage
            });
            setIsProtocolStatusLoaded(true);
        } finally {
            setIsProtocolStatusLoading(false);
        }
    };

    // Refresh protocol status (force reload)
    const refreshProtocolStatus = async (lucid: LucidEvolution) => {
        setIsProtocolStatusLoaded(false);
        setProtocolStatus(null);
        await checkProtocolStatus(lucid);
    };

    // Auto-load contracts on mount
    useEffect(() => {
        loadContracts();
    }, [loadContracts]);

    const contextValue: DustProtocolContextType = {
        // Contract state
        contracts,
        isContractsLoaded,
        isContractsLoading,
        contractsError,
        
        // Protocol status state
        protocolStatus,
        isProtocolStatusLoaded,
        isProtocolStatusLoading,
        
        // Methods
        loadContracts,
        checkProtocolStatus,
        refreshProtocolStatus,
    };

    return (
        <DustProtocolContext.Provider value={contextValue}>
            {children}
        </DustProtocolContext.Provider>
    );
};

// Custom hook to use the context
export const useDustProtocol = () => {
    const context = useContext(DustProtocolContext);
    if (context === undefined) {
        throw new Error('useDustProtocol must be used within a DustProtocolProvider');
    }
    return context;
};

// Export types for external use
export type { DustProtocolContextType };
