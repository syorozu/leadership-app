'use client';

import React, { useState, useEffect } from 'react';
import { QUESTIONS, Question } from '../lib/questions';
import { calculateScores, calculateReliability, DiagnosisScore, ReliabilityResult } from '../lib/scoring';
import LeadershipChart from '../components/LeadershipChart';

export default function DiagnosisPage() {
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [scores, setScores] = useState<DiagnosisScore[]>([]);
  const [reliability, setReliability] = useState<ReliabilityResult | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  // 受検時に設問順をランダムシャッフル（Fisher-Yates法）
  useEffect(() => {
    const list = [...QUESTIONS];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    setShuffledQuestions(list);
  }, []);

  if (shuffledQuestions.length === 0) return null;

  const currentQ = shuffledQuestions[currentIndex];

  const handleSelect = (value: number) => {
    const updated = { ...answers, [currentQ.id]: value };
    setAnswers(updated);

    if (currentIndex < shuffledQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 36問完了時の計算
      const calculatedScores = calculateScores(updated, QUESTIONS);
      const calculatedReliability = calculateReliability(updated, QUESTIONS);
      setScores(calculatedScores);
      setReliability(calculatedReliability);
      setIsCompleted(true);

      if (!calculatedReliability.isInvalid) {
        requestFeedback(calculatedScores, calculatedReliability);
      }
    }
  };

  const requestFeedback = async (calculatedScores: DiagnosisScore[], calculatedReliability: ReliabilityResult) => {
    setLoadingFeedback(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores: calculatedScores, reliability: calculatedReliability })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setFeedback(`【APIエラー (${res.status})】: ${data.error || JSON.stringify(data)}`);
      } else {
        setFeedback(data.feedback || '講評テキストが空で返却されました。');
      }
    } catch (e: any) {
      console.error(e);
      setFeedback(`【通信エラー】: ${e.message}`);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const mainStyles = scores.filter(s => s.level === 'main').map(s => s.name);
  const backupStyles = scores.filter(s => s.level === 'backup').map(s => s.name);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 text-slate-900 p-4 font-sans print:max-w-none print:w-full print:bg-white print:p-6">
      {!isCompleted ? (
        <div className="flex flex-col min-h-[90vh] justify-between">
          <div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-6">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / shuffledQuestions.length) * 100}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 font-bold mb-2">
              <span>質問 {currentIndex + 1} / {shuffledQuestions.length}</span>
              <span>直感で選択してください</span>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-4 min-h-[140px] flex items-center">
              <p className="text-base font-semibold leading-relaxed text-slate-800">
                {currentQ.text}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 my-6">
            {[
              { val: 5, label: '非常に該当する' },
              { val: 4, label: 'やや該当する' },
              { val: 3, label: 'どちらとも言えない' },
              { val: 2, label: 'あまり該当しない' },
              { val: 1, label: '全く該当しない' }
            ].map(btn => (
              <button
                key={btn.val}
                onClick={() => handleSelect(btn.val)}
                className="w-full py-3 px-4 bg-white hover:bg-blue-50 active:bg-blue-100 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 transition-colors flex justify-between items-center"
              >
                <span>{btn.label}</span>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">{btn.val}</span>
              </button>
            ))}
          </div>

          <div className="text-center">
            {currentIndex > 0 && (
              <button
                onClick={() => setCurrentIndex(currentIndex - 1)}
                className="text-xs text-slate-600 underline py-2"
              >
                1つ前の質問に戻る
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6 pb-12 pt-2 print:space-y-4 print:pb-0">
          <div className="border-b border-slate-200 pb-3">
            <h1 className="text-lg font-bold text-slate-900 print:text-xl">リーダーシップ・スタイル診断結果</h1>
            <p className="text-xs text-slate-500">コーン・フェリー基準プロファイル分析</p>
          </div>

          {/* 回答信頼度（信憑性）カード */}
          {reliability && (
            <div className={`p-4 rounded-lg border shadow-sm print:shadow-none ${
              reliability.isInvalid ? 'bg-red-50 border-red-200' :
              reliability.level === '高' ? 'bg-emerald-50 border-emerald-200' :
              reliability.level === '中' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">回答の信頼度（信憑性）</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  reliability.level === '高' ? 'bg-emerald-200 text-emerald-800' :
                  reliability.level === '中' ? 'bg-amber-200 text-amber-800' : 'bg-red-200 text-red-800'
                }`}>
                  判定: {reliability.level} ({reliability.score}点)
                </span>
              </div>
              {reliability.penalties.length > 0 && (
                <div className="mt-2 text-[11px] text-slate-600 space-y-1">
                  {reliability.penalties.map((pen, idx) => (
                    <div key={idx} className="leading-snug text-red-700">• {pen}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {reliability?.isInvalid ? (
            <div className="bg-red-100 border border-red-300 p-4 rounded-lg text-center text-xs text-red-800 space-y-2">
              <p className="font-bold">【無効な回答として処理されました】</p>
              <p>同一の選択肢が全体の80%以上を占めているため、正確な分析ができません。先入観を排し、再度受検してください。</p>
            </div>
          ) : (
            <>
              {/* スタイルサマリー */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2 print:shadow-none">
                <div className="flex items-center text-sm">
                  <span className="w-28 font-bold text-slate-600">メインスタイル:</span>
                  <span className="font-bold text-blue-600">
                    {mainStyles.length > 0 ? mainStyles.join('・') : 'なし'}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="w-28 font-bold text-slate-600">バックアップ:</span>
                  <span className="text-slate-800">
                    {backupStyles.length > 0 ? backupStyles.join('・') : 'なし'}
                  </span>
                </div>
              </div>

              {/* パーセンタイル棒グラフ */}
              <div className="print:break-inside-avoid">
                <div className="flex justify-between items-center mb-1">
                  <h2 className="text-xs font-bold text-slate-700">プロファイルグラフ</h2>
                  <span className="text-[10px] text-slate-600">70%以上: メイン / 50%〜: バックアップ</span>
                </div>
                <LeadershipChart scores={scores} />
              </div>

              {/* 組織開発コンサルタント講評 */}
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4 print:shadow-none print:break-inside-avoid">
                <h2 className="text-sm font-bold text-slate-800 border-l-4 border-blue-600 pl-2">
                  組織開発コンサルタント講評
                </h2>
                {loadingFeedback ? (
                  <div className="py-8 text-center text-slate-600 text-xs animate-pulse">
                    回答の一貫性と傾向を詳細分析中...
                  </div>
                ) : (
                  <div className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {feedback}
                  </div>
                )}
              </div>
            </>
          )}

          {/* 操作ボタン群（印刷・PDF出力時は非表示） */}
          <div className="flex flex-col gap-2 pt-2 print:hidden">
            <button
              onClick={() => window.print()}
              disabled={loadingFeedback}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:bg-blue-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              診断結果をPDFとして保存 / 印刷
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
            >
              もう一度診断を受ける
            </button>
          </div>
        </div>
      )}
    </div>
  );
}