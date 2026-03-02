import { SupportedMidnightWallet, SupportedWallet } from '@/contexts/WalletContext';
import { Button } from '@heroui/button';
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/modal';

export default function WalletsModal({
  wallets,
  handleWalletSelect,
  isOpen,
  onOpenChange,
}: {
  wallets: SupportedWallet[] | SupportedMidnightWallet[];
  handleWalletSelect: (wallet: SupportedWallet | SupportedMidnightWallet) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const walletInfo = {
    nami: { name: 'Nami', icon: '🦎' },
    eternl: { name: 'Eternl', icon: '♾️' },
    lace: { name: 'Lace', icon: '🎭' },
    flint: { name: 'Flint', icon: '🔥' },
    typhoncip30: { name: 'Typhon', icon: '🌪️' },
    nufi: { name: 'NuFi', icon: '💎' },
    gero: { name: 'GeroWallet', icon: '⚡' },
    ccvault: { name: 'CCVault', icon: '🛡️' },
    mnLace: { name: 'Lace (Midnight)', icon: '🌙' },
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">Connect your wallet</ModalHeader>
            {wallets.length > 0 ? (
              <ModalBody>
                {wallets.map((wallet, index) => (
                  <Button
                    key={index}
                    className="bg-brand-primary hover:bg-brand-primary-hover text-white font-medium"
                    onPress={() => handleWalletSelect(wallet)}
                    startContent={<span className="text-2xl">{walletInfo[wallet as SupportedWallet]?.icon}</span>}
                  >
                    {walletInfo[wallet as SupportedWallet]?.name?.toUpperCase()}
                  </Button>
                ))}
              </ModalBody>
            ) : (
              <ModalBody>
                <div>
                  <p>No wallets detected.</p>
                  <p>Please install a CIP-30-compatible Cardano wallet firs</p>
                  <div className="flex flex-col gap-2">
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
              </ModalBody>
            )}
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose}>
                Close
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
