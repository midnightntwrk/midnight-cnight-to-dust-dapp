import { Button } from '@heroui/button';
import { Card } from '@heroui/card';
import { Tooltip } from '@heroui/tooltip';
import { logger } from '@/lib/logger';
import Image from 'next/image';
import React, { useState } from 'react';

import InfoIcon from '@/assets/icons/info.svg';
import CopyIcon from '@/assets/icons/copy.svg';
import CheckIcon from '@/assets/icons/check.svg';
import MidnightBg from '@/assets/midnight.svg';
import DustBalanceIcon from '@/assets/icons/DUST.svg';
import { useWalletContext } from '@/contexts/WalletContext';
import ToastContainer from '../ui/ToastContainer';
import { useToast } from '@/hooks/useToast';
import { useTransaction } from '@/contexts/TransactionContext';
import { LucidEvolution } from '@lucid-evolution/lucid';
import DustTransactionsUtils from '@/lib/dustTransactionsUtils';
import UpdateAddressModal from '../modals/UpdateAddressModal';
import StopGenerationModal from '../modals/StopGenerationModal';
import WalletsModal from '../wallet-connect/WalletsModal';
import { SupportedMidnightWallet, SupportedWallet } from '@/contexts/WalletContext';
import LoadingBackdrop from '../ui/LoadingBackdrop';
import { useRouter } from 'next/navigation';
import { specksToTDust, specksToTDustFull } from '@/lib/specksToTDust';

