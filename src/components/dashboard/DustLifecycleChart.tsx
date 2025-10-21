'use client';

import React, { useCallback } from 'react';
import { useWalletContext } from '@/contexts/WalletContext';
import { ButtonGroup, Button } from '@heroui/react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import annotationPlugin from 'chartjs-plugin-annotation';
import { formatNumber } from '@/lib/utils';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    annotationPlugin
);

type LifecycleCase = 'generating' | 'capped' | 'decaying';

export default function DustLifecycleChart() {

    const { cardano } = useWalletContext();

    // Test case selection
    const [selectedCase, setSelectedCase] = React.useState<LifecycleCase>('generating');

    // Fade animation state
    const [fadeKey, setFadeKey] = React.useState(0);

    // Calculate CAP
    const generationCap = 10 * Number(cardano.balanceNight ?? 0);

    // MOCKED DATA - will vary based on selected case
    const mockedCurrentBalance = generationCap / 2; // Example: 4500 DUST
    const mockedHasReachedCap = false; // false = generating (case A), true = capped (case B)

    // Animation state for pulsating point (opacity)
    const [pulseOpacity, setPulseOpacity] = React.useState(1);

    React.useEffect(() => {
        const interval = setInterval(() => {
            setPulseOpacity((prev) => (prev === 1 ? 0.6 : 1));
        }, 800);
        return () => clearInterval(interval);
    }, []);

    // Trigger fade animation when case changes
    React.useEffect(() => {
        setFadeKey(prev => prev + 1);
    }, [selectedCase]);

    const labels = useCallback(() => {
        const today = new Date();
        const formatDate = (daysOffset: number) => {
            const date = new Date(today);
            date.setDate(today.getDate() + daysOffset);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        };

        if (selectedCase === 'generating') {
            return [formatDate(-2), 'Now', formatDate(2), ''];
        } else if (selectedCase === 'capped') {
            return [formatDate(-4), formatDate(-2), 'Now', ''];
        } else if (selectedCase === 'decaying') {
            return [formatDate(-8), formatDate(-6), formatDate(-4), formatDate(-2), 'Now', ''];
        }

    }, [selectedCase]);

    const capLine = useCallback(() => {
        if (selectedCase === 'generating') {
            return [generationCap, generationCap, generationCap, null];
        } else if (selectedCase === 'capped') {
            return null;
        } else if (selectedCase === 'decaying') {
            return [generationCap, generationCap, generationCap, null];
        }
    }, [selectedCase, mockedCurrentBalance, generationCap]);

    const yourPositionPoint = useCallback(() => {
        if (selectedCase === 'generating') {
            return [null, mockedCurrentBalance, null, null];
        } else if (selectedCase === 'capped') {
            return [null, null, generationCap, null];
        } else if (selectedCase === 'decaying') {
            return [null, null, null, null, mockedCurrentBalance];
        }
    }, [selectedCase, mockedCurrentBalance, generationCap]);

    const yourPositionLine = useCallback(() => {
        if (selectedCase === 'generating') {
            return [mockedCurrentBalance, mockedCurrentBalance, null, null];
        } else if (selectedCase === 'capped') {
            return [generationCap, generationCap, generationCap, null];
        } else if (selectedCase === 'decaying') {
            return [mockedCurrentBalance, mockedCurrentBalance, mockedCurrentBalance, mockedCurrentBalance, mockedCurrentBalance];
        }
    }, [selectedCase, mockedCurrentBalance, generationCap]);

    const chartDataLine = useCallback(() => {
        if (selectedCase === 'generating') {
            return [0, mockedCurrentBalance, generationCap, generationCap];
        } else if (selectedCase === 'capped') {
            return [0, mockedCurrentBalance, generationCap, generationCap];
        } else if (selectedCase === 'decaying') {
            return [0, mockedCurrentBalance, generationCap, generationCap, mockedCurrentBalance, 0];
        }
    }, [selectedCase, mockedCurrentBalance, generationCap]);

    // Chart data
    const data = {
        labels: labels(),
        datasets: [
            {
                label: 'Current Horizontal',
                data: yourPositionLine(),
                borderColor: '#34c759', // Green
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
                borderColor: '#fb923c', // Orange
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5],
                tension: 0,
                pointRadius: 0,
                order: 2,
            },
            // Glow effect layers (rendered behind main line)
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
                tension: 0.1, // Straight lines
                pointRadius: 0,
                order: 1,
            },
            // Current Position Point Glow Layers
            {
                label: 'Point Glow Layer 3',
                data: yourPositionPoint(),
                borderColor: 'transparent',
                backgroundColor: `rgba(52, 199, 89, ${pulseOpacity * 0.1})`,
                pointRadius: selectedCase === 'generating'
                    ? [0, 18, 0, 0]
                    : selectedCase === 'capped'
                    ? [0, 0, 18, 0]
                    : [0, 0, 0, 0, 18, 0],
                pointBorderWidth: 0,
                showLine: false,
                order: 3,
            },
            {
                label: 'Point Glow Layer 2',
                data: yourPositionPoint(),
                borderColor: 'transparent',
                backgroundColor: `rgba(52, 199, 89, ${pulseOpacity * 0.2})`,
                pointRadius: selectedCase === 'generating'
                    ? [0, 12, 0, 0]
                    : selectedCase === 'capped'
                    ? [0, 0, 12, 0]
                    : [0, 0, 0, 0, 12, 0],
                pointBorderWidth: 0,
                showLine: false,
                order: 2,
            },
            {
                label: 'Point Glow Layer 1',
                data: yourPositionPoint(),
                borderColor: 'transparent',
                backgroundColor: `rgba(52, 199, 89, ${pulseOpacity * 0.4})`,
                pointRadius: selectedCase === 'generating'
                    ? [0, 8, 0, 0]
                    : selectedCase === 'capped'
                    ? [0, 0, 8, 0]
                    : [0, 0, 0, 0, 8, 0],
                pointBorderWidth: 0,
                showLine: false,
                order: 1,
            },
            // Main Current Position Point
            {
                label: 'Current Position Point',
                data: yourPositionPoint(),
                borderColor: `rgba(52, 199, 89, ${pulseOpacity})`, // Green with pulsating opacity
                backgroundColor: `rgba(52, 199, 89, ${pulseOpacity})`,
                pointRadius: selectedCase === 'generating'
                    ? [0, 5, 0, 0]
                    : selectedCase === 'capped'
                    ? [0, 0, 5, 0]
                    : [0, 0, 0, 0, 5, 0], // Point at "Now" position for each case
                pointBorderWidth: 2,
                pointBorderColor: `rgba(52, 199, 89, ${pulseOpacity})`,
                showLine: false, // Don't draw a line, just the point
                order: 0, // Render on top
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
                    // Hide glow layers from tooltip
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
                        content: selectedCase === 'generating' || selectedCase === 'decaying' ? ['Generation CAP'] : ['CAP Reached'],
                        color: selectedCase === 'generating' || selectedCase === 'decaying' ? '#fb923c' : '#34c759',
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
                        yValue: mockedCurrentBalance,
                        backgroundColor: 'transparent',
                        content: selectedCase === 'generating' || selectedCase === 'decaying' ? ['Your Position'] : [''],
                        color: '#34c759',
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
                max: Math.floor(generationCap * 1.1),
                grid: {
                    color: '#374151',
                },
                ticks: {
                    color: '#9ca3af',
                    font: {
                        family: 'Outfit, sans-serif',
                    },
                    callback: function(tickValue: string | number) {
                        const value = Number(tickValue);
                        if (value >= 1000000) {
                            return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
                        } else if (value >= 1000) {
                            return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
                        }
                        return value.toString();
                    },
                },
            },
        },
    };

    const balancePercent = (mockedCurrentBalance / generationCap) * 100;

    return (
        <div className="w-full">
            <div className="flex flex-col gap-4">
                {/* Test Case Selector */}
                <div className="flex justify-center">
                    <ButtonGroup>
                        <Button
                            color={selectedCase === 'generating' ? 'primary' : 'default'}
                            onPress={() => setSelectedCase('generating')}
                        >
                            Generating
                        </Button>
                        <Button
                            color={selectedCase === 'capped' ? 'primary' : 'default'}
                            onPress={() => setSelectedCase('capped')}
                        >
                            Capped
                        </Button>
                        <Button
                            color={selectedCase === 'decaying' ? 'primary' : 'default'}
                            onPress={() => setSelectedCase('decaying')}
                        >
                            Decaying
                        </Button>
                    </ButtonGroup>
                </div>

                {/* Chart */}
                <div
                    key={fadeKey}
                    className="rounded-lg p-6 animate-in fade-in duration-500"
                >
                    <Line data={data} options={options} />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-gray-400 text-sm">Current Balance</span>
                        <span className="text-green-400 text-xl font-bold">
                            {/* {formatNumber(mockedCurrentBalance)} DUST */}
                            *** DUST
                        </span>
                        <span className="text-blue-400 text-xs">(Shielded)</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-gray-400 text-sm">Generation Rate</span>
                        <span className={`text-xl font-bold ${selectedCase === 'decaying' ? 'text-red-400' : 'text-white'}`}>
                            {selectedCase === 'generating'
                                ? '*** DUST/H'
                                : selectedCase === 'capped'
                                ? '0 DUST/H'
                                : '- *** DUST/H'
                            }
                        </span>
                        <span className="text-blue-400 text-xs">(Shielded)</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-gray-400 text-sm">Generation CAP</span>
                        <span className="text-orange-400 text-xl font-bold">
                            {formatNumber(generationCap)} DUST
                        </span>
                        <span className="text-blue-400 text-xs">(Shielded)</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-gray-400 text-sm">Progress</span>
                        <span className={`text-xl font-bold ${selectedCase === 'decaying' ? 'text-red-400' : 'text-white'}`}>
                            {selectedCase === 'generating'
                                ? `${balancePercent.toFixed(1)}%`
                                : selectedCase === 'capped'
                                ? '100%'
                                : '-50%'
                            }
                        </span>
                        <span className="text-gray-500 text-xs">
                            {selectedCase === 'generating'
                                ? 'Generating...'
                                : selectedCase === 'capped'
                                ? '(Capped)'
                                : '(Decaying)'
                            }
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
