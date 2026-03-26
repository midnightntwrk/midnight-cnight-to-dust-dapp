'use client';

import { Card } from '@heroui/card';
import { Tooltip } from '@heroui/tooltip';
import { Spinner } from '@heroui/spinner';
import Image from 'next/image';
import InfoIcon from '@/assets/icons/info.svg';
import { UTxO } from '@lucid-evolution/lucid';

interface ReplicateRegistrationBannerProps {
  isVisible: boolean;
  replicateUtxos: UTxO[];
  onRemoveReplicate: (utxo: UTxO) => void;
  removingTxHash: string | null;
}

const ReplicateRegistrationBanner = ({
  isVisible,
  replicateUtxos,
  onRemoveReplicate,
  removingTxHash,
}: ReplicateRegistrationBannerProps) => {
  if (!isVisible || replicateUtxos.length === 0) return null;

  const truncateTxHash = (hash: string) => `${hash.slice(0, 8)}...${hash.slice(-8)}`;

  return (
    <Card className="bg-gradient-to-r from-red-900/40 to-red-800/30 border border-red-600/50 p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
            <Tooltip
              content="Multiple registration UTXOs detected for the same stake key. DUST generation is paused until replicates are removed."
              placement="top"
              classNames={{
                content: 'bg-gray-800 text-white text-sm px-2 py-1',
              }}
            >
              <Image src={InfoIcon} alt="info" width={20} height={20} className="cursor-pointer" />
            </Tooltip>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-red-300 font-semibold text-sm mb-1">
            Replicate Registrations Detected ({replicateUtxos.length})
          </h3>
          <p className="text-red-100/80 text-sm leading-relaxed mb-3">
            Multiple registration UTXOs exist for your stake key. DUST generation is paused until the replicates are
            removed. Remove each replicate below to restore generation.
          </p>
          <div className="space-y-2">
            {replicateUtxos.map((utxo) => {
              const isRemoving = removingTxHash === utxo.txHash;
              return (
                <div
                  key={`${utxo.txHash}:${utxo.outputIndex}`}
                  className="flex items-center justify-between bg-red-950/30 rounded-lg px-3 py-2"
                >
                  <span className="text-red-200/70 text-xs font-mono">
                    {truncateTxHash(utxo.txHash)}#{utxo.outputIndex}
                  </span>
                  <button
                    onClick={() => onRemoveReplicate(utxo)}
                    disabled={removingTxHash !== null}
                    className="text-xs font-medium px-3 py-1 rounded bg-red-600/40 hover:bg-red-600/60 text-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isRemoving ? (
                      <>
                        <Spinner size="sm" color="white" />
                        Removing...
                      </>
                    ) : (
                      'Remove'
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ReplicateRegistrationBanner;
