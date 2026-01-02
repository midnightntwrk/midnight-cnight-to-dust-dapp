import { Spinner } from '@heroui/react';
import React from 'react';

interface LoadingBackdropProps {
    isVisible: boolean;
    title?: string;
    subtitle?: string;
}

export default function LoadingBackdrop({ isVisible, title = 'Loading...', subtitle }: LoadingBackdropProps) {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="p-8 flex flex-col items-center gap-4">
                <Spinner size="lg" color="primary" />
                <p className="text-white text-lg font-medium">{title}</p>
                {subtitle && <p className="text-gray-400 text-sm">{subtitle}</p>}
            </div>
        </div>
    );
}
