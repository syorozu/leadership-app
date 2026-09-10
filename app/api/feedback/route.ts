import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { scores, reliability } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'APIキーが設定されていません。' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const summaryText = scores.map((s: any) => 
      `- ${s.name}: ${s.percentile}% (素点: ${s.score5}/5.0, 判定: ${s.level === 'main' ? 'メイン' : s.level === 'backup' ? 'バックアップ' : '未開発'}, 乖離度: ${s.divergence})`
    ).join('\n');

    const reliabilityText = `
・信頼度スコア: ${reliability.score}点 / 100点（信憑性判定: ${reliability.level}）
・検出されたバイアス・矛盾点:
${reliability.penalties.length > 0 ? reliability.penalties.map((p: string) => `  * ${p}`).join('\n') : '  * 特になし（一貫性の高い回答）'}
`;

    const prompt = `
あなたは世界最高峰のエグゼクティブ・コーチです。
以下のリーダーシップ・スタイル診断データ（コーン・フェリー基準）と「回答信頼度データ」に基づき、
受検者の自己認識の盲点を突く客観的かつ率直なフィードバックを作成してください。

【受検者スコアデータ】
${summaryText}

【回答信頼度データ】
${reliabilityText}

【出力フォーマット（Markdown形式）】
### 1. スタイル特性と自己認識の総括
### 2. 発揮されている強み
### 3. 組織・部下に対する潜在的リスク・死角
### 4. 明日から即実践すべき具体的アクション
`;

    // 混雑（503）発生時に最大2回まで自動リトライする処理
    let response: any = null;
    let lastError: any = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
        });
        if (response?.text) break;
      } catch (err: any) {
        lastError = err;
        // 503エラーの場合は2秒待機して再試行
        if (err?.message?.includes('503') && attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        throw err;
      }
    }

    if (!response?.text) throw lastError;

    return NextResponse.json({ feedback: response.text });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: error.message || error.toString() 
    }, { status: 500 });
  }
}