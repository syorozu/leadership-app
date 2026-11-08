'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QUESTIONS, Question } from '../lib/questions';
import { calculateScores, calculateReliability, DiagnosisScore, ReliabilityResult } from '../lib/scoring';
import LeadershipChart from '../components/LeadershipChart';

export interface RoleOption {
  id: string;
  label: string;
  sub: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  { id: 'executive', label: '経営層・役員クラス', sub: '全社ビジョンの提示・経営資源配分・最終意思決定を担う立場' },
  { id: 'director', label: '部長・部門長クラス', sub: '複数チームの統括・部門戦略の推進・課長陣の育成を担う立場' },
  { id: 'manager', label: '課長・マネージャークラス', sub: '現場チームの目標必達・業務管理・メンバーの直接育成を担う立場' },
  { id: 'leader', label: 'リーダー・主任・一般クラス', sub: '実務の牽引・小集団の取りまとめ・後輩指導を担う立場' }
];

const STYLE_DEFINITIONS = [
  { name: 'ビジョン型', desc: '共通の夢や目標を提示し、メンバーを動機づける。' },
  { name: '関係重視型', desc: '人間関係や感情の絆を重視し、チームの調和を図る。' },
  { name: '民主型', desc: 'メンバーの意見を引き出し、合意形成を通じてコミットメントを高める。' },
  { name: '育成型', desc: '個人の目標と組織の目標を結びつけ、長期的な成長を支援する。' },
  { name: '率先型', desc: 'リーダー自らが手本となり、高いパフォーマンス基準を要求する。' },
  { name: '指示命令型', desc: '緊急時などに明確な指示を出し、即座の服従を求める。' }
];

