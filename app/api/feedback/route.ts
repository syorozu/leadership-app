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
3. 信頼度判定が「低（65点未満）」の場合のみ自己内省の甘さに短く言及し、「高」「中」の場合は信頼度には触れず分析に集中すること。
4. 以下の構成（ピラミッドストラクチャー）で論理的に記述すること：
   - ◆ リーダーシップ特性の総括
   - ◆ 発揮されている強みと潜在的組織リスク
   - ◆ 未開発スタイルの克服課題
   - ◆ 明日から実践すべき3つの行動変容`;

    // 1. Google APIから、このAPIキーで実際に「generateContent」が使える最新モデル一覧を動的取得
    let targetModels: string[] = [];
    try {
      const listRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
      );
      if (listRes.ok) {
        const listData = await listRes.json();
        const available = (listData.models || [])
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => m.name); // 例: "models/gemini-2.5-flash", "models/gemini-2.0-flash" など

        // 高速・安定な flash 系を最優先、次にその他をソート
        targetModels = available.sort((a: string, b: string) => {
          const aFlash = a.includes('flash') ? 1 : 0;
          const bFlash = b.includes('flash') ? 1 : 0;
          return bFlash - aFlash;
        });
      } else {
        const listErr = await listRes.text();
        console.error('ListModels失敗:', listErr);
      }
    } catch (e) {
      console.warn('ListModels通信エラー:', e);
    }

    // 取得できなかった場合のフォールバック候補
    if (targetModels.length === 0) {
      targetModels = ['models/gemini-2.0-flash', 'models/gemini-2.5-flash', 'models/gemini-1.5-flash'];
    }

    // 2. 利用可能なモデルで順番に試行（404や503が発生しても次モデルへ自動切り替え）
    let feedbackText = '';
    const attemptLogs: string[] = [];

    for (const modelPath of targetModels.slice(0, 4)) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1800,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          feedbackText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (feedbackText) {
            break; // 成功
          }
        } else {
          const errBody = await res.text();
          attemptLogs.push(`${modelPath} (${res.status}): ${errBody.slice(0, 120)}`);
        }
      } catch (err: any) {
        attemptLogs.push(`${modelPath} (例外): ${err.message}`);
      }
    }

    if (!feedbackText) {
      return NextResponse.json(
        { error: `Gemini API呼び出しに失敗しました。試行結果:\n${attemptLogs.join('\n')}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ feedback: feedbackText });
  } catch (error: any) {
    console.error('Handler Error:', error);
    return NextResponse.json({ error: error.message || '内部エラーが発生しました。' }, { status: 500 });
  }
}