const MidnightWalletCard = () => {
  const { toasts, showToast, removeToast } = useToast();
  const router = useRouter();

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const [isMidnightModalOpen, setIsMidnightModalOpen] = useState(false);

  const {
    cardano,
    midnight,
    generationStatus,
    refetchGenerationStatus,
    findRegistrationUtxo,
    isLoadingRegistrationUtxo,
    registrationUtxo,
    connectMidnightWallet,
    getAvailableMidnightWallets,
    disconnectMidnightWallet,
    disconnectCardanoWallet,
    updateMidnightAddress,
  } = useWalletContext();

  // Check if indexer has synced
  const isIndexerSyncing = registrationUtxo && generationStatus?.registered === false;
  const isIndexerSynced = generationStatus?.registered === true;

  // Check if user is connected with Midnight wallet (has wallet API access)
  const isWalletConnected = midnight.isConnected && midnight.walletName !== 'Manual' && midnight.api !== null;

  // Get DUST balance - prefer wallet data if connected, otherwise use indexer
  const getDustBalance = () => {
    if (isWalletConnected && midnight.dustBalance !== null) {
      return specksToTDust(midnight.dustBalance);
    }
    // Otherwise, use indexer data
    if (isIndexerSynced && generationStatus?.currentCapacity) {
      return specksToTDust(generationStatus.currentCapacity);
    }
    if (isIndexerSyncing) {
      return '...';
    }
    return '0';
  };

  // Full-precision balance for tooltip (no ellipsis)
  const getDustBalanceFull = () => {
    if (isWalletConnected && midnight.dustBalance !== null) {
      return specksToTDustFull(midnight.dustBalance);
    }
    if (isIndexerSynced && generationStatus?.currentCapacity) {
      return specksToTDustFull(generationStatus.currentCapacity);
    }
    return null;
  };

  // Get DUST address - prefer wallet data if connected, otherwise use indexer or manual address
  const getDustAddress = () => {
    // If connected with Midnight wallet, use wallet's dust address
    if (isWalletConnected && midnight.dustAddress) {
      return midnight.dustAddress;
    }
    // Otherwise, use indexer data or manual address
    return generationStatus?.dustAddress || midnight.address || '';
  };

  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Transaction management
  const transaction = useTransaction();

  const handleUpdateModalOpenChange = (isOpen: boolean) => {
    setIsUpdateModalOpen(isOpen);
    if (!isOpen) {
      transaction.resetTransaction();
    }
  };

  const handleStopModalOpenChange = (isOpen: boolean) => {
    setIsStopModalOpen(isOpen);
    if (!isOpen) {
      transaction.resetTransaction();
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);

    // Add small delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Disconnect both wallets and clear localStorage
    disconnectCardanoWallet();
    disconnectMidnightWallet();

    // Redirect to home
    router.push('/');
  };

  const handleUnregisterAddress = async () => {
    if (!cardano.lucid) {
      logger.error('❌ Cardano wallet not connected');
      return;
    }

    // Get DUST PKH from midnight wallet (extracted from Dust address)
    const dustPKHValue = midnight.coinPublicKey;
    if (!dustPKHValue) {
      logger.error('❌ Midnight wallet coinPublicKey not available');
      transaction.setError('Midnight wallet coinPublicKey not available. Please reconnect your Midnight wallet.');
      return;
    }

    if (!registrationUtxo) {
      logger.error('❌ Registration UTXO not found');
      transaction.setError('Registration UTXO not found. Please ensure you have registered your address.');
      return;
    }

    try {
      logger.log('🚀 Starting DUST unregistration...', {
        dustPKH: dustPKHValue,
        dustAddress: midnight.dustAddress || midnight.address,
        source: 'Extracted from Dust address via wallet connection',
      });

      // Create the unregistration executor and execute it
      const unregistrationExecutor = DustTransactionsUtils.createUnregistrationExecutor(
        cardano.lucid as LucidEvolution,
        dustPKHValue,
        registrationUtxo
      );

      const transactionState = await transaction.executeTransaction(
        'unregister',
        unregistrationExecutor,
        {},
        cardano.lucid as LucidEvolution
      );

      // Only open success modal if transaction actually succeeded
      if (transactionState === 'success') {
        transaction.resetTransaction();
        handleDisconnect();
        // refetchGenerationStatus();
        // findRegistrationUtxo();
      } else {
        logger.error('transactionState:', transactionState);
        throw new Error('transactionState:' + transactionState);
      }
    } catch (error) {
      logger.error('❌ DUST unregistration failed:', error);
      // Re-throw error so modal can handle it
      throw error;
    }
  };

  const handleUpdateAddress = async (newAddress: string, newCoinPublicKey: string) => {
    if (!cardano.lucid) {
      logger.error('❌ Cardano wallet not connected');
      return;
    }

    // Use the new coin public key passed from the modal
    if (!newCoinPublicKey) {
      logger.error('❌ New coin public key not provided');
      transaction.setError('New coin public key not provided. Please enter a valid Midnight address.');
      return;
    }

    if (!registrationUtxo) {
      logger.error('❌ Registration UTXO not found');
      transaction.setError('Registration UTXO not found. Please ensure you have registered your address.');
      return;
    }

    try {
      logger.log('🚀 Starting DUST update...', {
        newAddress,
        newCoinPublicKey,
        registrationUtxo: {
          txHash: registrationUtxo.txHash,
          outputIndex: registrationUtxo.outputIndex,
        },
      });

      // Create the update executor with the NEW coin public key
      const updateExecutor = DustTransactionsUtils.createUpdateExecutor(
        cardano.lucid as LucidEvolution,
        newCoinPublicKey, // ← Using the NEW coin public key!
        registrationUtxo
      );

      const transactionState = await transaction.executeTransaction(
        'update',
        updateExecutor,
        {},
        cardano.lucid as LucidEvolution
      );

      // Only open success modal if transaction actually succeeded
      if (transactionState === 'success') {
        // Update Midnight wallet state with new address
        // This changes coinPublicKey, which triggers useRegistrationUtxo's useEffect automatically
        updateMidnightAddress(newAddress, newCoinPublicKey);

        transaction.resetTransaction();
        refetchGenerationStatus();
      } else {
        logger.error('transactionState:', transactionState);
        throw new Error('transactionState:' + transactionState);
      }
    } catch (error) {
      logger.error('❌ DUST update failed:', error);
      // Re-throw error so modal can handle it
      throw error;
    }
  };

  const handleConnectMidnight = () => {
    setIsMidnightModalOpen(true);
  };

  const handleMidnightWalletSelect = async (wallet: SupportedWallet | SupportedMidnightWallet) => {
    await connectMidnightWallet(wallet as SupportedMidnightWallet);
    setIsMidnightModalOpen(false);
  };

  const handleFormatWalletAddress = (address: string) => {
    return address.slice(0, 10) + '...' + address.slice(-10);
  };

  const handleCopyAddress = async () => {
    const addressToCopy = getDustAddress();
    if (addressToCopy) {
      try {
        await navigator.clipboard.writeText(addressToCopy);
        showToast({
          message: 'DUST address copied to clipboard!',
          type: 'success',
        });
      } catch {
        showToast({
          message: 'Failed to copy address',
          type: 'error',
        });
      }
    }
  };

  return (
    <Card className="bg-[#70707035] p-[24px] w-full lg:w-[40%] flex flex-col gap-4 relative pb-8">
      <div className="absolute top-1/2 right-[16px] transform -translate-y-1/2">
        <Image src={MidnightBg} alt="cardano bg" width={100} height={100} />
      </div>
      <div className="flex flex-row gap-2 z-10">
        <span className="text-[18px] font-normal">DUST Balance</span>
        <Tooltip
          content={
            isWalletConnected ? 'Fetching data directly from your wallet' : 'Fetching maximum DUST generation capacity'
          }
          placement="top"
          classNames={{
            content: 'bg-gray-800 text-white text-sm px-2 py-1',
          }}
        >
          <Image src={InfoIcon} alt="info" width={24} height={24} className="cursor-pointer" />
        </Tooltip>
      </div>
      <div className="flex flex-row gap-2 items-center z-10">
        <Image src={DustBalanceIcon} alt="dust balance" width={42} height={42} />
        <Tooltip
          content={`${getDustBalanceFull() ?? getDustBalance()} DUST`}
          placement="top"
          classNames={{
            content: 'bg-gray-800 text-white text-sm px-2 py-1',
          }}
        >
          <span
            className={`text-[24px] font-bold cursor-help ${!isWalletConnected && isIndexerSyncing ? 'text-amber-400 animate-pulse' : ''}`}
          >
            {getDustBalance()} DUST
          </span>
        </Tooltip>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-row gap-2 items-center z-10">
          <span className="text-[14px] font-normal text-gray-400">Recipient Address Midnight</span>
          <Tooltip
            content="Midnight DUST address where DUST will be generated."
            placement="top"
            classNames={{
              content: 'bg-gray-800 text-white text-sm px-2 py-1',
            }}
          >
            <Image src={InfoIcon} alt="info" width={20} height={20} className="cursor-pointer" />
          </Tooltip>
        </div>
        <div className="flex flex-row gap-2 items-center z-10">
          <Image src={CheckIcon} alt="check" width={18} height={18} />
          <span>{handleFormatWalletAddress(getDustAddress())}</span>
          <Image
            src={CopyIcon}
            alt="copy"
            width={18}
            height={18}
            className="cursor-pointer hover:opacity-70"
            onClick={handleCopyAddress}
          />
        </div>
      </div>

      <div className="flex z-10 mt-4 gap-4">
        {midnight.isConnected || midnight.isRegisteredOnChain ? (
          // Registered (via wallet or on-chain): Show update and stop buttons
          <>
            <Button
              className="bg-brand-primary hover:bg-brand-primary-hover text-white w-full py-2 text-sm disabled:bg-gray-600 disabled:text-gray-400"
              radius="md"
              size="sm"
              onPress={() => setIsUpdateModalOpen(true)}
              isLoading={isLoadingRegistrationUtxo}
              isDisabled={
                isLoadingRegistrationUtxo ||
                !registrationUtxo ||
                (!transaction.isCurrentTransaction('update') && transaction.isAnyTransactionRunning())
              }
            >
              {isLoadingRegistrationUtxo
                ? 'LOADING REGISTRATION UTXO...'
                : !registrationUtxo
                  ? 'NO REGISTRATION FOUND'
                  : 'CHANGE ADDRESS'}
            </Button>
            <Button
              className="bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-700 w-full py-2 text-sm disabled:bg-gray-600 disabled:text-gray-400"
              radius="md"
              size="sm"
              onPress={() => setIsStopModalOpen(true)}
              isLoading={isLoadingRegistrationUtxo}
              isDisabled={
                isLoadingRegistrationUtxo ||
                !registrationUtxo ||
                (transaction.isCurrentTransaction('unregister') && transaction.isAnyTransactionRunning())
              }
            >
              {isLoadingRegistrationUtxo
                ? 'LOADING REGISTRATION UTXO...'
                : !registrationUtxo
                  ? 'NO REGISTRATION FOUND'
                  : 'STOP GENERATION'}
            </Button>
          </>
        ) : (
          // Not connected and no on-chain registration: Show connect button
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white w-full py-2 text-sm"
            radius="md"
            size="sm"
            onPress={handleConnectMidnight}
            isLoading={midnight.isLoading}
            isDisabled={midnight.isLoading}
          >
            {midnight.isLoading ? 'CONNECTING...' : 'CONNECT MIDNIGHT WALLET'}
          </Button>
        )}
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Modals */}
      <UpdateAddressModal
        isOpen={isUpdateModalOpen}
        onOpenChange={handleUpdateModalOpenChange}
        onAddressUpdate={handleUpdateAddress}
      />

      <StopGenerationModal
        isOpen={isStopModalOpen}
        onOpenChange={handleStopModalOpenChange}
        dustAddress={midnight.address}
        onStopGeneration={handleUnregisterAddress}
      />

      {/* Midnight Wallet Selection Modal */}
      <WalletsModal
        isOpen={isMidnightModalOpen}
        onOpenChange={setIsMidnightModalOpen}
        wallets={getAvailableMidnightWallets()}
        handleWalletSelect={handleMidnightWalletSelect}
      />

      <LoadingBackdrop
        isVisible={isDisconnecting}
        title="Disconnecting wallet..."
        subtitle="Redirecting to home page"
      />
    </Card>
  );
};

export default MidnightWalletCard;
