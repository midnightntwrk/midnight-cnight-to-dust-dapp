'use client';

import React from 'react';
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, NavbarMenuToggle, NavbarMenu, NavbarMenuItem, Link } from '@heroui/react';
import { useWalletContext } from '@/contexts/WalletContext';
import Image from 'next/image';

export default function MidnightNavbar() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { cardano, midnight } = useWalletContext();

  const menuItems = [
    { name: 'Home', href: '/' },
    { name: 'Dashboard', href: '/dashboard' },
  ];

  // Calculate wallet status
  const getWalletStatus = () => {
    const cardanoConnected = cardano.isConnected;
    const midnightConnected = midnight.isConnected;

    if (cardanoConnected && midnightConnected) return { count: 2, color: 'success' };
    if (cardanoConnected || midnightConnected) return { count: 1, color: 'warning' };
    return { count: 0, color: 'danger' };
  };

  const walletStatus = getWalletStatus();

  return (
    <Navbar onMenuOpenChange={setIsMenuOpen} maxWidth="xl">
      <NavbarContent>
        <NavbarMenuToggle aria-label={isMenuOpen ? 'Close menu' : 'Open menu'} className="sm:hidden" />
        <NavbarBrand className="flex items-center gap-4" as={Link} href="/">
          <Image src="/assets/midnight_logo.svg" alt="logo" width={50} height={50} />
          <p className="font-bold text-inherit text-white">NIGHT to DUST</p>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden sm:flex gap-4" justify="center">

      </NavbarContent>
      <NavbarContent justify="end" className="hidden sm:flex gap-4">
      </NavbarContent>
      <NavbarMenu>
        {menuItems.map((item, index) => (
          <NavbarMenuItem key={`${item.name}-${index}`}>
            <Link className="w-full" color="foreground" href={item.href} size="lg">
              {item.name}
            </Link>
          </NavbarMenuItem>
        ))}
      </NavbarMenu>
    </Navbar>
  );
}
