import React from 'react';
import { Card } from '@heroui/react';
import { Toast } from '@/hooks/useToast';

interface ToastContainerProps {
    toasts: Toast[];
    onRemove: (id: string) => void;
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {toasts.map((toast) => (
                <Card
                    key={toast.id}
                    className={`p-4 max-w-sm shadow-lg animate-in slide-in-from-right-full duration-300 ${
                        toast.type === 'success' ? 'bg-green-600/90 border-green-500' : toast.type === 'error' ? 'bg-red-600/90 border-red-500' : 'bg-blue-600/90 border-blue-500'
                    }`}
                >
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            {toast.type === 'success' && <span className="text-green-100">✓</span>}
                            {toast.type === 'error' && <span className="text-red-100">✗</span>}
                            {toast.type === 'info' && <span className="text-blue-100">ℹ</span>}
                            <p className="text-white text-sm font-medium">{toast.message}</p>
                        </div>
                        <button onClick={() => onRemove(toast.id)} className="text-white/70 hover:text-white text-lg leading-none">
                            ×
                        </button>
                    </div>
                </Card>
            ))}
        </div>
    );
}
