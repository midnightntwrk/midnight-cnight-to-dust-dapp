"use client";

import { Button, Link } from "@heroui/react";
import Image from 'next/image'
import React from 'react'

export default function Home() {
    return (
        <div className='flex flex-col items-center justify-center h-full gap-[40px]'>
            <div className='flex-1' />
            <Image src="/assets/midnight_logo.svg" alt="logo" width={150} height={100} />
            <div className='flex flex-col items-center justify-center'>
                <p className='text-3xl font-bold'>Start generating private DUST</p>
                <p className='text-3xl font-bold'>from your cNIGHT holdings</p>
            </div>
            <div className='flex flex-row items-center justify-center gap-[20px]'>
                <Button
                    as={Link}
                    href="/onboard"
                    color="primary"
                >
                    Register with Cardano
                </Button>
                <Button
                    as={Link}
                    href="/onboard"
                >
                    Login with Midnight
                </Button>
            </div>
        </div>
    )
}

