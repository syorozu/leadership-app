import type { Question } from './questions';

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

function standardNormalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

export interface DiagnosisScore {
  key: StyleKey;
  name: string;
  score5: number;
  percentile: number;
  level: 'main' | 'backup' | 'underdeveloped';
  posAvg: number;
  revAvg: number;
  divergence: number;
}

export interface ReliabilityResult {
  score: number;
  level: '高' | '中' | '低';
  isInvalid: boolean;
  penalties: string[];
}

// 信頼度スコアの動的計算（100点固定を排除）
export function calculateReliability(answers: Record<number, number>, questions: Question[]): ReliabilityResult {
  let score = 100;
  const penalties: string[] = [];
  const vals = Object.values(answers);
  const total = questions.length || 36;

  if (vals.length === 0) return { score: 100, level: '高', isInvalid: false, penalties: [] };

  // 1. 同一回答の集中度チェック
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  vals.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  const maxCount = Math.max(...Object.values(counts));
  const maxRatio = maxCount / total;
  let isInvalid = false;

  if (maxRatio >= 0.80) {
    score -= 45;
    isInvalid = true;
    penalties.push(`回答の${Math.round(maxRatio * 100)}%が同一選択肢です（無効回答判定）`);
  } else if (maxRatio >= 0.55) {
    score -= 20;
    penalties.push(`特定の選択肢への過度な集中（-20点）`);
  } else if (maxRatio >= 0.45) {
    score -= 10;
    penalties.push(`選択肢の偏り傾向（-10点）`);
  }

  // 2. 回答のバラつき（標準偏差）チェック：平板回答の検知
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / vals.length;
  const sd = Math.sqrt(variance);

  if (sd < 0.60) {
    score -= 15;
    penalties.push(`自己内省のメリハリ不足（平坦な回答傾向 / -15点）`);
  }

  // 3. 全肯定バイアス（4と5の割合が過半数を大きく超える）
  const highRatio = vals.filter(v => v >= 4).length / total;
  if (highRatio >= 0.70) {
    score -= 15;
    penalties.push(`肯定的回答への強い偏り（自己評価の甘口傾向 / -15点）`);
  }

  // 4. トレードオフの同時肯定（矛盾検出）
  const getAvg = (styleName: string) => {
    const qs = questions.filter(q => (q.style === styleName) || (styleName === 'commanding' && (q as any).category === 'directive'));
    const scores = qs.map(q => answers[q.id] || 3);
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 3;
  };

  const commandingAvg = getAvg('commanding');
  const democraticAvg = getAvg('democratic');
  const pacesettingAvg = getAvg('pacesetting');
  const coachingAvg = getAvg('coaching');

  if (commandingAvg >= 4.0 && democraticAvg >= 4.0) {
    score -= 15;
    penalties.push(`「指示命令」と「民主型」という相反行動の同時過大評価（-15点）`);
  }
  if (pacesettingAvg >= 4.0 && coachingAvg >= 4.0) {
    score -= 10;
    penalties.push(`「率先型」と「育成型」という時間的トレードオフの軽視（-10点）`);
  }

  const finalScore = Math.max(20, Math.min(100, score));
  let level: '高' | '中' | '低' = '高';
  if (finalScore < 65) level = '低';
  else if (finalScore < 85) level = '中';

  return { score: finalScore, level, isInvalid, penalties };
}

// 個人内センタリングによるパーセンタイル計算
export function calculateScores(answers: Record<number, number>, questions: Question[]): DiagnosisScore[] {
  const list = STYLE_METAS.map(meta => {
    const qs = questions.filter(q => {
      const cat = (q as any).category || q.style;
      return cat === meta.key || (meta.key === 'directive' && cat === 'commanding');
    });
    const sList = qs.map(q => answers[q.id] || 3);
    const score5 = Number((sList.reduce((a, b) => a + b, 0) / (sList.length || 1)).toFixed(2));
    return { meta, score5 };
  });

  const totalMean = list.reduce((sum, item) => sum + item.score5, 0) / list.length;
  const RELATIVE_SD = 0.40;

  return list.map(item => {
    const diff = item.score5 - totalMean;
    const z = diff / RELATIVE_SD;
    const percentile = Math.min(99, Math.max(1, Math.round(standardNormalCDF(z) * 100)));

    let level: 'main' | 'backup' | 'underdeveloped' = 'underdeveloped';
    if (percentile >= 70) level = 'main';
    else if (percentile >= 50) level = 'backup';

    return {
      key: item.meta.key,
      name: item.meta.name,
      score5: item.score5,
      percentile,
      level,
      posAvg: item.score5,
      revAvg: item.score5,
      divergence: 0
    };
  });
}