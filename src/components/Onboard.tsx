'use client'

import ConnectCardanoWallet from "./ConnectCardanoWallet"
import ConnectMidnightWallet from "./ConnectMidnightWallet"

export default function Onboard() {

    return (
        <div className="flex flex-col gap-4 items-center justify-center">
            <p className="text-2xl font-bold">Connect your cardano wallet</p>
            <p className="text-md text-gray-500">Connect your CIP-30 compatible wallet to begin</p>

            <ConnectCardanoWallet />
            <ConnectMidnightWallet />

        </div>
    )
}