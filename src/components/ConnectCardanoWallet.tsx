'use client'

import React, { useState } from 'react';
import { useCardanoWallet, SupportedWallet } from '@/hooks/useCardanoWallet';

const WalletConnect: React.FC = () => {
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
  } = useCardanoWallet();
  
  const [showWalletList, setShowWalletList] = useState(false);

  // Wallet display names and icons
  const walletInfo = {
    nami: { name: 'Nami', icon: '🦎' },
    eternl: { name: 'Eternl', icon: '♾️' },
    lace: { name: 'Lace', icon: '🎭' },
    flint: { name: 'Flint', icon: '🔥' },
    typhoncip30: { name: 'Typhon', icon: '🌪️' },
    nufi: { name: 'NuFi', icon: '💎' },
    gero: { name: 'GeroWallet', icon: '⚡' },
    ccvault: { name: 'CCVault', icon: '🛡️' },
  };

  const handleWalletSelect = async (wallet: SupportedWallet) => {
    setShowWalletList(false);
    await connectWallet(wallet);
  };

  if (isConnected) {
    return (
      <div className="wallet-connected">
        <div className="wallet-info">
          <h3>✅ Wallet Connected</h3>
          <p><strong>Wallet:</strong> {walletInfo[walletName as SupportedWallet]?.name}</p>
          <p><strong>Balance:</strong> {balance} ADA</p>
          <p><strong>Address:</strong> {address?.slice(0, 20)}...{address?.slice(-10)}</p>
        </div>
        <button 
          onClick={disconnectWallet}
          className="disconnect-btn"
        >
          Disconnect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-connect">
      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {!showWalletList ? (
        <button 
          onClick={() => setShowWalletList(true)}
          disabled={isLoading}
          className="connect-wallet-btn"
        >
          {isLoading ? '⏳ Connecting...' : '🔗 Connect Cardano Wallet'}
        </button>
      ) : (
        <div className="wallet-selection">
          <h3>Choose your wallet:</h3>
          <div className="wallet-list">
            {availableWallets.length > 0 ? (
              availableWallets.map((wallet) => (
                <button
                  key={wallet}
                  onClick={() => handleWalletSelect(wallet)}
                  className="wallet-option"
                  disabled={isLoading}
                >
                  <span className="wallet-icon">
                    {walletInfo[wallet]?.icon}
                  </span>
                  <span className="wallet-name">
                    {walletInfo[wallet]?.name}
                  </span>
                </button>
              ))
            ) : (
              <div className="no-wallets">
                <p>No Cardano wallets detected.</p>
                <p>Please install a wallet like Nami, Eternl, or Lace first.</p>
                <div className="wallet-links">
                  <a href="https://namiwallet.io/" target="_blank" rel="noopener noreferrer">
                    Install Nami
                  </a>
                  <a href="https://eternl.io/" target="_blank" rel="noopener noreferrer">
                    Install Eternl
                  </a>
                  <a href="https://www.lace.io/" target="_blank" rel="noopener noreferrer">
                    Install Lace
                  </a>
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={() => setShowWalletList(false)}
            className="cancel-btn"
          >
            Cancel
          </button>
        </div>
      )}

      <style jsx>{`
        .wallet-connect {
          max-width: 400px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-family: Arial, sans-serif;
        }
        
        .connect-wallet-btn {
          background: #0066cc;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          width: 100%;
        }
        
        .connect-wallet-btn:hover {
          background: #0052a3;
        }
        
        .connect-wallet-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .wallet-selection h3 {
          margin: 0 0 15px 0;
        }
        
        .wallet-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .wallet-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .wallet-option:hover {
          background: #f5f5f5;
        }
        
        .wallet-icon {
          font-size: 20px;
        }
        
        .wallet-name {
          font-weight: 500;
        }
        
        .cancel-btn {
          background: #666;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          width: 100%;
        }
        
        .wallet-connected {
          text-align: center;
        }
        
        .wallet-info {
          background: #f0f8ff;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 15px;
        }
        
        .wallet-info p {
          margin: 5px 0;
          font-size: 14px;
        }
        
        .disconnect-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .error-message {
          background: #ffe6e6;
          color: #cc0000;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 15px;
          font-size: 14px;
        }
        
        .no-wallets {
          text-align: center;
          padding: 20px;
        }
        
        .wallet-links {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 15px;
        }
        
        .wallet-links a {
          color: #0066cc;
          text-decoration: none;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default WalletConnect;