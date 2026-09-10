export type StyleKey = 'directive' | 'visionary' | 'affiliative' | 'democratic' | 'pacesetting' | 'coaching';

export interface Question {
  id: number;
  code: string;
  category: StyleKey;
  isReverse: boolean;
  text: string;
}

export const QUESTIONS: Question[] = [
  // ① 指示命令型
  { id: 1, code: 'Q1-1', category: 'directive', isReverse: false, text: '業務の進め方や手順について、部下に細かく具体的な指示命令を与えている。' },
  { id: 2, code: 'Q1-2', category: 'directive', isReverse: false, text: '定めた方針やルールを順守させるため、部下に対して厳しく是正を求めている。' },
  { id: 3, code: 'Q1-3', category: 'directive', isReverse: false, text: '緊急時や危機的な局面では、議論を挟まずトップダウンで即座に指示を出してチームを動かす。' },
  { id: 4, code: 'Q1-4', category: 'directive', isReverse: true,  text: '差し迫ったトラブルや緊急事態であっても、命令口調で部下の行動を強制することは避けている。' },
  { id: 5, code: 'Q1-5', category: 'directive', isReverse: true,  text: '部下が指示やルールを守らない場合でも、強い態度で指導・注意することに抵抗がある。' },
  { id: 6, code: 'Q1-6', category: 'directive', isReverse: true,  text: '指示通りに行動させることよりも、どのような場面でも部下の自主的な判断や裁量を最優先したい。' },

  // ② ビジョン型
  { id: 7, code: 'Q2-1', category: 'visionary', isReverse: false, text: '組織の理念や中長期的な将来像（ビジョン）を、日頃から繰り返し言葉にして共有している。' },
  { id: 8, code: 'Q2-2', category: 'visionary', isReverse: false, text: '部下に対して、目の前の業務だけでなく「なぜその仕事が重要なのか」という大局的な意義を伝えている。' },
  { id: 9, code: 'Q2-3', category: 'visionary', isReverse: false, text: '目指すべき明確な方向性を示した後は、具体的な業務の進め方は部下の裁量に委ねている。' },
  { id: 10, code: 'Q2-4', category: 'visionary', isReverse: true,  text: 'チームの将来像や理念を語るより、目の前にある日々のタスクを滞りなく処理することばかりに意識が向いている。' },
  { id: 11, code: 'Q2-5', category: 'visionary', isReverse: true,  text: '仕事の目的や背景を説明するよりも、手っ取り早く作業手順だけを伝えることが多い。' },
  { id: 12, code: 'Q2-6', category: 'visionary', isReverse: true,  text: 'チームが将来どこに向かうべきかについて、リーダーである自分自身も明確な方向性を描き切れていない。' },

  // ③ 関係重視型
  { id: 13, code: 'Q3-1', category: 'affiliative', isReverse: false, text: '業務の成果や効率と同じくらい、メンバー同士の信頼関係やチーム内の良好な雰囲気を大切にしている。' },
  { id: 14, code: 'Q3-2', category: 'affiliative', isReverse: false, text: '部下の感情面の変化やモチベーション、個人的な悩みにも日頃から気を配り、共感的に寄り添っている。' },
  { id: 15, code: 'Q3-3', category: 'affiliative', isReverse: false, text: 'チーム全体の結束力や仲間意識を高めるために、日頃から積極的な対話やねぎらいを行っている。' },
  { id: 16, code: 'Q3-4', category: 'affiliative', isReverse: true,  text: '職場はあくまで仕事をする場であり、メンバー同士の感情的な繋がりや親密な関係づくりは不要だと考えている。' },
  { id: 17, code: 'Q3-5', category: 'affiliative', isReverse: true,  text: 'チーム内に人間関係の摩擦があっても、業務の納期や目標数値さえ達成されていれば干渉しない。' },
  { id: 18, code: 'Q3-6', category: 'affiliative', isReverse: true,  text: '部下の私的な悩みや感情面に踏み込むことは避け、事務的な業務連絡だけに留めたい。' },

  // ④ 民主型
  { id: 19, code: 'Q4-1', category: 'democratic', isReverse: false, text: '重要な方針や計画を決定する際、チームメンバー全員の意見や提案を積極的に求めている。' },
  { id: 20, code: 'Q4-2', category: 'democratic', isReverse: false, text: '自分の考えと異なる意見であっても、議論を尽くして納得感のある合意形成を図ろうとする。' },
  { id: 21, code: 'Q4-3', category: 'democratic', isReverse: false, text: '意思決定のプロセスを共有し、チーム全体で決めたという当事者意識（オーナーシップ）を持たせている。' },
  { id: 22, code: 'Q4-4', category: 'democratic', isReverse: true,  text: '重要な決定はリーダーである自分一人で下し、メンバーには決まった結論のみを伝えている。' },
  { id: 23, code: 'Q4-5', category: 'democratic', isReverse: true,  text: 'メンバーに意見を聞くと議論が長引いて進まないため、相談せずに自分で進めることが多い。' },
  { id: 24, code: 'Q4-6', category: 'democratic', isReverse: true,  text: '合意形成に時間をかけるくらいなら、リーダーの直感やトップダウンで素早く決めるほうが良いと思う。' },

  // ⑤ 率先型
  { id: 25, code: 'Q5-1', category: 'pacesetting', isReverse: false, text: 'リーダー自らがプレイヤーとして高い成果を出し、「自分の背中を見せる」ことでチームを引っ張っている。' },
  { id: 26, code: 'Q5-2', category: 'pacesetting', isReverse: false, text: '成果物の品質やスピードに極めて高い基準を設け、自分にも部下にも妥協を許さない。' },
  { id: 27, code: 'Q5-3', category: 'pacesetting', isReverse: false, text: '基準に満たない業務がある場合、細かく指導するより自ら手本を示して巻き取って仕上げることが多い。' },
  { id: 28, code: 'Q5-4', category: 'pacesetting', isReverse: true,  text: '現場の実務で高い成果を出すことよりも、実務は部下に任せて自分は調整・管理役に徹している。' },
  { id: 29, code: 'Q5-5', category: 'pacesetting', isReverse: true,  text: 'チームのアウトプットの品質やスピードに対して、そこまでシビアな完璧さを求めていない。' },
  { id: 30, code: 'Q5-6', category: 'pacesetting', isReverse: true,  text: '仕事が遅れている部下がいても、自分が手本を見せたり手を貸したりせず、本人のペースに任せている。' },

  // ⑥ 育成型
  { id: 31, code: 'Q6-1', category: 'coaching', isReverse: false, text: '1on1などの定期的な対話を通じて、部下の長所・短所を把握し、中長期的なキャリア支援を行っている。' },
  { id: 32, code: 'Q6-2', category: 'coaching', isReverse: false, text: '答えを直接教えるのではなく、問いかけを通じて部下自身の気づきや自律的な思考を引き出している。' },
  { id: 33, code: 'Q6-3', category: 'coaching', isReverse: false, text: '目先の失敗を恐れず、部下の成長や学びに繋がる挑戦的な仕事を積極的に任せている。' },
  { id: 34, code: 'Q6-4', category: 'coaching', isReverse: true,  text: '部下個人の成長やキャリアよりも、今期の組織目標をこなさせることだけに集中している。' },
  { id: 35, code: 'Q6-5', category: 'coaching', isReverse: true,  text: '部下の相談や育成に対話の時間を割くのは非効率だと感じ、すぐに自分の答えを押し付けてしまう。' },
  { id: 36, code: 'Q6-6', category: 'coaching', isReverse: true,  text: '部下をじっくり育てるより、最初から実務ができる人に任せるか自分で処理したほうが効率的だと思う。' }
];