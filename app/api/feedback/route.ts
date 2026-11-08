import { NextResponse } from 'next/server';

export const maxDuration = 60;

let cachedValidModels: string[] = [];

const ROLE_CRITERIA: Record<string, string> = {
  executive: `【受検者の役職：経営層・役員クラス】
- 本来のミッション：全社ビジョンの提示、非連続な変革の断行、経営資源の配分、有事の最終決断と責任の引き受け。
- 厳しく指摘すべき階層リスク：
  1. 「ビジョン型」が主軸でない場合、経営者としての方向性提示の放棄であり致命的である点。
  2. 「率先型」や「指示命令型」が高すぎる場合、部長・課長の権限を奪う現場への過干渉（マイクロマネジメント）に陥り、次世代の経営幹部が育たない点。
  3. 「関係重視型」や「民主型」に偏りすぎている場合、痛みを伴う不採算事業の撤退や構造改革、抜本的な人事刷新を先送りする「事なかれ経営」に陥る点。`,

  director: `【受検者の役職：部長・部門長クラス】
- 本来のミッション：経営戦略の部門目標への翻訳、複数チームの統合・利害調整、課長（マネージャー）陣の育成と権限委譲。
- 厳しく指摘すべき階層リスク：
  1. 「率先型」が高い場合、自らプレイヤーとして現場実務に手を出してしまい、配下の課長を「単なる作業指示の伝達係」に矮小化させている点。
  2. 「関係重視型」や「民主型」に偏りすぎている場合、他部門との厳しい交渉や、成果を出せない課長への是正指導から逃げる「調整型・事なかれ主義」に陥る点。
  3. 経営層の意向をそのまま下に流すだけのメッセンジャーになっていないか、部門独自のビジョンと中長期の組織能力開発（育成型）を担えているかを問うこと。`,

  manager: `【受検者の役職：課長・マネージャークラス】
- 本来のミッション：現場チームの業績目標必達、日々の業務プロセスの管理、メンバー一人ひとりの能力開発と動機づけ。
- 厳しく指摘すべき階層リスク：
  1. 「率先型」に偏っている場合、「自分でやった方が早い」と仕事を抱え込むプレイングマネージャー過多に陥り、部下の成長機会を奪って自らがチームのボトルネックになっている点。
  2. 「関係重視型」や「民主型」に偏り、嫌われることを恐れて厳しい納期管理やミスへの是正指導（指示命令型・率先型の適切な使い分け）を放棄する「仲良しクラブ化」のリスク。
  3. 目の前の短期数字の消化に追われ、「ビジョン型（仕事の意味づけ）」や「育成型（中長期的なスキル開発）」がおろそかになっていないかを突くこと。`,

  leader: `【受検者の役職：リーダー・主任・一般クラス】
- 本来のミッション：高い実務基準の体現による小集団の牽引、後輩・同僚のサポート、次期管理職に向けたマネジメントの基礎習得。
- 厳しく指摘すべき階層リスク：
  1. プレイヤーとしての「率先型」だけに頼り、周囲を巻き込む「民主型」や後輩を育てる「育成型」が欠けている場合、将来マネージャーに昇格した際に必ず組織崩壊を起こす点。
  2. 逆に「関係重視型」ばかりが高く、自らが厳しい基準で成果を出す牽引力や、言うべき規律を伝える強さが欠けている場合の頼りなさ。
  3. 現場の作業者目線から脱却し、チーム全体の目的（ビジョン型）を言語化して周囲に共有する視座を持てているかを問うこと。`
};

export async function POST(req: Request) {
  try {
    const { scores, reliability, role } = await req.json();

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

    // 減点理由(penalties)をAIプロンプトから完全に削除し、判定結果のみを渡す
    const reliabilityText = reliability
      ? `判定: ${reliability.level} (${reliability.score}点)`
      : '判定なし';

    const roleCriteriaText = (role?.id && ROLE_CRITERIA[role.id])
      ? ROLE_CRITERIA[role.id]
      : `【受検者の役職：管理職全般】役職に応じた視座の高さと権限委譲・結果責任のバランスを厳しく評価すること。`;

    const prompt = `あなたはトップティア戦略コンサルティングファームのパートナーです。
以下の受検者の「役職・階層」と「リーダーシップ診断データ（6スタイル）」を照合し、客観的・批判的に分析した講評を作成してください。

${roleCriteriaText}

【受検者スコアデータ】
${scoreSummaryText}

【回答信頼度】
${reliabilityText}

【講評作成ルール】
1. お世辞や無難な全肯定は一切禁止。上記の「受検者の役職」に求められる本来のミッションに照らし合わせ、現在のスコアの偏りが引き起こす組織リスクや視座の甘さを鋭く指摘すること。
2. 調和型（民主・関係重視・ビジョン）に偏っている場合、その役職における「事なかれ主義」「厳しい意思決定の放棄」がないかを厳しく牽制すること。
3. 信頼度判定が「低（55点未満）」の場合のみ自己内省の甘さに短く言及し、「高」「中」の場合は信頼度には一切触れず分析に集中すること。
4. 以下の構成（ピラミッドストラクチャー）で簡潔かつ論理的に記述すること：
   - ◆ リーダーシップ特性の総括（現在の役職要件との適合度）
   - ◆ 発揮されている強みと、この役職特有の潜在的組織リスク
   - ◆ 未開発スタイルの克服課題（上位視座への脱皮に向けて）
   - ◆ 明日から実践すべき3つの行動変容（役職に応じた具体的アクション）`;

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
            .filter((name: string) => name.startsWith('gemini-') && !name.includes('vision') && !name.includes('embedding') && !name.includes('tts') && !name.includes('image'));

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
      ? cachedValidModels.slice(0, 3)
      : ['gemini-3.8-flash'];

    let feedbackText = '';
    const errors: string[] = [];

    for (const model of modelsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7500);

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1100,
            },
          }),
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          feedbackText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (feedbackText) break;
        } else {
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