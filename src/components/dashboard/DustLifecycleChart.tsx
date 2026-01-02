'use client';

import React, { useCallback, useMemo } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { Chip } from '@heroui/react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';
import annotationPlugin from 'chartjs-plugin-annotation';
import { formatNumber } from '@/lib/utils';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, annotationPlugin);

type LifecycleCase = 'generating' | 'capped' | 'decaying' | 'syncing';

export default function DustLifecycleChart() {
    const { cardano, generationStatus, registrationUtxo } = useWalletContext();

    // Fade animation state
    const [fadeKey, setFadeKey] = React.useState(0);

    // Animation state for pulsating point (opacity)
    const [pulseOpacity, setPulseOpacity] = React.useState(1);

    React.useEffect(() => {
        const interval = setInterval(() => {
            setPulseOpacity((prev) => (prev === 1 ? 0.6 : 1));
        }, 800);
        return () => clearInterval(interval);
    }, []);

    // Check indexer sync status
    const isIndexerSyncing = registrationUtxo && generationStatus?.registered === false;
    const isIndexerSynced = generationStatus?.registered === true;

    // Calculate CAP (10 * NIGHT balance from indexer)
    const nightBalance = useMemo(() => {
        if (isIndexerSynced && generationStatus?.nightBalance) {
            const indexerBalance = parseFloat(generationStatus.nightBalance);
            // nightBalance from indexer is already in display format
            return indexerBalance;
        }
        return 0; // Show 0 if indexer not synced yet
    }, [isIndexerSynced, generationStatus?.nightBalance]);

    const generationCap = 10 * nightBalance;

    // Get current DUST balance from indexer
    const currentDustBalance = useMemo(() => {
        if (isIndexerSynced && generationStatus?.currentCapacity) {
            return parseFloat(generationStatus.currentCapacity);
        }
        return 0;
    }, [isIndexerSynced, generationStatus?.currentCapacity]);

    // Get generation rate from indexer
    const generationRate = useMemo(() => {
        if (isIndexerSynced && generationStatus?.generationRate) {
            return parseFloat(generationStatus.generationRate);
        }
        return 0;
    }, [isIndexerSynced, generationStatus?.generationRate]);

    // Determine lifecycle case automatically based on generation rate
    const lifecycleCase: LifecycleCase = useMemo(() => {
        if (isIndexerSyncing) {
            return 'syncing';
        }
        if (!isIndexerSynced) {
            return 'syncing';
        }
        if (generationRate > 0) {
            return 'generating';
        }
        if (generationRate < 0) {
            return 'decaying';
        }
        // generationRate === 0
        return 'capped';
    }, [isIndexerSyncing, isIndexerSynced, generationRate]);

    // Trigger fade animation when case changes
    React.useEffect(() => {
        setFadeKey((prev) => prev + 1);
    }, [lifecycleCase]);

    const labels = useCallback(() => {
        const today = new Date();
        const formatDate = (daysOffset: number) => {
            const date = new Date(today);
            date.setDate(today.getDate() + daysOffset);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        };

        if (lifecycleCase === 'generating' || lifecycleCase === 'syncing') {
            return [formatDate(-2), 'Now', formatDate(2), ''];
        } else if (lifecycleCase === 'capped') {
            return [formatDate(-4), formatDate(-2), 'Now', ''];
        } else if (lifecycleCase === 'decaying') {
            return [formatDate(-8), formatDate(-6), formatDate(-4), formatDate(-2), 'Now', ''];
        }
        return [];
    }, [lifecycleCase]);

    const capLine = useCallback(() => {
        if (lifecycleCase === 'generating' || lifecycleCase === 'syncing') {
            return [generationCap, generationCap, generationCap, null];
        } else if (lifecycleCase === 'capped') {
            return null;
        } else if (lifecycleCase === 'decaying') {
            return [generationCap, generationCap, generationCap, null];
        }
        return null;
    }, [lifecycleCase, generationCap]);

    const yourPositionPoint = useCallback(() => {
        if (lifecycleCase === 'generating' || lifecycleCase === 'syncing') {
            return [null, currentDustBalance, null, null];
        } else if (lifecycleCase === 'capped') {
            return [null, null, generationCap, null];
        } else if (lifecycleCase === 'decaying') {
            return [null, null, null, null, currentDustBalance];
        }
        return [];
    }, [lifecycleCase, currentDustBalance, generationCap]);

    const yourPositionLine = useCallback(() => {
        if (lifecycleCase === 'generating' || lifecycleCase === 'syncing') {
            return [currentDustBalance, currentDustBalance, null, null];
        } else if (lifecycleCase === 'capped') {
            return [generationCap, generationCap, generationCap, null];
        } else if (lifecycleCase === 'decaying') {
            return [currentDustBalance, currentDustBalance, currentDustBalance, currentDustBalance, currentDustBalance];
        }
        return [];
    }, [lifecycleCase, currentDustBalance, generationCap]);

    const chartDataLine = useCallback(() => {
        if (lifecycleCase === 'generating' || lifecycleCase === 'syncing') {
            return [0, currentDustBalance, generationCap, generationCap];
        } else if (lifecycleCase === 'capped') {
            return [0, currentDustBalance, generationCap, generationCap];
        } else if (lifecycleCase === 'decaying') {
            return [0, generationCap * 0.5, generationCap, generationCap, currentDustBalance, 0];
        }
        return [];
    }, [lifecycleCase, currentDustBalance, generationCap]);

    // Get status color and label
    const statusConfig = useMemo(() => {
        switch (lifecycleCase) {
            case 'generating':
                return { color: 'success' as const, label: 'Generating', textColor: 'text-green-400' };
            case 'capped':
                return { color: 'warning' as const, label: 'Capped', textColor: 'text-orange-400' };
            case 'decaying':
                return { color: 'danger' as const, label: 'Decaying', textColor: 'text-red-400' };
            case 'syncing':
                return { color: 'default' as const, label: 'Syncing...', textColor: 'text-amber-400' };
        }
    }, [lifecycleCase]);

    // Chart data
    const data = {
        labels: labels(),
        datasets: [
            {
                label: 'Current Horizontal',
                data: yourPositionLine(),
                borderColor: lifecycleCase === 'decaying' ? '#ef4444' : '#34c759',
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5],
                tension: 0.4,
                pointRadius: 0,
                order: 2,
            },
            {
                label: 'Generation Cap',
                data: capLine(),
                borderColor: '#fb923c',
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5],
                tension: 0,
                pointRadius: 0,
                order: 2,
            },
            // Glow effect layers
            {
                label: 'Glow Layer 3',
                data: chartDataLine(),
                borderColor: 'rgba(255, 255, 255, 0.1)',
                backgroundColor: 'transparent',
                borderWidth: 16,
                tension: 0.1,
                pointRadius: 0,
                order: 4,
            },
            {
                label: 'Glow Layer 2',
                data: chartDataLine(),
                borderColor: 'rgba(255, 255, 255, 0.2)',
                backgroundColor: 'transparent',
                borderWidth: 10,
                tension: 0.1,
                pointRadius: 0,
                order: 3,
            },
            {
                label: 'Glow Layer 1',
                data: chartDataLine(),
                borderColor: 'rgba(255, 255, 255, 0.3)',
                backgroundColor: 'transparent',
                borderWidth: 6,
                tension: 0.1,
                pointRadius: 0,
                order: 2,
            },
            // Main DUST Balance line
            {
                label: 'DUST Balance',
                data: chartDataLine(),
                borderColor: '#ffffff',
                backgroundColor: 'transparent',
                borderWidth: 4,
                tension: 0.1,
                pointRadius: 0,
                order: 1,
            },
            // Current Position Point Glow Layers
            {
                label: 'Point Glow Layer 3',
                data: yourPositionPoint(),
                borderColor: 'transparent',
                backgroundColor: lifecycleCase === 'decaying' ? `rgba(239, 68, 68, ${pulseOpacity * 0.1})` : `rgba(52, 199, 89, ${pulseOpacity * 0.1})`,
                pointRadius: lifecycleCase === 'generating' || lifecycleCase === 'syncing' ? [0, 18, 0, 0] : lifecycleCase === 'capped' ? [0, 0, 18, 0] : [0, 0, 0, 0, 18, 0],
                pointBorderWidth: 0,
                showLine: false,
                order: 3,
            },
            {
                label: 'Point Glow Layer 2',
                data: yourPositionPoint(),
                borderColor: 'transparent',
                backgroundColor: lifecycleCase === 'decaying' ? `rgba(239, 68, 68, ${pulseOpacity * 0.2})` : `rgba(52, 199, 89, ${pulseOpacity * 0.2})`,
                pointRadius: lifecycleCase === 'generating' || lifecycleCase === 'syncing' ? [0, 12, 0, 0] : lifecycleCase === 'capped' ? [0, 0, 12, 0] : [0, 0, 0, 0, 12, 0],
                pointBorderWidth: 0,
                showLine: false,
                order: 2,
            },
            {
                label: 'Point Glow Layer 1',
                data: yourPositionPoint(),
                borderColor: 'transparent',
                backgroundColor: lifecycleCase === 'decaying' ? `rgba(239, 68, 68, ${pulseOpacity * 0.4})` : `rgba(52, 199, 89, ${pulseOpacity * 0.4})`,
                pointRadius: lifecycleCase === 'generating' || lifecycleCase === 'syncing' ? [0, 8, 0, 0] : lifecycleCase === 'capped' ? [0, 0, 8, 0] : [0, 0, 0, 0, 8, 0],
                pointBorderWidth: 0,
                showLine: false,
                order: 1,
            },
            // Main Current Position Point
            {
                label: 'Current Position Point',
                data: yourPositionPoint(),
                borderColor: lifecycleCase === 'decaying' ? `rgba(239, 68, 68, ${pulseOpacity})` : `rgba(52, 199, 89, ${pulseOpacity})`,
                backgroundColor: lifecycleCase === 'decaying' ? `rgba(239, 68, 68, ${pulseOpacity})` : `rgba(52, 199, 89, ${pulseOpacity})`,
                pointRadius: lifecycleCase === 'generating' || lifecycleCase === 'syncing' ? [0, 5, 0, 0] : lifecycleCase === 'capped' ? [0, 0, 5, 0] : [0, 0, 0, 0, 5, 0],
                pointBorderWidth: 2,
                pointBorderColor: lifecycleCase === 'decaying' ? `rgba(239, 68, 68, ${pulseOpacity})` : `rgba(52, 199, 89, ${pulseOpacity})`,
                showLine: false,
                order: 0,
            },
        ],
    };

    // Chart options
    const options: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                titleColor: '#ffffff',
                bodyColor: '#9ca3af',
                filter: (tooltipItem) => {
                    const label = tooltipItem.dataset.label || '';
                    return !label.startsWith('Glow Layer') && !label.startsWith('Point Glow Layer');
                },
                callbacks: {
                    label: (context) => {
                        const value = context.parsed?.y?.toFixed(2) || '0';
                        return `${context.dataset.label}: ${value} DUST`;
                    },
                },
            },
            annotation: {
                annotations: {
                    capLabel: {
                        type: 'label',
                        xValue: 0.5,
                        yValue: generationCap,
                        backgroundColor: 'transparent',
                        content: lifecycleCase === 'capped' ? ['CAP Reached'] : ['Generation CAP'],
                        color: lifecycleCase === 'capped' ? '#34c759' : '#fb923c',
                        font: {
                            size: 12,
                            weight: 'bold',
                            family: 'Outfit, sans-serif',
                        },
                        position: 'end',
                        xAdjust: 20,
                        yAdjust: -4,
                    },
                    currentPositionLabel: {
                        type: 'label',
                        xValue: 0.5,
                        yValue: currentDustBalance,
                        backgroundColor: 'transparent',
                        content: lifecycleCase !== 'capped' ? ['Your Position'] : [''],
                        color: lifecycleCase === 'decaying' ? '#ef4444' : '#34c759',
                        font: {
                            size: 12,
                            weight: 'bold',
                            family: 'Outfit, sans-serif',
                        },
                        position: 'end',
                        xAdjust: 20,
                        yAdjust: -4,
                    },
                },
            },
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'TIME',
                    color: '#9ca3af',
                    font: {
                        size: 14,
                        family: 'Outfit, sans-serif',
                    },
                },
                grid: {
                    color: '#374151',
                },
                ticks: {
                    color: '#9ca3af',
                    font: {
                        family: 'Outfit, sans-serif',
                    },
                },
            },
            y: {
                title: {
                    display: true,
                    text: 'DUST Balance',
                    color: '#9ca3af',
                    font: {
                        size: 14,
                        family: 'Outfit, sans-serif',
                    },
                },
                beginAtZero: true,
                max: Math.max(Math.floor(generationCap * 1.1), 100),
                grid: {
                    color: '#374151',
                },
                ticks: {
                    display: false,
                },
            },
        },
    };

    // Calculate progress percentage
    const progressPercent = generationCap > 0 ? (currentDustBalance / generationCap) * 100 : 0;

    // Format generation rate for display
    const formatGenerationRate = () => {
        if (lifecycleCase === 'syncing') {
            return '...';
        }
        if (generationRate === 0) {
            return '0';
        }
        if (generationRate < 0) {
            return generationRate.toFixed(2);
        }
        return generationRate.toFixed(2);
    };

    return (
        <div className="w-full">
            <div className="flex flex-col gap-4">
                {/* Status Indicator */}
                <div className="flex justify-center">
                    <Chip color={statusConfig.color} variant="flat" size="lg" className={lifecycleCase === 'syncing' ? 'animate-pulse' : ''}>
                        {statusConfig.label}
                    </Chip>
                </div>

                {/* Chart */}
                <div key={fadeKey} className="rounded-lg p-6 animate-in fade-in duration-500">
                    <Line data={data} options={options} />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-gray-400 text-sm">Current Balance</span>
                        <span className={`text-xl font-bold ${lifecycleCase === 'syncing' ? 'text-amber-400 animate-pulse' : 'text-green-400'}`}>
                            {lifecycleCase === 'syncing' ? '...' : `${formatNumber(currentDustBalance)}`} DUST
                        </span>
                        <span className="text-blue-400 text-xs">(Shielded)</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-gray-400 text-sm">Generation Rate</span>
                        <span className={`text-xl font-bold ${statusConfig.textColor} ${lifecycleCase === 'syncing' ? 'animate-pulse' : ''}`}>{formatGenerationRate()} DUST/H</span>
                        <span className="text-blue-400 text-xs">(Shielded)</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-gray-400 text-sm">Generation CAP</span>
                        <span className="text-orange-400 text-xl font-bold">{formatNumber(generationCap)} DUST</span>
                        <span className="text-blue-400 text-xs">(Shielded)</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-gray-400 text-sm">Progress</span>
                        <span className={`text-xl font-bold ${statusConfig.textColor} ${lifecycleCase === 'syncing' ? 'animate-pulse' : ''}`}>
                            {lifecycleCase === 'syncing' ? '...' : `${progressPercent.toFixed(1)}%`}
                        </span>
                        <span className="text-gray-500 text-xs">
                            {lifecycleCase === 'generating'
                                ? 'Generating...'
                                : lifecycleCase === 'capped'
                                  ? '(Capped)'
                                  : lifecycleCase === 'decaying'
                                    ? '(Decaying)'
                                    : '(Syncing...)'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
