import { NextResponse } from 'next/server';

// Vercelのタイムアウト制限を60秒へ延長
export const maxDuration = 60;

// 稼働確認済みモデルのインメモリキャッシュ（サーバー起動中は再問い合わせ不要で最速稼働）
let cachedValidModel: string | null = null;

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
      ? `判定: ${reliability.level} (${reliability.score}点) / 特記事項: ${reliability.penalties.join('、') || '良好・一貫性あり'}`
      : '判定なし';

    const prompt = `あなたはトップティア戦略コンサルティングファームのパートナーです。
以下のリーダーシップ診断データ（ダニエル・ゴールマン基準の6スタイル）を客観的・批判的に分析し、経営管理職向けの講評を作成してください。

【受検者データ】
${scoreSummaryText}

【回答信頼度】
${reliabilityText}

【講評作成ルール】
1. お世辞や無難な全肯定は禁止。潜在的な組織リスクやマネジメントの盲点を鋭く指摘すること。
2. 調和型（民主・関係重視・ビジョン）に偏っている場合、事なかれ主義や厳しい意思決定の放棄がないかを厳しく牽制すること。
3. 信頼度判定が「低（55点未満）」の場合のみ自己内省の甘さに短く言及し、「高」「中」の場合は信頼度には触れず分析に集中すること。
4. 以下の構成（ピラミッドストラクチャー）で論理的に記述すること：
   - ◆ リーダーシップ特性の総括
   - ◆ 発揮されている強みと潜在的組織リスク
   - ◆ 未開発スタイルの克服課題
   - ◆ 明日から実践すべき3つの行動変容`;

    // 1. キャッシュが存在しない初回のみ、Google APIから現行の稼働モデルを特定
    if (!cachedValidModel) {
      try {
        const listRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
        );
        if (listRes.ok) {
          const listData = await listRes.json();
          const available: string[] = (listData.models || [])
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => m.name.replace('models/', ''));

          // 最新・高速の flash 系モデル（3.8-flash, 3-flash, 2.5-flash 等）を最優先で探索
          const preferredList = [
            'gemini-3.8-flash',
            'gemini-3-flash',
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-1.5-flash'
          ];

          const found = preferredList.find(p => available.includes(p));
          if (found) {
            cachedValidModel = found;
          } else if (available.length > 0) {
            // 一致しない場合はリスト先頭の生成対応モデルを採用
            cachedValidModel = available[0];
          }
        }
      } catch (e) {
        console.warn('モデル自動特定失敗、フォールバック値を使用:', e);
      }
    }

    // Google推奨の最新モデルをデフォルト値に設定
    const selectedModel = cachedValidModel || 'gemini-3.8-flash';

    // 2. generateContent の実行（トークン数を1100に絞り2〜3秒で高速返却）
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1100,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      // 万が一失敗した場合はキャッシュを破棄して次回再取得させる
      cachedValidModel = null;
      return NextResponse.json(
        { error: `Gemini API呼び出し失敗 (${res.status} - モデル: ${selectedModel}): ${errText.slice(0, 150)}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const feedbackText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!feedbackText) {
      return NextResponse.json({ error: '講評テキストの生成結果が空でした。' }, { status: 500 });
    }

    return NextResponse.json({ feedback: feedbackText });
  } catch (error: any) {
    console.error('Feedback Handler Error:', error);
    return NextResponse.json({ error: error.message || '内部エラーが発生しました。' }, { status: 500 });
  }
}