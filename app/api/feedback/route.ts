import { NextResponse } from 'next/server';

export const maxDuration = 60;

// 有効なモデル一覧をキャッシュ（2回目以降のListModels通信を省き高速化）
let cachedValidModels: string[] = [];

export async function POST(req: Request) {
  try {
    const { scores, reliability } = await req.json();

    if (!scores || !Array.isArray(scores)) {
      return NextResponse.json({ error: 'スコアデータが不足しています。' }, { status: 400 });
    }

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
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
4. 以下の構成（ピラミッドストラクチャー）で簡潔かつ論理的に記述すること：
   - ◆ リーダーシップ特性の総括
   - ◆ 発揮されている強みと潜在的組織リスク
   - ◆ 未開発スタイルの克服課題
   - ◆ 明日から実践すべき3つの行動変容`;

    // 1. 有効なモデルリストが未取得の場合のみ、Google APIから実在モデル一覧を取得
    if (cachedValidModels.length === 0) {
      try {
        const listRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
        );
        if (listRes.ok) {
          const listData = await listRes.json();
          const available: string[] = (listData.models || [])
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => m.name.replace('models/', ''))
            // 画像や音声専用モデルを除外し、テキスト生成モデルに絞る
            .filter((name: string) => name.startsWith('gemini-') && !name.includes('vision') && !name.includes('embedding') && !name.includes('tts') && !name.includes('image'));

          // 優先順位付け：1. flash-lite系(最速・空きやすい) / 2. flash系 / 3. pro系
          cachedValidModels = available.sort((a, b) => {
            const getPriority = (name: string) => {
              if (name.includes('3.8-flash')) return 1;
              if (name.includes('lite')) return 2;
              if (name.includes('flash')) return 3;
              if (name.includes('pro')) return 4;
              return 5;
            };
            return getPriority(a) - getPriority(b);
          });
        }
      } catch (e) {
        console.warn('モデル一覧の取得に失敗:', e);
      }
    }

    const modelsToTry = cachedValidModels.length > 0
      ? cachedValidModels.slice(0, 3) // 上位3つの実在モデルのみ試行（タイムアウト防止）
      : ['gemini-3.8-flash'];

    // 2. 503発生時は即座に次の実在モデルへ切り替え
    let feedbackText = '';
    const errors: string[] = [];

    for (const model of modelsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7500); // 1モデル最大7.5秒で打ち切り

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
            },
          }),
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          feedbackText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (feedbackText) break; // 生成成功したら即ループ終了
        } else {
          const errText = await res.text();
          errors.push(`[${model}: ${res.status}]`);
        }
      } catch (e: any) {
        errors.push(`[${model}: ${e.name === 'AbortError' ? 'Timeout' : e.message}]`);
      }
    }

    if (!feedbackText) {
      return NextResponse.json(
        { error: `AIサーバーが一時的に混雑しています (${errors.join(' -> ')})。数秒後に下の「講評を再取得」ボタンを押してください。` },
        { status: 503 }
      );
    }

    return NextResponse.json({ feedback: feedbackText });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '内部エラーが発生しました。' }, { status: 500 });
  }
}