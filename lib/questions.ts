export type LeadershipStyle =
  | 'visionary'
  | 'coaching'
  | 'affiliative'
  | 'democratic'
  | 'pacesetting'
  | 'commanding';

export type StyleKey = LeadershipStyle | 'directive';

export interface Question {
  id: number;
  text: string;
  style: LeadershipStyle;
  category?: LeadershipStyle | 'directive';
  isReverse?: boolean;
}

export interface StyleMeta {
  key: LeadershipStyle;
  label: string;
  description: string;
}

export const LEADERSHIP_STYLES: Record<LeadershipStyle, StyleMeta> = {
  visionary: {
    key: 'visionary',
    label: 'ビジョン型',
    description: '共通の夢や大義を示し、人々を同じ目標へ向けて動かすスタイル。',
  },
  coaching: {
    key: 'coaching',
    label: '育成型',
    description: '個人の強みや目標を組織の目標と結びつけ、中長期的な成長を促すスタイル。',
  },
  affiliative: {
    key: 'affiliative',
    label: '関係重視型',
    description: '良好な人間関係と心理的安心感を最優先し、調和を築くスタイル。',
  },
  democratic: {
    key: 'democratic',
    label: '民主型',
    description: 'メンバーの参加や合意形成を通じて納得感とコミットメントを引き出すスタイル。',
  },
  pacesetting: {
    key: 'pacesetting',
    label: '率先型',
    description: 'リーダー自ら極めて高い成果基準を実演し、同じ水準のスピードと質を求めるスタイル。',
  },
  commanding: {
    key: 'commanding',
    label: '指示命令型',
    description: '有事や危機的局面において、迅速なトップダウンで規律と指示の徹底を図るスタイル。',
  },
};

