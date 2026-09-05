/**
 * Urdu (اردو) strings — mirrors the shape of `en.js`.
 *
 * Written for Lady Health Workers in rural Pakistan: everyday spoken Urdu,
 * short sentences, no Persianised or bookish vocabulary. Clinical terms are
 * given in the words health workers actually use (تیز سانس rather than a
 * transliteration of "tachypnoea"), with the English abbreviation kept where
 * it appears on the physical test or device (MUAC, mWRD, LF-LAM, PHC, NTP).
 *
 * Numerals stay Western (0-9), as used in Pakistan.
 */
export const ur = {
  common: {
    yes: 'ہاں',
    no: 'نہیں',
    yesEmphatic: 'ہاں',
    noEmphatic: 'نہیں',
    back: 'واپس',
    continue: 'آگے بڑھیں',
    startNewScreening: 'نئی جانچ شروع کریں',
    aiComingSoon: 'یہ سہولت جلد آ رہی ہے',
    days: '{count} دن',
    daysOne: '1 دن',
  },

  topBar: {
    brand: 'Saans',
    languageEnglish: 'EN',
    languageUrdu: 'اردو',
  },

  welcome: {
    tagline: 'ہر سانس کی حفاظت',
    dividerLeft: 'بچوں میں ٹی بی کی جانچ',
    dividerRight: 'عالمی ادارہ صحت الگورتھم B',
    start: 'جانچ شروع کریں',
    footer:
      'v0.1 · انٹرنیٹ کے بغیر کام کرتی ہے · پاکستان کی لیڈی ہیلتھ ورکرز کے لیے',
  },

  visitType: {
    question: 'کیا یہ پہلا معائنہ ہے یا دوبارہ معائنہ؟',
    first: 'پہلا معائنہ',
    followUp: '1–2 ہفتے بعد دوبارہ معائنہ (علامات باقی ہیں یا بڑھ گئی ہیں)',
  },

  ageGate: {
    question: 'بچے کی عمر کتنی ہے؟',
    unit: 'سال',
    hint: 'مکمل سال میں عمر لکھیں۔ ایک سال سے چھوٹے بچے کے لیے 0 لکھیں۔',
  },

  outOfScope: {
    label: 'منظور شدہ عمر سے باہر',
    body: 'سانس v0.1 پانچ سال سے کم عمر بچوں کے لیے عالمی ادارہ صحت کے IMCI اصولوں کے مطابق بنائی گئی ہے۔',
    advice: '5 سے 9 سال کے بچوں کے لیے ڈاکٹر سے رجوع کریں (ETAT اصول)۔',
  },

  triage: {
    progress: 'سوال {current} از {total}',
  },

  dangerSigns: {
    drink: {
      text: 'کیا بچہ کچھ پی سکتا ہے یا ماں کا دودھ پی سکتا ہے؟',
      label: 'کچھ پی نہیں سکتا',
    },
    vomit: {
      text: 'کیا بچہ ہر کھائی پی ہوئی چیز الٹی کر دیتا ہے؟',
      label: 'ہر چیز کی الٹی',
    },
    seizure: {
      text: 'کیا بچے کو دورہ پڑا ہے؟',
      label: 'دورہ',
    },
    consciousness: {
      text: 'کیا بچہ بہت سست ہے، مشکل سے جاگتا ہے، یا بے ہوش ہے؟',
      label: 'بہت سست یا بے ہوش',
    },
    indrawing: {
      text: 'کیا سانس لیتے وقت بچے کا سینہ اندر کی طرف گہرا دھنستا ہے؟',
      label: 'سینہ اندر دھنسنا',
    },
    stridor: {
      text: 'کیا بچہ آرام کی حالت میں سانس لیتے ہوئے تیز، کھردری آواز نکالتا ہے؟',
      label: 'آرام میں کھردری آواز',
    },
    dehydration: {
      text: 'شدید پانی کی کمی کی علامات (آنکھیں اندر دھنسی ہوئی، جلد دبانے پر بہت آہستہ واپس آنا)؟',
      label: 'شدید پانی کی کمی',
    },
    pallor: {
      text: 'ہتھیلیوں کا شدید پیلا پن؟',
      label: 'ہتھیلیوں کا شدید پیلا پن',
    },
    hypoxia: {
      text: 'آکسیجن کی مقدار 90% سے کم (اگر پلس آکسی میٹر موجود ہو)؟',
      label: 'آکسیجن 90% سے کم',
    },
    neckStiffness: {
      text: 'گردن کا اکڑنا یا سر کی نرم جگہ کا ابھرنا؟',
      label: 'گردن اکڑنا یا سر کی نرم جگہ ابھرنا',
    },
  },

  urgent: {
    band: 'خطرے کی علامت موجود ہے',
    lead: 'بچہ شدید بیمار ہو سکتا ہے۔ یہ ٹی بی کی تشخیص نہیں ہے۔',
    body: 'پہلے ہنگامی طبی امداد ضروری ہے: بچے کو سنبھالیں اور فوراً قریبی ڈسٹرکٹ ہسپتال بھیجیں۔ ٹی بی کی جانچ ہسپتال میں جاری رہے گی۔',
    detected: 'ملی ہوئی علامات',
  },

  breathing: {
    band: 'سانس کی تکلیف موجود ہے',
    lead: 'اب شدت کا جائزہ لیں۔',
    severe:
      'شدید علامات موجود ہیں (سینہ بہت گہرا دھنسنا، ہونٹوں کا نیلا ہونا، یا کوئی بھی خطرے کی علامت)',
    noSevere: 'کوئی شدید علامت نہیں',
  },

  riskProfile: {
    ageLabel: 'بچے کی عمر',
    ageNotRecorded: 'درج نہیں',
    ageUnderOne: 'ایک سال سے کم',
    ageOneYear: '1 سال',
    ageYears: '{count} سال',
    hivQuestion: 'کیا بچے میں ایچ آئی وی کی تصدیق ہو چکی ہے؟',
    muacQuestion: 'بازو ناپنے والی (MUAC) ٹیپ کون سا رنگ دکھا رہی ہے؟',
    muac: {
      red: { name: 'سرخ', description: 'شدید غذائی کمی (115 ملی میٹر سے کم)' },
      yellow: { name: 'پیلا', description: 'درمیانی غذائی کمی' },
      green: { name: 'سبز', description: 'نارمل' },
    },
    highRiskBadge: 'زیادہ خطرہ · فوری جانچ',
    whoAdvice:
      'عالمی ادارہ صحت کی ہدایت: پہلے عام بیماریوں کا علاج کریں اور 1–2 ہفتے بعد دوبارہ دیکھیں۔ اگر علامات باقی رہیں تو یہ جانچ جاری رکھیں۔',
    continue: 'علامات کی طرف بڑھیں',
  },

  lowerRisk: {
    label: 'کم خطرہ · اسکور نہیں کیا گیا',
    guidance:
      'پہلے ٹی بی کے علاوہ ممکنہ بیماری کا علاج کریں۔ 1–2 ہفتے بعد دوبارہ معائنہ کریں۔ جانچ صرف اسی صورت جاری رکھیں اگر علامات باقی رہیں یا بڑھ جائیں۔',
    action: 'دوبارہ معائنے کا وقت طے کریں',
  },

  mwrd: {
    question:
      'کیا mWRD ٹیسٹ (Xpert MTB/RIF یا Ultra) یا پیشاب کا LF-LAM ٹیسٹ کیا گیا؟',
    detected: 'ہاں — ٹی بی کے جراثیم ملے',
    notDetected: 'ہاں — جراثیم نہیں ملے',
    pending: 'نتیجہ ابھی نہیں آیا',
    notPerformed: 'ٹیسٹ نہیں کیا گیا',
  },

  contact: {
    question:
      'کیا پچھلے 12 مہینوں میں گھر میں یا قریبی لوگوں میں کسی کو ٹی بی ہوئی؟',
  },

  symptoms: {
    coughDuration: 'کھانسی کتنے دن سے',
    feverDuration: 'بخار کتنے دن سے',
    coughQualifies: 'یہ 2 ہفتے سے زیادہ کھانسی شمار ہوگی',
    feverQualifies: 'یہ 2 ہفتے سے زیادہ بخار شمار ہوگا',
    scoresAt: '{days} دن یا اس سے زیادہ پر شمار ہوگا',
    maxDays: '{days} دن',
    toggles: {
      lethargy: 'بچے میں مسلسل سستی یا کھیل کود میں کمی؟',
      weightLoss: 'وزن کم ہونا یا وزن نہ بڑھنا؟',
      haemoptysis: 'کھانسی کے ساتھ خون آنا؟',
      nightSweats: 'رات کو پسینہ آنا؟',
      lymphNodes: 'بغیر درد کے سوجی ہوئی گلٹیاں؟',
    },
    vitalsHeading: 'جسمانی علامات',
    respiratoryRate: 'سانس کی رفتار',
    respiratoryUnit: 'سانس فی منٹ',
    respiratoryHint: 'اس عمر میں {threshold}/منٹ سے زیادہ ہو تو تیز سانس شمار ہوگا',
    heartRate: 'دل کی دھڑکن',
    heartUnit: 'دھڑکن فی منٹ',
    heartHint: 'اس عمر میں {threshold}/منٹ سے زیادہ ہو تو تیز دھڑکن شمار ہوگی',
    tachypnoea: 'تیز سانس؟',
    tachycardia: 'تیز دھڑکن؟',
    scanXray: 'ایکسرے اسکین کریں',
    recordCough: 'کھانسی ریکارڈ کریں',
    calculate: 'خطرے کا اسکور نکالیں',
  },

  vitalBands: {
    infant: '2–12 ماہ',
    child: '1–5 سال',
    older: '5 سال سے زیادہ',
  },

  coughRecord: {
    title: 'کھانسی ریکارڈ کریں',
    guidance:
      'ٹیبلٹ کو بچے سے تقریباً 30 سینٹی میٹر دور رکھیں اور نگہداشت کرنے والے سے کہیں کہ بچے کو کھانسنے دیں۔ ریکارڈنگ 10 سیکنڈ بعد خود بند ہو جائے گی۔',
    start: 'ریکارڈنگ شروع کریں',
    stop: 'بند کریں',
    recording: 'ریکارڈنگ جاری ہے',
    analyzing: 'ریکارڈنگ کا تجزیہ ہو رہا ہے…',
    reRecord: 'دوبارہ ریکارڈ کریں',
    use: 'یہی ریکارڈنگ استعمال کریں',
    back: 'علامات پر واپس جائیں',
    patternLabel: 'کھانسی کی قسم',
    characterLabel: 'آواز',
    coughsLabel: 'شمار کی گئی کھانسیاں',
    pattern: {
      wet: 'بلغم والی',
      dry: 'خشک',
      none: 'کھانسی واضح نہیں',
    },
    character: {
      abnormal: 'آواز غیر معمولی لگتی ہے',
      normal: 'آواز معمول کی لگتی ہے',
      unclear: 'آواز کافی نہیں',
    },
    disclaimer:
      'آواز کا تجزیہ صرف ایک معاون اشارہ ہے — فیصلہ ڈبلیو ایچ او کے الگورتھم سے آتا ہے۔',
    methodNote:
      'کھانسی کی پہچان کے لیے ماڈل بڑوں کی ریکارڈنگز پر تربیت یافتہ ہے؛ بلغم والی یا خشک ہونے کا اندازہ آواز کی خصوصیات سے لگایا گیا ہے اور ابھی جانچا نہیں گیا۔ ڈبلیو ایچ او کا کھانسی کا معیار وہ دو ہفتے کی تاریخ ہے جو آپ خود پوچھتے ہیں، یہ ریکارڈنگ نہیں۔',
    permissionDenied:
      'مائیکروفون کی اجازت نہیں دی گئی۔ براؤزر میں مائیکروفون کی اجازت دیں اور دوبارہ کوشش کریں۔',
    unsupported: 'یہ ڈیوائس یا براؤزر آواز ریکارڈ نہیں کر سکتا۔',
  },

  xrayScan: {
    title: 'سینے کا ایکسرے اسکین کریں',
    guidance: 'ایکسرے فلم کو تیز روشنی یا سفید اسکرین کے سامنے رکھیں۔',
    startingCamera: 'کیمرہ کھل رہا ہے…',
    cameraUnavailable:
      'اس ڈیوائس پر کیمرہ دستیاب نہیں۔ نیچے ”تصویر اپ لوڈ کریں“ استعمال کریں۔',
    capture: 'تصویر لیں',
    upload: 'تصویر اپ لوڈ کریں',
    uploadAria: 'سینے کے ایکسرے کی تصویر اپ لوڈ کریں',
    analyze: 'ایکسرے کا تجزیہ کریں',
    analyzing: 'تجزیہ ہو رہا ہے…',
    retake: 'دوبارہ تصویر لیں',
    failed: 'تجزیہ نہیں ہو سکا: {error}۔ دیکھیں کہ ویژن سروس چل رہی ہے۔',
    capturedAlt: 'لی گئی ایکسرے کی تصویر',
  },

  xrayFeatures: {
    title: 'ایکسرے کی علامات کی تصدیق کریں',
    probabilityLabel: 'ماڈل کے مطابق ٹی بی کا امکان',
    hint: 'تصویر کے تجزیے سے تجویز کردہ علامات پہلے سے منتخب ہیں۔ اسکور سے پہلے ان کی تصدیق یا تبدیلی کریں۔',
    lymphNodePrompt:
      'سینے کے درمیانی حصے میں بڑی ہوئی گلٹیاں خود دیکھیں۔ چھوٹے بچوں میں ٹی بی کی سب سے عام علامت یہی ہے۔ ماڈل اسے نہیں پہچان سکتا، اس لیے اس کا فیصلہ آپ خود کریں۔',
    sumB: 'مجموعہ B',
    confirm: 'تصدیق کریں اور حساب لگائیں',
    overlayAlt: 'ایکسرے پر ماڈل کی توجہ کا رنگین نشان',
  },

  cxrItems: {
    cavity: 'کیویٹی (پھیپھڑے میں سوراخ)',
    enlargedLymphNodes: 'بڑی ہوئی گلٹیاں',
    opacities: 'دھندلے دھبے',
    miliary: 'باریک دانے دار نشان',
    effusion: 'پھیپھڑے کے گرد پانی',
  },

  symptomItems: {
    cough: '2 ہفتے سے زیادہ کھانسی',
    fever: '2 ہفتے سے زیادہ بخار',
    lethargy: 'سستی',
    weightLoss: 'وزن کم ہونا / وزن نہ بڑھنا',
    haemoptysis: 'کھانسی میں خون',
    nightSweats: 'رات کو پسینہ',
    lymphNodes: 'سوجی ہوئی گلٹیاں (گردن، جبڑے کے نیچے یا بغل میں)',
    tachycardia: 'تیز دل کی دھڑکن',
    tachypnoea: 'تیز سانس',
  },

  results: {
    scoreLabel: 'خطرے کا اسکور',
    algorithmA: 'الگورتھم A (ایکسرے کے ساتھ)',
    algorithmB: 'الگورتھم B (ایکسرے کے بغیر)',
    reasoning: 'وجوہات',
    sumAHeading: 'مجموعہ A · علامات',
    sumBHeading: 'مجموعہ B · سینے کا ایکسرے',
    noFindings: 'کوئی علامت درج نہیں ہوئی۔',
    noSymptomFindings: 'کوئی علامت درج نہیں ہوئی۔',
    noCxrFindings: 'ایکسرے کی کوئی علامت تصدیق نہیں ہوئی۔',
    thresholdWithXray:
      'مجموعہ A {sumA} + مجموعہ B {sumB} = {total}۔ اگر کل {threshold} سے زیادہ ہو تو علاج شروع کیا جاتا ہے۔',
    thresholdNoXray:
      'کل {total}۔ اگر کل {threshold} سے زیادہ ہو تو علاج شروع کیا جاتا ہے۔',
    treatTitle: 'ٹی بی کا علاج شروع کریں',
    noTreatTitle: 'علاج کی ضرورت نہیں',
    decisionTreat: 'ٹی بی کا مناسب علاج شروع کریں۔',
    decisionNoTreat:
      'ٹی بی کا علاج شروع نہ کریں۔ 1–2 ہفتے بعد دوبارہ معائنہ کریں۔',
    immediateTreat: 'فوراً ٹی بی کا مناسب علاج شروع کریں۔',
    mwrdReason:
      'بچے کو قومی ٹی بی پروگرام (NTP) میں رجسٹر اور اطلاع کریں۔ mWRD یا LF-LAM ٹیسٹ میں ٹی بی کے جراثیم ملے؛ علامات کا اسکور نہیں لگایا جاتا۔',
    contactReason:
      'پچھلے 12 مہینوں میں گھر یا قریبی لوگوں میں کسی کو ٹی بی تھی۔ صرف اسی بنیاد پر علاج شروع کیا جاتا ہے؛ علامات کا اسکور نہیں لگایا جاتا۔',
    referral: 'قریبی PHC بھیجیں، حوالہ نمبر {code}۔',
    highRiskNote: 'زیادہ خطرے والا بچہ — دوبارہ معائنے میں دیر نہ کریں۔',
    highRiskBadge: 'زیادہ خطرہ · فوری جانچ',
    askAssistant: 'ڈبلیو ایچ او اسسٹنٹ سے پوچھیں',
    heatmapAlt: 'ایکسرے کا رنگین نشان',
    itemWithDays: '{label} ({count} دن)',
    source:
      'اسکور عالمی ادارہ صحت کی ٹی بی ہینڈ بک، ماڈیول 5 (2022)، ضمیمہ 5 کے مطابق۔',
  },
}
