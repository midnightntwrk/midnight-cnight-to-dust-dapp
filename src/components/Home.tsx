"use client";

import { Button, Link } from "@heroui/react";
import Image from 'next/image'
import React from 'react'
import RequirementsCard from './ui/RequirementsCard'
import Faqs from './ui/Faqs'
import Footer from './ui/Footer'

export default function Home() {
    return (
        <>
            <div className='flex flex-col items-center justify-center h-full gap-[40px]'>
                <div className='flex-1' />
                <Image src="/assets/midnight_logo.svg" alt="logo" width={150} height={100} />
                <div className='flex flex-col items-center justify-center text-center px-4'>
                    <p className='text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-tight'>
                        Start generating private DUST
                    </p>
                    <p className='text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-tight'>
                        from your cNIGHT holdings
                    </p>
                </div>
                <div className='flex flex-row items-center justify-center gap-[20px]'>
                    <Button
                        as={Link}
                        href="/onboard"
                        // color="primary"
                        className="bg-[#0000FE] hover:bg-blue-600 text-white font-medium py-3 text-sm md:text-base"
                        >
                        Register with Cardano
                    </Button>
                    <Button
                        as={Link}
                        href="/onboard"
                        className="bg-black border-1 border-white text-white font-medium py-3 text-sm md:text-base"
                    >
                        Login with Midnight
                    </Button>
                </div>
                <RequirementsCard />
                <Faqs />
            </div>
        </>
    )
}

