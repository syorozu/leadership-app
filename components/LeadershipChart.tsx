'use client';

import React from 'react';
import { DiagnosisScore } from '../lib/scoring';

interface LeadershipChartProps {
  scores: DiagnosisScore[];
}

export default function LeadershipChart({ scores }: LeadershipChartProps) {
  // バーの塗色：メイン（濃青）、バックアップ（中青）、未開発（淡グレー）
  const getBarColor = (percentile: number) => {
    if (percentile >= 70) return 'bg-blue-700'; // メイン
    if (percentile >= 50) return 'bg-indigo-500'; // バックアップ
    return 'bg-slate-300'; // 開発途上
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:border-slate-300 print:shadow-none space-y-3">
      {/* ゾーン目盛りヘッダー */}
      <div className="relative h-6 text-[10px] font-bold text-slate-500 flex items-center border-b border-slate-100 pb-1">
        <div className="w-24 shrink-0 text-slate-400">スタイル</div>
        <div className="relative flex-1 h-full">
          {/* 目盛りライン */}
          <span className="absolute left-0 -bottom-1">0%</span>
          <span className="absolute left-[50%] -translate-x-1/2 -bottom-1 text-indigo-600 font-semibold">50% (準主軸)</span>
          <span className="absolute left-[70%] -translate-x-1/2 -bottom-1 text-blue-700 font-bold">70% (主軸)</span>
          <span className="absolute right-0 -bottom-1">100%</span>
        </div>
        <div className="w-10 shrink-0 text-right text-slate-400">値</div>
      </div>

      {/* スタイル別バー一覧 */}
      <div className="space-y-3 pt-1">
        {scores.map(s => (
          <div key={s.key} className="flex items-center text-xs">
            {/* スタイル名 */}
            <span className="w-24 shrink-0 font-medium text-slate-700 truncate pr-2">
              {s.name}
            </span>

            {/* ゲージ本体（背景にゾーン色を敷く） */}
            <div className="relative flex-1 h-6 bg-slate-100/70 rounded-md overflow-hidden flex items-center">
              {/* ゾーン背景帯 50%〜70%（バックアップ領域：薄いインディゴ） */}
              <div
                className="absolute top-0 bottom-0 left-[50%] w-[20%] bg-indigo-100/50 border-l border-r border-indigo-200/50 print:bg-indigo-50"
                title="バックアップスタイル領域 (50%〜70%)"
              />

              {/* ゾーン背景帯 70%〜100%（メイン領域：濃いめの薄青） */}
              <div
                className="absolute top-0 bottom-0 left-[70%] w-[30%] bg-blue-100/70 border-l border-blue-300/50 print:bg-blue-50"
                title="メインスタイル領域 (70%以上)"
              />

              {/* 実績値バー */}
              <div
                className={`h-4 rounded transition-all duration-500 ${getBarColor(s.percentile)} shadow-xs z-10`}
                style={{ width: `${Math.max(4, s.percentile)}%` }}
              />
            </div>

            {/* パーセンタイル値 */}
            <span className="w-10 shrink-0 text-right font-mono font-bold text-slate-800 pl-2">
              {s.percentile}%
            </span>
          </div>
        ))}
      </div>

      {/* ゾーン凡例 */}
      <div className="flex justify-end items-center gap-4 pt-2 text-[10px] text-slate-500 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-blue-700 rounded-xs inline-block" />
          <span>メイン (70%以上)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-indigo-500 rounded-xs inline-block" />
          <span>バックアップ (50%〜69%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-slate-300 rounded-xs inline-block" />
          <span>未開発 (~49%)</span>
        </div>
      </div>
    </div>
  );
}