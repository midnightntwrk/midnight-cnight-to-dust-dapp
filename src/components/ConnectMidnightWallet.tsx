'use client'

import React, { useState } from 'react';
import { useMidnightWallet, SupportedMidnightWallet } from '@/hooks/useMidnightWallet';

const MidnightWalletConnect: React.FC = () => {
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
  
  const [showWalletList, setShowWalletList] = useState(false);

  // Wallet display names and icons
  const walletInfo = {
    mnLace: { name: 'Lace (Midnight)', icon: '🌙' },
  };

  const handleWalletSelect = async (wallet: SupportedMidnightWallet) => {
    setShowWalletList(false);
    await connectWallet(wallet);
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
          className="connect-wallet-btn midnight-btn"
        >
          {isLoading ? '⏳ Connecting...' : '🌙 Connect Midnight Wallet'}
        </button>
      ) : (
        <div className="wallet-selection">
          <h3>Choose your Midnight wallet:</h3>
          <div className="wallet-list">
            {availableWallets.length > 0 ? (
              availableWallets.map((wallet) => (
                <button
                  key={wallet}
                  onClick={() => handleWalletSelect(wallet)}
                  className="wallet-option midnight-option"
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
                <p>No Midnight wallets detected.</p>
                <p>Please install Lace wallet with Midnight support first.</p>
                <div className="wallet-links">
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
        
        .midnight-btn {
          background: #4a1d96;
          background: linear-gradient(135deg, #4a1d96 0%, #2d1b69 100%);
        }
        
        .connect-wallet-btn:hover {
          background: #0052a3;
        }
        
        .midnight-btn:hover {
          background: linear-gradient(135deg, #3d1a7a 0%, #261654 100%);
        }
        
        .connect-wallet-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .wallet-selection h3 {
          margin: 0 0 15px 0;
          color: #4a1d96;
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
        
        .midnight-option {
          border-color: #4a1d96;
        }
        
        .wallet-option:hover, .midnight-option:hover {
          background: #f8f6ff;
        }
        
        .wallet-icon {
          font-size: 20px;
        }
        
        .wallet-name {
          font-weight: 500;
          color: #4a1d96;
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
          background: #f8f6ff;
          border: 1px solid #4a1d96;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 15px;
        }
        
        .wallet-info h3 {
          color: #4a1d96;
        }
        
        .wallet-info p {
          margin: 5px 0;
          font-size: 14px;
          color: #333;
        }
        
        .address-text {
          font-family: monospace;
          font-size: 11px;
          background: #f0f0f0;
          padding: 4px 6px;
          border-radius: 3px;
          word-break: break-all;
          margin: 2px 0 !important;
        }
        
        .note-text {
          font-size: 12px !important;
          color: #666 !important;
          font-style: italic;
          margin-top: 8px !important;
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
          color: #4a1d96;
          text-decoration: none;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default MidnightWalletConnect;