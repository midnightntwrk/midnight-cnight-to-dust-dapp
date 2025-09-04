"use client";

import React from 'react';

interface StepperProps {
    currentStep: number;
    cardanoConnected: boolean;
    midnightConnected: boolean;
}

interface StepData {
    number: number;
    label: string;
    status: 'completed' | 'active' | 'inactive';
}

export default function Stepper({ currentStep, cardanoConnected, midnightConnected }: StepperProps) {
    // Determine step statuses based on wallet connections
    const getStepStatus = (stepNumber: number): 'completed' | 'active' | 'inactive' => {
        if (stepNumber === 1) {
            return cardanoConnected ? 'completed' : currentStep === 1 ? 'active' : 'inactive';
        }
        if (stepNumber === 2) {
            return midnightConnected ? 'completed' : currentStep === 2 ? 'active' : 'inactive';
        }
        if (stepNumber === 3) {
            return cardanoConnected && midnightConnected ? 'active' : 'inactive';
        }
        return 'inactive';
    };

    const steps: StepData[] = [
        {
            number: 1,
            label: 'CARDANO WALLET',
            status: getStepStatus(1)
        },
        {
            number: 2,
            label: 'MIDNIGHT WALLET',
            status: getStepStatus(2)
        },
        {
            number: 3,
            label: 'READY TO MATCH',
            status: getStepStatus(3)
        }
    ];

    const getStepStyles = (status: 'completed' | 'active' | 'inactive') => {
        switch (status) {
            case 'completed':
                return {
                    circle: 'bg-green-500 text-white',
                    label: 'text-green-500',
                    line: 'bg-green-500'
                };
            case 'active':
                return {
                    circle: 'bg-[#0000FE] text-white',
                    label: 'text-white',
                    line: 'bg-gray-600'
                };
            case 'inactive':
            default:
                return {
                    circle: 'bg-gray-600 text-gray-400',
                    label: 'text-gray-400',
                    line: 'bg-gray-600'
                };
        }
    };

    return (
        <div className="flex items-center justify-center mb-12 px-4">
            {/* Desktop/Tablet Layout */}
            <div className="hidden md:flex items-center space-x-4 lg:space-x-8">
                {steps.map((step, index) => {
                    const styles = getStepStyles(step.status);
                    const isLastStep = index === steps.length - 1;

                    return (
                        <div key={step.number} className="flex items-center">
                            {/* Step Circle and Label */}
                            <div className="flex items-center space-x-3 lg:space-x-4">
                                {/* Step Number Circle */}
                                <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center 
                                    text-sm font-bold transition-colors duration-300
                                    ${styles.circle}
                                `}>
                                    {step.status === 'completed' ? '✓' : step.number}
                                </div>

                                {/* Step Label */}
                                <span className={`
                                    text-xs lg:text-sm font-medium transition-colors duration-300 whitespace-nowrap
                                    ${styles.label}
                                `}>
                                    {step.label}
                                </span>
                            </div>

                            {/* Connecting Line (except for last step) */}
                            {!isLastStep && (
                                <div className="flex items-center ml-4 lg:ml-8">
                                    <div className={`
                                        w-4 lg:w-8 h-0.5 transition-colors duration-300
                                        ${step.status === 'completed' ? 'bg-green-500' : 'bg-gray-600'}
                                    `} />
                                    <div className="w-2 h-2 mx-1">
                                        <svg viewBox="0 0 8 8" className={`w-2 h-2 ${step.status === 'completed' ? 'text-green-500' : 'text-gray-600'}`}>
                                            <path d="M0,4 L8,4" stroke="currentColor" strokeWidth="1" />
                                            <path d="M6,2 L8,4 L6,6" stroke="currentColor" strokeWidth="1" fill="none" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Mobile Layout - Vertical */}
            <div className="flex md:hidden flex-col space-y-4 w-full max-w-xs">
                {steps.map((step, index) => {
                    const styles = getStepStyles(step.status);
                    const isLastStep = index === steps.length - 1;

                    return (
                        <div key={step.number} className="flex flex-col items-center">
                            {/* Step Circle and Label */}
                            <div className="flex items-center space-x-3 w-full">
                                {/* Step Number Circle */}
                                <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center 
                                    text-sm font-bold transition-colors duration-300 flex-shrink-0
                                    ${styles.circle}
                                `}>
                                    {step.status === 'completed' ? '✓' : step.number}
                                </div>

                                {/* Step Label */}
                                <span className={`
                                    text-xs font-medium transition-colors duration-300 text-center flex-1
                                    ${styles.label}
                                `}>
                                    {step.label}
                                </span>
                            </div>

                            {/* Vertical Connecting Line (except for last step) */}
                            {!isLastStep && (
                                <div className="flex flex-col items-center mt-2 mb-2">
                                    <div className={`
                                        w-0.5 h-4 transition-colors duration-300
                                        ${step.status === 'completed' ? 'bg-green-500' : 'bg-gray-600'}
                                    `} />
                                    <div className="w-2 h-2 my-1 rotate-90">
                                        <svg viewBox="0 0 8 8" className={`w-2 h-2 ${step.status === 'completed' ? 'text-green-500' : 'text-gray-600'}`}>
                                            <path d="M0,4 L8,4" stroke="currentColor" strokeWidth="1" />
                                            <path d="M6,2 L8,4 L6,6" stroke="currentColor" strokeWidth="1" fill="none" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}