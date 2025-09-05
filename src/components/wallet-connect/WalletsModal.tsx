import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    useDisclosure,
} from "@heroui/react";
import { SupportedWallet } from "@/hooks/useCardanoWallet";
import { SupportedMidnightWallet } from "@/hooks/useMidnightWallet";

export default function WalletsModal({ wallets, handleWalletSelect, isOpen, onOpenChange }:
    {
        wallets: SupportedWallet[] | SupportedMidnightWallet[],
        handleWalletSelect: (wallet: SupportedWallet | SupportedMidnightWallet) => void,
        isOpen: boolean,
        onOpenChange: (open: boolean) => void
    }) {

    console.log('>>> wallets', wallets);

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            Connect your wallet
                        </ModalHeader>
                        {wallets.length > 0 ? (
                            <ModalBody>
                                {wallets.map((wallet, index) => (
                                    <Button
                                        key={index}
                                        color="primary"
                                        onPress={() => handleWalletSelect(wallet)}
                                    >
                                        {wallet}
                                    </Button>
                                ))}
                            </ModalBody>
                        ) : (
                            <ModalBody>
                                <div>
                                    <p>No Cardano wallets detected.</p>
                                    <p>Please install a wallet like Nami, Eternl, or Lace first.</p>
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
