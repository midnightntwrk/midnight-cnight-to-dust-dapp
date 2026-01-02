'use client';
import { logger } from '@/lib/logger';

import React, { useState } from 'react';
import { Button, Input, Link, Checkbox } from '@heroui/react';
import Image from 'next/image';
import MidnightLogo from '@/assets/icons/midnight-logo.svg';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && agreedToTerms) {
      logger.log('Email submitted:', email);
      // Handle email submission logic here
      setEmail('');
      setAgreedToTerms(false);
    }
  };

  return (
    <footer className="bg-[#151515] text-white py-16 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          {/* Left Section - Midnight Branding & Links */}
          <div className="space-y-8">
            {/* Midnight Logo */}
            <Image src={MidnightLogo} alt="wallet" width={160} height={74} />

            {/* Explore Links */}
            <div>
              <h3 className="text-white font-medium mb-4 text-sm uppercase tracking-wider">EXPLORE</h3>
              <div className="space-y-3">
                <div>
                  <Link href="https://midnight.network" target="_blank" className="text-gray-400 hover:text-white text-sm flex items-center gap-2">
                    midnight.network
                    <span className="text-xs">↗</span>
                  </Link>
                </div>
                <div>
                  <Link href="https://midnight.foundation" target="_blank" className="text-gray-400 hover:text-white text-sm flex items-center gap-2">
                    midnight.foundation
                    <span className="text-xs">↗</span>
                  </Link>
                </div>
                <div>
                  <Link href="https://docs.midnight.network" target="_blank" className="text-gray-400 hover:text-white text-sm flex items-center gap-2">
                    docs.midnight.network
                    <span className="text-xs">↗</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Email Signup */}
          <div className="space-y-6">
            <div>
              <h3 className="text-white font-medium mb-2 text-sm uppercase tracking-wider">SIGN UP FOR UPDATES</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                classNames={{
                  input: 'bg-transparent text-white placeholder-gray-400',
                  inputWrapper: 'bg-transparent border-gray-600 border-1 hover:border-gray-400 focus-within:border-white',
                }}
                required
              />

              <div className="space-y-4 flex justify-between">
                <Checkbox
                  isSelected={agreedToTerms}
                  onValueChange={setAgreedToTerms}
                  size="sm"
                  classNames={{
                    wrapper: 'before:border-gray-600',
                    label: 'text-gray-400 text-xs',
                  }}
                >
                  I confirm I have read an understood the{' '}
                  <Link href="#" className="text-white underline text-xs">
                    Terms & Conditions
                  </Link>
                </Checkbox>

                <Button
                  type="submit"
                  disabled={!email || !agreedToTerms}
                  className="bg-white text-black font-medium px-8 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  size="sm"
                >
                  SUBMIT
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Social Media Links */}
        <div className="mb-12">
          <h3 className="text-white font-medium mb-4 text-sm uppercase tracking-wider">FOLLOW MIDNIGHT</h3>
          <div className="flex flex-wrap gap-4">
            <Link href="#" className="text-gray-400 hover:text-white text-sm flex items-center gap-2">
              TWITTER
            </Link>
            <Link href="#" className="text-gray-400 hover:text-white text-sm flex items-center gap-2">
              DISCORD
            </Link>
            <Link href="#" className="text-gray-400 hover:text-white text-sm flex items-center gap-2">
              TELEGRAM
            </Link>
            <Link href="#" className="text-gray-400 hover:text-white text-sm flex items-center gap-2">
              LINKEDIN
            </Link>
            <Link href="#" className="text-gray-400 hover:text-white text-sm flex items-center gap-2">
              YOUTUBE
            </Link>
          </div>
        </div>

        {/* Legal Links */}
        <div className="pt-8 border-t border-gray-800">
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="#" className="text-gray-400 hover:text-white text-xs uppercase tracking-wider">
              PRIVACY POLICY
            </Link>
            <Link href="#" className="text-gray-400 hover:text-white text-xs uppercase tracking-wider">
              TERMS & CONDITIONS
            </Link>
            <Link href="#" className="text-gray-400 hover:text-white text-xs uppercase tracking-wider">
              COOKIES POLICY
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
