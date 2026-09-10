import { StyleKey, Question } from './questions';

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
  score5: number;        // 5点満点得点
  percentile: number;    // パーセンタイル (0〜100)
  level: 'main' | 'backup' | 'underdeveloped';
  posAvg: number;        // 正方向平均
  revAvg: number;        // 反転後平均
  divergence: number;    // 乖離度
}

export interface ReliabilityResult {
  score: number;         // 100点満点
  level: '高' | '中' | '低';
  isInvalid: boolean;    // 80%以上同じ数字による無効回答判定
  penalties: string[];   // 減点理由リスト
}

// 信頼度スコアの計算
export function calculateReliability(answers: Record<number, number>, questions: Question[]): ReliabilityResult {
  let score = 100;
  const penalties: string[] = [];

  // 減点項目③：回答の偏り・無気力回答
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const total = questions.length; // 36
  Object.values(answers).forEach(v => {
    if (counts[v] !== undefined) counts[v]++;
  });

  const maxFreq = Math.max(...Object.values(counts));
  const maxRatio = maxFreq / total;
  let isInvalid = false;

  if (maxRatio >= 0.80) {
    score -= 40;
    isInvalid = true;
    penalties.push(`全回答の${Math.round(maxRatio * 100)}%が同一の選択肢です（無効回答判定・再受検推奨）`);
  } else if (maxRatio >= 0.70) {
    score -= 40;
    penalties.push(`全回答の${Math.round(maxRatio * 100)}%が同一の選択肢に偏っています（-40点）`);
  }

  // スタイルごとの集計
  STYLE_METAS.forEach(meta => {
    const styleQs = questions.filter(q => q.category === meta.key);
    const posQs = styleQs.filter(q => !q.isReverse);
    const revQs = styleQs.filter(q => q.isReverse);

    const posScores = posQs.map(q => answers[q.id] || 3);
    const revRawScores = revQs.map(q => answers[q.id] || 3);
    const revConvertedScores = revRawScores.map(v => 6 - v);

    const posAvg = posScores.reduce((a, b) => a + b, 0) / posScores.length;
    const revAvg = revConvertedScores.reduce((a, b) => a + b, 0) / revConvertedScores.length;
    const divergence = Math.abs(posAvg - revAvg);

    // 減点項目①：内的一貫性の乖離（矛盾減点）
    if (divergence >= 2.0) {
      score -= 15;
      penalties.push(`【${meta.name}】正反対の設問との乖離度が極めて高い（乖離度: ${divergence.toFixed(1)} / -15点）`);
    } else if (divergence > 1.0) {
      score -= 5;
      penalties.push(`【${meta.name}】正反対の設問間で回答に食い違いがあります（乖離度: ${divergence.toFixed(1)} / -5点）`);
    }

    // 減点項目②：社会的望ましさバイアス
    // ビジョン型・民主型・育成型で、正方向で5を連発（平均4.5以上）かつ反対設問の素点でも3以上をつけている
    if (['visionary', 'democratic', 'coaching'].includes(meta.key)) {
      const isPosAllHigh = posAvg >= 4.5;
      const hasHighRawInReverse = revRawScores.some(val => val >= 3);
      if (isPosAllHigh && hasHighRawInReverse) {
        score -= 10;
        penalties.push(`【${meta.name}】理想像への過剰同調（好ましい行動に満点を付けつつ、阻害行動も肯定している / -10点）`);
      }
    }
  });

  const finalScore = Math.max(0, score);
  let level: '高' | '中' | '低' = '高';
  if (finalScore < 60) level = '低';
  else if (finalScore < 80) level = '中';

  return { score: finalScore, level, isInvalid, penalties };
}

// 各スタイルのスコアおよびパーセンタイル計算
export function calculateScores(answers: Record<number, number>, questions: Question[]): DiagnosisScore[] {
  // 5点満点基準の正規分布パラメータ（平均 3.5、標準偏差 0.6）
  const MEAN = 3.5;
  const SD = 0.6;

  return STYLE_METAS.map(meta => {
    const styleQs = questions.filter(q => q.category === meta.key);
    const posQs = styleQs.filter(q => !q.isReverse);
    const revQs = styleQs.filter(q => q.isReverse);

    const posScores = posQs.map(q => answers[q.id] || 3);
    const revScores = revQs.map(q => 6 - (answers[q.id] || 3));

    const posAvg = posScores.reduce((a, b) => a + b, 0) / posQs.length;
    const revAvg = revScores.reduce((a, b) => a + b, 0) / revQs.length;

    // スタイル得点 = (正方向平均 + 反転後平均) / 2
    const score5 = Number(((posAvg + revAvg) / 2).toFixed(2));
    const divergence = Number(Math.abs(posAvg - revAvg).toFixed(2));

    const zScore = (score5 - MEAN) / SD;
    const percentile = Math.min(99, Math.max(1, Math.round(standardNormalCDF(zScore) * 100)));

    let level: 'main' | 'backup' | 'underdeveloped' = 'underdeveloped';
    if (percentile >= 70) level = 'main';
    else if (percentile >= 50) level = 'backup';

    return {
      key: meta.key,
      name: meta.name,
      score5,
      percentile,
      level,
      posAvg,
      revAvg,
      divergence
    };
  });
}