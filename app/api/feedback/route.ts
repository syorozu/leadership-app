import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { scores, reliability } = await req.json();

    if (!scores || !Array.isArray(scores)) {
      return NextResponse.json({ error: 'スコアデータが不足しています。' }, { status: 400 });
    }

    const rawKey = process.env.GEMINI_API_KEY || '';
    const apiKey = rawKey.trim();
    if (!apiKey) {
      return NextResponse.json({ error: '環境変数 GEMINI_API_KEY が設定されていません。' }, { status: 500 });
    }

    const scoreSummaryText = scores
      .map((s: any) => `- ${s.name} (${s.key}): パーセンタイル ${s.percentile}% 【${s.level === 'main' ? 'メイン(主軸)' : s.level === 'backup' ? 'バックアップ(準主軸)' : '未開発'}】 (素点: ${s.score5})`)
      .join('\n');

    const reliabilityText = reliability
      ? `判定: ${reliability.level} (${reliability.score}点) / 指摘: ${reliability.penalties.join('、') || '特になし'}`
      : '判定なし';

    const prompt = `あなたはトップティア戦略コンサルティングファームのパートナーです。
以下のリーダーシップ診断データ（ダニエル・ゴールマン基準の6スタイル）を客観的・批判的に分析し、経営管理職向けの講評を作成してください。

【受検者データ】
${scoreSummaryText}

【回答信頼度】
${reliabilityText}

【講評作成ルール】
1. お世辞や無難な全肯定は禁止。潜在的な組織リスクやマネジメントの甘さを鋭く指摘すること。
2. 調和型（民主・関係重視・ビジョン）に偏っている場合、事なかれ主義や厳しい意思決定の放棄がないかを厳しく牽制すること。
3. 信頼度判定が「低（65点未満）」の場合のみ自己内省の甘さに言及し、「高」「中」の場合は信頼度には触れず分析に集中すること。
4. 以下の構成（ピラミッドストラクチャー）で論理的に記述すること：
   - ◆ リーダーシップ特性の総括
   - ◆ 発揮されている強みと潜在的組織リスク
   - ◆ 未開発スタイルの克服課題
   - ◆ 明日から実践すべき3つの行動変容`;

    // 安定稼働するモデル候補を順次トライ（404を確実に防止）
    const candidateModels = [
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-pro'
    ];

    let lastErrorDetails = '';
    let feedbackText = '';

    for (const model of candidateModels) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1800 }
          })
        });

        if (res.ok) {
          const data = await res.json();
          feedbackText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (feedbackText) break;
        } else {
          const errBody = await res.text();
          lastErrorDetails = `Model ${model} (${res.status}): ${errBody}`;
        }
      } catch (err: any) {
        lastErrorDetails = `Model ${model} 例外: ${err.message}`;
      }
    }

    if (!feedbackText) {
      return NextResponse.json(
        { error: `Gemini API呼び出しに失敗しました。詳細: ${lastErrorDetails}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ feedback: feedbackText });
  } catch (error: any) {
    console.error('Handler Error:', error);
    return NextResponse.json({ error: error.message || '内部エラーが発生しました。' }, { status: 500 });
  }
}