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

// 信頼度スコアの計算（類似設問乖離＋反対設問矛盾の厳格判定）
export function calculateReliability(answers: Record<number, number>, questions: Question[]): ReliabilityResult {
  let score = 95;
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
    const penaltyVal = Math.min(20, runDeduct);
    score -= penaltyVal;
    penalties.push(`同じ選択肢の連続選択（最大${maxRun}問連続 / 思考停止傾向: -${penaltyVal}点）`);
  }

  // 2. 甘口バイアス（4と5の割合が45%を超えたら減点）
  const highCount = vals.filter(v => v >= 4).length;
  const highRatio = highCount / total;
  if (highRatio >= 0.45) {
    const deduct = Math.min(25, Math.round((highRatio - 0.45) * 55));
    score -= deduct;
    penalties.push(`肯定的回答（4・5）への過度な偏り（全体の${Math.round(highRatio * 100)}% / 甘口自己評価: -${deduct}点）`);
  }

  // 3. 回答の平板化（標準偏差が0.90未満で減点）
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / vals.length;
  const sd = Math.sqrt(variance);

  if (sd < 0.90) {
    const deduct = Math.min(18, Math.round((0.90 - sd) * 30));
    score -= deduct;
    penalties.push(`自己内省のメリハリ不足（平坦な回答傾向: -${deduct}点）`);
  }

  // 4. 同一スタイル内・類似設問の方向性不一致（大きなブレの検知）
  STYLE_METAS.forEach(meta => {
    const styleQs = questions.filter(q => {
      const cat = (q as any).category || q.style;
      return cat === meta.key || (meta.key === 'directive' && cat === 'commanding');
    });
    const sScores = styleQs.map(q => answers[q.id]).filter(v => v !== undefined);
    if (sScores.length >= 4) {
      const maxVal = Math.max(...sScores);
      const minVal = Math.min(...sScores);
      const range = maxVal - minVal;
      if (range >= 4) {
        score -= 8;
        penalties.push(`【${meta.name}】類似設問間で回答が正反対に分裂（最大差: ${range}点 / -8点）`);
      } else if (range === 3) {
        score -= 4;
        penalties.push(`【${meta.name}】類似設問間で回答に大きなバラつき（最大差: ${range}点 / -4点）`);
      }
    }
  });

  // 5. 背反する反対設問ペアの矛盾（トレードオフの同時肯定を検出）
  const tradeOffPairs = [
    {
      q1: 4,  // Q04: プロセスには口出しせず方向性のみ管理（ビジョン）
      q2: 36, // Q36: 自己流アレンジを認めず手順通りの完遂を徹底（指示命令）
      label: '「裁量委任（Q04）」と「手順強制（Q36）」の同時肯定'
    },
    {
      q1: 9,  // Q09: 納期が迫っても指示せず本人が気づくまで待つ（育成）
      q2: 28, // Q28: 進捗が遅れたら自分が直接作業を引き受け挽回（率先）
      label: '「見守り育成（Q09）」と「直接代行（Q28）」の同時肯定'
    },
    {
      q1: 21, // Q21: 納得合意が得られるまでトップダウンで打ち切らない（民主）
      q2: 33, // Q33: 膠着時は責任で即決しチームをその通り動かす（指示命令）
      label: '「合意徹底（Q21）」と「即断独断（Q33）」の同時肯定'
    },
    {
      q1: 16, // Q16: 融和のため成果未達やルール違反も大目に見る（関係）
      q2: 30, // Q30: プロセスより期日内の成果物クオリティのみで評価（率先）
      label: '「規律の容認（Q16）」と「結果至上主義（Q30）」の同時肯定'
    }
  ];

  tradeOffPairs.forEach(pair => {
    const val1 = answers[pair.q1] || 3;
    const val2 = answers[pair.q2] || 3;
    if (val1 >= 4 && val2 >= 4) {
      score -= 8;
      penalties.push(`背反する行動の矛盾: ${pair.label}（-8点）`);
    }
  });

  const finalScore = Math.max(25, Math.min(95, Math.round(score)));
  let level: '高' | '中' | '低' = '高';
  if (finalScore < 70) level = '低';
  else if (finalScore < 85) level = '中';

  const maxCount = Math.max(...[1, 2, 3, 4, 5].map(v => vals.filter(x => x === v).length));
  const isInvalid = maxCount / total >= 0.75;

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