import { NextResponse } from 'next/server';

interface DiagnosisScoreInput {
  key: string;
  name: string;
  score5: number;
  percentile: number;
  level: 'main' | 'backup' | 'underdeveloped';
  posAvg?: number;
  revAvg?: number;
  divergence?: number;
}

interface ReliabilityInput {
  score: number;
  level: '高' | '中' | '低';
  isInvalid: boolean;
  penalties: string[];
}

export async function POST(req: Request) {
  try {
    const { scores, reliability }: { scores: DiagnosisScoreInput[]; reliability: ReliabilityInput } = await req.json();

    if (!scores || !Array.isArray(scores)) {
      return NextResponse.json(
        { error: '診断スコアデータが不足しています。' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: '環境変数 GEMINI_API_KEY が設定されていません。Vercel等の環境変数をご確認ください。' },
        { status: 500 }
      );
    }

    // スコアサマリーの整形
    const scoreSummaryText = scores
      .map(
        (s) =>
          `- ${s.name} (${s.key}): パーセンタイル ${s.percentile}% 【${
            s.level === 'main' ? 'メインスタイル (主軸)' : s.level === 'backup' ? 'バックアップ (準主軸)' : '未開発・課題'
          }】 / 5点満点素点: ${s.score5}`
      )
      .join('\n');

    // 回答信頼度の整形
    const reliabilitySummaryText = reliability
      ? `判定: ${reliability.level} (スコア: ${reliability.score}/100)\n減点項目: ${
          reliability.penalties.length > 0 ? reliability.penalties.join(' / ') : 'なし'
        }`
      : '判定なし';

    // Gemini API向けプロンプトの構築
    const prompt = `あなたはトップティア戦略コンサルティングファームのパートナーであり、組織・人事開発のシニアプロフェッショナルです。
受検者のリーダーシップ・スタイル診断データ（ダニエル・ゴールマン／コーン・フェリー基準の6スタイル）を精査し、客観的かつ実践的な経営者・管理職向け講評を作成してください。

━━━━━━━━━━━━━━━━━━━━━━━━━━
【受検者データ】
${scoreSummaryText}

【回答信頼度】
${reliabilitySummaryText}
━━━━━━━━━━━━━━━━━━━━━━━━━━

【分析・出力ルール（厳守事項）】
1. **全肯定の完全排除と改善点の直視**
   - 耳当たりの良いお世辞や無難な褒め言葉は一切排除してください。
   - リーダーとしての盲点、組織に与える潜在的リスク、マネジメントの甘さを厳しく鋭く突いてください。

2. **調和型偏重（ビジョン型・民主型・関係重視型）への牽制**
   - 受検者のスコアが調和型スタイルに偏り、率先型や指示命令型が著しく低い場合、以下の経営リスクを厳しく指摘してください：
     * 嫌われることを恐れ、厳しい意思決定や泥臭い牽引を現場へ丸投げしていないか（事なかれ主義）。
     * 合意形成や心理的安全性を隠れ蓑に、納期遅延や業績ノルマ未達に対する組織的な甘さを容認していないか。
     * 有事・緊急時において自ら火中の栗を拾うトップダウンの覚悟が欠落していないか。

3. **回答信頼度についてのルール（最重要）**
   - 受検者の回答信頼度判定が「低」（またはスコア60点未満）の場合に限り、客観的な自己内省の甘さや回答の矛盾について短く注意喚起を行ってください。
   - 信頼度判定が「高」または「中」の場合は、信頼度スコアや判定結果には一切言及せず、各スタイルの分析と実践的なアドバイスに集中してください。

4. **構成（ピラミッドストラクチャーに基づく論理展開）**
   以下の4セクションで簡潔・重厚に出力してください（見出しはマークダウンを使用）：
   - **◆ リーダーシップ特性の総括**（メインとバックアップの組み合わせから見える行動特性）
   - **◆ 発揮されている強みと潜在的組織リスク**（平時の価値と、表裏一体で生じる弊害）
   - **◆ 未開発スタイルの克服課題**（特に低スコアのスタイルが引き起こす組織のボトルネック）
   - **◆ 明日から実践すべき処方箋（3つの行動変容）**（抽象論ではなく、即日実行可能な具体的アクション）

5. **トーン＆マナー**
   - 結論ファースト、無駄な装飾のない論理的かつストイックな文体。
   - 専門用語は平易に噛み砕き、中学生でも腹落ちする明快さで記述すること。`;

    // Gemini API 呼び出し（プライマリ: gemini-2.5-flash / フォールバック: gemini-1.5-flash）
    const requestGemini = async (modelName: string) => {
      return fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2000,
            },
          }),
        }
      );
    };

    let response = await requestGemini('gemini-2.5-flash');

    // 404等の場合は安定版モデルへフォールバック
    if (!response.ok) {
      console.warn(`gemini-2.5-flash failed (${response.status}), falling back to gemini-1.5-flash`);
      response = await requestGemini('gemini-1.5-flash');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API Error:', errorData);
      return NextResponse.json(
        { error: `Gemini API呼び出しに失敗しました (${response.status})`, details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const feedbackText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!feedbackText) {
      return NextResponse.json(
        { error: 'AI講評テキストの生成結果が空でした。' },
        { status: 500 }
      );
    }

    return NextResponse.json({ feedback: feedbackText });
  } catch (error: any) {
    console.error('Feedback API Handler Error:', error);
    return NextResponse.json(
      { error: error.message || '講評生成処理中に内部エラーが発生しました。' },
      { status: 500 }
    );
  }
}