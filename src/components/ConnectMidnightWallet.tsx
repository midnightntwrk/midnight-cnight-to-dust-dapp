'use client'

import React, { useState } from 'react';
import { useMidnightWallet, SupportedMidnightWallet } from '@/hooks/useMidnightWallet';
import WalletsModal from './wallet-connect/WalletsModal';
import { Button } from '@heroui/react';
import { SupportedWallet } from '@/hooks/useCardanoWallet';

const ConnectMidnightWallet: React.FC = () => {
  const {
    isConnected,
    address,
    balance,
    walletName,
    isLoading,
    error,
    connectWallet,
    disconnectWallet,
    availableWallets
  } = useMidnightWallet();

  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  // Wallet display names and icons
  const walletInfo = {
    mnLace: { name: 'Lace (Midnight)', icon: '🌙' },
  };

  const handleWalletSelect = async (wallet: SupportedWallet | SupportedMidnightWallet) => {
    await connectWallet(wallet as SupportedMidnightWallet);
  };

  if (isConnected) {
    return (
      <div className="wallet-connected">
        <div className="wallet-info">
          <h3>✅ Midnight Wallet Connected</h3>
          <p><strong>Wallet:</strong> {walletInfo[walletName as SupportedMidnightWallet]?.name}</p>
          <p><strong>Balance:</strong> {balance}</p>
          <p><strong>Shield Address:</strong></p>
          <p className="address-text">{address?.slice(0, 40)}...{address?.slice(-20)}</p>
          <p className="note-text">🛡️ Private shielded address for enhanced privacy</p>
        </div>
        <button
          onClick={disconnectWallet}
          className="disconnect-btn"
        >
          Disconnect Midnight Wallet
        </button>
      </div>
    );
  }

  return (
    <>

      <Button
        onPress={() => setIsWalletModalOpen(true)}
        disabled={isLoading}
      >
        {isLoading ? '⏳ Connecting...' : '🌙 Connect Midnight Wallet'}
      </Button>

      <WalletsModal
        isOpen={isWalletModalOpen}
        onOpenChange={setIsWalletModalOpen}
        wallets={availableWallets}
        handleWalletSelect={handleWalletSelect}
      />
    </>
  );
};

export default ConnectMidnightWallet;