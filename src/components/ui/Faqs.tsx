'use client';

import React from 'react';
import { Accordion, AccordionItem } from '@heroui/accordion';
import { useRuntimeConfig } from '@/contexts/RuntimeConfigContext';

export default function Faqs() {
  const { isPreview } = useRuntimeConfig();
  const dustGenerationDuration = isPreview ? '2.5 hours' : '12 hours';

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
      content: `It takes at least ${dustGenerationDuration} for DUST generation to start on Midnight once a registration is successful on Cardano.`,
    },
    {
      key: '5',
      title: 'Is there any cost to register my NIGHT for DUST generation?',
      content:
        'Registering, re-registering, or de-registering your Cardano-held NIGHT through this app is free. However, each such action involves executing a Cardano transaction, and will thus incur a network transaction fee. In addition to NIGHT, your generating wallet must have a small amount of ADA to cover the transaction fees.',
    },
    {
      key: '6',
      title: 'What is the DUST Generator?',
      content:
        'The DUST Generator links the Cardano wallet that holds your NIGHT to a DUST address on the Midnight network. Once linked, the NIGHT in your Cardano wallet automatically generates DUST at the Midnight address you specified.',
    },
    {
      key: '7',
      title: 'Do I need a Cardano wallet to use this?',
      content:
        'Yes. You need a compatible Cardano wallet to complete the address mapping. The dApp connects to your wallet to verify ownership and sign the mapping transaction.',
    },
    {
      key: '8',
      title: 'Do I need a Midnight wallet to use this?',
      content:
        'Yes. You need a compatible Midnight wallet to complete the address mapping. The dApp connects to your wallet to verify ownership and to designate the generated DUST to the DUST address.',
    },
    {
      key: '9',
      title: 'Which wallets are supported?',
      content:
        'The dApp supports wallets compatible with the Cardano and Midnight network. Check the Midnight documentation at docs.midnight.network for the most current list.',
    },
    {
      key: '10',
      title: 'My wallet won\'t connect, what should I do?',
      content:
        'Try refreshing the page, ensuring your wallet extension is up to date and that you\'re not running conflicting browser extensions.',
    },
    {
      key: '11',
      title: 'Can I designate DUST to multiple wallets?',
      content:
        'No. The NIGHT balance in your wallet can only be designated to a single DUST address.',
    },
    {
      key: '12',
      title: 'Can I change the DUST designation wallet?',
      content: 'Yes. You may change your DUST designation at any time.',
    },
    {
      key: '13',
      title: 'When will I see DUST in my wallet?',
      content:
        `DUST starts accumulating as soon as the DUST registration is successful. However, it will take at least ${dustGenerationDuration} for the DUST to show up in your Midnight wallet.`,
    },
    {
      key: '14',
      title: 'What happens if I move my NIGHT from the designated wallet?',
      content:
        'Each NIGHT you hold generates DUST up to a cap of 5 DUST per NIGHT. If you move your NIGHT to another wallet, the corresponding DUST will decay over time down to the cap of however much NIGHT remains in the original wallet.',
    },
    {
      key: '15',
      title: 'Can I stop generating DUST?',
      content:
        'Yes. You can stop generating DUST for your NIGHT. When you do, the DUST will decay over a period of time down to zero.',
    },
    {
      key: '16',
      title: 'Have Questions?',
      content: (
        <a
          href="https://midnightfoundation.notion.site/3334057b9f2380cdb50fdfb5183600bb?pvs=105"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline"
        >
          Submit a ticket here.
        </a>
      ),
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