export default function DiagnosisPage() {
  // --- 状態管理 ---
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  
  // 結果データ
  const [scores, setScores] = useState<DiagnosisScore[]>([]);
  const [reliability, setReliability] = useState<ReliabilityResult | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  
  // UX状態
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [highlightedAnswer, setHighlightedAnswer] = useState<number | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  // --- 初期化処理 (シャッフル & 復元) ---
  useEffect(() => {
    // 質問シャッフル
    const list = [...QUESTIONS];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    setShuffledQuestions(list);

    // URLパラメータから共有データを復元
    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get('data');
    if (sharedData) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(sharedData)));
        setScores(decoded.scores);
        setReliability(decoded.reliability);
        setSelectedRole(decoded.role);
        if (decoded.feedback) setFeedback(decoded.feedback);
        setIsCompleted(true);
        setHasStarted(true);
        // URLをクリーンアップ
        window.history.replaceState({}, '', window.location.pathname);
        return;
      } catch (e) {
        console.error('共有データの復元に失敗しました', e);
      }
    }
  }, []);

  // --- 回答と遷移処理 ---
  const handleSelect = (value: number) => {
    if (highlightedAnswer !== null) return; // 連続タップ防止
    setHighlightedAnswer(value);
    
    const updated = { ...answers, [shuffledQuestions[currentIndex].id]: value };
    setAnswers(updated);

    setTimeout(() => {
      setHighlightedAnswer(null);
      if (currentIndex < shuffledQuestions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        finishDiagnosis(updated);
      }
    }, 300); // 300msのハイライト遅延
  };

  const finishDiagnosis = (finalAnswers: Record<number, number>) => {
    const calculatedScores = calculateScores(finalAnswers, QUESTIONS);
    const calculatedReliability = calculateReliability(finalAnswers, QUESTIONS);
    setScores(calculatedScores);
    setReliability(calculatedReliability);
    setIsCompleted(true);

    if (!calculatedReliability.isInvalid) {
      requestFeedback(calculatedScores, calculatedReliability, selectedRole);
    }
  };

  // --- AI講評取得 (タイムアウト・再試行対応) ---
  const fetchAbortController = useRef<AbortController | null>(null);

  const requestFeedback = useCallback(async (
    calculatedScores: DiagnosisScore[],
    calculatedReliability: ReliabilityResult,
    role: RoleOption | null
  ) => {
    setLoadingFeedback(true);
    setHasError(false);
    setFeedback('');

    if (fetchAbortController.current) {
      fetchAbortController.current.abort();
    }
    fetchAbortController.current = new AbortController();
    const timeoutId = setTimeout(() => fetchAbortController.current?.abort(), 90000); // 90秒タイムアウト

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: fetchAbortController.current.signal,
        body: JSON.stringify({
          scores: calculatedScores,
          reliability: calculatedReliability,
          role: role ? { id: role.id, label: role.label, sub: role.sub } : null
        })
      });

      clearTimeout(timeoutId);
      const contentType = res.headers.get('content-type') || '';
      
      if (!contentType.includes('application/json')) {
        setHasError(true);
        setFeedback('サーバーエラーが発生しました。時間を置いて再試行してください。');
        setLoadingFeedback(false);
        return;
      }

      const data = await res.json();

      if (res.ok && data.feedback) {
        setFeedback(data.feedback);
      } else {
        setHasError(true);
        setFeedback(data.error || '講評の取得に失敗しました。');
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      setHasError(true);
      if (e.name === 'AbortError') {
        setFeedback('生成に時間がかかりすぎたためタイムアウトしました。再試行してください。');
      } else {
        setFeedback(`通信エラーが発生しました: ${e.message}`);
      }
    } finally {
      setLoadingFeedback(false);
    }
  }, []);

  // --- データ共有処理 ---
  const generateShareUrl = () => {
    const data = { scores, reliability, role: selectedRole, feedback };
    const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
    return `${window.location.origin}${window.location.pathname}?data=${encoded}`;
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(generateShareUrl());
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
    } catch (e) {
      alert('URLのコピーに失敗しました。');
    }
  };

  const handleEmailShare = () => {
    const url = generateShareUrl();
    const mainStylesText = scores.filter(s => s.level === 'main').map(s => s.name).join('・') || 'なし';
    const backupStylesText = scores.filter(s => s.level === 'backup').map(s => s.name).join('・') || 'なし';
    
    const subject = 'リーダーシップ・スタイル診断結果';
    const body = `私のリーダーシップ・スタイル診断結果です。\n\n【メインスタイル】\n${mainStylesText}\n\n【バックアップ】\n${backupStylesText}\n\n▼以下のリンクから詳しい結果とAI講評を確認できます\n${url}`;
    
    // mailtoスキームを起動
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (shuffledQuestions.length === 0) return null;

  // --- 表示用変数 ---
  const currentQ = shuffledQuestions[currentIndex];
  const mainStyles = scores.filter(s => s.level === 'main').map(s => s.name);
  const backupStyles = scores.filter(s => s.level === 'backup').map(s => s.name);

  // ==========================================
  // レンダー: スタート画面
  // ==========================================
  if (!hasStarted) {
    return (
      <div className="max-w-xl mx-auto min-h-screen bg-slate-50 text-slate-900 p-6 font-sans flex flex-col justify-center">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">リーダーシップ・スタイル診断</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              コーン・フェリーの6つのスタイルに基づき、あなたのリーダーシップ特性をプロファイル分析します。
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 text-sm text-slate-700">
            <p>📋 <strong>設問数</strong>：全36問（直感でお答えください）</p>
            <p>⏱ <strong>所要時間</strong>：約3分程度</p>
            <p>🔒 <strong>データについて</strong>：回答結果はあなたのブラウザ（端末）にのみ保存され、外部サーバーには記録されません。</p>
          </div>

          <div className="space-y-3 pt-4">
            <h2 className="text-sm font-bold text-slate-800">現在の役職・役割を選択してください</h2>
            <div className="space-y-2">
              {ROLE_OPTIONS.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full text-left p-4 border rounded-xl transition-all ${
                    selectedRole?.id === role.id 
                      ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' 
                      : 'bg-white border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="font-bold text-slate-800">{role.label}</div>
                  <div className="text-[11px] text-slate-500 mt-1">{role.sub}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <button
              onClick={() => setHasStarted(true)}
              disabled={!selectedRole}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-md transition-colors"
            >
              診断を開始する
            </button>
            {!selectedRole && (
              <p className="text-center text-xs text-red-500 font-bold">※役職を選択してください</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // レンダー: 診断画面 (36問)
  // ==========================================
  if (!isCompleted) {
    return (
      <div className="max-w-2xl mx-auto min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 font-sans">
        <div className="flex flex-col min-h-[90vh] justify-between">
          <div className="space-y-6">
            {/* ヘッダー・戻るボタン */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => setCurrentIndex(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="text-sm font-bold text-slate-500 disabled:text-slate-300 flex items-center gap-1"
              >
                <span className="text-lg">←</span> 戻る
              </button>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                {selectedRole?.label}
              </span>
            </div>

            {/* 進捗表示 */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-bold text-slate-700">
                  質問 {currentIndex + 1} <span className="text-xs text-slate-400 font-normal">/ 36</span>
                </span>
                <span className="text-xs font-bold text-blue-600">
                  残り {36 - currentIndex - 1}問 ({Math.round(((currentIndex) / 36) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 ease-out"
                  style={{ width: `${((currentIndex) / 36) * 100}%` }}
                />
              </div>
            </div>

            {/* 質問文 */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm min-h-[160px] flex items-center justify-center">
              <p className="text-lg sm:text-xl font-bold leading-relaxed text-slate-800 text-center">
                {currentQ.text}
              </p>
            </div>
          </div>

          {/* 選択肢 */}
          <div className="flex flex-col gap-2.5 my-8">
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
                className={`w-full py-4 px-5 bg-white border rounded-xl text-sm font-bold text-slate-700 flex justify-between items-center transition-all
                  ${highlightedAnswer === btn.val 
                    ? 'bg-blue-100 border-blue-500 ring-1 ring-blue-500 transform scale-[0.99]' 
                    : 'border-slate-300 hover:bg-slate-50 hover:border-slate-400'
                  }`}
              >
                <span>{btn.label}</span>
                <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-mono">{btn.val}</span>
              </button>
            ))}
          </div>
          
          <div className="text-center pb-4">
            <button
              onClick={() => { setHasStarted(false); setCurrentIndex(0); setAnswers({}); }}
              className="text-xs text-slate-400 underline hover:text-slate-600"
            >
              最初からやり直す
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // レンダー: 結果画面 (レスポンシブ 2カラム対応)
  // ==========================================
  return (
    <div className="max-w-5xl mx-auto min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 font-sans print:bg-white print:p-0">
      
      {/* 印刷時非表示のヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3 print:hidden">
        <h1 className="text-xl font-bold text-slate-900">診断結果</h1>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleShare}
            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded text-xs font-bold shadow-sm hover:bg-slate-50 transition-colors"
          >
            {shareCopied ? 'URLをコピーしました！' : 'URLコピー'}
          </button>
          <button 
            onClick={handleEmailShare}
            className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs font-bold shadow-sm hover:bg-blue-100 transition-colors"
          >
            メールで送る
          </button>
          <button 
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-slate-800 text-white rounded text-xs font-bold shadow-sm hover:bg-slate-700 transition-colors"
          >
            PDF保存・印刷
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:block">
        
        {/* 左カラム：データとチャート */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
            <div className="mb-4">
              <span className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full">
                {selectedRole?.label || '役職不明'}
              </span>
            </div>

            {reliability?.isInvalid ? (
              <div className="bg-red-100 border border-red-300 p-4 rounded-lg text-center text-sm text-red-800">
                <p className="font-bold">【無効回答】</p>
                <p>回答に極端な偏りがあるため、正確な分析ができません。</p>
              </div>
            ) : (
              <>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 mb-6">
                  <div className="flex items-center text-sm">
                    <span className="w-28 font-bold text-slate-600">メインスタイル:</span>
                    <span className="font-bold text-blue-700">
                      {mainStyles.length > 0 ? mainStyles.join('・') : 'なし'}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="w-28 font-bold text-slate-600">バックアップ:</span>
                    <span className="font-bold text-indigo-600">
                      {backupStyles.length > 0 ? backupStyles.join('・') : 'なし'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-200">
                    ※メイン(70%以上)は無意識に発揮される強み、バックアップ(50〜69%)は意識的に使えるスタイルを表します。
                  </p>
                </div>

                <LeadershipChart scores={scores} />
              </>
            )}
          </div>

          {/* スタイル定義の解説 (結果画面の説明) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm print:break-inside-avoid">
            <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-4 border-blue-600 pl-2">6つのリーダーシップスタイル定義</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STYLE_DEFINITIONS.map(def => (
                <div key={def.name} className="text-xs">
                  <div className="font-bold text-slate-700 mb-0.5">{def.name}</div>
                  <div className="text-slate-500 leading-tight">{def.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右カラム：講評 */}
        <div className="space-y-6 h-full">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full print:border-none print:shadow-none print:p-0">
            <h2 className="text-base font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
              組織開発コンサルタント講評
            </h2>
            
            {loadingFeedback ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded w-full"></div>
                <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                <div className="pt-4">
                  <div className="h-32 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                    <span className="text-xs font-bold text-slate-400">
                      AI講評を生成中... (通常30秒ほどかかります)
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {feedback && (
                  <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {feedback}
                  </div>
                )}
                
                {hasError && reliability && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg space-y-3 print:hidden">
                    <p className="text-xs text-red-700 font-bold">{feedback}</p>
                    <button
                      onClick={() => requestFeedback(scores, reliability, selectedRole)}
                      className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-colors"
                    >
                      講評を再取得する
                    </button>
                  </div>
                )}
              </div>
            )}

            {reliability && !reliability.isInvalid && (
              <div className="mt-8 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs print:break-inside-avoid">
                <div className="flex justify-between items-center font-bold text-slate-600">
                  <span>回答信頼度（信憑性）</span>
                  <span>判定: {reliability.level} ({reliability.score}点)</span>
                </div>
                {reliability.penalties.length > 0 && (
                  <div className="mt-2 text-[10px] space-y-1 border-t border-slate-200 pt-2 text-slate-500">
                    {reliability.penalties.map((pen, idx) => (
                      <div key={idx}>• {pen}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="mt-8 text-center print:hidden">
        <button
          onClick={() => {
            window.history.replaceState({}, '', window.location.pathname);
            window.location.reload();
          }}
          className="text-sm text-slate-500 underline hover:text-slate-700"
        >
          最初から診断をやり直す
        </button>
      </div>
    </div>
  );
}