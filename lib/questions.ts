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
    text: '個別の実務手順の指示は最小限にとどめ、組織が目指す大義や将来像を語ることに業務時間の多くを充てている。',
    style: 'visionary',
  },
  {
    id: 2,
    text: '目先の業績よりも、中長期的なありたい姿についての議論を重視する。',
    style: 'visionary',
  },
  {
    id: 3,
    text: '急ぎの業務であっても手順だけを指示することはせず、本人が仕事の目的を納得するまで作業着手を待つ。',
    style: 'visionary',
  },
  {
    id: 4,
    text: '日々の業務の進め方や具体的プロセスにはあまり口出しせず、最終的な方向性が合致しているかのみを管理する。',
    style: 'visionary',
  },
  {
    id: 5,
    text: 'メンバーから強い反対や疑問の声が上がった場合でも、方針を妥協せず、将来の必要性を時間をかけて説得し切る。',
    style: 'visionary',
  },
  {
    id: 6,
    text: '業務の完了スピードが多少遅れたとしても、組織全体のビジョンや戦略方針に忠実に沿っているかを厳格に評価する。',
    style: 'visionary',
  },

  // 2. 育成型（Coaching）
  {
    id: 7,
    text: '自分でやった方が早い業務であっても、本人の学習機会のためにあえて任せ、進捗の遅れを受け入れる。',
    style: 'coaching',
  },
  {
    id: 8,
    text: '日々の業務に追われる繁忙期であっても、進捗確認とは明確に枠を分け、本人の長期的なキャリア形成を支援する時間を定期的に設けている。',
    style: 'coaching',
  },
  {
    id: 9,
    text: '締め切りが迫っている局面であっても、正解を直接指示せず、本人が自力で解決策に気づくまで見守る。',
    style: 'coaching',
  },
  {
    id: 10,
    text: 'メンバーがミスをした際、直ちに現場介入して火消しするよりも、本人が原因と教訓を自覚するための振り返りを重視する。',
    style: 'coaching',
  },
  {
    id: 11,
    text: '当期の目標達成には直結しない業務であっても、メンバーの長期的な能力開発につながる挑戦的な課題を意図的に割り当てている。',
    style: 'coaching',
  },
  {
    id: 12,
    text: '指示を出す際、単に作業手順を伝えるだけでなく、「この仕事が本人のどのスキルを伸ばすのか」等を言語化して伝えている。',
    style: 'coaching',
  },

  // 3. 関係重視型（Affiliative）
  {
    id: 13,
    text: 'チーム内の空気や人間関係がギスギスするくらいなら、厳しいノルマの達成や納期の遵守を多少緩める判断をする。',
    style: 'affiliative',
  },
  {
    id: 14,
    text: '業務上の対立が起きた際、どちらの意見が論理的に正しいかを決着させることよりも、双方の感情的な納得を優先する。',
    style: 'affiliative',
  },
  {
    id: 15,
    text: '個人の家庭事情やメンタルの不調をケアするためであれば、チーム全体の納期遅れや他メンバーへの業務のしわ寄せを容認する。',
    style: 'affiliative',
  },
  {
    id: 16,
    text: 'チーム内の融和や本人のモチベーションを維持するためであれば、成果の未達や多少のルール違反も厳しく追及せず大目に見る。',
    style: 'affiliative',
  },
  {
    id: 17,
    text: '関係の悪化や相手の落胆を恐れ、耳の痛い直接的な指摘や厳しい是正指導を避け、遠回しな表現にとどめることがある。',
    style: 'affiliative',
  },
  {
    id: 18,
    text: '業務効率が一時的に落ちるとしても、チームの一体感を高めるために日常的な雑談や感情の共有に意識して時間を割いている。',
    style: 'affiliative',
  },

  // 4. 民主型（Democratic）
  {
    id: 19,
    text: '迅速に決めれば優位に立てる場面であっても、独断を避け、関係者全員の意見を聞いて合意を形成するプロセスに時間をかける。',
    style: 'democratic',
  },
  {
    id: 20,
    text: '自ら方針を打ち出して引っ張るよりも、現場メンバーから自主的なアイデアや意見を引き出すことを重視する。',
    style: 'democratic',
  },
  {
    id: 21,
    text: '自分に最終決定権がある事案でも、多くのメンバーが納得して合意に至るまで、安易にトップダウンで打ち切らない。',
    style: 'democratic',
  },
  {
    id: 22,
    text: '組織目標やルールを決める際、リーダーの権限で一方的に下ろすのではなく、メンバー全員の議論を経て納得の上で設定する。',
    style: 'democratic',
  },
  {
    id: 23,
    text: '自らに過去の成功パターンや明確な持論がある場合でも、自分のやり方を指示せず、現場の議論で出た方針を優先して採用する。',
    style: 'democratic',
  },
  {
    id: 24,
    text: '会議時間が超過するリスクがあっても、自らの意見で強引にまとめず、参加者全員が意見を出し切るまで議論を続けさせる。',
    style: 'democratic',
  },

  // 5. 率先型（Pacesetting）
  {
    id: 25,
    text: '言葉で細かく指導するよりも、自らが手本を見せけん引する。',
    style: 'pacesetting',
  },
  {
    id: 26,
    text: '要求水準に達しないメンバーがいる場合、成長を待つ時間的余裕はないと判断し、自らが直接業務を引き取って完遂させる。',
    style: 'pacesetting',
  },
  {
    id: 27,
    text: '提出物のクオリティが自分の求める基準に達していない場合、相手が疲弊していても妥協せず、何度も手直しを要求する。',
    style: 'pacesetting',
  },
  {
    id: 28,
    text: 'プロジェクトの進捗が遅れた際、他人に指示を出して説明する時間があれば、自分が直接作業を引き受けて一気に挽回する。',
    style: 'pacesetting',
  },
  {
    id: 29,
    text: '自分の期待する基準で動けないメンバーに対して強いもどかしさを感じ、自発的な奮起を強く要求する。',
    style: 'pacesetting',
  },
  {
    id: 30,
    text: 'どれだけ真面目に努力したかというプロセスよりも、期日内に高いクオリティの成果物が出たかどうかのみでシビアに評価する。',
    style: 'pacesetting',
  },

  // 6. 指示命令型（Commanding）
  {
    id: 31,
    text: '緊急トラブルや危機的局面においては、現場との議論や根回しを一切省き、トップダウンで即座の行動徹底を命令する。',
    style: 'commanding',
  },
  {
    id: 32,
    text: '組織の規律やコンプライアンスに関わる場面では、個人の事情や感情を挟む余地を与えず、厳格かつ毅然とした態度で対処する。',
    style: 'commanding',
  },
  {
    id: 33,
    text: '議論が膠着して方針が定まらない時は、批判を受けるリスクを覚悟の上で自らの責任で即決し、チームをその通りに動かす。',
    style: 'commanding',
  },
  {
    id: 34,
    text: '業務事故や致命的なミスを絶対に防ぐため、メンバーの裁量に委ねず、作業の手順や進捗を細部まで把握・管理する。',
    style: 'commanding',
  },
  {
    id: 35,
    text: '危機的局面では、メンバーの不満や負荷に配慮することよりも、成果の必達を最優先に指示を出す。',
    style: 'commanding',
  },
  {
    id: 36,
    text: '業務の標準化やミス撲滅のため、メンバー独自の自己流アレンジを認めず、決められた手順通りの完遂を徹底させる。',
    style: 'commanding',
  },
];