/* =========================================================
 * 伯洋體產生器 — 介面語言包（i18n）
 *
 * 只翻譯「介面外殼」：按鈕、標籤、提示、頁尾。
 * **產生出來的內容一律是繁體中文**——語料庫的笑點建立在中文政治語言上，
 * 翻成英文就不成立了。英文模式下會以 note.zhOnly 向使用者說明這件事。
 *
 * 用法：index.html 以 data-i18n / data-i18n-html / data-i18n-ph /
 *      data-i18n-aria 標記靜態字串，app.js 的 applyLang() 負責套用。
 *      data-i18n-html 僅供本檔作者撰寫的靜態標記使用，不得接受使用者輸入。
 * ========================================================= */

const I18N = {

  'zh-TW': {
    label: '中',
    next: 'EN',
    locale: 'zh-TW',

    'meta.title': '伯洋體產生器',
    'meta.desc': '一鍵生成「有聽跟沒聽一樣」的伯洋體貼文與回覆——政治語言的幽默諷刺／媒體識讀小工具。',

    'logo.name': '伯洋體產生器',
    'logo.sub': '政治語言生態系感知工具',
    'a11y.theme': '切換主題',
    'a11y.lang': '切換語言',
    'a11y.density': '廢話濃度',

    'hero.badge': '✨ 伯洋體 2.0 · 台北順起來',
    'hero.title1': '伯洋體',
    'hero.title2': '產生器',
    'hero.lede': '一鍵生成讓人「有聽跟沒聽一樣」的完整貼文，或把對方的留言餵進來，產出一篇回應了但等於沒回應的廢話體回覆。',

    'mode.post': '📝 產生貼文',
    'mode.reply': '💬 產生回覆',

    'label.style': '公式風格',
    'label.density': '廢話濃度',
    'scale.low': '低',
    'scale.mid': '中',
    'scale.high': '高',
    'density.0': '低・點到為止',
    'density.1': '中・恰到好處的空泛',
    'density.2': '高・資訊量趨近於零',

    'btn.quick': '📝 一鍵產生貼文',
    'btn.generate': '🎤 產生伯洋體',
    'btn.random': '🎲 隨機填入',
    'btn.reply': '💬 產生廢話回覆',
    'btn.again': '🔁 換一篇',
    'btn.copy': '📋 複製',
    'btn.copied': '✓ 已複製',
    'btn.share': '↗ 分享到 Threads',

    'adv.summary': '🔧 進階：自己填關鍵詞',
    'field.subject': '對象 / 市民',
    'field.a': '核心抽象名詞 A',
    'field.b': '連鎖效益 B',
    'field.c': '終極目標 C',
    'field.buzzword': '學術關鍵詞（進階）',
    'field.topic': '政策主題',
    'ph.subject': '台北市民、年輕人…',
    'ph.a': '休息、空間、時間…',
    'ph.b': '消費、互動、能量…',
    'ph.c': '城市活力、認同感…',
    'ph.buzzword': '第三空間感知、韌性對齊、生態系治理…',
    'ph.topic': '交通、治安、文化創意…',

    'reply.label': '貼上對方的留言／貼文',
    'reply.ph': '把對方的留言貼進來，我來回應個寂寞…',
    'reply.warn': '請先貼上對方的留言，才有辦法回應個寂寞。',

    'history.title': '最近產生',
    'history.copy': '複製',

    'mode.checklist': '🔍 拆解口號',
    'btn.checklist': '🔍 拆出該問的問題',
    'chk.label': '口號拆解',
    'chk.label2': '貼上一句口號或政見',
    'chk.ph': '例如：把斷掉的接點連起來，台北就順起來了',
    'chk.warn': '請先貼上一句話，才有東西可以拆。',
    'chk.intro': '這個模式不會幫你生成答案——它只把一句話拆成它迴避掉的問責提問，並列出文本裡「找不找得到」具體元素。任何推測都會變成另一種廢話。',
    'chk.thisClaim': '這件事',
    'chk.scanHead': '具體元素盤點：{total} 項裡有 {n} 項在這句話裡找不到',
    'chk.ladderHead': '這句話落在政策邏輯模型的哪幾層',
    'chk.ladderNone': '五個層級都沒有比對到關鍵詞——這句話沒有落在政策邏輯模型的任何一層上。',
    'chk.ladderNote': '以上為關鍵詞機械比對的結果，僅供參考，不是語意判讀。空泛的話通常只長在最下面兩層。',
    'chk.answered': '這句話有提到',
    'chk.count': '{n} 個提問',
    'chk.foot': '這份清單不判斷對錯，只標出還沒被回答的部分。拿去問，答得出來就是好政見。',
    'chk.copyHead': '【這句話該問的問題】',
    'chk.copyFoot': '— 由伯洋體產生器的「拆解口號」模式產出，僅列提問，未生成任何答案。',

    'out.sep': '・',
    'out.quick': '一鍵貼文',
    'out.reply': '廢話回覆',
    'out.chars': '字',
    'out.thread': '串文 {i}／{n}',
    'card.handle': '@boyangti_parody · 剛剛',
    'card.badge': '戲仿',

    'formula.box':
      '<strong>伯洋體公式懶人包：</strong><br>' +
      '「讓 <strong>[對象]</strong> 找回他失去的 <strong>[A]</strong> → 有了 A 自然就有 <strong>[B]</strong> → B 帶來的正是 <strong>[C]</strong> 的根本 → 就是那麼簡單的道理而已。」' +
      '<hr>' +
      '<strong>2026 版公式（順起來版）：</strong><br>' +
      '「<strong>[卡點A]</strong> 卡、<strong>[卡點B]</strong> 卡，什麼都卡 → 為什麼卡？因為接點斷了 → 把斷掉的接點連起來 → <strong>接起來，就順了。</strong>」',

    'note.zhOnly': '',

    'footer.mark': '伯洋體感知生態系已完成對齊 · 就是那麼簡單的道理而已',
    'footer.disclaimer': '本站為諷刺／娛樂用途之戲仿（parody）創作，所有內容皆由句式模板隨機拼裝生成，非沈伯洋本人言論，亦不代表其立場。',

    styles: null // 中文風格名直接取自 CORPUS.styles[key].name
  },

  en: {
    label: 'EN',
    next: '中',
    locale: 'en-US',

    'meta.title': 'Boyangti Generator',
    'meta.desc': 'Generate Taiwanese political-speak posts and replies that sound profound and say nothing — a parody and media-literacy toy.',

    'logo.name': 'Boyangti Generator',
    'logo.sub': 'Political language ecosystem alignment tool',
    'a11y.theme': 'Toggle theme',
    'a11y.lang': 'Switch language',
    'a11y.density': 'Waffle density',

    'hero.badge': '✨ Boyangti 2.0 · Let Taipei Flow',
    'hero.title1': 'Boyangti',
    'hero.title2': 'Generator',
    'hero.lede': 'One click gives you a complete post that sounds profound and says nothing. Or paste someone’s comment and get a reply that responds thoroughly without answering anything.',

    'mode.post': '📝 Generate post',
    'mode.reply': '💬 Generate reply',

    'label.style': 'Formula style',
    'label.density': 'Waffle density',
    'scale.low': 'Low',
    'scale.mid': 'Mid',
    'scale.high': 'High',
    'density.0': 'Low · restrained',
    'density.1': 'Mid · pleasantly vacant',
    'density.2': 'High · approaching zero information',

    'btn.quick': '📝 Generate a post',
    'btn.generate': '🎤 Generate Boyangti',
    'btn.random': '🎲 Fill randomly',
    'btn.reply': '💬 Generate reply',
    'btn.again': '🔁 Reroll',
    'btn.copy': '📋 Copy',
    'btn.copied': '✓ Copied',
    'btn.share': '↗ Share to Threads',

    'adv.summary': '🔧 Advanced: supply your own keywords',
    'field.subject': 'Subject / citizens',
    'field.a': 'Core abstract noun A',
    'field.b': 'Knock-on effect B',
    'field.c': 'Ultimate goal C',
    'field.buzzword': 'Academic buzzword (advanced)',
    'field.topic': 'Policy topic',
    'ph.subject': 'In Chinese, e.g. 台北市民、年輕人…',
    'ph.a': 'In Chinese, e.g. 休息、空間、時間…',
    'ph.b': 'In Chinese, e.g. 消費、互動、能量…',
    'ph.c': 'In Chinese, e.g. 城市活力、認同感…',
    'ph.buzzword': 'In Chinese, e.g. 第三空間感知、韌性對齊…',
    'ph.topic': 'In Chinese, e.g. 交通、治安、文化創意…',

    'reply.label': 'Paste the comment or post you’re replying to',
    'reply.ph': 'Paste their comment here and I’ll respond at length about nothing…',
    'reply.warn': 'Paste a comment first — there’s nothing to respond to yet.',

    'history.title': 'Recently generated',
    'history.copy': 'Copy',

    'mode.checklist': '🔍 Unpack a slogan',
    'btn.checklist': '🔍 Surface the questions',
    'chk.label': 'Slogan unpacked',
    'chk.label2': 'Paste a slogan or a policy claim',
    'chk.ph': 'e.g. Reconnect the broken junctions and Taipei will flow',
    'chk.warn': 'Paste something first — there\u2019s nothing to unpack yet.',
    'chk.intro': 'This mode does not generate answers. It turns a sentence into the accountability questions it dodges, and reports which concrete elements are literally absent from the text. Anything inferred would just be more waffle.',
    'chk.thisClaim': 'this claim',
    'chk.scanHead': 'Concrete elements: {n} of {total} are missing from this sentence',
    'chk.ladderHead': 'Where this sits on the policy logic model',
    'chk.ladderNone': 'No keywords matched on any of the five rungs — this sentence does not land anywhere on the policy logic model.',
    'chk.ladderNote': 'Mechanical keyword matching, not semantic reading — treat as a hint. Vague statements usually occupy only the bottom two rungs.',
    'chk.answered': 'addressed here',
    'chk.count': '{n} questions',
    'chk.foot': 'This list does not judge right or wrong. It marks what has not been answered yet. Go ask — a claim that survives the questions is a good one.',
    'chk.copyHead': '[Questions this sentence should answer]',
    'chk.copyFoot': '— Produced by the Boyangti Generator\u2019s unpack mode. Questions only; no answers were generated.',

    'out.sep': ' · ',
    'out.quick': 'one-click post',
    'out.reply': 'Waffle reply',
    'out.chars': 'chars',
    'out.thread': 'Post {i} of {n}',
    'card.handle': '@boyangti_parody · just now',
    'card.badge': 'parody',

    'formula.box':
      '<strong>The classic formula:</strong><br>' +
      '“Give <strong>[SUBJECT]</strong> back the <strong>[A]</strong> they have lost → with A, <strong>[B]</strong> naturally follows → and what B brings is the very foundation of <strong>[C]</strong> → it really is that simple.”' +
      '<hr>' +
      '<strong>The 2026 formula (Flow style):</strong><br>' +
      '“<strong>[BLOCKAGE A]</strong> is stuck, <strong>[BLOCKAGE B]</strong> is stuck, everything is stuck → Why? The junctions are broken → Reconnect them → <strong>Connect them, and it flows.</strong>”',

    'note.zhOnly': 'Interface is in English; generated output stays in Traditional Chinese — the joke only works in the original.',

    'footer.mark': 'Boyangti perceptual ecosystem alignment complete · it really is that simple',
    'footer.disclaimer': 'This site is a parody created for satire and media-literacy purposes. All output is assembled at random from sentence templates. It is not the speech of Shen Bo-yang and does not represent his positions.',

    styles: {
      basic: 'Basic',
      slogan: 'Flow (順起來)',
      academic: 'Academic smokescreen',
      ironic: 'Ironic worship',
      interpellation: 'Interpellation',
      crisis: 'Crisis',
      warmth: 'Warmth',
      thread: 'Threads thread'
    }
  }
};
