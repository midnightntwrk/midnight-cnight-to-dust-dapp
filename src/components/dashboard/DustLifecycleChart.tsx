'use client';

import React from 'react';
import { Card } from '@heroui/react';
import { useWalletContext } from '@/contexts/WalletContext';
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

export default function DustLifecycleChart() {

    const { cardano } = useWalletContext();

    // Calculate CAP
    const generationCap = 10 * Number(cardano.balanceNight ?? 0);

    // MOCKED DATA
    const mockedCurrentBalance = generationCap / 2; // Example: 4500 DUST
    const mockedHasReachedCap = false; // false = generating (case A), true = capped (case B)

    // Animation state for pulsating point (opacity)
    const [pulseOpacity, setPulseOpacity] = React.useState(1);

    React.useEffect(() => {
        const interval = setInterval(() => {
            setPulseOpacity((prev) => (prev === 1 ? 0.3 : 1));
        }, 800);
        return () => clearInterval(interval);
    }, []);

    // Simple data structure - white line showing growth from origin to current balance, then horizontal
    const labels = ['0 Days', 'Now', 'Oct 26', ''];

    // White line: diagonal from (t_0, 0) to (t_1, currentBalance), then horizontal to (t_2, currentBalance)
    const dataPoints = [0, mockedCurrentBalance, generationCap, generationCap];

    // Chart data
    const data = {
        labels,
        datasets: [
            {
                label: 'Current Horizontal',
                data: [mockedCurrentBalance, mockedCurrentBalance, null, null],
                borderColor: '#34c759', // Green
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5],
                tension: 0,
                pointRadius: 0,
                order: 2,
            },
            {
                label: 'Generation Cap',
                data: [generationCap, generationCap, generationCap, null],
                borderColor: '#fb923c', // Orange
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5],
                tension: 0,
                pointRadius: 0,
                order: 2,
            },
            {
                label: 'DUST Balance',
                data: dataPoints,
                borderColor: '#ffffff',
                backgroundColor: 'transparent',
                borderWidth: 3,
                tension: 0, // Straight lines
                pointRadius: 0,
                order: 1,
            },
            {
                label: 'Current Position Point',
                data: [null, mockedCurrentBalance, null, null],
                borderColor: `rgba(52, 199, 89, ${pulseOpacity})`, // Green with pulsating opacity
                backgroundColor: `rgba(52, 199, 89, ${pulseOpacity})`,
                pointRadius: [0, 5, 0, 0], // Slightly larger point at t_0,5
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
                        content: ['Generation CAP'],
                        color: '#fb923c',
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
                        content: ['Your Position'],
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

    // Format number with K/M suffix
    const formatNumber = (value: number): string => {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        }
        return value.toFixed(2);
    };

    return (
        <Card className="p-6 w-full">
            <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex flex-row justify-between items-center">
                    <h3 className="text-xl font-bold text-white">DUST Generation Lifecycle</h3>
                    <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-blue-400 text-sm">
                        Mocked Data
                    </span>
                </div>

                {/* Chart */}
                <div className="rounded-lg p-6">
                    <Line data={data} options={options} />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-gray-400 text-sm">Current Balance</span>
                        <span className="text-green-400 text-xl font-bold">
                            {formatNumber(mockedCurrentBalance)} DUST
                        </span>
                        <span className="text-blue-400 text-xs">(Mocked)</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-gray-400 text-sm">Generation CAP</span>
                        <span className="text-orange-400 text-xl font-bold">
                            {formatNumber(generationCap)} DUST
                        </span>
                        <span className="text-blue-400 text-xs">(Mocked)</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-gray-400 text-sm">Progress</span>
                        <span className="text-white text-xl font-bold">
                            {balancePercent.toFixed(1)}%
                        </span>
                        <span className="text-gray-500 text-xs">
                            {mockedHasReachedCap ? 'CAP Reached ✓' : 'Generating...'}
                        </span>
                    </div>
                </div>
            </div>
        </Card>
    );
}
