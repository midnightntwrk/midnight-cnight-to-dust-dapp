import { Tooltip } from '@heroui/react';
import Image from 'next/image';
import React from 'react';
import InfoIcon from '@/assets/icons/info.svg';
import CopyIcon from '@/assets/icons/copy.svg';
import CheckIcon from '@/assets/icons/check.svg';
import { useWalletContext } from '@/contexts/WalletContext';
import ToastContainer from '../ui/ToastContainer';
import { useToast } from '@/hooks/useToast';

const RegistrationUtxoCard = () => {
  const { toasts, showToast, removeToast } = useToast();
  const { registrationUtxo } = useWalletContext();

  const handleFormatHash = (hash: string) => {
    return hash.slice(0, 8) + '...' + hash.slice(-8);
  };

  const handleFormatAddress = (address: string) => {
    return address.slice(0, 12) + '...' + address.slice(-12);
  };

  const handleFormatDatum = (datum: string) => {
    return datum.slice(0, 20) + '...' + datum.slice(-20);
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast({
        message: `${label} copied to clipboard!`,
        type: 'success',
      });
    } catch {
      showToast({
        message: `Failed to copy ${label}`,
        type: 'error',
      });
    }
  };

  if (!registrationUtxo) {
    return null;
  }

  return (
    <>
      <div className="w-full flex flex-col gap-4 relative">
        <div className="flex flex-row gap-2 z-10 relative items-center">
          <span className="text-[16px] font-normal text-gray-400">On-chain proof of your Cardano-Midnight address registration</span>
          <Tooltip
            content="This UTXO contains your registration data on the Cardano blockchain"
            placement="top"
            classNames={{
              content: 'bg-gray-800 text-white text-sm px-2 py-1',
            }}
          >
            <Image src={InfoIcon} alt="info" width={20} height={20} className="cursor-pointer" />
          </Tooltip>
        </div>

        {/* Transaction Hash */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-row gap-2 items-center z-10">
            <span className="text-[14px] font-normal text-gray-400">Transaction Hash</span>
          </div>
          <div className="flex flex-row gap-2 items-center z-10">
            <Image src={CheckIcon} alt="check" width={18} height={18} />
            <span className="text-sm font-mono">{handleFormatHash(registrationUtxo.txHash)}</span>
            <Image
              src={CopyIcon}
              alt="copy"
              width={18}
              height={18}
              className="cursor-pointer hover:opacity-70"
              onClick={() => handleCopy(registrationUtxo.txHash, 'Transaction hash')}
            />
          </div>
        </div>

        {/* Address */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-row gap-2 items-center z-10">
            <span className="text-[14px] font-normal text-gray-400">Address</span>
          </div>
          <div className="flex flex-row gap-2 items-center z-10">
            <Image src={CheckIcon} alt="check" width={18} height={18} />
            <span className="text-sm font-mono">{handleFormatAddress(registrationUtxo.address)}</span>
            <Image src={CopyIcon} alt="copy" width={18} height={18} className="cursor-pointer hover:opacity-70" onClick={() => handleCopy(registrationUtxo.address, 'Address')} />
          </div>
        </div>

        {/* Datum */}
        {registrationUtxo.datum && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-row gap-2 items-center z-10">
              <span className="text-[14px] font-normal text-gray-400">Datum</span>
            </div>
            <div className="flex flex-row gap-2 items-center z-10">
              <Image src={CheckIcon} alt="check" width={18} height={18} />
              <span className="text-sm font-mono">{handleFormatDatum(registrationUtxo.datum)}</span>
              <Image
                src={CopyIcon}
                alt="copy"
                width={18}
                height={18}
                className="cursor-pointer hover:opacity-70"
                onClick={() => handleCopy(registrationUtxo.datum || '', 'Datum')}
              />
            </div>
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
};

export default RegistrationUtxoCard;
