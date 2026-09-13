import type { Question } from './questions';

// 互換性確保のためのスタイルキー型定義
export type StyleKey =
  | 'directive'
  | 'commanding'
  | 'visionary'
  | 'affiliative'
  | 'democratic'
  | 'pacesetting'
  | 'coaching';

export interface StyleMeta {
  key: StyleKey;
  name: string;
}

export const STYLE_METAS: StyleMeta[] = [
  { key: 'directive', name: '指示命令型' },
  { key: 'visionary', name: 'ビジョン型' },
  { key: 'affiliative', name: '関係重視型' },
  { key: 'democratic', name: '民主型' },
  { key: 'pacesetting', name: '率先型' },
  { key: 'coaching', name: '育成型' }
];

// 標準正規分布の累積分布関数（CDF）
function standardNormalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

export interface DiagnosisScore {
  key: StyleKey;
  name: string;
  score5: number;        // 5点満点の素点平均
  percentile: number;    // 個人内センタリングによるパーセンタイル (1〜99)
  level: 'main' | 'backup' | 'underdeveloped';
  posAvg: number;
  revAvg: number;
  divergence: number;
}

export interface ReliabilityResult {
  score: number;         // 100点満点
  level: '高' | '中' | '低';
  isInvalid: boolean;    // 80%以上同一選択による無効回答判定
  penalties: string[];   // 減点理由リスト
}

// 信頼度スコアの計算
export function calculateReliability(answers: Record<number, number>, questions: Question[]): ReliabilityResult {
  let score = 100;
  const penalties: string[] = [];

  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const total = questions.length || 36;
  Object.values(answers).forEach(v => {
    if (counts[v] !== undefined) counts[v]++;
  });

  const maxFreq = Math.max(...Object.values(counts));
  const maxRatio = total > 0 ? maxFreq / total : 0;
  let isInvalid = false;

  if (maxRatio >= 0.80) {
    score -= 40;
    isInvalid = true;
    penalties.push(`全回答の${Math.round(maxRatio * 100)}%が同一選択肢です（無効回答判定・再受検推奨）`);
  } else if (maxRatio >= 0.70) {
    score -= 40;
    penalties.push(`全回答の${Math.round(maxRatio * 100)}%が同一選択肢に偏っています（-40点）`);
  }

  STYLE_METAS.forEach(meta => {
    const styleQs = questions.filter(q => {
      const cat = (q as any).category || (q as any).style;
      return cat === meta.key || (meta.key === 'directive' && cat === 'commanding');
    });

    if (styleQs.length === 0) return;

    const posQs = styleQs.filter(q => !(q as any).isReverse);
    const revQs = styleQs.filter(q => (q as any).isReverse);

    const posScores = posQs.map(q => answers[q.id] || 3);
    const revRawScores = revQs.map(q => answers[q.id] || 3);
    const revConvertedScores = revRawScores.map(v => 6 - v);

    const posAvg = posScores.length > 0 ? posScores.reduce((a, b) => a + b, 0) / posScores.length : 3;
    const revAvg = revConvertedScores.length > 0 ? revConvertedScores.reduce((a, b) => a + b, 0) / revConvertedScores.length : posAvg;
    const divergence = revQs.length > 0 ? Math.abs(posAvg - revAvg) : 0;

    if (revQs.length > 0) {
      if (divergence >= 2.0) {
        score -= 15;
        penalties.push(`【${meta.name}】正反対の設問との乖離度が極めて高い（乖離度: ${divergence.toFixed(1)} / -15点）`);
      } else if (divergence > 1.0) {
        score -= 5;
        penalties.push(`【${meta.name}】正反対の設問間で回答に食い違いがあります（乖離度: ${divergence.toFixed(1)} / -5点）`);
      }
    }

    if (['visionary', 'democratic', 'coaching'].includes(meta.key)) {
      const isPosAllHigh = posAvg >= 4.5;
      const hasHighRawInReverse = revRawScores.length > 0 ? revRawScores.some(val => val >= 3) : false;
      if (isPosAllHigh && hasHighRawInReverse) {
        score -= 10;
        penalties.push(`【${meta.name}】理想像への過剰同調（好ましい行動に満点を付けつつ、阻害行動も肯定 / -10点）`);
      }
    }
  });

  const finalScore = Math.max(0, score);
  let level: '高' | '中' | '低' = '高';
  if (finalScore < 60) level = '低';
  else if (finalScore < 80) level = '中';

  return { score: finalScore, level, isInvalid, penalties };
}

// 各スタイルのスコアおよびパーセンタイル計算（個人内センタリング方式）
export function calculateScores(answers: Record<number, number>, questions: Question[]): DiagnosisScore[] {
  // 1. 各スタイルの素点平均（score5）を算出
  const styleRawAverages: { meta: StyleMeta; score5: number; posAvg: number; revAvg: number; divergence: number }[] = [];

  STYLE_METAS.forEach(meta => {
    const styleQs = questions.filter(q => {
      const cat = (q as any).category || (q as any).style;
      return cat === meta.key || (meta.key === 'directive' && cat === 'commanding');
    });

    const posQs = styleQs.filter(q => !(q as any).isReverse);
    const revQs = styleQs.filter(q => (q as any).isReverse);

    const posScores = posQs.map(q => answers[q.id] || 3);
    const revScores = revQs.map(q => 6 - (answers[q.id] || 3));

    const posAvg = posScores.length > 0 ? posScores.reduce((a, b) => a + b, 0) / posScores.length : 3;
    const revAvg = revScores.length > 0 ? revScores.reduce((a, b) => a + b, 0) / revScores.length : posAvg;

    const score5 = revQs.length > 0
      ? Number(((posAvg + revAvg) / 2).toFixed(2))
      : Number(posAvg.toFixed(2));

    const divergence = revQs.length > 0
      ? Number(Math.abs(posAvg - revAvg).toFixed(2))
      : 0;

    styleRawAverages.push({ meta, score5, posAvg, revAvg, divergence });
  });

  // 2. 受検者個人の全6スタイル平均値（ベースライン）を算出
  const totalScoreSum = styleRawAverages.reduce((sum, item) => sum + item.score5, 0);
  const userGlobalMean = totalScoreSum / (styleRawAverages.length || 1);

  // 3. 個人内センタリングによるパーセンタイル換算
  const RELATIVE_SD = 0.40;

  return styleRawAverages.map(item => {
    const relativeDiff = item.score5 - userGlobalMean;
    const zScore = relativeDiff / RELATIVE_SD;

    // 正規分布CDFで 1〜99% にマッピング
    const percentile = Math.min(99, Math.max(1, Math.round(standardNormalCDF(zScore) * 100)));

    let level: 'main' | 'backup' | 'underdeveloped' = 'underdeveloped';
    if (percentile >= 70) level = 'main';
    else if (percentile >= 45) level = 'backup';

    return {
      key: item.meta.key,
      name: item.meta.name,
      score5: item.score5,
      percentile,
      level,
      posAvg: Number(item.posAvg.toFixed(2)),
      revAvg: Number(item.revAvg.toFixed(2)),
      divergence: Number(item.divergence.toFixed(2))
    };
  });
}