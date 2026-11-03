'use client';

import React from 'react';
import { DiagnosisScore } from '../lib/scoring';

interface Props {
  scores: DiagnosisScore[];
}

export default function LeadershipChart({ scores }: Props) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
      {/* ゾーン目盛りヘッダー（文字被りを排除） */}
      <div className="relative flex items-center text-[11px] font-mono text-slate-500 border-b border-slate-200 pb-1.5">
        <div className="w-24 shrink-0 font-sans font-bold text-slate-700">スタイル</div>
        <div className="relative flex-1 h-4">
          <span className="absolute left-0">0%</span>
          <span className="absolute left-[50%] -translate-x-1/2 font-bold text-slate-600">50%</span>
          <span className="absolute left-[70%] -translate-x-1/2 font-bold text-blue-700">70%</span>
          <span className="absolute right-0">100%</span>
        </div>
        <div className="w-12 shrink-0 text-right font-bold">数値</div>
      </div>

      {/* スタイル別バー一覧 */}
      <div className="space-y-3">
        {scores.map(s => {
          const isMain = s.percentile >= 70;
          const isBackup = s.percentile >= 50 && s.percentile < 70;

          return (
            <div key={s.key} className="flex items-center text-xs">
              {/* スタイル名 */}
              <div className="w-24 shrink-0 pr-2">
                <span className="font-bold text-slate-800 block truncate">{s.name}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded inline-block ${
                  isMain ? 'bg-blue-100 text-blue-800' : isBackup ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400'
                }`}>
                  {isMain ? '【主軸】' : isBackup ? '【準主軸】' : '開発途上'}
                </span>
              </div>

              {/* ゲージ本体 */}
              <div className="relative flex-1 h-7 bg-slate-100 rounded-md overflow-hidden flex items-center">
                {/* 50〜70% 準主軸ゾーン（淡いインディゴ） */}
                <div className="absolute top-0 bottom-0 left-[50%] w-[20%] bg-indigo-50/80 border-l border-dashed border-indigo-300" />
                {/* 70〜100% 主軸ゾーン（淡いブルー） */}
                <div className="absolute top-0 bottom-0 left-[70%] w-[30%] bg-blue-50 border-l-2 border-blue-500" />

                {/* 実績バー */}
                <div
                  className={`h-4.5 rounded transition-all duration-500 z-10 ${
                    isMain ? 'bg-blue-700' : isBackup ? 'bg-indigo-600' : 'bg-slate-400'
                  }`}
                  style={{ width: `${Math.max(5, s.percentile)}%` }}
                />
              </div>

              {/* パーセンタイル数値 */}
              <span className={`w-12 shrink-0 text-right font-mono font-bold text-sm pl-2 ${
                isMain ? 'text-blue-700' : isBackup ? 'text-indigo-600' : 'text-slate-500'
              }`}>
                {s.percentile}%
              </span>
            </div>
          );
        })}
      </div>

      {/* 凡例 */}
      <div className="flex justify-end items-center gap-4 pt-2 text-[10px] text-slate-500 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-blue-700 rounded-xs inline-block" />
          <span className="font-medium text-slate-700">主軸 (70%以上)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-indigo-600 rounded-xs inline-block" />
          <span className="font-medium text-slate-700">準主軸 (50〜69%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-slate-400 rounded-xs inline-block" />
          <span>開発途上 (~49%)</span>
        </div>
      </div>
    </div>
  );
}