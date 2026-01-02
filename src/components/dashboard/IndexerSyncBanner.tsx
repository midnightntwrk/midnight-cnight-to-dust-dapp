import { Card } from '@heroui/react';
import Image from 'next/image';
import InfoIcon from '@/assets/icons/info.svg';

interface IndexerSyncBannerProps {
  isVisible: boolean;
}

const IndexerSyncBanner = ({ isVisible }: IndexerSyncBannerProps) => {
  if (!isVisible) return null;

  return (
    <Card className="bg-gradient-to-r from-amber-900/40 to-amber-800/30 border border-amber-600/50 p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Image src={InfoIcon} alt="info" width={20} height={20} className="opacity-90" />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-amber-300 font-semibold text-sm">Registration Syncing</h3>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
          <p className="text-amber-100/80 text-sm leading-relaxed">
            Your registration was successful and recorded on the Cardano blockchain. The indexer is processing your registration, which may take up to{' '}
            <span className="font-semibold text-amber-200">12 hours</span>. Once complete, your DUST generation details will appear below.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default IndexerSyncBanner;
