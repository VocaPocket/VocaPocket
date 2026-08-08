// Built-in daily study words. Each day a few not-yet-learned words are pulled
// from here and mixed into review. Extend freely — no code change needed.

export type BankWord = {
  word: string;
  zh: string;
  pos: string;
  example: string;
  exampleZh: string;
};

export const WORDBANK: BankWord[] = [
  { word: "negotiate", zh: "談判；協商", pos: "動詞", example: "They negotiated a better contract.", exampleZh: "他們協商出更好的合約。" },
  { word: "sustainable", zh: "永續的；可持續的", pos: "形容詞", example: "We need a sustainable approach.", exampleZh: "我們需要一種永續的做法。" },
  { word: "deadline", zh: "截止日期", pos: "名詞", example: "We must meet the deadline.", exampleZh: "我們必須趕上截止日期。" },
  { word: "budget", zh: "預算", pos: "名詞", example: "The budget was cut this year.", exampleZh: "今年預算被削減了。" },
  { word: "significant", zh: "顯著的；重要的", pos: "形容詞", example: "There was a significant increase.", exampleZh: "有顯著的成長。" },
  { word: "analyze", zh: "分析", pos: "動詞", example: "Researchers analyzed the data.", exampleZh: "研究人員分析了資料。" },
  { word: "commute", zh: "通勤", pos: "動詞", example: "I commute by bike every day.", exampleZh: "我每天騎腳踏車通勤。" },
  { word: "appointment", zh: "預約；約會", pos: "名詞", example: "I have a dentist appointment.", exampleZh: "我有牙醫預約。" },
  { word: "consequence", zh: "後果；結果", pos: "名詞", example: "Actions have consequences.", exampleZh: "行為會有後果。" },
  { word: "evaluate", zh: "評估", pos: "動詞", example: "We need to evaluate the results.", exampleZh: "我們需要評估結果。" },
  { word: "invoice", zh: "發票；請款單", pos: "名詞", example: "Please send the invoice by Friday.", exampleZh: "請在週五前寄出發票。" },
  { word: "colleague", zh: "同事", pos: "名詞", example: "I discussed it with a colleague.", exampleZh: "我和一位同事討論過了。" },
  { word: "ambiguous", zh: "模稜兩可的", pos: "形容詞", example: "The instructions were ambiguous.", exampleZh: "這些說明含糊不清。" },
  { word: "grocery", zh: "食品雜貨", pos: "名詞", example: "I need to buy some groceries.", exampleZh: "我需要買些食品雜貨。" },
  { word: "demonstrate", zh: "證明；展示", pos: "動詞", example: "The study demonstrates a clear trend.", exampleZh: "這項研究展現了明確的趨勢。" },
  { word: "refund", zh: "退款", pos: "名詞", example: "You can request a full refund.", exampleZh: "你可以申請全額退款。" },
  { word: "comprehensive", zh: "全面的", pos: "形容詞", example: "The book offers a comprehensive overview.", exampleZh: "這本書提供了全面的概覽。" },
  { word: "opportunity", zh: "機會", pos: "名詞", example: "This job is a great opportunity.", exampleZh: "這份工作是個很好的機會。" },
  { word: "inevitable", zh: "不可避免的", pos: "形容詞", example: "Some conflict is inevitable.", exampleZh: "某些衝突是不可避免的。" },
  { word: "strategy", zh: "策略；戰略", pos: "名詞", example: "We need a clear strategy.", exampleZh: "我們需要清楚的策略。" },
];
