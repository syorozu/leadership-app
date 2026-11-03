'use client';

import React, { useState, useEffect } from 'react';
import { QUESTIONS, Question } from '../lib/questions';
import { calculateScores, calculateReliability, DiagnosisScore, ReliabilityResult } from '../lib/scoring';
import LeadershipChart from '../components/LeadershipChart';

export interface RoleOption {
  id: string;
  label: string;
  sub: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    id: 'executive',
    label: '経営層・役員クラス',
    sub: '全社ビジョンの提示・経営資源配分・最終意思決定を担う立場'
  },
  {
    id: 'director',
    label: '部長・部門長クラス',
    sub: '複数チームの統括・部門戦略の推進・課長陣の育成を担う立場'
  },
  {
    id: 'manager',
    label: '課長・マネージャークラス',
    sub: '現場チームの目標必達・業務管理・メンバーの直接育成を担う立場'
  },
  {
    id: 'leader',
    label: 'リーダー・主任・一般クラス',
    sub: '実務の牽引・小集団の取りまとめ・後輩指導を担う立場'
  }
];

export default function DiagnosisPage() {
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [scores, setScores] = useState<DiagnosisScore[]>([]);
  const [reliability, setReliability] = useState<ReliabilityResult | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [hasError, setHasError] = useState(false);

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
        requestFeedback(calculatedScores, calculatedReliability, selectedRole);
      }
    }
  };

  // 503混雑時に自動で最大3回リトライする通信関数（役職情報を付与）
  const requestFeedback = async (
    calculatedScores: DiagnosisScore[],
    calculatedReliability: ReliabilityResult,
    role: RoleOption | null
  ) => {
    setLoadingFeedback(true);
    setHasError(false);

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scores: calculatedScores,
            reliability: calculatedReliability,
            role: role ? { id: role.id, label: role.label, sub: role.sub } : null
          })
        });

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
          setHasError(true);
          setFeedback('AIサーバーの応答がタイムアウトしました。下のボタンから再取得してください。');
          break;
        }

        const data = await res.json();

        if (res.ok && data.feedback) {
          setFeedback(data.feedback);
          setHasError(false);
          break;
        } else {
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
          setHasError(true);
          setFeedback(data.error || '講評の取得に失敗しました。');
        }
      } catch (e: any) {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        setHasError(true);
        setFeedback(`通信エラーが発生しました: ${e.message}`);
      }
    }

    setLoadingFeedback(false);
  };

  const mainStyles = scores.filter(s => s.level === 'main').map(s => s.name);
  const backupStyles = scores.filter(s => s.level === 'backup').map(s => s.name);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 text-slate-900 p-4 font-sans">
      {/* ステップ0: 役職（階層）選択画面 */}
      {!selectedRole ? (
        <div className="flex flex-col min-h-[85vh] justify-center space-y-6 py-6">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
              STEP 1 / 2
            </span>
            <h1 className="text-xl font-bold text-slate-900 pt-1">
              現在の役職・役割を選択してください
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              求められるリーダーシップの視座や組織リスクは、役職によって大きく異なります。選択した階層を基準にプロファイル分析と講評を行います。
            </p>
          </div>

          <div className="space-y-3">
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role)}
                className="w-full text-left p-4 bg-white hover:bg-blue-50/70 active:bg-blue-100 border border-slate-200 hover:border-blue-400 rounded-xl shadow-xs transition-all group"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-slate-800 group-hover:text-blue-700">
                    {role.label}
                  </span>
                  <span className="text-xs text-slate-400 group-hover:text-blue-600 font-bold">
                    選択 →
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  {role.sub}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : !isCompleted ? (
        /* ステップ1: 36問の質問画面 */
        <div className="flex flex-col min-h-[90vh] justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded">
                対象: {selectedRole.label}
              </span>
              {currentIndex === 0 && (
                <button
                  onClick={() => setSelectedRole(null)}
                  className="text-[10px] text-blue-600 underline"
                >
                  役職を選び直す
                </button>
              )}
            </div>

            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-5">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / shuffledQuestions.length) * 100}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 font-bold mb-2">
              <span>質問 {currentIndex + 1} / {shuffledQuestions.length}</span>
              <span>直感で選択してください</span>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-3 min-h-[140px] flex items-center">
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
        /* ステップ2: 診断結果画面 */
        <div className="space-y-5 pb-12 pt-2">
          <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
              <h1 className="text-lg font-bold text-slate-900">リーダーシップ・スタイル診断結果</h1>
              <span className="text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full">
                {selectedRole.label}
              </span>
            </div>

            {reliability?.isInvalid ? (
              <div className="bg-red-100 border border-red-300 p-4 rounded-lg text-center text-xs text-red-800 space-y-2">
                <p className="font-bold">【無効回答として判定されました】</p>
                <p>同一選択肢が極端に集中しているため再受検を推奨します。</p>
              </div>
            ) : (
              <>
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

                <div>
                  <LeadershipChart scores={scores} />
                </div>

                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-3">
                  <h2 className="text-sm font-bold text-slate-800 border-l-4 border-blue-600 pl-2">
                    組織開発コンサルタント講評（{selectedRole.label}基準）
                  </h2>
                  {loadingFeedback ? (
                    <div className="py-8 text-center text-slate-500 text-xs animate-pulse">
                      {selectedRole.label}に求められる要件と回答傾向を照合し、講評を生成中...
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {feedback}
                      </div>
                      {hasError && reliability && (
                        <button
                          onClick={() => requestFeedback(scores, reliability, selectedRole)}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold shadow-xs transition-colors"
                        >
                          講評を再取得する（回答データは保持されています）
                        </button>
                      )}
                    </div>
                  )}
                </div>

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

          <div className="pt-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
            >
              もう一度診断を受ける
            </button>
          </div>
        </div>
      )}
    </div>
  );
}