export const QUESTIONS: Question[] = [
  // 1. ビジョン型（Visionary）
  {
    id: 1,
    text: '個別の業務手順を細かく指示するよりも、事業や組織が目指す「大義や方向性」の共有に多くの時間を割いている。',
    style: 'visionary',
  },
  {
    id: 2,
    text: '目の前の実務的な課題よりも、中長期的なビジョンや目指すべき理想像をチームに語りかけることが多い。',
    style: 'visionary',
  },
  {
    id: 3,
    text: '業務の着手が遅れるリスクがあっても、メンバーが仕事の意義や大義に完全に腹落ちするまで作業開始を待つ。',
    style: 'visionary',
  },
  {
    id: 4,
    text: '日常業務の細部はメンバーに委ね、自分は組織の目指すゴールや方針がブレないよう管理することに注力している。',
    style: 'visionary',
  },
  {
    id: 5,
    text: '新しい方針を打ち出す際は、反発や疑問が生じても、将来の必要性を粘り強く説得して巻き込む。',
    style: 'visionary',
  },
  {
    id: 6,
    text: 'メンバーの成果を評価する際、個々の作業スピードよりも「組織全体の方向性に合致しているか」を重視する。',
    style: 'visionary',
  },

  // 2. 育成型（Coaching）
  {
    id: 7,
    text: '目先の業務効率が一時的に落ちるとしても、メンバー本人の学習や成長機会を優先して仕事を任せる。',
    style: 'coaching',
  },
  {
    id: 8,
    text: 'メンバーの目先の業務進捗だけでなく、本人のキャリア目標や長期的な強み・弱みについて定期的に話し合っている。',
    style: 'coaching',
  },
  {
    id: 9,
    text: '納期や締め切りが迫っている逼迫した局面であっても、手取り足取り指示を出さず、本人が気づくまで待つ。',
    style: 'coaching',
  },
  {
    id: 10,
    text: 'メンバーがミスをした際、即座の損害リカバリーや責任追及よりも、本人の学びや内省を深める対話を最優先する。',
    style: 'coaching',
  },
  {
    id: 11,
    text: '短期的な業績達成と同じくらい、メンバー個々の能力開発計画や挑戦機会の創出に時間を割いている。',
    style: 'coaching',
  },
  {
    id: 12,
    text: '業務指示を出す際、単なる手順の伝達にとどまらず、その業務が本人の能力伸長にどう繋がるかを意識して伝えている。',
    style: 'coaching',
  },

  // 3. 関係重視型（Affiliative）
  {
    id: 13,
    text: '業務の厳格な納期や成果水準よりも、チーム内の良好な人間関係や心理的安全性の維持を優先することがある。',
    style: 'affiliative',
  },
  {
    id: 14,
    text: '業務上の衝突や対立が生じた際、合理的な正論で白黒つけることよりも、双方の感情的なわだかまりを解消することを最優先する。',
    style: 'affiliative',
  },
  {
    id: 15,
    text: 'メンバーの業務パフォーマンスだけでなく、私生活や家庭環境、心身のストレス状態に強い関心を払っている。',
    style: 'affiliative',
  },
  {
    id: 16,
    text: 'メンバーの士気やチームの和を守るためであれば、低パフォーマンスな行動やルーズな規律違反も一定程度大目に見る。',
    style: 'affiliative',
  },
  {
    id: 17,
    text: '業務上の課題やフィードバックを伝える際、相手を動揺させないよう、肯定的な言葉や配慮を最優先して伝える。',
    style: 'affiliative',
  },
  {
    id: 18,
    text: 'チームの士気（モラール）を高めるため、公式な業務時間外の懇親やインフォーマルな雑談の機会を積極的に設けている。',
    style: 'affiliative',
  },

  // 4. 民主型（Democratic）
  {
    id: 19,
    text: 'スピーディーに意思決定を下すことよりも、関係者全員の意見を聞き、合意を形成するプロセスに時間をかける。',
    style: 'democratic',
  },
  {
    id: 20,
    text: '方針を決定する際、トップダウンで方向性を示すよりも、現場メンバーからの発案やブレインストーミングを重視する。',
    style: 'democratic',
  },
  {
    id: 21,
    text: '最終決定権が自分にある場合でも、メンバー間で意見の一致や納得感が得られるまで議論を重ねることが多い。',
    style: 'democratic',
  },
  {
    id: 22,
    text: 'チームの目標や評価基準を定める際、リーダー単独ではなく、メンバー全員を議論に巻き込んで決定する。',
    style: 'democratic',
  },
  {
    id: 23,
    text: '自らに明確な成功手順や持論がある場合でも、自分のやり方を指示せず、現場が合意した方針を優先して採用する。',
    style: 'democratic',
  },
  {
    id: 24,
    text: '会議の終了時間が迫っている場合でも、自らの意見で強引にまとめず、全員が発言し終えるまで場を委ねる。',
    style: 'democratic',
  },

  // 5. 率先型（Pacesetting）
  {
    id: 25,
    text: 'チーム全体の平均水準に合わせるのではなく、自分自身が極めて高い基準の成果をアウトプットで示し、牽引する。',
    style: 'pacesetting',
  },
  {
    id: 26,
    text: '成果水準を満たせないメンバーに対し、成長を待つよりも、自らが現場に入って手本を見せるか代行することがある。',
    style: 'pacesetting',
  },
  {
    id: 27,
    text: 'メンバーから提出された成果物の品質に妥協せず、基準に達するまで何度も厳しく手直しを求める。',
    style: 'pacesetting',
  },
  {
    id: 28,
    text: 'プロジェクトが遅延・停滞した局面では、人に指示を出す時間があれば自分が直接手を動かしてリカバリーを図る。',
    style: 'pacesetting',
  },
  {
    id: 29,
    text: '自らと同等の高いコミットメントやスピード感、品質基準をチームメンバー全員にも当然のこととして求める。',
    style: 'pacesetting',
  },
  {
    id: 30,
    text: '業務のプロセスや努力の量よりも、期日内に高い品質の「結果」が出ているかどうかを極めて厳密に評価する。',
    style: 'pacesetting',
  },

  // 6. 指示命令型（Commanding）
  {
    id: 31,
    text: '緊急時やトラブル発生時は、メンバーとの議論や合意形成を省き、トップダウンで明確かつ即座の指示徹底を行う。',
    style: 'commanding',
  },
  {
    id: 32,
    text: 'チームの規律や業務手順に違反があった場合、理由の如何を問わず、例外を認めずに厳格に対処する。',
    style: 'commanding',
  },
  {
    id: 33,
    text: '方向性が定まらない膠着状態では、メンバーの意見集約を待たず、独断で即決し実行を強制することがある。',
    style: 'commanding',
  },
  {
    id: 34,
    text: 'メンバーからの業務進捗報告に対して細部まで確認を入れ、指示通りに動いているかを厳密にコントロールする。',
    style: 'commanding',
  },
  {
    id: 35,
    text: '組織の危機的局面においては、メンバーへの心理的配慮よりも、課題の解決やノルマの達成を絶対優先する。',
    style: 'commanding',
  },
  {
    id: 36,
    text: '指示を出した後は、メンバー独自の解釈やアレンジを許さず、指示通りの手順で完遂させることを求める。',
    style: 'commanding',
  },
];