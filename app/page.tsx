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
  const [isExportingPdf, setIsExportingPdf] = useState(false);

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
        setFeedback(`【APIエラー (${res.status})】: ${data.error || '通信エラー'}`);
      } else {
        setFeedback(data.feedback || '講評が取得できませんでした。');
      }
    } catch (e: any) {
      console.error(e);
      setFeedback(`【通信エラー】: ${e.message}`);
    } finally {
      setLoadingFeedback(false);
    }
  };

  // CDN動的ロードによる確実なPDF直接ダウンロード
  const handleDownloadPdf = async () => {
    const element = document.getElementById('pdf-area');
    if (!element) return;

    setIsExportingPdf(true);
    try {
      if (!(window as any).html2pdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const opt = {
        margin: [8, 8, 8, 8],
        filename: 'リーダーシップスタイル診断結果.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await (window as any).html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF生成エラー:', error);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const mainStyles = scores.filter(s => s.level === 'main').map(s => s.name);
  const backupStyles = scores.filter(s => s.level === 'backup').map(s => s.name);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 text-slate-900 p-4 font-sans">
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
        <div className="space-y-5 pb-12 pt-2">
          {/* PDF出力対象エリア */}
          <div id="pdf-area" className="space-y-4 bg-white p-4 rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 pb-3">
              <h1 className="text-lg font-bold text-slate-900">リーダーシップ・スタイル診断結果</h1>
              <p className="text-xs text-slate-500">コーン・フェリー基準プロファイル分析</p>
            </div>

            {reliability?.isInvalid ? (
              <div className="bg-red-100 border border-red-300 p-4 rounded-lg text-center text-xs text-red-800 space-y-2">
                <p className="font-bold">【無効回答として判定されました】</p>
                <p>同一選択肢が極端に集中しているため再受検を推奨します。</p>
              </div>
            ) : (
              <>
                {/* スタイルサマリー */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center text-sm">
                    <span className="w-28 font-bold text-slate-600">メインスタイル:</span>
                    <span className="font-bold text-blue-600">
                      {mainStyles.length > 0 ? mainStyles.join('・') : 'なし'}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="w-28 font-bold text-slate-600">バックアップ:</span>
                    <span className="font-bold text-indigo-600">
                      {backupStyles.length > 0 ? backupStyles.join('・') : 'なし'}
                    </span>
                  </div>
                </div>

                {/* プロファイル棒グラフ */}
                <div>
                  <LeadershipChart scores={scores} />
                </div>

                {/* 組織開発コンサルタント講評 */}
                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-3">
                  <h2 className="text-sm font-bold text-slate-800 border-l-4 border-blue-600 pl-2">
                    組織開発コンサルタント講評
                  </h2>
                  {loadingFeedback ? (
                    <div className="py-8 text-center text-slate-500 text-xs animate-pulse">
                      回答傾向を精査し、講評を生成中...
                    </div>
                  ) : (
                    <div className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {feedback}
                    </div>
                  )}
                </div>

                {/* 回答信頼度（最下部に配置） */}
                {reliability && (
                  <div className={`p-3 rounded-lg border text-xs ${
                    reliability.level === '高' ? 'bg-slate-50 border-slate-200 text-slate-600' :
                    reliability.level === '中' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                    'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <div className="flex justify-between items-center font-bold">
                      <span>回答信頼度（信憑性）</span>
                      <span>判定: {reliability.level} ({reliability.score}点)</span>
                    </div>
                    {reliability.penalties.length > 0 && (
                      <div className="mt-2 text-[10px] space-y-0.5 border-t border-slate-200 pt-1 text-slate-500">
                        {reliability.penalties.map((pen, idx) => (
                          <div key={idx}>• {pen}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 操作ボタン群 */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleDownloadPdf}
              disabled={loadingFeedback || isExportingPdf}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-2 disabled:bg-blue-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isExportingPdf ? 'PDFファイルを生成中...' : '診断結果をPDFとしてダウンロード'}
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