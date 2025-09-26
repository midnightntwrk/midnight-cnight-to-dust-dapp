"use client";

import React from "react";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
  Link,
  Button,
} from "@heroui/react";
import { useWalletContext } from '@/contexts/WalletContext';
import Image from "next/image";

export default function MidnightNavbar() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { cardano, midnight } = useWalletContext();

  const menuItems = [
    { name: "Home", href: "/" },
    { name: "Dashboard", href: "/dashboard" },
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
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="sm:hidden"
        />
        <NavbarBrand className="flex items-center gap-4" as={Link} href="/">
          <Image src="/assets/midnight_logo.svg" alt="logo" width={50} height={50} />
          <p className="font-bold text-inherit text-white">NIGHT to DUST</p>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        {/* <NavbarItem>
          <Link color="foreground" href="/">
            Home
          </Link>
        </NavbarItem>
        <NavbarItem>
          <Badge
            content={walletStatus.count > 0 ? walletStatus.count : ""}
            color={walletStatus.color as any}
            size="sm"
            isInvisible={walletStatus.count === 0}
          >
            <Link color="foreground" href="/dashboard">
              Dashboard
            </Link>
          </Badge>
        </NavbarItem> */}
      </NavbarContent>
      <NavbarContent justify="end" className="hidden sm:flex gap-4">
        {/* <NavbarItem className="flex items-center gap-2">
          <ThemeSwitcher />
        </NavbarItem> */}
        <NavbarItem>
          {cardano.isConnected && (
            <Button as={Link} className="bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-700 w-full py-2 text-sm"
              href="/dashboard" variant="flat">
              Dashboard
            </Button>
          )}
        </NavbarItem>
      </NavbarContent>
      <NavbarMenu>
        {menuItems.map((item, index) => (
          <NavbarMenuItem key={`${item.name}-${index}`}>
            <Link
              className="w-full"
              color="foreground"
              href={item.href}
              size="lg"
            >
              {item.name}
            </Link>
          </NavbarMenuItem>
        ))}
        <NavbarMenuItem>
          {/* <div className="flex justify-center mt-4">
            <ThemeSwitcher />
          </div> */}
        </NavbarMenuItem>
      </NavbarMenu>
    </Navbar>
  );
}

