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

// 信頼度スコアの計算（シビア判定アルゴリズム）
export function calculateReliability(answers: Record<number, number>, questions: Question[]): ReliabilityResult {
  let score = 92;
  const penalties: string[] = [];
  const vals = Object.values(answers);
  const total = questions.length || 36;

  if (vals.length === 0) return { score: 85, level: '高', isInvalid: false, penalties: [] };

  // 1. 同一回答の連続（3問連続から即座に減点）
  let currentVal = vals[0];
  let currentRun = 1;
  let maxRun = 1;
  let runDeduct = 0;

  for (let i = 1; i < vals.length; i++) {
    if (vals[i] === currentVal) {
      currentRun++;
      if (currentRun >= 3) {
        runDeduct += 4;
      }
    } else {
      maxRun = Math.max(maxRun, currentRun);
      currentVal = vals[i];
      currentRun = 1;
    }
  }
  maxRun = Math.max(maxRun, currentRun);

  if (runDeduct > 0) {
    const penaltyVal = Math.min(24, runDeduct);
    score -= penaltyVal;
    penalties.push(`同じ選択肢の連続選択（最大${maxRun}問連続 / 思考停止・省力回答の検知: -${penaltyVal}点）`);
  }

  // 2. 甘口バイアス（4と5の割合が45%を超えたらシビアに減点）
  const highCount = vals.filter(v => v >= 4).length;
  const highRatio = highCount / total;
  if (highRatio >= 0.45) {
    const deduct = Math.min(30, Math.round((highRatio - 0.45) * 60));
    score -= deduct;
    penalties.push(`肯定的回答（4・5）への過度な偏り（全回答の${Math.round(highRatio * 100)}% / 自己肯定バイアス: -${deduct}点）`);
  }

  // 3. 回答の平板化（標準偏差が0.95未満で減点）
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / vals.length;
  const sd = Math.sqrt(variance);

  if (sd < 0.95) {
    const deduct = Math.min(20, Math.round((0.95 - sd) * 35));
    score -= deduct;
    penalties.push(`自己内省のメリハリ不足（回答の起伏が乏しい平坦な傾向: -${deduct}点）`);
  }

  // 4. 同一選択肢の全体集中度
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  vals.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  const maxFreq = Math.max(...Object.values(counts));
  const maxRatio = maxFreq / total;
  let isInvalid = false;

  if (maxRatio >= 0.75) {
    score -= 45;
    isInvalid = true;
    penalties.push(`全回答の${Math.round(maxRatio * 100)}%が同一選択肢（無効回答判定・再受検推奨）`);
  } else if (maxRatio >= 0.40) {
    const deduct = Math.min(20, Math.round((maxRatio - 0.40) * 45));
    score -= deduct;
    penalties.push(`特定の回答選択肢への集中傾向（${Math.round(maxRatio * 100)}% / -${deduct}点）`);
  }

  // 5. リーダーシップ行動のトレードオフ矛盾（相反スタイルの同時高評価）
  const getAvg = (styleName: string) => {
    const qs = questions.filter(q => (q.style === styleName) || (styleName === 'commanding' && (q as any).category === 'directive'));
    const scores = qs.map(q => answers[q.id] || 3);
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 3;
  };

  const commandingAvg = getAvg('commanding');
  const democraticAvg = getAvg('democratic');
  const pacesettingAvg = getAvg('pacesetting');
  const coachingAvg = getAvg('coaching');

  // 指示命令 vs 民主型
  if (commandingAvg >= 3.6 && democraticAvg >= 3.6) {
    score -= 12;
    penalties.push(`「指示命令型」と「民主型」という背反する意思決定スタイルの同時過大評価（-12点）`);
  }
  // 率先型 vs 育成型
  if (pacesettingAvg >= 3.6 && coachingAvg >= 3.6) {
    score -= 10;
    penalties.push(`「率先型」と「育成型」という時間投下のトレードオフに対する内省の矛盾（-10点）`);
  }

  const finalScore = Math.max(25, Math.min(95, Math.round(score)));
  let level: '高' | '中' | '低' = '高';
  if (finalScore < 70) level = '低';
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