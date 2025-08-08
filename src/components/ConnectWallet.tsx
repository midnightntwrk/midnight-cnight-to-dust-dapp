'use client'

import React from 'react'

const ConnectWallet = () => {

    const connectWallet = async () => {
        // const api = await window.midnight.lace.enable();
        // try {
        //     const api = await window.midnight.lace.enable();
        //     // api is now your interface to the wallet
        // } catch (error) {
        //     console.log('An error occurred', error);
        // }
    }

    return (
        <div>

            <button onClick={connectWallet}>Connect Wallet</button>

        </div>
    )
}

export default ConnectWallet