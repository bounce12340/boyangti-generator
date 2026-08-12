/* =========================================================
 * 伯洋體產生器 — 口號拆解清單（checklist）
 *
 * 這個檔案**不是戲仿內容**，不受 data/style-guide.md 的語料規範約束，
 * 也不帶〔一手〕〔二手〕之類的來源註解。它是本站的媒體識讀工具那一半：
 * 把一句空泛的話，拆成它迴避掉的問責提問。
 *
 * 唯一的設計原則：**只生成問題、只陳述文本裡有什麼，絕不生成答案。**
 * 任何「這句話其實是想說 X」的推測都不該出現在這裡——那就變成另一種廢話了。
 *
 * detectors 做的是純字串比對（有沒有數字、有沒有機關名、有沒有期程），
 * 不做語意判斷；ladder 的層級標示同理，只看關鍵詞落點，並在 UI 上
 * 標明這是機械比對的參考值。
 * ========================================================= */

const CHECKLIST = {

  /* ---------- 邏輯模型五層 ----------
   * 政策評估的標準骨架。伯洋體的遞進階梯幾乎只長在最上面兩層，
   * 這正是它聽起來有意義、卻無法驗收的結構原因。 */
  ladder: [
    {
      key: 'input',
      'zh-TW': { name: '投入', desc: '錢、人、法規工具' },
      en: { name: 'Input', desc: 'Money, people, legal instruments' },
      markers: ['預算', '億', '萬元', '經費', '財源', '人力', '編制', '員額', '修法', '條例', '自治條例', '要點', '辦法', '法源']
    },
    {
      key: 'activity',
      'zh-TW': { name: '活動', desc: '實際要做的動作' },
      en: { name: 'Activity', desc: 'What will actually be done' },
      markers: ['興建', '設置', '增設', '開辦', '補助', '修繕', '招募', '稽查', '盤點', '普查', '試辦', '委外', '招標', '拆除', '改建']
    },
    {
      key: 'output',
      'zh-TW': { name: '產出', desc: '做完會多出什麼東西' },
      en: { name: 'Output', desc: 'What tangibly exists afterwards' },
      markers: ['座', '處所', '案件', '公里', '床位', '名額', '班次', '路口', '路段', '園區', '中心']
    },
    {
      key: 'outcome',
      'zh-TW': { name: '成果', desc: '對象身上發生的改變' },
      en: { name: 'Outcome', desc: 'The measurable change in people' },
      markers: ['減少', '降低', '提升', '縮短', '增加', '改善', '下降', '成長', '涵蓋率', '普及率', '等候時間']
    },
    {
      key: 'impact',
      'zh-TW': { name: '影響', desc: '社會層次的長期改變' },
      en: { name: 'Impact', desc: 'Long-term societal change' },
      // 這一層另外會併入 CORPUS.words.c（終極目標詞池）——
      // 同一份詞庫正著用是產生器，反著用就是偵測器。
      markers: ['願景', '文明', '共好', '幸福感', '生態系', '韌性', '對齊', '感知', '環環相扣', '底蘊', '高度']
    }
  ],

  /* ---------- 具體元素偵測 ----------
   * 全部是「文本裡找不找得到」的機械比對，不做任何語意推測。 */
  detectors: [
    {
      key: 'number',
      re: /\d|[一二三四五六七八九十百千萬億]{1,}(?=[％%元件座人年月日次成倍])|％|%/,
      'zh-TW': { has: '有數字或數量', none: '沒有任何數字' },
      en: { has: 'Contains numbers', none: 'No numbers at all' }
    },
    {
      key: 'money',
      re: /預算|經費|億|萬元|新台幣|財源|補助款|自償/,
      'zh-TW': { has: '有提到錢', none: '沒有提到任何金額或財源' },
      en: { has: 'Mentions money', none: 'No budget or funding source' }
    },
    {
      key: 'time',
      re: /\d+\s*年|\d+\s*月|期程|時程|里程碑|任內|四年|第一年|上路|完工|前完成|截止/,
      'zh-TW': { has: '有提到期程', none: '沒有任何時間點或期程' },
      en: { has: 'Mentions a timeline', none: 'No dates or deadlines' }
    },
    {
      key: 'agency',
      re: /局$|局[^長]|處$|署|委員會|市府|府級|中央|部會|里辦公處|公所|科$/m,
      'zh-TW': { has: '有指名機關', none: '沒有指名任何權責機關' },
      en: { has: 'Names an agency', none: 'No responsible agency named' }
    },
    {
      key: 'legal',
      re: /條例|辦法|要點|修法|法源|法規|準則|自治/,
      'zh-TW': { has: '有提到法規工具', none: '沒有提到法源或法規工具' },
      en: { has: 'Mentions legal instruments', none: 'No legal basis mentioned' }
    },
    {
      key: 'metric',
      re: /指標|KPI|基線|目標值|評估|考核|驗收|統計|調查|回報率|滿意度/i,
      'zh-TW': { has: '有提到衡量方式', none: '沒有提到任何可驗收的指標' },
      en: { has: 'Mentions a measure', none: 'No verifiable metric' }
    }
  ],

  /* ---------- 問責提問 ----------
   * {keyword} 會被替換成從輸入抽出的關鍵詞；抽不到時退回通用寫法。 */
  groups: [
    {
      key: 'who',
      icon: '🏛',
      detector: 'agency',
      'zh-TW': {
        title: '誰做',
        lead: '一句話沒有主詞，就沒有人需要負責。',
        questions: [
          '「{keyword}」這件事，哪一個局處是主責機關？',
          '如果需要跨局處，誰負責整合？層級夠不夠壓得動？',
          '這件事是市府權限內就能做，還是需要中央配合？',
          '做不到的時候，是誰要出來說明？'
        ]
      },
      en: {
        title: 'Who does it',
        lead: 'A sentence with no subject leaves no one accountable.',
        questions: [
          'Which department owns “{keyword}”?',
          'If it spans departments, who integrates them — and at what level of authority?',
          'Is this within the city\'s powers, or does it need central government?',
          'Who has to answer for it if it doesn\'t happen?'
        ]
      }
    },
    {
      key: 'resource',
      icon: '💰',
      detector: 'money',
      'zh-TW': {
        title: '花多少',
        lead: '沒有金額的承諾，等於沒有承諾。',
        questions: [
          '「{keyword}」要花多少錢？一次性還是每年編列？',
          '財源從哪裡來？哪個預算科目？',
          '這筆錢原本要用在什麼地方——排擠掉了誰？',
          '如果預算被議會砍半，這件事還做得成嗎？'
        ]
      },
      en: {
        title: 'What it costs',
        lead: 'A promise without a number is not a promise.',
        questions: [
          'What does “{keyword}” cost — one-off, or recurring?',
          'Which budget line does the money come from?',
          'What was that money going to fund instead — who gets crowded out?',
          'If the council halves the budget, does this still work?'
        ]
      }
    },
    {
      key: 'when',
      icon: '📅',
      detector: 'time',
      'zh-TW': {
        title: '多久',
        lead: '沒有期程的目標，永遠不會逾期。',
        questions: [
          '「{keyword}」什麼時候開始？什麼時候看得到？',
          '任期四年內的里程碑是什麼？第一年要交出什麼？',
          '哪一部分是這一任做得完的，哪一部分留給下一任？',
          '如果延宕，怎麼判斷是延宕而不是「還在推動」？'
        ]
      },
      en: {
        title: 'By when',
        lead: 'A goal with no deadline can never be late.',
        questions: [
          'When does “{keyword}” start, and when is it visible?',
          'What are the milestones inside a four-year term? What ships in year one?',
          'Which part finishes this term, and which is left to the next?',
          'If it slips, how would anyone tell slippage from “still in progress”?'
        ]
      }
    },
    {
      key: 'metric',
      icon: '📊',
      detector: 'metric',
      'zh-TW': {
        title: '怎麼算成功',
        lead: '不能被判定失敗的目標，也不能被判定成功。',
        questions: [
          '用什麼數字判斷「{keyword}」做到了？',
          '現在的基線值是多少？目標值是多少？',
          '這個數字由誰統計、多久公布一次、查得到嗎？',
          '什麼結果會被認定為失敗？'
        ]
      },
      en: {
        title: 'What counts as success',
        lead: 'A goal that cannot fail cannot succeed either.',
        questions: [
          'What number decides whether “{keyword}” happened?',
          'What is the baseline today, and the target?',
          'Who measures it, how often is it published, and can the public see it?',
          'What outcome would count as failure?'
        ]
      }
    },
    {
      key: 'authority',
      icon: '⚖️',
      detector: 'legal',
      'zh-TW': {
        title: '憑什麼做得到',
        lead: '想做和做得到，中間隔著法規與權限。',
        questions: [
          '現行法規允許「{keyword}」嗎？要不要修自治條例或作業要點？',
          '如果要修法，送議會的時程是什麼？過得了嗎？',
          '需要哪些單位點頭——中央、地主、既有承包商？',
          '過去有沒有人試過？當時卡在哪一關？'
        ]
      },
      en: {
        title: 'By what authority',
        lead: 'Between wanting and doing sit rules and jurisdiction.',
        questions: [
          'Do current rules permit “{keyword}”, or does a bylaw need amending?',
          'If it needs legislation, what is the council timeline — and will it pass?',
          'Whose sign-off is required — central government, landowners, incumbent contractors?',
          'Has anyone tried before? Where exactly did it stall?'
        ]
      }
    },
    {
      key: 'tradeoff',
      icon: '⚖',
      detector: null,
      'zh-TW': {
        title: '誰付代價',
        lead: '一件事如果沒有人反對，通常是還沒講到具體做法。',
        questions: [
          '「{keyword}」做下去，誰受益最多？',
          '誰會變得比較不方便、比較貴、比較慢？',
          '最強的反對理由是什麼？怎麼回應？',
          '如果所有人都同意，是不是因為還沒講到取捨？'
        ]
      },
      en: {
        title: 'At whose cost',
        lead: 'If nobody objects, the specifics usually haven\'t been said yet.',
        questions: [
          'Who benefits most from “{keyword}”?',
          'Who ends up worse off — slower, costlier, more inconvenienced?',
          'What is the strongest objection, and what is the answer to it?',
          'If everyone agrees, is that because the trade-off hasn\'t been named?'
        ]
      }
    },
    {
      key: 'risk',
      icon: '🚧',
      detector: null,
      'zh-TW': {
        title: '失敗會怎樣',
        lead: '沒有退場機制的計畫，失敗時只會繼續花錢。',
        questions: [
          '「{keyword}」最可能卡在哪一關？',
          '什麼情況下會停損？有沒有退場機制？',
          '如果做不到，已經投入的資源怎麼處理？',
          '有沒有可以先做小規模試辦、再決定要不要放大的做法？'
        ]
      },
      en: {
        title: 'What if it fails',
        lead: 'A plan with no exit keeps spending after it has failed.',
        questions: [
          'Where is “{keyword}” most likely to stall?',
          'Under what conditions does it stop? Is there an exit ramp?',
          'If it fails, what happens to what has already been spent?',
          'Could this be piloted small before scaling — and what would the pilot decide?'
        ]
      }
    }
  ]
};
