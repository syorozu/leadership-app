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

export function calculateReliability(answers: Record<number, number>, questions: Question[]): ReliabilityResult {
  let score = 98;
  const penalties: string[] = [];
  const vals = Object.values(answers);
  const total = questions.length || 36;

  if (vals.length === 0) return { score: 95, level: '高', isInvalid: false, penalties: [] };

  // 1. 同一回答の連続（緩めに設定：7問以上連続した場合のみ軽微に減点）
  let currentVal = vals[0];
  let currentRun = 1;
  let maxRun = 1;

  for (let i = 1; i < vals.length; i++) {
    if (vals[i] === currentVal) {
      currentRun++;
    } else {
      maxRun = Math.max(maxRun, currentRun);
      currentVal = vals[i];
      currentRun = 1;
    }
  }
  maxRun = Math.max(maxRun, currentRun);

  if (maxRun >= 7) {
    const deduct = Math.min(10, (maxRun - 6) * 3);
    score -= deduct;
    penalties.push(`同一選択肢の極端な連続（${maxRun}問連続: -${deduct}点）`);
  }

  // 2. 肯定的評価（4・5）への偏り（きつめに設定：55%超過からシビアに減点）
  const highCount = vals.filter(v => v >= 4).length;
  const highRatio = highCount / total;
  if (highRatio >= 0.55) {
    const deduct = Math.min(25, Math.round((highRatio - 0.55) * 55));
    score -= deduct;
    penalties.push(`肯定的回答（4・5）への偏向（全体の${Math.round(highRatio * 100)}% / 甘口評価バイアス: -${deduct}点）`);
  }

  // 3. 回答の平板化（標準偏差 0.65 未満で減点）
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / vals.length;
  const sd = Math.sqrt(variance);

  if (sd < 0.65) {
    const deduct = Math.min(12, Math.round((0.65 - sd) * 25));
    score -= deduct;
    penalties.push(`自己内省のメリハリ不足（平坦な回答傾向: -${deduct}点）`);
  }

  // 4. 同一スタイル内・類似設問の方向性不一致（きつめに設定）
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
        // 5と1の両極端
        score -= 10;
        penalties.push(`【${meta.name}】類似設問間で対照的・極端な回答のブレ（差: ${range} / -10点）`);
      } else if (range === 3) {
        // 5と2、または4と1
        score -= 6;
        penalties.push(`【${meta.name}】類似設問間で回答の方向性に不一致（差: ${range} / -6点）`);
      }
    }
  });

  // 5. 背反するトレードオフ設問ペアの同時肯定（きつめに設定）
  const tradeOffPairs = [
    {
      q1: 4,  // Q04: プロセスに口出しせず方向性のみ管理（ビジョン）
      q2: 36, // Q36: 自己流アレンジを認めず手順通りの完遂を徹底（指示命令）
      label: '「裁量委任」と「手順強制」の同時肯定'
    },
    {
      q1: 9,  // Q09: 納期が迫っても本人が気づくまで待つ（育成）
      q2: 28, // Q28: 進捗が遅れたら自分が直接作業を引き受け挽回（率先）
      label: '「見守り育成」と「直接代行」の同時肯定'
    },
    {
      q1: 21, // Q21: 納得合意が得られるまでトップダウンで打ち切らない（民主）
      q2: 33, // Q33: 膠着時は責任で即決しチームをその通り動かす（指示命令）
      label: '「合意徹底」と「即断独断」の同時肯定'
    },
    {
      q1: 16, // Q16: 融和のため成果未達やルール違反も大目に見る（関係）
      q2: 30, // Q30: プロセスより期日内の成果物クオリティのみで評価（率先）
      label: '「規律容認」と「結果至上主義」の同時肯定'
    }
  ];

  tradeOffPairs.forEach(pair => {
    const val1 = answers[pair.q1] || 3;
    const val2 = answers[pair.q2] || 3;
    if (val1 >= 4 && val2 >= 4) {
      score -= 8;
      penalties.push(`背反行動の同時肯定矛盾: ${pair.label}（-8点）`);
    }
  });

  // 最終スコアと判定レベル
  const finalScore = Math.max(30, Math.min(99, Math.round(score)));
  let level: '高' | '中' | '低' = '高';
  if (finalScore < 65) level = '低';
  else if (finalScore < 82) level = '中';

  const maxCount = Math.max(...[1, 2, 3, 4, 5].map(v => vals.filter(x => x === v).length));
  const isInvalid = maxCount / total >= 0.80;

  return { score: finalScore, level, isInvalid, penalties };
}

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