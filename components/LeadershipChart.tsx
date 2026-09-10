'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Bar } from 'react-chartjs-2';
import { DiagnosisScore } from '@/lib/scoring';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, annotationPlugin);

export default function LeadershipChart({ scores }: { scores: DiagnosisScore[] }) {
  const data = {
    labels: scores.map(s => s.name),
    datasets: [
      {
        label: '本人評価',
        data: scores.map(s => s.percentile),
        backgroundColor: '#60a5fa',
        borderColor: '#2563eb',
        borderWidth: 1,
        borderRadius: 2,
        barPercentage: 0.55
      }
    ]
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { stepSize: 10, font: { size: 10 } },
        grid: { color: '#e5e7eb' },
        title: { display: true, text: 'パーセンタイル', font: { size: 11 } }
      },
      x: {
        ticks: { font: { size: 11, weight: 'bold' } },
        grid: { display: false }
      }
    },
    plugins: {
      legend: { display: false },
      annotation: {
        annotations: {
          mainStyleZone: {
            type: 'box',
            yMin: 70,
            yMax: 100,
            backgroundColor: 'rgba(229, 231, 235, 0.45)',
            borderWidth: 0,
            label: {
              display: true,
              content: 'メインスタイル (70%以上)',
              position: 'start',
              font: { size: 10, weight: 'bold' },
              color: '#4b5563'
            }
          },
          backupLine: {
            type: 'line',
            yMin: 50,
            yMax: 50,
            borderColor: '#9ca3af',
            borderWidth: 1.5,
            borderDash: [4, 4],
            label: {
              display: true,
              content: 'バックアップ (50%〜)',
              position: 'end',
              font: { size: 10 },
              color: '#6b7280'
            }
          }
        }
      }
    }
  };

  return (
    <div className="w-full h-80 bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
      <Bar data={data} options={options} />
    </div>
  );
}