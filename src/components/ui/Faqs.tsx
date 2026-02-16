'use client';

import React from 'react';
import { Accordion, AccordionItem } from '@heroui/react';

export default function Faqs() {
  const faqData = [
    {
      key: '1',
      title: 'What is DUST?',
      content:
        'DUST is a shielded, non-transferable, renewable resource used to pay transaction fees on Midnight. NIGHT token holders may generate DUST resources by registering their NIGHT tokens for generation, and explicitly designating a DUST address as recipient.',
    },
    {
      key: '2',
      title: 'What wallets are supported?',
      content:
        'On the Cardano side, a browser-based, CIP-30 compatible Cardano wallet is required in order to connect with this app and sign the registration transaction. Supported wallets include Lace wallet (Cardano), Nami, Eternl, Lace, Flint, Typhon, NuFi, GeroWallet, and CCVault. On the Midnight side, you may optionally also connect the recipient address using a Midnight-compatible wallet, like Lace wallet (Midnight).',
    },
    {
      key: '3',
      title: 'How can I generate DUST?',
      content:
        'To generate DUST via this app, you must a) hold NIGHT tokens (plus a small amount of ADA for transaction fees) in a CIP-30-compatible Cardano wallet, and b) provide a recipient DUST address on the Midnight network. To start the generation, you must register the Cardano address holding your NIGHT tokens for generation, thus designating the DUST address as recipient. The generation transaction also requires a small amount of ADA in your Cardano wallet to cover the transaction fees.',
    },
    {
      key: '4',
      title: 'How long does it take for the DUST generation to start?',
      content:
        'It takes up to 12 hours for DUST generation to start on Midnight once a registration is successful on Cardano.',
    },
    {
      key: '5',
      title: 'Is there any cost to register my NIGHT for DUST generation?',
      content:
        'Registering, re-registering, or de-registering your Cardano-held NIGHT through this app is free. However, each such action involves executing a Cardano transaction, and will thus incur a network transaction fee. In addition to NIGHT, your generating wallet must have a small amount of ADA to cover the transaction fees.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">FAQs</h2>
      </div>

      <Accordion
        variant="splitted"
        className="px-0"
        itemClasses={{
          base: 'bg-black border-none rounded-lg mb-2',
          title: 'text-white font-medium',
          trigger: 'py-4 px-6 hover:bg-[#111111]',
          content: 'text-gray-300 text-sm px-6 pb-4',
        }}
      >
        {faqData.map((faq) => (
          <AccordionItem key={faq.key} aria-label={faq.title} title={faq.title}>
            {faq.content}
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
