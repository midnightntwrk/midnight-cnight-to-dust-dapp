'use client';

import React from 'react';
import { Accordion, AccordionItem } from '@heroui/react';

export default function Faqs() {
  const faqData = [
    {
      key: '1',
      title: 'What is DUST?',
      content:
        'You will need DUST token to pay gas in Midnight. DUST is a unique token that plays a crucial role in our ecosystem, enhancing transaction efficiency and user engagement.',
    },
    {
      key: '2',
      title: 'What wallets are supported?',
      content: 'We support Cardano addresses and Midnight addresses for seamless transactions.',
    },
    {
      key: '3',
      title: 'How can I generate DUST?',
      content: 'You can earn DUST through holding NIGHT in a Cardano wallet.',
    },
    {
      key: '4',
      title: 'Why am I not generating DUST tokens?',
      content: 'This could be due to not meeting the necessary criteria or participating in eligible activities.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">FAQs</h2>
        <p className="text-gray-400 text-sm">Here are some quick insights into wallets and DUST.</p>
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
