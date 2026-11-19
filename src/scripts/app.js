'use strict';
const adhanUrl = '/adhan/adhan.mp3';
const adhanFajrUrl = '/adhan/adhan-fajr.mp3';
const vMakkah = '/adhan/voices/makkah.mp3';
const vMadinah = '/adhan/voices/madinah.mp3';
const vAqsa = '/adhan/voices/aqsa.mp3';
const vEgypt = '/adhan/voices/egypt.mp3';
const vTurkey = '/adhan/voices/turkey.mp3';
const vBaldi = '/adhan/voices/baldi.mp3';
const vQatami = '/adhan/voices/qatami.mp3';
import mosqueUrl from '../assets/hero/greatmosque.jpg?url';
import ADHKAR from '../data/adhkar.json';
import { pad, norm, norm2, esc, hash, arDigits, fmt, safeName } from './lib/text.js';
import { SURAH, surahName, surahNameGlyph, SURAH_PAGE } from './lib/surah.js';
import { MUSHAF_PAGES, JUZ_PAGE, mushafJuz, mushafSurah, mushafRight, mushafStep } from './lib/mushaf.js';
import { ED_KEYS, CORS_AUDIO_HOST, corsAudio, serverURL, parseList, buildSources, pickSource } from './lib/sources.js';
import { prayerTimeStr, countdownStr } from './lib/prayer.js';
import { apiFetch, nominatimSearch } from './lib/api.js';
import { nextFocusable } from './lib/focus.js';
import { initTelemetry, logError } from './lib/telemetry.js';
initTelemetry();
/* ═══════════════════════ OUNS · Quran Player ═══════════════════════ */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const API = 'https://mp3quran.net/api/v3';
const CURRENT_SCHEMA = 1;
const STORE_SCHEMAS = {
  lang: v => v === 'ar' || v === 'en' ? v : 'ar',
  theme: v => v === 'dark' || v === 'light' ? v : 'light',
  quality: v => ['auto', 'high', 'std', 'save'].includes(v) ? v : 'auto',
  speed: v => typeof v === 'number' && Number.isFinite(v) && v >= 0.5 && v <= 2.5 ? v : 1,
  volume: v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1 ? v : 1,
  mushafRiwaya: v => v === 'warsh' || v === 'hafs' ? v : 'hafs',
  mushafPage: v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 604 ? v : 0,
  npMode: v => v === 'pinned' || v === 'float' || v === 'auto' ? v : 'hidden',
  sideMode: v => v === 'collapsed' || v === 'open' ? v : 'open',
  repeat: v => v === 1 || v === 2 ? v : 0,
  shuffle: v => Boolean(v),
  adhanOn: v => Boolean(v),
  notifyOn: v => Boolean(v),
  adhanMode: v => v === 'duck' ? 'duck' : 'stop',
  favorites: v => Array.isArray(v) ? v.slice(0, 500) : [],
  recent: v => Array.isArray(v) ? v.slice(0, 30) : [],
  prayerLoc: v => v && typeof v === 'object' && Number.isFinite(+v.lat) && Number.isFinite(+v.lng) ? { name: String(v.name || ''), lat: +v.lat, lng: +v.lng, src: v.src || 'gps' } : { name: 'وادي العثمانية، ميلة', lat: 36.2662, lng: 6.3118, src: 'gps' },
  prayerOffset: v => {
    const base = { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 };
    if (typeof v === 'number' && Number.isFinite(v)) { for (const k in base) base[k] = Math.max(-30, Math.min(30, v)); return base }
    if (v && typeof v === 'object') { for (const k in base) if (typeof v[k] === 'number' && Number.isFinite(v[k])) base[k] = Math.max(-30, Math.min(30, v[k])) }
    return base;
  }
};
const store = {
  get(k, d) {
    try {
      const raw = localStorage.getItem('ouns_' + k);
      if (raw == null) return d;
      const parsed = JSON.parse(raw);
      const validate = STORE_SCHEMAS[k];
      return validate ? validate(parsed) : parsed;
    } catch (_) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem('ouns_' + k, JSON.stringify(v));
    } catch (e) {
      if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
        try { toast(t('quotaExceeded')) } catch (_) { }
      }
    }
  }
};

/* ── Migrations & schema check ── */
(function runMigrations() {
  try {
    const v = store.get('schema_version', 0);
    if (v < 1) {
      const oldMushafLast = store.get('mushafLast', 0);
      if (oldMushafLast > 1 && !store.get('mushafLast_hafs', 0)) {
        store.set('mushafLast_hafs', oldMushafLast);
      }
      try { localStorage.removeItem('ouns_mushafLast') } catch (_) { }
      store.set('schema_version', 1);
    }
  } catch (_) { }
})();

/* ── Surah metadata (114) ── */

/* ── Fallback catalog (offline resilience) ── */
const FALLBACK = [["مشاري راشد العفاسي", "Mishary Rashid Alafasy", "https://server8.mp3quran.net/afs/"], ["عبد الرحمن السديس", "Abdurrahman As-Sudais", "https://server11.mp3quran.net/sds/"], ["سعود الشريم", "Saud Ash-Shuraim", "https://server7.mp3quran.net/shur/"], ["ماهر المعيقلي", "Maher Al Muaiqly", "https://server12.mp3quran.net/maher/"], ["محمود خليل الحصري", "Mahmoud Khalil Al-Husary", "https://server13.mp3quran.net/husr/"], ["محمد صديق المنشاوي", "Mohamed Siddiq El-Minshawi", "https://server10.mp3quran.net/minsh/"], ["سعد الغامدي", "Saad Al-Ghamdi", "https://server7.mp3quran.net/s_gmd/"], ["أبو بكر الشاطري", "Abu Bakr Ash-Shatri", "https://server11.mp3quran.net/shatri/"], ["ناصر القطامي", "Nasser Al Qatami", "https://server6.mp3quran.net/qtm/"], ["ياسر الدوسري", "Yasser Al-Dosari", "https://server11.mp3quran.net/yasser/"], ["هاني الرفاعي", "Hani Ar-Rifai", "https://server8.mp3quran.net/hani/"], ["أحمد العجمي", "Ahmed Al-Ajmi", "https://server10.mp3quran.net/ajm/"], ["محمد أيوب", "Muhammad Ayyoub", "https://server8.mp3quran.net/ayyub/"], ["عبد الله بصفر", "Abdullah Basfar", "https://server6.mp3quran.net/bsfr/"], ["علي الحذيفي", "Ali Al-Hudhaify", "https://server9.mp3quran.net/hthfi/"], ["إبراهيم الأخضر", "Ibrahim Al-Akhdar", "https://server6.mp3quran.net/akdr/"], ["خالد القحطاني", "Khalid Al-Qahtani", "https://server10.mp3quran.net/qht/"], ["عبد الباسط عبد الصمد", "Abdul Basit Abdus-Samad", "https://server7.mp3quran.net/basit/"]].map((r, i) => ({ id: 9000 + i, name: r[0], name_en: r[1], moshaf: [{ id: 1, server: r[2], rewaya: 'حفص عن عاصم', name: 'مرتل', surah_list: '1-114', surah_total: 114 }] }));

/* ── Islamic Network CDN edition matching ── */
let EDITIONS = [];

/* ── Verses ── */
const VERSES = [["وَإِذَا قُرِئَ الْقُرْآنُ فَاسْتَمِعُوا لَهُ وَأَنصِتُوا لَعَلَّكُمْ تُرْحَمُونَ", "الأعراف · ٢٠٤", "When the Qur'an is recited, listen to it attentively, so you may receive mercy.", "Al-A'raf · 204"], ["الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", "الرعد · ٢٨", "Those who believe, and whose hearts find comfort in the remembrance of Allah.", "Ar-Ra'd · 28"], ["وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا", "المزمل · ٤", "And recite the Qur'an with measured recitation.", "Al-Muzzammil · 4"], ["إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ", "الحجر · ٩", "Indeed, it is We who sent down the Reminder, and indeed, We will be its guardian.", "Al-Hijr · 9"]];

/* ── i18n ── */
const I18N = {
  ar: { library: "المكتبة", home: "الرئيسية", reciters: "القرّاء", favorites: "المفضلة", recent: "سجل الاستماع", downloads: "التنزيلات", developer: "المُطوِّر", verseLabel: "آية وتدبّر", tagline: "رفيقك لتلاوة القرآن الكريم", nowPlaying: "يُتلى الآن", chooseReciter: "اختر قارئًا لبدء التلاوة", upNext: "التالي في القائمة", favorite: "المفضلة", download: "تنزيل", settings: "الإعدادات", theme: "المظهر", themeDesc: "نهاري بيج / ليلي OLED", light: "نهاري", dark: "ليلي", language: "اللغة", audioSource: "مصدر الصوت", audioSourceDesc: "يُختار الأعلى جودة تلقائيًا مع تجاوز عند الفشل", shortcuts: "اختصارات لوحة المفاتيح", kPlay: "تشغيل / إيقاف", kSeek: "تقديم / ترجيع ٥ ثوانٍ", kNext: "التالي / السابق", kFav: "المفضلة", kMute: "كتم الصوت", kSearch: "بحث", done: "تم", cancel: "إلغاء", confirm: "تأكيد", chooseFolder: "مجلد الحفظ", noDownloads: "لا توجد تنزيلات بعد", loading: "جارٍ تحميل المكتبة…", offline: "تعذّر الاتصال بالمصدر — عُرضت مكتبة مختصرة تعمل عبر الإنترنت", searchReciters: "ابحث عن قارئ…", searchSurahs: "ابحث عن سورة…", searchFav: "ابحث في المفضلة…", searchRecent: "ابحث في سجل الاستماع…", greetM: "صباح النور والقرآن", greetE: "مساء النور والقرآن", heroSub: "تلاوات خاشعة بأعلى جودة، بروايات متعددة وقرّاء من حول العالم. اختر قارئًا ودع القرآن يؤنسك.", continueL: "واصل الاستماع", browse: "تصفّح القرّاء", featured: "قرّاء مختارون", quickSurahs: "سور يُكثر الاستماع إليها", allRiwayat: "كل الروايات", riwayat: "الروايات", sortName: "الاسم", sortCount: "عدد المصاحف", moshaf: "مصحف", surahs: "سورة", playAll: "تشغيل الكل", downloadAll: "تنزيل الكل", back: "عودة للصفحة السابقة", ayahs: "آية", meccan: "مكية", medinan: "مدنية", noFav: "لا توجد سور في المفضلة بعد — اضغط ♥ على أي سورة", noRecent: "لم تستمع إلى شيء بعد", clearRecent: "مسح السجل", cleared: "تم مسح السجل", undo: "تراجع", addedFav: "أُضيفت إلى المفضلة", removedFav: "أُزيلت من المفضلة", qAuto: "أعلى جودة", qHigh: "١٩٢+", qStd: "١٢٨", qSave: "توفير البيانات", sleep: "مؤقت النوم", sleepOff: "إيقاف", min: "دقيقة", timerSet: "سيتوقف التشغيل بعد", timerEnd: "انتهى مؤقت النوم — تصبح على خير", confirmDlAll: "تنزيل جميع سور هذا المصحف؟", confirmDlAllMsg: "قد يتجاوز الحجم ٥٠٠ ميغابايت. سيبدأ التنزيل في الخلفية.", saved: "تم الحفظ", failed: "فشل", downloading: "جارٍ التنزيل", pending: "بالانتظار", cancelled: "أُلغي", dlDone: "اكتمل التنزيل", errorAudio: "تعذّر تشغيل هذه التلاوة — جرّب مصدرًا آخر", noResults: "لا توجد نتائج مطابقة", reciter: "قارئ", tracks: "تلاوة", kbps: "kbps", provider: "المصدر", resume: "استئناف", playing: "يُتلى الآن", selectReciterFirst: "اختر قارئًا أولًا", favView: "المفضلة", recentView: "سجل الاستماع", favSub: "سورك المحفوظة للتلاوة الدائمة", recentSub: "آخر ما استمعت إليه", recitersSub: "قرّاء من حول العالم، بروايات متعددة", surahCount: "سورة متاحة", dlFolder: "اختر مجلدًا لحفظ التلاوات تلقائيًا", folderOk: "سيتم الحفظ في", quality: "الجودة", speed: "السرعة", volume: "الصوت", playback: "التحكم بالتشغيل", mute: "كتم", expand: "ملء الشاشة", close: "إغلاق", previous: "السابق", next: "التالي", shuffle: "عشوائي", repeat: "تكرار", play: "تشغيل", pause: "إيقاف", remove: "إزالة", clear: "مسح", about: "أُنس — مشغل القرآن الكريم", aboutSub: "تلاوات كاملة، روايات متعددة، أعلى جودة", pin: "تثبيت اللوحة", unpin: "إلغاء التثبيت", hidePanel: "إخفاء اللوحة", showPanel: "إظهار اللوحة", floatPanel: "فصل اللوحة كنافذة عائمة", dockPanel: "إرجاع اللوحة إلى الجانب", mushaf: "المصحف", quranName: "القرآن الكريم", startReading: "ابدأ القراءة", continueReading: "تابع القراءة", mushafSub: "قراءة المصحف — رواية حفص عن عاصم", page: "صفحة", juz: "الجزء", rwHafs: "حفص عن عاصم", rwWarsh: "ورش عن نافع", mushafRiwaya: "رواية المصحف", mushafRiwayaDesc: "المصحف المكتوب — حفص عن عاصم / ورش عن نافع", chooseRiwaya: "اختر رواية المصحف", chooseRiwayaDesc: "يمكنك تغييرها لاحقاً من الإعدادات", dlPages: "تحميل جميع الصفحات", prayerTimes: "مواقيت الصلاة", prayerSub: "مواقيت الصلاة لموقعك", nextPrayer: "الصلاة القادمة", fajr: "الفجر", sunrise: "الشروق", dhuhr: "الظهر", asr: "العصر", maghrib: "المغرب", isha: "العشاء", location: "الموقع", changeLoc: "تغيير الموقع", searchLoc: "ابحث عن مدينة…", locNotFound: "لم يتم العثور على الموقع", search: "بحث", locAuto: "تحديد الموقع تلقائياً", locGps: "عبر GPS", locNet: "عبر الشبكة", locDetecting: "جارٍ تحديد الموقع…", locFail: "تعذّر تحديد الموقع", locApprox: "تقريبي — الشبكة", locApproxT: "تم التحديد عبر الشبكة وقد يكون غير دقيق — استعمل GPS أو ابحث عن مدينتك", adhan: "الأذان", adhanDesc: "تشغيل الأذان تلقائياً عند دخول وقت الصلاة", adhanNow: "حان الآن وقت", stopAdhan: "إيقاف الأذان", adhanOn: "مفعّل", adhanOff: "معطّل", firstThird: "الثلث الأول من الليل", lastThird: "الثلث الأخير من الليل", prOffset: "تصحيح المواقيت", prOffsetDesc: "تقديم أو تأخير المواقيت بالدقائق", untilAdhan: "بقي على رفع الآذان", cc: "الترجمة", adhkar: "الأذكار", adhkarSub: "من حصن المسلم", dhikr: "ذكر", allCats: "جميع الأقسام", akDone: "تمّت الأذكار — تقبّل الله", akProgress: "تمّ", ytView: "أفضل التلاوات", ytSub: "مجموعة مختارة من أجمل التلاوات المرئية", ytAll: "كل التلاوات", prToday: "صلوات اليوم", prNight: "الشروق وأوقات الليل", adhanVoice: "صوت المؤذن", adhanVoiceDesc: "اختر صوت الأذان المستعمل عند دخول وقت الصلاة", preview: "استماع", adhanMode: "سلوك الأذان", adhanModeDesc: "عند دخول وقت الصلاة: إيقاف التلاوة أو خفض صوتها أثناء الأذان", adhanStop: "إيقاف التلاوة", adhanDuck: "خفض الصوت", notify: "إشعار سطح المكتب", notifyDesc: "إشعار عند دخول وقت الصلاة", adhanSec: "الإذان والتنبيهات", quickCities: "مدن سريعة", sideFoot: "أُنس · رفيق التلاوة", focusMode: "قراءة نظيفة", mSearch: "انتقل إلى صفحة أو سورة…", mvUp: "تحريك لأعلى", mvDown: "تحريك لأسفل", locPrivacy: "يُستخدم تحديد الموقع لحساب مواقيت الصلاة عبر خدمات عامة دون تخزين بيانات خاصة.", quotaExceeded: "مساحة التخزين ممتلئة — تعذّر حفظ البيانات", notifyDenied: "تم حظر الإشعارات في متصفحك", onePage: "صفحة واحدة", twoPages: "صفحتان (كتاب)", zoomIn: "تكبير", zoomOut: "تصغير", zoomReset: "إعادة ضبط الحجم", layoutMode: "نمط العرض", mushafIndex: "فهرس المصحف", searchSurahOrJuz: "ابحث عن سورة أو جزء…", current: "الحالية", menu: "القائمة", addSurah: "إضافة سورة", addToQueue: "إضافة إلى قائمة التشغيل", selectReciter: "اختر القارئ", selectRewaya: "المصحف / الرواية", selectSurah: "اختر السورة", searchSurahPh: "ابحث عن سورة بالاسم أو الرقم…", clearQueue: "مسح القائمة القادمة", confirmClearQueue: "هل تريد تفريغ السور القادمة من القائمة؟", queueEmpty: "قائمة التشغيل فارغة", addedToQueue: "تمت الإضافة إلى القائمة", removedFromQueue: "تم الحذف من القائمة", queueCleared: "تم تفريغ القائمة القادمة", removeFromQueue: "حذف من القائمة", audioSet: "إعدادات الصوت", reset: "إعادة الضبط" },
  en: { library: "Library", home: "Home", reciters: "Reciters", favorites: "Favorites", recent: "Recently Played", downloads: "Downloads", developer: "Developer", verseLabel: "Verse & Reflect", tagline: "Your companion for Qur'an listening", nowPlaying: "Now Reciting", chooseReciter: "Choose a reciter to begin", upNext: "Up Next", favorite: "Favorite", download: "Download", settings: "Settings", theme: "Theme", themeDesc: "Beige light / OLED dark", light: "Light", dark: "Dark", language: "Language", audioSource: "Audio source", audioSourceDesc: "Highest quality chosen automatically, with fallback", shortcuts: "Keyboard shortcuts", kPlay: "Play / pause", kSeek: "Seek ±5 seconds", kNext: "Next / previous", kFav: "Favorite", kMute: "Mute", kSearch: "Search", done: "Done", cancel: "Cancel", confirm: "Confirm", chooseFolder: "Save folder", noDownloads: "No downloads yet", loading: "Loading library…", offline: "Could not reach the source — showing a compact online catalog", searchReciters: "Search reciters…", searchSurahs: "Search surahs…", searchFav: "Search favorites…", searchRecent: "Search recent…", greetM: "Good morning, with Qur'an", greetE: "Good evening, with Qur'an", heroSub: "Humble recitations in the highest quality, across multiple riwayat and reciters worldwide. Pick a reciter and let the Qur'an keep you company.", continueL: "Continue listening", browse: "Browse reciters", featured: "Featured reciters", quickSurahs: "Frequently recited surahs", allRiwayat: "All riwayat", riwayat: "Riwayat", sortName: "Name", sortCount: "Mushaf count", moshaf: "mushaf", surahs: "surahs", playAll: "Play all", downloadAll: "Download all", back: "Back to reciters", ayahs: "ayahs", meccan: "Meccan", medinan: "Medinan", noFav: "No favorites yet — tap ♥ on any surah", noRecent: "Nothing played yet", clearRecent: "Clear history", cleared: "History cleared", undo: "Undo", addedFav: "Added to favorites", removedFav: "Removed from favorites", qAuto: "Best quality", qHigh: "192+", qStd: "128", qSave: "Save data", sleep: "Sleep timer", sleepOff: "Off", min: "min", timerSet: "Playback will stop in", timerEnd: "Sleep timer ended — good night", confirmDlAll: "Download all surahs of this mushaf?", confirmDlAllMsg: "Total size may exceed 500 MB. Downloads run in the background.", saved: "Saved", failed: "Failed", downloading: "Downloading", pending: "Pending", cancelled: "Cancelled", dlDone: "Download complete", errorAudio: "Could not play this recitation — try another source", noResults: "No matching results", reciter: "reciters", tracks: "recitations", kbps: "kbps", provider: "Source", resume: "Resume", playing: "Now reciting", selectReciterFirst: "Choose a reciter first", favView: "Favorites", recentView: "Recently Played", favSub: "Your saved surahs for anytime recitation", recentSub: "What you listened to last", recitersSub: "Reciters worldwide, across multiple riwayat", surahCount: "surahs available", dlFolder: "Choose a folder to save recitations automatically", folderOk: "Saving to", quality: "Quality", speed: "Speed", volume: "Volume", playback: "Playback controls", mute: "Mute", expand: "Fullscreen", close: "Close", previous: "Previous", next: "Next", shuffle: "Shuffle", repeat: "Repeat", play: "Play", pause: "Pause", remove: "Remove", clear: "Clear", about: "Ouns — Qur'an Player", aboutSub: "Full recitations, multiple riwayat, highest quality", pin: "Pin panel", unpin: "Unpin", hidePanel: "Hide panel", showPanel: "Show panel", floatPanel: "Float panel", dockPanel: "Dock panel", mushaf: "Mushaf", quranName: "The Holy Qur'an", startReading: "Start reading", continueReading: "Continue reading", mushafSub: "Read the Qur'an — Hafs 'an 'Asim", page: "Page", juz: "Juz", rwHafs: "Hafs 'an 'Asim", rwWarsh: "Warsh 'an Nafi'", mushafRiwaya: "Mushaf riwayah", mushafRiwayaDesc: "Written mushaf — Hafs 'an 'Asim / Warsh 'an Nafi'", chooseRiwaya: "Choose mushaf riwayah", chooseRiwayaDesc: "You can change it later in Settings", dlPages: "Download all pages", prayerTimes: "Prayer times", prayerSub: "Prayer times for your location", nextPrayer: "Next prayer", fajr: "Fajr", sunrise: "Sunrise", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha", location: "Location", changeLoc: "Change location", searchLoc: "Search a city…", locNotFound: "Location not found", search: "Search", locAuto: "Detect location", locGps: "Via GPS", locNet: "Via network", locDetecting: "Detecting location…", locFail: "Could not detect your location", locApprox: "Approximate", locApproxT: "Detected via network and may be imprecise — use GPS or search your city", adhan: "Adhan", adhanDesc: "Play the adhan automatically at prayer time", adhanNow: "It is now time for", stopAdhan: "Stop adhan", adhanOn: "On", adhanOff: "Off", firstThird: "First third of the night", lastThird: "Last third of the night", prOffset: "Time adjustment", prOffsetDesc: "Shift prayer times earlier or later (minutes)", untilAdhan: "Adhan in", cc: "Captions", adhkar: "Adhkar", adhkarSub: "From Hisn al-Muslim", dhikr: "dhikr", allCats: "All categories", akDone: "Adhkar complete — may Allah accept", akProgress: "Done", ytView: "Best recitations", ytSub: "A curated selection of the finest video recitations", ytAll: "All recitations", prToday: "Today's prayers", prNight: "Sunrise & night quarters", adhanVoice: "Adhan voice", adhanVoiceDesc: "Choose the adhan recitation played at prayer time", preview: "Preview", adhanMode: "Adhan behavior", adhanModeDesc: "At prayer time: pause recitation or lower its volume during the adhan", adhanStop: "Pause recitation", adhanDuck: "Lower volume", notify: "Desktop notification", notifyDesc: "Notify when a prayer time enters", adhanSec: "Adhan & alerts", quickCities: "Quick cities", sideFoot: "Ouns · Recitation Companion", focusMode: "Clean reading", mSearch: "Go to page or surah…", mvUp: "Move up", mvDown: "Move down", locPrivacy: "Location is used solely to compute prayer times via public services without storing private data.", quotaExceeded: "Storage quota exceeded — could not save data", notifyDenied: "Notifications blocked by browser", onePage: "Single page", twoPages: "Two pages (book)", zoomIn: "Zoom in", zoomOut: "Zoom out", zoomReset: "Reset zoom", layoutMode: "Display mode", mushafIndex: "Mushaf Index", searchSurahOrJuz: "Search surah or juz…", current: "Current", menu: "Menu", addSurah: "Add Surah", addToQueue: "Add to Queue", selectReciter: "Select Reciter", selectRewaya: "Moshaf / Riwayah", selectSurah: "Select Surah", searchSurahPh: "Search surah by name or number…", clearQueue: "Clear Upcoming", confirmClearQueue: "Do you want to clear upcoming surahs from the queue?", queueEmpty: "Queue is empty", addedToQueue: "Added to queue", removedFromQueue: "Removed from queue", queueCleared: "Queue cleared", removeFromQueue: "Remove from queue", audioSet: "Audio settings", reset: "Reset" }
};
const t = k => I18N[S.lang][k] ?? k;

/* ── State ── */
const S = {
  lang: store.get('lang', 'ar'), theme: store.get('theme', 'light'),
  quality: store.get('quality', 'auto'), speed: store.get('speed', 1),
  view: 'home', query: '', rewaya: '__all', sort: 'name',
  reciters: [], riwayat: [], editionsReady: false,
  reciter: null, moshaf: null, reciterTracks: [], tracks: [], idx: -1,
  shuffle: store.get('shuffle', false), repeat: store.get('repeat', 0),
  favorites: store.get('favorites', []), recent: store.get('recent', []),
  current: null, srcIdx: 0, dirHandle: null, sleepMin: 0, sleepTimer: null, sleepTick: null,
  verseIdx: 0, offline: false, npMode: (() => { const v = store.get('npMode', 'hidden'); return v === 'pinned' || v === 'float' ? v : 'hidden' })(), npPos: store.get('npPos', null), sideMode: store.get('sideMode', 'open'),
  readN: null, mushafPage: store.get('mushafPage', 0), mushafRiwaya: store.get('mushafRiwaya', 'hafs'), mushafAsk: true, mushafLayout: store.get('mushafLayout', 'book'), mushafZoom: store.get('mushafZoom', 1), mushafIndexOpen: false, mushafIndexTab: 'surah', mushafIndexQuery: '',
  prayerLoc: store.get('prayerLoc', { name: 'وادي العثمانية، ميلة', lat: 36.2662, lng: 6.3118 }), prayerData: null, prayerTimer: null,
  prayerOffset: (() => {
    const v = store.get('prayerOffset', 0); const base = { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 };
    if (typeof v === 'number') { for (const k in base) base[k] = v; return base }
    return Object.assign(base, v)
  })(),
  adhanOn: store.get('adhanOn', true), adhanAudio: null, adhanLast: store.get('adhanLast', ''), adhanVoice: store.get('adhanVoice', 'abdulbasit'),
  adhanMode: store.get('adhanMode', 'stop'), notifyOn: store.get('notifyOn', false), adhanDuckV: null,
  adhkarCat: null, ytId: null, weather: null
};
let audio = $('#audio');
const IS_ANDROID = /Android/i.test(navigator.userAgent);
audio.volume = store.get('volume', 1);

/* CORS-safe audio: only route through Web Audio (which requires CORS) for
   hosts verified to send Access-Control-Allow-Origin; never let the analyser
   break playback — non-CORS sources play unrouted with synthetic waves. */
function setAudioSrc(url) {
  audio.preload = 'metadata';
  if (corsAudio(url)) { audio.crossOrigin = 'anonymous' }
  else if (acx) { audio = swapAudioEl() }
  else { audio.removeAttribute('crossorigin') }
  audio.src = url;
}
function swapAudioEl() {
  try { audio.pause(); audio.removeAttribute('src'); audio.load() } catch (e) { }
  const el = document.createElement('audio');
  el.id = 'audio'; el.preload = 'metadata'; el.setAttribute('playsinline', ''); el.setAttribute('webkit-playsinline', '');
  el.volume = audio.volume; el.muted = audio.muted; el.playbackRate = audio.playbackRate;
  audio.replaceWith(el);
  try { if (acx) acx.close() } catch (e) { }
  acx = null; analyser = null; freqData = null;
  bindAudio(el);
  return el;
}
let stallTimer = 0, stallSnap = 0, errToastedKey = '';
function clearStallWatch() { if (stallTimer) { clearTimeout(stallTimer); stallTimer = 0 } stallSnap = 0 }
const curBufEnd = el => { try { const b = el.buffered; return b.length ? b.end(b.length - 1) : -1 } catch (e) { return -1 } };
function armStallWatch(el) {
  if (stallTimer) return;
  stallSnap = curBufEnd(el);
  stallTimer = setTimeout(() => {
    stallTimer = 0;
    if (el.paused || el.ended || el.readyState >= 3) return;
    if (document.hidden) { armStallWatch(el); return }
    if (curBufEnd(el) > stallSnap) { armStallWatch(el); return }
    const at = el.currentTime;
    try { el.load() } catch (e) { }
    el.addEventListener('loadedmetadata', () => { el.currentTime = at; el.play().catch(() => { }) }, { once: true });
  }, 12000);
}
let prewarmTimer = 0;
function prewarmTrack() {
  prewarmTimer = 0;
  if (!audio || !S.current || !audio.paused || !audio.currentSrc) return;
  if (document.visibilityState !== 'visible') return;
  const c = navigator.connection || {};
  if (c.saveData || c.effectiveType === 'slow-2g' || c.effectiveType === '2g') return;
  if (corsAudio(audio.currentSrc) && navigator.serviceWorker.controller) {
    try { navigator.serviceWorker.controller.postMessage({ type: 'cache-audio', url: audio.currentSrc }) } catch (_) { }
  }
}
function schedulePrewarm() { if (!prewarmTimer) prewarmTimer = setTimeout(prewarmTrack, 1500) }
function bindAudio(el) {
  el.addEventListener('play', () => { setPlayingUI(true); if (prewarmTimer) { clearTimeout(prewarmTimer); prewarmTimer = 0 } if (corsAudio(el.currentSrc || el.src)) ensureAnalyser(); if (acx && acx.state === 'suspended') acx.resume() });
  el.addEventListener('pause', () => { setPlayingUI(false); clearStallWatch(); saveSession(); schedulePrewarm() });
  el.addEventListener('playing', () => { clearStallWatch(); const cur = currentSources()[S.srcIdx]; if (cur) store.set('lastProvider', cur.provider) });
  let lastSessionSave = 0;
  el.addEventListener('timeupdate', () => { scheduleProgress(); const now = Date.now(); if (now - lastSessionSave > 25000) { lastSessionSave = now; saveSession() } });
  el.addEventListener('progress', updateBuffer);
  el.addEventListener('loadedmetadata', () => { clearStallWatch(); lastProgressPaint = 0; updateProgress() });
  el.addEventListener('waiting', () => armStallWatch(el));
  el.addEventListener('stalled', () => armStallWatch(el));
  el.addEventListener('ended', () => { if (S.repeat === 2) { el.currentTime = 0; el.play().catch(() => { }) } else nextTrack() });
  el.addEventListener('error', () => {
    if (!S.current || !el.src) return;
    if (S.srcIdx < currentSources().length) { tryNextSource(); return }
    if (errToastedKey !== S.current.key) { errToastedKey = S.current.key; toast(t('errorAudio')) }
  });
}

/* ═══════════════ GENERATIVE ISLAMIC ART ═══════════════ */
const PAL = [["#2F5D3A", "#A8CBA0", "#F4F1E8", "#C9A24B"], ["#1F4030", "#D9C9A3", "#F7F3E8", "#C9A24B"], ["#3E6B48", "#8FBC8F", "#FBF9F3", "#B99745"], ["#274C3B", "#9DCB9D", "#EAF2E6", "#D4B36A"], ["#41563A", "#CBB98A", "#F4F1E8", "#B99745"], ["#2C3E30", "#B7C9A8", "#F7F9F7", "#C2A14D"]];
const pal = seed => PAL[hash(seed) % PAL.length];
const svgURI = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
function avatarURI(seed, letter) {
  const [bg, pt, ink, gd] = pal(seed); let sq = '', dots = '';
  for (let i = 0; i < 4; i++)sq += `<rect x="40" y="40" width="120" height="120" fill="none" stroke="${pt}" stroke-width="1.4" opacity=".45" transform="rotate(${i * 22.5} 100 100)"/>`;
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; dots += `<circle cx="${(100 + 87 * Math.cos(a)).toFixed(1)}" cy="${(100 + 87 * Math.sin(a)).toFixed(1)}" r="3" fill="${pt}" opacity=".85"/>` }
  return svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="${bg}"/>${sq}${dots}<rect x="57" y="57" width="86" height="86" fill="none" stroke="${gd}" stroke-width="1.6" transform="rotate(45 100 100)"/><circle cx="100" cy="100" r="46" fill="${pt}"/><text x="100" y="117" text-anchor="middle" font-size="50" font-family="Amiri,serif" font-weight="700" fill="${bg}">${esc(letter)}</text></svg>`);
}
let ART_TPL = null, phSeq = 0;
function mandalaArt() {
  if (ART_TPL == null) { const el = document.getElementById('mandalaArt'); ART_TPL = el ? el.textContent.trim().replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '') : '' }
  return ART_TPL;
}
function mandalaSVG(seed) {
  const C = (2 * Math.PI * 45.6).toFixed(2), cid = 'phc' + (hash(seed) >>> 0).toString(36) + (phSeq++);
  const inner = `<defs><filter id="${cid}sh" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.6"/></filter></defs>`
    + `<g class="spin-a">${mandalaArt()}</g>`
    + `<circle cx="48" cy="48" r="45.6" fill="none" stroke="#ba9743" stroke-opacity="0.22" stroke-width="1.5"/>`
    + `<circle class="pr-fill" cx="48" cy="48" r="45.6" fill="none" stroke="#ba9743" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" transform="rotate(-90 48 48)"/>`
    + `<circle cx="48" cy="48" r="23" fill="#15251a" opacity="0.5" filter="url(#${cid}sh)"/>`;
  return `<svg viewBox="0 0 96 96" class="mandala-svg" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}
function mandalaHTML(seed, numTxt, subTxt, photo, phLetter, placeholderImg) {
  let center;
  if (photo || placeholderImg) {
    center = `<img class="m-ava" src="${avatarURI(seed, phLetter || 'ق')}" alt="" aria-hidden="true">`
      + (placeholderImg ? `<img class="m-pic" src="${placeholderImg}" alt="" loading="lazy" data-err-remove="1">` : '')
      + (photo ? `<img class="m-pic" src="${photo}" alt="" loading="lazy" data-err-remove="1">` : '');
  } else {
    center = `<span class="m-txt"><span class="m-num">${esc(numTxt)}</span><span class="m-sub">${esc(subTxt)}</span></span>`;
  }
  return mandalaSVG(seed) + `<div class="m-center">${center}</div>`;
}
const reciterLetter = r => { const n = (S.lang === 'ar' ? r.name : r.name_en || r.name).trim(); return n[0] || 'ق' };
const reciterName = r => S.lang === 'ar' ? r.name : (r.name_en || r.name);
const moshafRewaya = m => m.rewaya || (m.name || '').split('-')[0].replace(/\s+/g, ' ').trim();
const RECITER_PHOTOS = { 'منشاوي': 'minshawi', 'عبدالباسط': 'abdulbasit', 'التركي': 'badr-turki', 'شريم': 'shuraim', 'ديبروف': 'dibirov', 'دوسري': 'dosari', 'معيقلي': 'muaiqly', 'الموسى': 'al-mousa', 'سحيم': 'suhaim', 'الدخين': 'dukayn', 'السديس': 'sudais', 'العفاسي': 'afasy', 'الحصري': 'husary', 'العجمي': 'ajmi', 'عباد': 'faris-abbad' };
const RECITER_PHOTOS_EXACT = { 'سعودالشريم': 'shuraim', 'ياسرالدوسري': 'dosari', 'محمدصديقالمنشاوي': 'minshawi', 'عبدالباسطعبدالصمد': 'abdulbasit', 'بدرالتركي': 'badr-turki', 'ماهرالمعيقلي': 'muaiqly', 'عبداللهالموسى': 'al-mousa', 'عبدالعزيزسحيم': 'suhaim', 'عبدالعزيزالسحيم': 'suhaim', 'هيثمالدخين': 'dukayn', 'محمدديبروف': 'dibirov', 'عبدالرحمنالسديس': 'sudais', 'مشاريراشدالعفاسي': 'afasy', 'محمودخليلالحصري': 'husary', 'أحمدالعجمي': 'ajmi', 'سعدالغامدي': 'saad-ghamdi', 'فارسعباد': 'faris-abbad', 'مصطفىاسماعيل': 'mustafa', 'مصطفياسماعيل': 'mustafa' };
const KNOWN_RECITER_IDS = new Set([14, 46, 76, 86, 94, 95, 221, 231, 253, 259, 264, 265, 278, 21200]);
function photoURL(name, id) {
  const n = norm2(name);
  const ex = RECITER_PHOTOS_EXACT[n];
  if (ex) return 'img/' + ex + '.jpg';
  if (n.includes(norm2('الشريمي')) || n.includes(norm2('الدوسري')) || n.includes(norm2('التركي')) || (n.includes(norm2('منشاوي')) && n.includes(norm2('طه')))) {
    return (id && KNOWN_RECITER_IDS.has(+id)) ? 'img/' + id + '.jpg' : '';
  }
  for (const k in RECITER_PHOTOS) {
    if (n.includes(norm2(k))) return 'img/' + RECITER_PHOTOS[k] + '.jpg';
  }
  return (id && KNOWN_RECITER_IDS.has(+id)) ? 'img/' + id + '.jpg' : '';
}
const reciterImg = (r, cls = '') => { const p = photoURL(r.name, r.id); const ava = avatarURI(r.name, reciterLetter(r)); return p ? `<img class="${cls}" src="${p}" alt="${esc(reciterName(r))}" loading="lazy" data-err-fallback="${ava}">` : `<img class="${cls}" src="${ava}" alt="${esc(reciterName(r))}" loading="lazy">` };

/* ═══════════════ DATA ═══════════════ */
async function api(path, params = {}) { const u = new URL(API + path); Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v)); return apiFetch(u.toString(), { timeout: 12000, retries: 1, ttl: 300000 }) }
function makeTrack(r, m, n) {
  const meta = SURAH[n - 1];
  return {
    key: `${r.id}:${m.id}:${n}`, n, name_ar: meta[0], name_en: meta[1], ayahs: meta[2], type: meta[3],
    rid: r.id, mid: m.id, rar: r.name, ren: r.name_en || r.name, rewaya: moshafRewaya(m), mname: m.name || moshafRewaya(m),
    server: m.server, sources: buildSources(r.name, r.name_en || r.name, m, n, EDITIONS), duration: 0
  };
}
const trackName = tr => S.lang === 'ar' ? tr.name_ar : tr.name_en;
const trackReciter = tr => S.lang === 'ar' ? tr.rar : tr.ren;
function rebuildTrack(f) { const r = { id: f.rid, name: f.rar, name_en: f.ren }, m = { id: f.mid, server: f.server, rewaya: f.rewaya, name: f.mname }; return makeTrack(r, m, f.n) }

async function loadData() {
  try {
    const [ar, en] = await Promise.all([api('/reciters', { language: 'ar' }), api('/reciters', { language: 'eng' })]);
    const enMap = new Map((en.reciters || []).map(r => [r.id, r.name]));
    S.reciters = (ar.reciters || []).filter(r => r.moshaf && r.moshaf.length).map(r => ({ ...r, name_en: enMap.get(r.id) || r.name }));
    if (!S.reciters.length) throw new Error('empty');
  } catch (e) { S.reciters = FALLBACK; S.offline = true; toast(t('offline')) }
  try { const j = await apiFetch('https://api.alquran.cloud/v1/edition/format/audio', { timeout: 12000, retries: 1, ttl: 21600000 }); EDITIONS = (j.data || []).filter(e => e.format === 'audio' && e.language === 'ar').map(e => ({ ...e, bitrate: e.bitrate || 128 })) } catch (e) { EDITIONS = [] }
  buildRiwayat();
  $('#cntReciters').textContent = S.reciters.length;
}
function buildRiwayat() {
  const map = new Map();
  S.reciters.forEach(r => r.moshaf.forEach(m => { const rw = moshafRewaya(m); const k = norm(rw); if (!k) return; if (!map.has(k)) map.set(k, { key: k, name: rw, count: 0 }); map.get(k).count++ }));
  const rank = k => /حفص|hafs/.test(k) ? 0 : /ورش|warsh/.test(k) ? 1 : /قالون|qaloon|qalun/.test(k) ? 2 : /الدوري|duri/.test(k) ? 3 : 9;
  S.riwayat = [...map.values()].sort((a, b) => rank(a.key) - rank(b.key) || b.count - a.count);
}
function filteredReciters() {
  const q = norm2(S.query);
  let list = S.reciters.filter(r => {
    const okR = S.rewaya === '__all' || r.moshaf.some(m => norm(moshafRewaya(m)) === S.rewaya);
    const okQ = !q || norm2(r.name + ' ' + r.name_en).includes(q);
    return okR && okQ
  });
  if (S.sort === 'count') list.sort((a, b) => b.moshaf.length - a.moshaf.length);
  else list.sort((a, b) => reciterName(a).localeCompare(reciterName(b), S.lang === 'ar' ? 'ar' : 'en'));
  return list;
}

/* ═══════════════ VIEWS ═══════════════ */
function setView(v) { S.view = v; S.query = ''; $('#searchInput').value = ''; if (v === 'mushaf') { S.readN = null; S.mushafAsk = true; S.mushafIndexOpen = false } if (v !== 'adhkar') S.adhkarCat = null; else if (S.adhkarCat == null) S.adhkarCat = akAutoCat(); if (v !== 'yt') { S.ytId = null; destroyYt() } document.body.classList.toggle('mushaf-full', v === 'mushaf'); $$('.nav-item[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === v)); closeSidebar(); render() }
function render() {
  destroyFlip();
  applyI18nStatic();
  const ph = { home: 'searchReciters', reciters: 'searchReciters', surahs: 'searchSurahs', favorites: 'searchFav', recent: 'searchRecent', mushaf: 'searchSurahs' }[S.view] || 'searchReciters';
  $('#searchInput').placeholder = t(ph);
  const v = $('#view');
  if (S.view === 'home') v.innerHTML = viewHome();
  else if (S.view === 'reciters') v.innerHTML = viewReciters();
  else if (S.view === 'surahs') v.innerHTML = viewSurahs();
  else if (S.view === 'favorites') v.innerHTML = viewCollection(S.favorites, 'favView', 'favSub', true);
  else if (S.view === 'recent') v.innerHTML = viewCollection(S.recent, 'recentView', 'recentSub', false);
  else if (S.view === 'mushaf') { v.innerHTML = S.readN ? viewRead() : viewMushaf(); if (S.readN) mountFlip() }
  else if (S.view === 'prayer') v.innerHTML = viewPrayer();
  else if (S.view === 'adhkar') v.innerHTML = viewAdhkar();
  else if (S.view === 'yt') v.innerHTML = viewYt();
  $('#main').scrollTop = 0;
  updateCounts();
  if (S.view === 'yt' && S.ytId) { const cur = YT_LIST.find(x => x.id === S.ytId); if (cur) mountYtPlayer(cur) }
}
const orn = `<div class="ornament"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="7" y="7" width="10" height="10"/><rect x="7" y="7" width="10" height="10" transform="rotate(45 12 12)"/></svg></div>`;
/* ─── WEATHER (Open-Meteo & Makin-Things icons) ─── */
function weatherIconSVG(type) {
  const hr = new Date().getHours();
  const night = hr < 6 || hr >= 19;
  switch (type) {
    case 'clear':
      return night
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="w-svg"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="w-svg"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;
    case 'partly-cloudy':
      return night
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="w-svg"><path d="M12 3a6 6 0 0 0 6 6c.3 0 .6 0 .9-.07A7.5 7.5 0 0 1 18 17H7a5 5 0 0 1-.5-9.97A7.5 7.5 0 0 1 12 3z"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="w-svg"><path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M19.07 4.93l-1.41 1.41"/><path d="M15.5 8.5a4 4 0 0 0-5.8 1.4A4.5 4.5 0 0 0 6 14.5a4.5 4.5 0 0 0 4.5 4.5h9a3.5 3.5 0 0 0 .5-6.96 4 4 0 0 0-4.5-3.54z"/></svg>`;
    case 'cloudy':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="w-svg"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/></svg>`;
    case 'fog':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="w-svg"><path d="M5 14h14M3 18h18M8 10h8M17 10a4 4 0 0 0-7.8-1.2A3.5 3.5 0 0 0 6 12"/></svg>`;
    case 'drizzle':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="w-svg"><path d="M19 14a4 4 0 0 0-4-4h-.7A6 6 0 1 0 5 14"/><path d="M8 17v2M12 17v2M16 17v2"/></svg>`;
    case 'rain':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="w-svg"><path d="M19 13a4 4 0 0 0-4-4h-.7A6 6 0 1 0 5 13"/><path d="M8 16l-1.5 4M12 16l-1.5 4M16 16l-1.5 4"/></svg>`;
    case 'snow':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="w-svg"><path d="M19 13a4 4 0 0 0-4-4h-.7A6 6 0 1 0 5 13"/><path d="M8 17h.01M8 20h.01M12 17h.01M12 20h.01M16 17h.01M16 20h.01"/></svg>`;
    case 'thunderstorm':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="w-svg"><path d="M19 12a4 4 0 0 0-4-4h-.7A6 6 0 1 0 5 12"/><path d="M13 14l-3 5h4l-2 5"/></svg>`;
    default:
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="w-svg"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;
  }
}
const WEATHER = [
  [0, 'مشمس', 'Clear', 'clear'],
  [1, 'صافٍ غالبًا', 'Mostly clear', 'partly-cloudy'],
  [2, 'غائم جزئيًا', 'Partly cloudy', 'partly-cloudy'],
  [3, 'غائم', 'Cloudy', 'cloudy'],
  [45, 'ضباب', 'Fog', 'fog'],
  [48, 'ضباب صقيعي', 'Fog', 'fog'],
  [51, 'رذاذ خفيف', 'Light drizzle', 'drizzle'],
  [53, 'رذاذ', 'Drizzle', 'drizzle'],
  [55, 'رذاذ كثيف', 'Drizzle', 'drizzle'],
  [61, 'مطر خفيف', 'Light rain', 'rain'],
  [63, 'مطر', 'Rain', 'rain'],
  [65, 'مطر غزير', 'Heavy rain', 'rain'],
  [71, 'ثلج خفيف', 'Light snow', 'snow'],
  [73, 'ثلج', 'Snow', 'snow'],
  [75, 'ثلج كثيف', 'Heavy snow', 'snow'],
  [77, 'حبيبات ثلج', 'Snow grains', 'snow'],
  [80, 'زخات مطر', 'Rain showers', 'rain'],
  [81, 'زخات مطر', 'Rain showers', 'rain'],
  [82, 'زخات عنيفة', 'Heavy showers', 'rain'],
  [85, 'زخات ثلجية', 'Snow showers', 'snow'],
  [86, 'زخات ثلجية', 'Snow showers', 'snow'],
  [95, 'عاصفة رعدية', 'Thunderstorm', 'thunderstorm'],
  [96, 'عاصفة مع برد', 'Storm with hail', 'thunderstorm'],
  [99, 'عاصفة مع برد', 'Storm with hail', 'thunderstorm']
];
const weatherInfo = c => WEATHER.find(w => w[0] === c) || WEATHER[2];
function paintWeather() {
  const el = $('#hpWeather'); if (!el || !S.weather) return;
  const w = weatherInfo(S.weather.c);
  el.innerHTML = `<span class="hw-ic" aria-hidden="true">${weatherIconSVG(w[3])}</span><span class="hw-t" dir="ltr">${S.weather.t}°</span><span class="hw-d">${S.lang === 'ar' ? w[1] : w[2]}</span>`;
}
async function loadWeather() {
  const L = S.prayerLoc;
  if (S.weather && S.weather.lat === L.lat && Date.now() - S.weather.at < 1800000) { paintWeather(); return }
  try {
    const j = await apiFetch(`https://api.open-meteo.com/v1/forecast?latitude=${L.lat}&longitude=${L.lng}&current=temperature_2m,weather_code`, { timeout: 8000, retries: 1 });
    if (!j.current) throw new Error('no current');
    S.weather = { at: Date.now(), lat: L.lat, t: Math.round(j.current.temperature_2m), c: j.current.weather_code };
    paintWeather();
  } catch (e) { }
}

function viewHome() {
  const h = new Date().getHours(); const greet = h < 12 ? t('greetM') : t('greetE');
  const last = S.recent[0];
  const featKeys = [['صديق المنشاوي', 'المنشاوي'], ['عبد الباسط', 'عبدالباسط'], ['بدر التركي', 'التركي'], ['سعود الشريم', 'الشريم'], ['محمد ديبيروف', 'ديبيروف', 'ديبروف'], ['ياسر الدوسري', 'الدوسري'], ['ماهر المعيقلي', 'المعيقلي'], ['عبد الله الموسى', 'الموسى'], ['عبدالعزيز السحيم', 'عبدالعزيز سحيم', 'السحيم', 'سحيم'], ['هيثم الدخين', 'الدخين'], ['إسلام صبحي', 'صبحي'], ['أحمد بن علي العجمي', 'العجمي'], ['رعد محمد الكردي', 'رعد الكردي'], ['ناصر القطامي', 'القطامي'], ['صلاح بو خاطر', 'بو خاطر'], ['هزاع البلوشي', 'البلوشي']];
  let feat = featKeys.map(ks => ks.map(k => S.reciters.find(r => norm2(r.name).includes(norm2(k)))).find(Boolean)).filter(Boolean);
  if (feat.length < 6) feat = [...feat, ...S.reciters.filter(r => !feat.includes(r))].slice(0, 16);
  const quick = [1, 2, 18, 36, 55, 56, 67, 76, 112, 113, 114];
  const num = n => S.lang === 'ar' ? arDigits(n) : n;
  const npKey = nextPrayerKey();
  const hpCard = npKey && S.prayerData ? `
      <div class="hp-weather" id="hpWeather"><span class="hw-d">${t('loading')}</span></div>
      <div class="hp-top"><svg class="ic" viewBox="0 0 24 24"><path d="M12 3c2 2 4 3.6 4 6H8c0-2.4 2-4 4-6z"/><path d="M5 21v-8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v8"/><path d="M3 21h18"/><path d="M10 21v-4h4v4"/></svg><span>${t('nextPrayer')}</span></div>
      <div class="hp-name">${S.lang === 'ar' ? 'صلاة ' : ''}${t(npKey.toLowerCase())}<span class="hp-time" dir="ltr">${prayerTime(npKey)}</span></div>
      <div class="hp-count"><span>${t('untilAdhan')}</span><b class="pr-count" dir="ltr">${prayerCountdownStr()}</b></div>
      <div class="hp-loc">${esc(S.prayerLoc.name)}</div>` : `
      <div class="hp-top"><svg class="ic" viewBox="0 0 24 24"><path d="M12 3c2 2 4 3.6 4 6H8c0-2.4 2-4 4-6z"/><path d="M5 21v-8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v8"/><path d="M3 21h18"/><path d="M10 21v-4h4v4"/></svg><span>${t('prayerTimes')}</span></div>
      <div class="hp-name">${t('prayerTimes')}</div>
      <div class="hp-weather" id="hpWeather"><span class="hw-d">${t('loading')}</span></div>
      <div class="hp-loc">${esc(S.prayerLoc.name)}</div>`;
  setTimeout(loadWeather, 0);
  return `<section class="hero">
    <div class="hero-bg" style="background-image:url('${mosqueUrl}')"></div>
    <div class="hero-main">
      <span class="eyebrow">${t('tagline')}</span><h1>${greet}</h1><p>${t('heroSub')}</p>
      <div class="hero-cta">
        ${last ? `<button class="btn primary" data-act="resume"><svg class="ic fill" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg><span class="btn-col"><span>${t('continueL')}</span><b>${esc(S.lang === 'ar' ? last.rar : (last.ren || last.rar))} — ${esc(surahName(last.n, S.lang))}</b></span></button>` : ''}
        <button class="btn" data-act="browse"><svg class="ic" viewBox="0 0 24 24"><path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>${t('browse')}</button>
      </div>
    </div>
    <div class="hero-side"><button class="hp-card" data-act="goprayer">${hpCard}</button></div>
  </section>
  ${S.recent.length ? `
  <div class="view-head"><div><h2>${t('recentView')}</h2></div><button class="icon-btn" data-act="openrecent" aria-label="${t('recentView')}"><svg class="ic" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button></div>
  <div class="recent-row">${S.recent.slice(0, 10).map((f, i) => `<button class="recent-card" data-coll="${i}">
    <img src="${avatarURI(f.rar, reciterLetter({ name: f.rar, name_en: f.ren }))}" alt="" loading="lazy">
    <span class="rc-txt"><span class="rt${S.lang === 'ar' ? ' sn-font' : ''}">${S.lang === 'ar' ? surahNameGlyph(f.n) : esc(surahName(f.n, S.lang))}</span><span class="rs">${esc(S.lang === 'ar' ? f.rar : (f.ren || f.rar))} · ${esc(f.rewaya || f.mname || '')}</span></span>
    <span class="rplay"><svg class="ic fill" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg></span></button>`).join('')}</div>
  ${orn}` : ''}
  <div class="view-head"><div><h2>${t('quickSurahs')}</h2></div></div>
  <div class="quick-grid">${quick.map(n => {
    const m = SURAH[n - 1]; return `
    
    <button class="quick-surah" data-surah="${n}" title="${esc(surahName(n, S.lang))}"><span class="qsurah sn-font" aria-hidden="true">
  
  <span class="qn">${num(n)}</span>
    <span class="qt sn-font" aria-label="${esc(surahName(n, S.lang))}">${surahNameGlyph(n)}</span>
    
  
</span>
 <span class="qplay"><svg class="ic fill" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg></span>

   <span class="qs">${m[2]} ${t('ayahs')} · ${m[3] ? t('medinan') : t('meccan')}</span>
 </button>` }).join('')}</div>
  ${orn}
  <div class="view-head"><div><h2>${t('featured')}</h2><div class="sub">${t('recitersSub')}</div></div><button class="btn sm" data-act="browse">${t('browse')}</button></div>
  <div class="reciter-grid">${feat.slice(0, 16).map(reciterCard).join('')}</div>`;
}
function reciterCard(r) {
  const ms = S.rewaya === '__all' ? r.moshaf : r.moshaf.filter(m => norm(moshafRewaya(m)) === S.rewaya);
  const rw = [...new Set(ms.map(m => moshafRewaya(m)).filter(Boolean))].slice(0, 2);
  return `<button class="reciter-card ${S.reciter && S.reciter.id === r.id ? 'active' : ''}" data-rid="${esc(r.id)}">
    <div class="ava">${reciterImg(r)}
    <span class="play-ov"><span><svg class="ic" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg></span></span></div>
    <div class="rn">${esc(reciterName(r))}</div>
    <div class="rm">${rw.map(x => `<span class="tag">${esc(x)}</span>`).join('')}<span class="tag gold">${r.moshaf.length} ${t('moshaf')}</span></div></button>`;
}
function viewReciters() {
  const list = filteredReciters();
  const chips = [{ key: '__all', name: t('allRiwayat'), count: S.reciters.length }, ...S.riwayat];
  return `<div class="view-head"><div><h2>${t('reciters')}</h2><div class="sub">${list.length} ${t('reciter')} · ${t('recitersSub')}</div></div>
    <select id="rwSel" class="btn sm" style="border-radius:30px;max-width:240px" aria-label="${t('riwayat')}">${chips.map(c => `<option value="${esc(c.key)}"${S.rewaya === c.key ? ' selected' : ''}>${esc(c.name)} (${c.count})</option>`).join('')}</select>
    <select id="sortSel" class="btn sm" style="border-radius:30px"><option value="name" ${S.sort === 'name' ? 'selected' : ''}>${t('sortName')}</option><option value="count" ${S.sort === 'count' ? 'selected' : ''}>${t('sortCount')}</option></select></div>
  ${list.length ? `<div class="reciter-grid">${list.map(reciterCard).join('')}</div>` : `<div class="empty"><p>${t('noResults')}</p></div>`}`;
}
function viewSurahs() {
  if (!S.reciter || !S.moshaf) return viewReciters();
  const r = S.reciter, m = S.moshaf;
  const all = S.reciterTracks && S.reciterTracks.length ? S.reciterTracks : S.tracks;
  const q = norm2(S.query);
  const list = all.filter(tr => !q || norm2(tr.name_ar + ' ' + tr.name_en + ' ' + tr.n).includes(q));
  const ms = r.moshaf;
  return `<button class="back-btn" data-act="back"><svg class="ic" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>${t('back')}</button>
  <section class="reciter-hero">${reciterImg(r)}
    <div class="rh-info"><h2>${esc(reciterName(r))}</h2>
      <div class="rh-meta"><span class="tag gold">${esc(moshafRewaya(m))}</span><span class="tag">${esc(m.name || moshafRewaya(m))}</span><span class="tag">${all.length} ${t('surahCount')}</span></div>
      <div class="rh-actions">
        <button class="btn primary sm" data-act="playall"><svg class="ic fill" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>${t('playAll')}</button>
        <button class="btn sm" data-act="dlall"><svg class="ic" viewBox="0 0 24 24"><path d="M12 3v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4 19h16"/></svg>${t('downloadAll')}</button>
        ${ms.length > 1 ? `<select id="moshafSel">${ms.map((x, i) => `<option value="${i}" ${x.id === m.id ? 'selected' : ''}>${esc(x.name || moshafRewaya(x))} — ${esc(moshafRewaya(x))}</option>`).join('')}</select>` : ''}
      </div></div></section>
  <div class="surah-list">${list.length ? list.map(tr => surahRow(tr, all.indexOf(tr))).join('') : `<div class="empty"><p>${t('noResults')}</p></div>`}</div>`;
}
function surahRow(tr, i) {
  const isPlaying = S.current && S.current.key === tr.key;
  const isFaved = S.favorites.some(f => f.key === tr.key);
  const trackNum = S.lang === 'ar' ? arDigits(tr.n) : tr.n;
  const trackName = S.lang === 'ar' ? tr.name_ar : tr.name_en;

  const numberContent = isPlaying
    ? '<span class="eq"><i></i><i></i><i></i></span>'
    : `<b>${trackNum}</b>`;

  const nameContent = S.lang === 'ar'
    ? `<span class="sa sn-font" aria-label="${esc(trackName)}"><span class="sg-w"></span><span class="sg-n">${surahNameGlyph(tr.n)}</span></span>`
    : `<span class="sa en-name">${esc(trackName)}</span>`;

  return `
    <div class="surah-row ${isPlaying ? 'playing' : ''}" 
         data-idx="${i}" 
         data-n="${tr.n}" 
         data-key="${esc(tr.key)}" 
         title="${esc(trackName)}">
         
      <!-- السطر الأول: رقم السورة + اسم السورة -->
      <div class="surah-main-line">
        <span class="sn">${numberContent}</span>
        <span class="si">${nameContent}</span>
      </div>
      
      <!-- السطر الثاني: التفاصيل + المدة + الأزرار -->
      <div class="surah-sub-line">
  
        <span class="sfoot">
              <span class="se">${tr.ayahs} ${t('ayahs')} · ${tr.type ? t('medinan') : t('meccan')}</span>
          <span class="dur">${tr.duration ? fmt(tr.duration) : '—'}</span>
          <span class="acts">
            <button class="mini-btn qadd-btn" data-qadd="${esc(tr.key)}" title="${t('addToQueue')}" aria-label="${t('addToQueue')}">
              <svg class="ic" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            </button>
            <button class="mini-btn ${isFaved ? 'faved' : ''}" data-fav="${esc(tr.key)}" aria-label="favorite">
              <svg class="ic" viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.3-9A5.2 5.2 0 0 1 12 6.6a5.2 5.2 0 0 1 9.3 4.9c-1.8 4.4-9.3 9-9.3 9z"/></svg>
            </button>
            <button class="mini-btn" data-dl="${esc(tr.key)}" aria-label="download">
              <svg class="ic" viewBox="0 0 24 24"><path d="M12 3v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4 19h16"/></svg>
            </button>
          </span>
        </span>
      </div>
      
    </div>
  `;
}
function viewCollection(items, title, sub, isFav) {
  const q = norm2(S.query);
  const list = items.filter(f => !q || norm2(f.rar + ' ' + f.ren + ' ' + surahName(f.n, 'ar') + ' ' + surahName(f.n, 'en')).includes(q));
  return `<div class="view-head"><div><h2>${t(title)}</h2><div class="sub">${t(sub)}</div></div>
    ${!isFav && items.length ? `<button class="btn sm" data-act="clearrecent">${t('clearRecent')}</button>` : ''}</div>
  ${list.length ? `<div class="surah-list">${list.map((f, i) => { const tr = rebuildTrack(f); return collectionRow(f, tr, i, isFav) }).join('')}</div>` : `<div class="empty"><svg class="ic" viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.3-9A5.2 5.2 0 0 1 12 6.6a5.2 5.2 0 0 1 9.3 4.9c-1.8 4.4-9.3 9-9.3 9z"/></svg><p>${isFav ? t('noFav') : t('noRecent')}</p></div>`}`;
}
function collectionRow(f, tr, i, isFav) {
  const playing = S.current && S.current.key === tr.key;
  const prim = S.lang === 'ar' ? tr.name_ar : tr.name_en;
  return `<div class="surah-row ${playing ? 'playing' : ''}" data-coll="${i}" data-n="${tr.n}" data-key="${esc(tr.key)}">
    <span class="sn">${playing ? '<span class="eq"><i></i><i></i><i></i></span>' : `<b>${S.lang === 'ar' ? arDigits(tr.n) : tr.n}</b>`}</span>
    <span class="si">${S.lang === 'ar' ? `<span class="sa sn-font" aria-label="${esc(prim)}"><span class="sg-w"></span><span class="sg-n">${surahNameGlyph(tr.n)}</span></span>` : `<span class="sa en-name">${esc(prim)}</span>`}<span class="se">${esc(trackReciter(tr))} · ${esc(f.rewaya || f.mname || '')}</span></span>
    <span class="sfoot"><span class="tag gold">${esc(f.rewaya || f.mname || '')}</span>
    <span class="acts">
      <button class="mini-btn qadd-btn" data-qadd="${esc(tr.key)}" title="${t('addToQueue')}" aria-label="${t('addToQueue')}">
        <svg class="ic" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
      </button>
      ${isFav ? `<button class="mini-btn faved" data-unfav="${esc(tr.key)}" aria-label="${t('favorite')}"><svg class="ic" viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.3-9A5.2 5.2 0 0 1 12 6.6a5.2 5.2 0 0 1 9.3 4.9c-1.8 4.4-9.3 9-9.3 9z"/></svg></button>` : ''}
      <button class="mini-btn" data-dl="${esc(tr.key)}" aria-label="${t('download')}"><svg class="ic" viewBox="0 0 24 24"><path d="M12 3v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4 19h16"/></svg></button>
    </span></span></div>`;
}

/* ═══════════════ NAVIGATION ACTIONS ═══════════════ */
function openReciter(id, autoplay = false) {
  const r = S.reciters.find(x => x.id === id); if (!r) return;
  S.reciter = r;
  const ms = S.rewaya === '__all' ? r.moshaf : r.moshaf.filter(m => norm(moshafRewaya(m)) === S.rewaya);
  S.moshaf = ms[0] || r.moshaf[0];
  S.reciterTracks = parseList(S.moshaf.surah_list, S.moshaf.surah_total).map(n => makeTrack(r, S.moshaf, n));
  S.view = 'surahs'; S.query = ''; $('#searchInput').value = '';
  $$('.nav-item[data-view]').forEach(b => b.classList.remove('active'));
  render();
  if (autoplay && S.reciterTracks.length) {
    S.tracks = [...S.reciterTracks];
    loadTrack(0, true);
  }
}
function setMoshaf(i) {
  const r = S.reciter; S.moshaf = r.moshaf[i];
  S.reciterTracks = parseList(S.moshaf.surah_list, S.moshaf.surah_total).map(n => makeTrack(r, S.moshaf, n));
  render();
}
function playQuick(n) {
  if (!S.reciter) { const r = S.reciters.find(x => norm2(x.name).includes('عفاسي')) || S.reciters[0]; openReciter(r.id, false) }
  const tr = (S.reciterTracks && S.reciterTracks.find(x => x.n === n)) || (S.reciter && S.moshaf ? makeTrack(S.reciter, S.moshaf, n) : null);
  if (tr) {
    S.tracks = [tr];
    loadTrack(0, true);
  }
}
function playCollection(i, isFav) {
  const items = isFav ? S.favorites : S.recent; const f = items[i]; if (!f) return;
  const tr = rebuildTrack(f);
  S.tracks = items.map(rebuildTrack); S.reciter = null; S.moshaf = null;
  loadTrack(i, true);
}

/* ═══════════════ PLAYER ═══════════════ */
function loadTrack(i, autoplay = true, seek = 0) {
  if (i < 0 || i >= S.tracks.length) return;
  lastQueuedOffset = 0;
  S.idx = i; const tr = S.tracks[i]; S.current = tr; S.srcIdx = 0;
  const order = pickSource(tr, S.quality);
  const good = store.get('lastProvider', '');
  if (good && order.length > 1) {
    const gi = order.findIndex(s => s.provider === good);
    if (gi > 0 && order[gi].bitrate >= order[0].bitrate - 32) order.unshift(order.splice(gi, 1)[0]);
  }
  S.srcOrder = order;
  setAudioSrc(order[0].url); audio.playbackRate = S.speed;
  if (seek) audio.addEventListener('loadedmetadata', () => { audio.currentTime = seek }, { once: true });
  if (autoplay) audio.play().catch(() => { });
  updateNowPlaying();
  const idle = window.requestIdleCallback ? cb => requestIdleCallback(cb, { timeout: 300 }) : cb => setTimeout(cb, 120);
  idle(() => { renderQueue(); markPlayingRows(); });
  pushRecent(tr); saveSession();
}
function currentSources() { return S.srcOrder || [] }
function tryNextSource() {
  S.srcIdx++;
  if (S.srcIdx < currentSources().length) { setAudioSrc(currentSources()[S.srcIdx].url); audio.play().catch(() => { }); updateBadges(); return true }
  toast(t('errorAudio')); return false;
}
function togglePlay() {
  if (!S.current) { if (S.tracks.length) loadTrack(0, true); else { setView('reciters'); toast(t('selectReciterFirst')) } return }
  audio.paused ? audio.play().catch(() => { }) : audio.pause();
}
function nextTrack() {
  if (!S.tracks.length) return;
  if (S.shuffle) { let j; do { j = Math.floor(Math.random() * S.tracks.length) } while (j === S.idx && S.tracks.length > 1); loadTrack(j, true); return }
  const n = S.idx + 1;
  if (n >= S.tracks.length) { if (S.repeat === 1) loadTrack(0, true); else { audio.pause(); audio.currentTime = 0 } }
  else loadTrack(n, true);
}
function prevTrack() {
  if (!S.tracks.length) return;
  if (audio.currentTime > 3) { audio.currentTime = 0; return }
  loadTrack(S.idx - 1 < 0 ? S.tracks.length - 1 : S.idx - 1, true);
}
function updateNowPlaying() {
  const tr = S.current; if (!tr) return;
  const seed = tr.rar, num = S.lang === 'ar' ? arDigits(tr.n) : String(tr.n), sub = trackName(tr);
  const photo = photoURL(tr.rar, tr.rid);
  const isMadani = (tr.type === 1) || (tr.n && SURAH[tr.n - 1] && SURAH[tr.n - 1][3] === 1);
  const mosquePlaceholder = isMadani ? '/img/mosque-nabawi.jpg' : '/img/mosque-haram.jpg';
  const args = [seed, num, sub, photo, (S.lang === 'ar' ? tr.rar : tr.ren).trim()[0] || 'ق', mosquePlaceholder];
  $('#npMandala').innerHTML = mandalaHTML(...args);
  if ($('#npOverlay').classList.contains('open')) $('#ovMandala').innerHTML = mandalaHTML(...args);
  $('#ovPhoto').innerHTML = photo ? `<img src="${photo}" alt="" data-err-remove="1">` : (mosquePlaceholder ? `<img src="${mosquePlaceholder}" alt="">` : '');
  const ava = photo || avatarURI(tr.rar, (S.lang === 'ar' ? tr.rar : tr.ren).trim()[0] || 'ق');
  $('#pbArtImg').src = ava; $('#pbArtImg').onerror = function () { this.onerror = null; this.src = avatarURI(tr.rar, 'ق') };
  const titleHTML = S.lang === 'ar' && tr.n != null ? `<span class="sn-font sg-pair"><span class="sg-w"></span><span class="sg-n">${surahNameGlyph(tr.n)}</span></span>` : esc(trackName(tr));
  $('#npTitle').innerHTML = titleHTML; $('#ovTitle').innerHTML = titleHTML; P = null;
  $('#npArtist').textContent = trackReciter(tr); $('#ovArtist').textContent = trackReciter(tr);
  $('#pbTitle').textContent = `${trackName(tr)} · ${trackReciter(tr)}`;
  $('#pbSub').textContent = (tr.mname && tr.rewaya && tr.mname !== tr.rewaya && tr.mname.includes(tr.rewaya)) ? tr.mname : [tr.rewaya, tr.mname].filter((v, i, a) => v && a.indexOf(v) === i).join(' · ') || trackReciter(tr);
  updateBadges(); updateFavButtons(); applyNpPanel();
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: trackName(tr), artist: trackReciter(tr), album: tr.rewaya || '', artwork: [{ src: ava, sizes: '512x512', type: photo ? 'image/jpeg' : 'image/svg+xml' }] });
  }
}
function updateBadges() {
  const tr = S.current; if (!tr) return;
  const src = currentSources()[S.srcIdx] || tr.sources[0];
  const html = `<span class="tag gold">${esc(tr.rewaya || tr.mname || '')}</span><span class="tag" id="qBadge">${src.bitrate} ${t('kbps')}</span><span class="tag">${esc(src.provider)}</span>`;
  $('#npBadges').innerHTML = html; $('#ovBadges').innerHTML = html;
}
function markPlayingRows() {
  $$('.surah-row').forEach(row => {
    const on = S.current && row.dataset.key === S.current.key;
    row.classList.toggle('playing', on);
    const sn = row.querySelector('.sn');
    if (on && !sn.querySelector('.eq')) sn.innerHTML = '<span class="eq"><i></i><i></i><i></i></span>';
    else if (!on && sn.querySelector('.eq')) { const n = +row.dataset.n || 0; sn.innerHTML = `<b>${n ? (S.lang === 'ar' ? arDigits(n) : n) : ''}</b>` }
  });
  $$('.quick-surah[data-surah]').forEach(q => q.classList.toggle('playing', !!(S.view === 'home' && S.current && +q.dataset.surah === S.current.n)));
}
function renderQueue() {
  const q = $('#npQueue'), oq = $('#ovQueue'), cnt = $('#ovQueueCount');
  if (!S.tracks.length) {
    const emptyHtml = `<div class="queue-empty"><p>${t('queueEmpty')}</p><button class="btn sm" data-act="openqueueadd"><svg class="ic" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><span>${t('addSurah')}</span></button></div>`;
    if (q) q.innerHTML = emptyHtml;
    if (oq) oq.innerHTML = emptyHtml;
    if (cnt) cnt.textContent = '';
    return;
  }
  const start = Math.max(0, S.idx);
  const upcomingCount = S.tracks.length - 1 - start;
  if (cnt) {
    cnt.textContent = upcomingCount > 0 ? (S.lang === 'ar' ? `${arDigits(upcomingCount)}` : `${upcomingCount}`) : '';
  }
  const items = S.tracks.slice(start, start + 30);
  const html = items.map((tr, k) => {
    const i = start + k;
    const isCur = i === S.idx;
    const numStr = isCur ? '▶' : (S.lang === 'ar' ? arDigits(tr.n) : String(tr.n));
    const reciterStr = trackReciter(tr);
    const surahStr = trackName(tr);
    return `<div class="queue-item ${isCur ? 'active' : ''}" draggable="${!isCur}" data-qi="${i}">
      <span class="grip" title="${t('mvUp')} / ${t('mvDown')}"><svg class="ic" viewBox="0 0 24 24"><path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01"/></svg></span>
      <span class="qi-n">${numStr}</span>
      <div class="qi-info">
        <span class="qi-t">${esc(surahStr)}</span>
        <span class="qi-r">${esc(reciterStr)}</span>
      </div>
      <span class="qi-d">${tr.duration ? fmt(tr.duration) : ''}</span>
      <div class="qi-actions">
        <button class="qmv" data-qmv="-1" title="${t('mvUp')}" aria-label="${t('mvUp')}"${i === 0 || i === S.idx ? ' disabled' : ''}><svg class="ic" viewBox="0 0 24 24"><path d="m6 14 6-6 6 6"/></svg></button>
        <button class="qmv" data-qmv="1" title="${t('mvDown')}" aria-label="${t('mvDown')}"${i === S.tracks.length - 1 || i === S.idx ? ' disabled' : ''}><svg class="ic" viewBox="0 0 24 24"><path d="m6 10 6 6 6-6"/></svg></button>
        ${!isCur ? `<button class="qdel" data-qdel="${i}" title="${t('removeFromQueue')}" aria-label="${t('removeFromQueue')}"><svg class="ic" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>` : ''}
      </div>
    </div>`;
  }).join('');
  if (q) q.innerHTML = html;
  if (oq) oq.innerHTML = html;
}
function updateProgress() {
  const df = audio.duration, fin = typeof df === 'number' && isFinite(df), d = fin ? df : 0, p = d ? Math.min(1, Math.max(0, audio.currentTime / d)) : 0, cur = fmt(audio.currentTime), dur = fmt(d);
  if (!P || !P.tCur.isConnected) P = { tCur: $('#tCur'), tDur: $('#tDur'), ovCur: $('#ovCur'), ovDur: $('#ovDur'), progBar: $('#progBar'), ovProg: $('#ovProg') };
  const { tCur, tDur, ovCur, ovDur, progBar, ovProg } = P;
  if (tDur) tDur.textContent = dur;
  if (ovDur) ovDur.textContent = dur;
  const scrub = (progBar && progBar.classList.contains('scrub')) ? 1 : (ovProg && ovProg.classList.contains('scrub') ? 2 : 0);
  if (scrub !== 1) { if (tCur) tCur.textContent = cur; if (progBar) progBar.style.setProperty('--p', String(p)) }
  if (scrub !== 2) { if (ovCur) ovCur.textContent = cur; if (ovProg) ovProg.style.setProperty('--p', String(p)) }
  const now = Math.round(audio.currentTime || 0), max = Math.round(d), vt = cur + ' / ' + dur;
  [progBar, ovProg].forEach(el => { if (!el) return; el.setAttribute('aria-valuemax', max); el.setAttribute('aria-valuenow', now); el.setAttribute('aria-valuetext', vt) });
  document.documentElement.style.setProperty('--pr', p.toFixed(4));
  if (S.current && d && S.current.duration !== d) { S.current.duration = d; const row = $(`.surah-row[data-key="${S.current.key}"] .dur`); if (row) row.textContent = dur }
}
let P = null, progressRaf = 0, lastProgressPaint = 0;
const PROGRESS_MIN_INTERVAL = ((navigator.hardwareConcurrency || 8) <= 4 || matchMedia('(max-width: 820px)').matches) ? 500 : 250, PR_CIRC = 2 * Math.PI * 45.6;
function scheduleProgress() {
  if (progressRaf) return;
  progressRaf = requestAnimationFrame(() => {
    progressRaf = 0;
    const now = performance.now();
    if (now - lastProgressPaint < PROGRESS_MIN_INTERVAL) return;
    lastProgressPaint = now;
    updateProgress();
  });
}
function updateBuffer() {
  try { if (audio.buffered.length && audio.duration && isFinite(audio.duration)) { const b = audio.buffered.end(audio.buffered.length - 1) / audio.duration; const pb = $('#progBar'); if (pb) pb.style.setProperty('--buf', String(b)); const op = $('#ovProg'); if (op) op.style.setProperty('--buf', String(b)) } } catch (e) { }
}
function setPlayingUI(on) {
  document.body.classList.toggle('playing', on);
  const ic = on ? '<svg class="ic" viewBox="0 0 24 24"><rect x="6" y="4.5" width="4" height="15" rx="1.2"/><rect x="14" y="4.5" width="4" height="15" rx="1.2"/></svg>' : '<svg class="ic play-ic" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>';
  $('#btnPlay').innerHTML = ic; $$('.np-overlay [data-act="play"]').forEach(b => b.innerHTML = ic);
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = on ? 'playing' : 'paused';
}
function saveSession() {
  if (!S.current) return;
  store.set('session', { rid: S.current.rid, mid: S.current.mid, n: S.current.n, pos: audio.currentTime || 0, server: S.current.server, rewaya: S.current.rewaya, mname: S.current.mname, rar: S.current.rar, ren: S.current.ren });
}
function pushRecent(tr) {
  const f = { key: tr.key, n: tr.n, rid: tr.rid, mid: tr.mid, server: tr.server, rewaya: tr.rewaya, mname: tr.mname, rar: tr.rar, ren: tr.ren, ts: Date.now() };
  S.recent = [f, ...S.recent.filter(x => x.key !== tr.key)].slice(0, 30); store.set('recent', S.recent); updateCounts();
}

/* ═══════════════ MUSHAF ═══════════════ */
const MUSHAF_LOCAL = {
  hafs: import.meta.glob('../assets/mushaf-hafs/*.svg', { eager: true, query: '?url', import: 'default' }),
  warsh: import.meta.glob('../assets/mushaf-warsh/*.svg', { eager: true, query: '?url', import: 'default' })
};
const MUSHAF_REMOTE = {
  hafs: n => [
    `https://cdn.jsdelivr.net/gh/Younes12345698/pro-muslim-mushaf@09c92b7a328a3a9dad06d2e1da98eada722fb292/svg/${pad(n)}.svg`,
    `https://raw.githubusercontent.com/Younes12345698/pro-muslim-mushaf/09c92b7a328a3a9dad06d2e1da98eada722fb292/svg/${pad(n)}.svg`,
    `https://cdn.jsdelivr.net/gh/SakinaDevGroup/mushaf-madani-cdn@7679356bc96f468c334f5a7d74fd548fc8e22682/light/p${n}.png`,
    `https://raw.githubusercontent.com/SakinaDevGroup/mushaf-madani-cdn/7679356bc96f468c334f5a7d74fd548fc8e22682/light/p${n}.png`
  ],
  warsh: n => [
    `https://raw.githubusercontent.com/quran-ws/quran-svg/b4155f07e4aea087d2c458069acff9f7c7e749f6/mushafs/warsh/kfqc/svg/${pad(n)}.svg`,
    `https://cdn.jsdelivr.net/gh/quran-ws/quran-svg@b4155f07e4aea087d2c458069acff9f7c7e749f6/mushafs/warsh/kfqc/svg/${pad(n)}.svg`
  ]
};
const mushafLocalKey = (n, rw) => `../assets/${rw === 'warsh' ? 'mushaf-warsh' : 'mushaf-hafs'}/${pad(n)}.svg`;
const mushafSources = (n, rw) => {
  const local = MUSHAF_LOCAL[rw][mushafLocalKey(n, rw)];
  return local ? [local, ...MUSHAF_REMOTE[rw](n)] : MUSHAF_REMOTE[rw](n);
};
const mushafSVGURL = (n, rw) => mushafSources(n, rw)[0];
const mushafLastGet = () => store.get(`mushafLast_${S.mushafRiwaya}`, 0);
function setMushafRiwaya(rw) {
  S.mushafRiwaya = rw; store.set('mushafRiwaya', rw); store.set('mushafVisited', true);
  $$('#segMushafRw button').forEach(b => b.classList.toggle('on', b.dataset.mrw === rw));
  if (S.view === 'mushaf') { S.readN = null; S.mushafAsk = true; render() }
}
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++)c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c } return t })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++)c = CRC_TABLE[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0 };
const zipDeflate = async raw => {
  if (typeof CompressionStream === 'undefined') return { data: raw, method: 0 };
  try {
    const out = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
    return out.length < raw.length ? { data: out, method: 8 } : { data: raw, method: 0 };
  } catch (e) { return { data: raw, method: 0 } }
};
let mushafZipCancel = null;
const ctlCancelMushafZip = () => { if (mushafZipCancel) mushafZipCancel() };
async function mushafZipAll(rw, onProg, ctl, sink) {
  const enc = new TextEncoder(), parts = [], central = [];
  let offset = 0, count = 0, fail = 0;
  const u16 = v => new Uint8Array([v & 255, (v >> 8) & 255]);
  const u32 = v => new Uint8Array([v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255]);
  const put = sink ? u8 => sink.write(u8) : u8 => { parts.push(u8) };
  for (let n = 1; n <= MUSHAF_PAGES; n++) {
    if (ctl && ctl.cancelled) throw new Error('cancelled');
    let txt = null;
    for (const u of mushafSources(n, rw)) {
      try { const res = await fetch(u); if (!res.ok) throw new Error(res.status); txt = await res.text(); break } catch (e) { }
    }
    if (txt == null) { onProg(n); if (++fail >= 25) throw new Error('too-many-failures'); continue }
    fail = 0;
    const raw = enc.encode(txt); txt = null;
    const crc = crc32(raw), { data, method } = await zipDeflate(raw);
    const csz = method === 8 ? data.length : raw.length;
    const nameB = enc.encode(`${pad(n)}.svg`);
    const lh = new Uint8Array(30); lh.set(u32(0x04034b50), 0); lh.set(u16(20), 4); lh.set(u16(0), 8); lh.set(u16(method), 10); lh.set(u32(crc), 14);
    lh.set(u32(csz), 18); lh.set(u32(raw.length), 22); lh.set(u16(nameB.length), 26);
    await put(lh); await put(nameB); await put(data);
    offset += lh.length + nameB.length + csz;
    const ch = new Uint8Array(46); ch.set(u32(0x02014b50), 0); ch.set(u16(20), 4); ch.set(u16(20), 6); ch.set(u16(method), 10); ch.set(u32(crc), 16);
    ch.set(u32(csz), 20); ch.set(u32(raw.length), 24); ch.set(u16(nameB.length), 28); ch.set(u32(offset - (lh.length + nameB.length + csz)), 42);
    central.push(ch, nameB); count++; onProg(n);
    if (n % 6 === 0) await new Promise(r => setTimeout(r, 0));
  }
  if (!count) throw new Error('no pages');
  const cdSize = central.reduce((s, a) => s + a.length, 0);
  const eo = new Uint8Array(22); eo.set(u32(0x06054b50), 0); eo.set(u16(count), 8); eo.set(u16(count), 10); eo.set(u32(cdSize), 12); eo.set(u32(offset), 16);
  if (sink) { for (const c of central) await sink.write(c); await sink.write(eo); await sink.close(); return null }
  return new Blob([...parts, ...central, eo], { type: 'application/zip' });
}
async function mushafDownloadAll(btn) {
  if (btn.dataset.busy) { ctlCancelMushafZip(); return }
  btn.dataset.busy = '1'; btn.title = t('cancel');
  const rw = S.mushafRiwaya, orig = btn.textContent, ctl = { cancelled: false };
  mushafZipCancel = () => { ctl.cancelled = true };
  const prog = p => { btn.textContent = `${S.lang === 'ar' ? arDigits(p) : p} / ${S.lang === 'ar' ? arDigits(MUSHAF_PAGES) : MUSHAF_PAGES}` };
  const fname = `mushaf-${rw}-svg.zip`;
  let sink = null, wr = null;
  try {
    if (S.dirHandle) {
      const fh = await S.dirHandle.getFileHandle(fname, { create: true });
      wr = await fh.createWritable();
    } else if (window.showSaveFilePicker) {
      try {
        const fh = await window.showSaveFilePicker({ suggestedName: fname, types: [{ description: 'ZIP', accept: { 'application/zip': ['.zip'] } }] });
        wr = await fh.createWritable();
      } catch (e) { if (e && e.name === 'AbortError') throw new Error('cancelled') }
    }
    if (wr) sink = { write: async u8 => { if (ctl.cancelled) throw new Error('cancelled'); await wr.write(u8) }, close: async () => { await wr.close() } };
    const blob = await mushafZipAll(rw, prog, ctl, sink);
    if (blob) {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    }
    toast(t('saved'));
  } catch (e) {
    if (wr && wr.abort) try { wr.abort() } catch (_) { }
    toast(e && e.message === 'cancelled' ? t('cancelled') : t('failed'));
  }
  btn.textContent = orig; btn.title = ''; btn.disabled = false; delete btn.dataset.busy; mushafZipCancel = null;
}
function mushafGo(n) {
  n = Math.round(n) || 0; if (n < 0) n = 0; if (n > MUSHAF_PAGES) n = MUSHAF_PAGES;
  S.mushafPage = n; store.set('mushafPage', n);
  if (n >= 1) store.set(`mushafLast_${S.mushafRiwaya}`, n);
  if (S.view !== 'mushaf') setView('mushaf');
  S.readN = n;
  const stg = $('#view .mushaf-stage');
  if (stg && stg.scrollTop > 0) stg.scrollTop = 0;
  if (flip && document.contains($('#flipHost'))) {
    const idx = Math.max(0, n - 1), cur = flip.getCurrentPageIndex();
    if (idx !== cur) {
      try { flip.flip(idx, 'bottom'); } catch (_) { flip.turnToPage(idx); }
    }
    mushafSyncUI();
  } else render();
  mushafPrecache(n, S.mushafRiwaya);
}
function mushafPrecache(n, rw) {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
  const book = mushafBook();
  const R = book ? mushafRight(n) : n;
  const pages = (book ? [R, R + 1, R + 2, R + 3] : [n, n + 1]).filter(p => p >= 1 && p <= MUSHAF_PAGES);
  const urls = pages.flatMap(p => mushafSources(p, rw).slice(1));
  try { navigator.serviceWorker.controller.postMessage({ type: 'precache-mushaf', urls }) } catch (_) { }
}
function mushafCoverHTML() {
  const last = mushafLastGet() || S.mushafPage;
  const first = !store.get('mushafVisited', false);
  const ask = first ? `<div class="mushaf-ask" data-act="mushafaskclose"><div class="ma-card">
      <b>${t('chooseRiwaya')}</b>
      <span>${t('chooseRiwayaDesc')}</span>
      <button class="btn gold" data-act="mrwset" data-rw="hafs">${t('rwHafs')}</button>
      <button class="btn" data-act="mrwset" data-rw="warsh">${t('rwWarsh')}</button>
    </div></div>`: (S.mushafAsk ? `<div class="mushaf-ask" data-act="mushafaskclose"><div class="ma-card">
      <b>${last > 1 ? t('continueReading') : t('startReading')}</b>
      <span>${last > 1 ? `${t('page')} ${S.lang === 'ar' ? arDigits(last) : last} · ` : ''}${t(S.mushafRiwaya === 'warsh' ? 'rwWarsh' : 'rwHafs')}</span>
      ${last > 1 ? `<button class="btn gold" data-act="mresume">${t('resume')} — ${t('page')} ${S.lang === 'ar' ? arDigits(last) : last}</button>` : ''}
      <button class="btn${last > 1 ? '' : ' gold'}" data-act="mstart">${t('startReading')}</button>
    </div></div>`: '');
  return `<div class="mushaf-wrap">
    <div class="mushaf-stage cover">
      <div class="mushaf-page cover-page" data-act="mushafopen">
        <img src="${S.mushafRiwaya === 'warsh' ? '/mushaf-cover.jpg' : '/mushaf-cover-hafs.jpg'}" alt="${t('quranName')}" data-err-broken="1">
      </div>
    </div>
    ${ask}
  </div>`;
}
function viewMushaf() { return mushafCoverHTML() }
const mushafBook = () => S.mushafLayout !== 'single' && typeof window.matchMedia === 'function' && window.matchMedia('(min-width:900px)').matches;
const MUSHAF_ZOOMS = [0.85, 1.0, 1.15, 1.3, 1.45, 1.6, 1.8, 2.0];
function setMushafZoom(z) {
  const clamped = Math.min(2.0, Math.max(0.85, Math.round(z * 100) / 100));
  S.mushafZoom = clamped;
  store.set('mushafZoom', clamped);
  applyMushafZoom();
}
function applyMushafZoom() {
  const stg = $('#view .mushaf-stage');
  if (stg) {
    stg.style.setProperty('--mzoom', String(S.mushafZoom || 1));
    stg.classList.toggle('mushaf-zoomed', (S.mushafZoom || 1) > 1.0);
    if ((S.mushafZoom || 1) <= 1.0) {
      stg.scrollTop = 0;
      stg.scrollLeft = 0;
    }
  }
  $$('#view [data-mzoom-val]').forEach(el => {
    el.textContent = `${Math.round((S.mushafZoom || 1) * 100)}%`;
  });
  if (flip) {
    requestAnimationFrame(() => { if (flip) try { flip.update() } catch (_) { } });
  }
}
function mushafZoomStep(dir) {
  const cur = S.mushafZoom || 1;
  if (dir > 0) {
    const next = MUSHAF_ZOOMS.find(z => z > cur + 0.02) || 2.0;
    setMushafZoom(next);
  } else {
    const prev = [...MUSHAF_ZOOMS].reverse().find(z => z < cur - 0.02) || 0.85;
    setMushafZoom(prev);
  }
}
function mushafFocus() {
  document.body.classList.toggle('mushaf-clean');
  if (flip) {
    requestAnimationFrame(() => { if (flip) try { flip.update() } catch (_) { } });
  }
}
/* flip-book (StPageFlip) */
let flip = null, flipIO = null, flipRO = null;
function destroyFlip() {
  if (flipIO) { flipIO.disconnect(); flipIO = null }
  if (flipRO) { flipRO.disconnect(); flipRO = null }
  if (flip) { try { flip.destroy() } catch (_) { } flip = null }
  const stg = $('#view .mushaf-stage'); if (stg) stg.classList.remove('flip-on');
}
function flipSetSrc(p) {
  const im = document.querySelector(`#flipHost .flip-page[data-p="${p}"] img`);
  if (im && !im.getAttribute('src')) im.src = im.dataset.src;
}
function mushafSyncUI() {
  const n = S.readN; if (!n) return;
  const book = mushafBook(), R = book ? mushafRight(n) : n;
  const num = p => S.lang === 'ar' ? arDigits(p) : String(p);
  const L = book && R + 1 <= MUSHAF_PAGES ? R + 1 : null;
  const footNum = L ? `${num(R)} – ${num(L)}` : `${num(R)} / ${num(MUSHAF_PAGES)}`;
  $$('#view .mf-num').forEach(el => el.textContent = footNum);
  $$('#view .mt-center span').forEach(el => el.textContent = `${t('page')} ${footNum}`);
  ['mSlider', 'mSliderSide'].forEach(id => { const el = document.getElementById(id); if (el) el.value = n });
  const sc = mushafSurah(R), jz = mushafJuz(R);
  ['mSurahSel', 'mSurahSelSide'].forEach(id => { const el = document.getElementById(id); if (el) el.value = sc });
  ['mJuzSel', 'mJuzSelSide'].forEach(id => { const el = document.getElementById(id); if (el) el.value = jz });
  $$('#view [data-mlist="surah"] .ms-item').forEach(el => el.classList.toggle('active', +el.dataset.read === SURAH_PAGE[sc - 1]));
  $$('#view [data-mlist="juz"] .ms-item').forEach(el => el.classList.toggle('active', +el.dataset.read === JUZ_PAGE[jz - 1]));
}
async function mountFlip() {
  const host = $('#flipHost'); if (!host || flip) return;
  const book = mushafBook(), n = S.readN, rw = S.mushafRiwaya;
  if (!book) return;
  const num = p => S.lang === 'ar' ? arDigits(p) : String(p);
  const stg = host.closest('.mushaf-stage');
  try {
    const { PageFlip } = await import('page-flip');
    if (!document.contains(host) || flip) return;
    if (stg) {
      stg.classList.add('flip-on');
      stg.style.setProperty('--mzoom', String(S.mushafZoom || 1));
      stg.classList.toggle('mushaf-zoomed', (S.mushafZoom || 1) > 1.0);
    }
    const frag = document.createDocumentFragment();
    for (let p = 1; p <= MUSHAF_PAGES; p++) {
      const d = document.createElement('div');
      d.className = 'flip-page'; d.dataset.p = p;
      const sm = SURAH[mushafSurah(p) - 1];
      d.innerHTML = `<div class="flip-in"><span class="fp-juz">${t('juz')} ${num(mushafJuz(p))}</span><span class="fp-surah">${esc(S.lang === 'ar' ? sm[0] : sm[1])}</span><img data-src="${esc(mushafSVGURL(p, rw))}" alt="${t('mushaf')} — ${t('page')} ${num(p)}" draggable="false"><span class="fp-num">${num(p)}</span></div>`;
      frag.appendChild(d);
    }
    host.innerHTML = ''; host.appendChild(frag);
    const pf = new PageFlip(host, {
      width: 345, height: 550, size: 'stretch', autoSize: false,
      minWidth: 200, maxWidth: 1200, minHeight: 260, maxHeight: 1800,
      usePortrait: !book, showCover: false, mobileScrollSupport: false,
      drawShadow: true, maxShadowOpacity: .45, flippingTime: 700,
      startPage: Math.max(0, (book ? mushafRight(n) : n) - 1), swipeDistance: 18
    });
    pf.loadFromHTML(host.querySelectorAll('.flip-page'));
    flip = pf;
    const ui = pf.getUI();
    if (ui && typeof ui.getMousePos === 'function') {
      ui.getMousePos = function(x, y) {
        const el = this.distElement || this.wrapper;
        if (!el) return { x, y };
        const rect = el.getBoundingClientRect();
        const baseW = el.offsetWidth || rect.width || 1;
        const baseH = el.offsetHeight || rect.height || 1;
        const scaleX = rect.width / baseW;
        const scaleY = rect.height / baseH;
        const localX = (x - rect.left) / (scaleX || 1);
        const localY = (y - rect.top) / (scaleY || 1);
        return {
          x: Math.max(0, Math.min(baseW, baseW - localX)),
          y: Math.max(0, Math.min(baseH, localY))
        };
      };
    }
    if (typeof ResizeObserver === 'function' && stg) {
      if (flipRO) flipRO.disconnect();
      let roTimer = null;
      flipRO = new ResizeObserver(() => {
        if (!flip) return;
        cancelAnimationFrame(roTimer);
        roTimer = requestAnimationFrame(() => {
          if (flip && document.contains(host)) {
            try { flip.update() } catch (_) { }
          }
        });
      });
      flipRO.observe(stg);
    }
    flipIO = new IntersectionObserver(es => {
      for (const en of es) if (en.isIntersecting) { const im = en.target.querySelector('img'); if (im && !im.getAttribute('src')) im.src = im.dataset.src }
    }, { rootMargin: '600px' });
    host.querySelectorAll('.flip-page').forEach(el => flipIO.observe(el));
    const R0 = book ? mushafRight(n) : n;
    for (let p = R0 - 2; p <= R0 + 3; p++) if (p >= 1 && p <= MUSHAF_PAGES) flipSetSrc(p);
    pf.on('flip', e => {
      const i = +e.data; if (isNaN(i)) return;
      S.readN = book ? mushafRight(i + 1) : i + 1;
      S.mushafPage = S.readN; store.set('mushafPage', S.readN); store.set(`mushafLast_${S.mushafRiwaya}`, S.readN);
      if (stg && stg.scrollTop > 0) stg.scrollTop = 0;
      mushafSyncUI();
      for (let p = S.readN - 4; p <= S.readN + 5; p++) if (p >= 1 && p <= MUSHAF_PAGES) flipSetSrc(p);
      mushafPrecache(S.readN, S.mushafRiwaya);
    });
  } catch (_) { if (stg) stg.classList.remove('flip-on') }
}
function mushafSearchGo(q) {
  q = (q || '').trim();
  if (!q) return;
  if (/^\d{1,3}$/.test(q)) { mushafGo(Math.min(Math.max(+q, 1), MUSHAF_PAGES)); return }
  const nq = norm2(q);
  const i = SURAH.findIndex(s => norm2(s[0]).includes(nq) || norm2(s[1]).includes(nq));
  if (i >= 0) mushafGo(SURAH_PAGE[i]);
  else toast(t('noResults'));
}
function starNumberHTML(num, isActive) {
  return `<span class="star-badge${isActive ? ' active' : ''}">
    <svg viewBox="0 0 44 44" class="star-svg" aria-hidden="true">
      <path d="M22 2L27.86 7.86L36.14 7.86L36.14 16.14L42 22L36.14 27.86L36.14 36.14L27.86 36.14L22 42L16.14 36.14L7.86 36.14L7.86 27.86L2 22L7.86 16.14L7.86 7.86L16.14 7.86Z" stroke-width="1.25" stroke-linejoin="round"/>
    </svg>
    <span class="star-num">${S.lang === 'ar' ? arDigits(num) : num}</span>
  </span>`;
}
function mushafIndexItemsHTML() {
  const n = S.readN || S.mushafPage || 1;
  const book = mushafBook(), R = book ? mushafRight(n) : n;
  const curSurah = mushafSurah(R);
  const curJuz = mushafJuz(R);
  const q = norm2(S.mushafIndexQuery || '');

  if (S.mushafIndexTab === 'surah') {
    const list = SURAH.map((s, i) => {
      const sNum = i + 1;
      const pageNum = SURAH_PAGE[i];
      const isCur = sNum === curSurah;
      const match = !q || norm2(s[0]).includes(q) || norm2(s[1]).includes(q) || String(sNum) === q || String(pageNum) === q;
      if (!match) return '';
      const name = S.lang === 'ar' ? s[0] : s[1];
      const type = t(s[3] === 1 ? 'medinan' : 'meccan');
      const ayahs = `${S.lang === 'ar' ? arDigits(s[2]) : s[2]} ${t('ayahs')}`;
      const pStr = S.lang === 'ar' ? arDigits(pageNum) : pageNum;
      return `<button class="mindex-card-item${isCur ? ' current' : ''}" data-act="mjump" data-page="${pageNum}" ${isCur ? 'aria-current="true"' : ''}>
        <div class="mci-top">
          ${starNumberHTML(sNum, isCur)}
          <span class="mci-page"><span class="mci-p-lbl">${t('page')}</span> <span class="mci-p-val">${pStr}</span></span>
        </div>
        <div class="mci-name">${esc(name)}</div>
        <div class="mci-meta">${type} · ${ayahs}</div>
        ${isCur ? `<span class="mindex-badge">${t('current')}</span>` : ''}
      </button>`;
    }).join('');
    return list ? `<div class="mindex-grid">${list}</div>` : `<div class="mindex-empty">${t('noResults')}</div>`;
  } else {
    const list = JUZ_PAGE.map((p, j) => {
      const jNum = j + 1;
      const isCur = jNum === curJuz;
      const sAtJuz = mushafSurah(p);
      const sName = SURAH[sAtJuz - 1] ? (S.lang === 'ar' ? SURAH[sAtJuz - 1][0] : SURAH[sAtJuz - 1][1]) : '';
      const match = !q || String(jNum) === q || norm2(sName).includes(q) || String(p) === q;
      if (!match) return '';
      const jStr = S.lang === 'ar' ? arDigits(jNum) : jNum;
      const pStr = S.lang === 'ar' ? arDigits(p) : p;
      return `<button class="mindex-card-item${isCur ? ' current' : ''}" data-act="mjump" data-page="${p}" ${isCur ? 'aria-current="true"' : ''}>
        <div class="mci-top">
          ${starNumberHTML(jNum, isCur)}
          <span class="mci-page"><span class="mci-p-lbl">${t('page')}</span> <span class="mci-p-val">${pStr}</span></span>
        </div>
        <div class="mci-name">${t('juz')} ${jStr}</div>
        <div class="mci-meta">${esc(sName)}</div>
        ${isCur ? `<span class="mindex-badge">${t('current')}</span>` : ''}
      </button>`;
    }).join('');
    return list ? `<div class="mindex-grid">${list}</div>` : `<div class="mindex-empty">${t('noResults')}</div>`;
  }
}
function mushafIndexModalHTML() {
  if (!S.mushafIndexOpen) return '';
  return `<div class="mindex-scrim" data-act="mindexclose">
    <div class="mindex-card" role="dialog" aria-modal="true" aria-labelledby="mIndexTitle">
      <div class="mindex-head">
        <div class="mindex-title" id="mIndexTitle">${t('mushafIndex')}</div>
        <div class="mindex-tabs" role="tablist">
          <button class="mindex-tab${S.mushafIndexTab === 'surah' ? ' active' : ''}" data-act="mindextab" data-tab="surah" role="tab">${t('surahs')}</button>
          <button class="mindex-tab${S.mushafIndexTab === 'juz' ? ' active' : ''}" data-act="mindextab" data-tab="juz" role="tab">${t('juz')}</button>
        </div>
        <button class="icon-btn mindex-x" data-act="mindexclose" title="${t('close')}" aria-label="${t('close')}"><svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      <div class="mindex-search">
        <svg class="ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input type="text" id="mIndexSearch" placeholder="${t('searchSurahOrJuz')}" value="${esc(S.mushafIndexQuery || '')}" autocomplete="off">
        ${S.mushafIndexQuery ? `<button class="icon-btn xs" data-act="mindexqclear"><svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>` : ''}
      </div>
      <div class="mindex-body" id="mIndexBody">
        ${mushafIndexItemsHTML()}
      </div>
    </div>
  </div>`;
}
function viewRead() {
  const n = S.readN, book = mushafBook();
  if (n <= 0) return mushafCoverHTML();
  const R = book ? mushafRight(n) : n;
  const L = book && R + 1 <= MUSHAF_PAGES ? R + 1 : null;
  const num = p => S.lang === 'ar' ? arDigits(p) : String(p);
  const tot = S.lang === 'ar' ? arDigits(MUSHAF_PAGES) : MUSHAF_PAGES;
  const jz = mushafJuz(R), jn = S.lang === 'ar' ? arDigits(jz) : jz;
  const sc = mushafSurah(R);
  const sm = SURAH[sc - 1], sn = S.lang === 'ar' ? sm[0] : sm[1];
  const rw = S.mushafRiwaya;
  const img = p => `<img src="${mushafSVGURL(p, rw)}" alt="${t('mushaf')} — ${t('page')} ${num(p)}" data-alts="${esc(mushafSources(p, rw).slice(1).join('|'))}">`;
  const prevOff = false, nextOff = book ? R >= MUSHAF_PAGES - 1 : n >= MUSHAF_PAGES;
  const footNum = L ? `${num(R)} – ${num(L)}` : `${num(R)} / ${tot}`;

  return `<div class="mushaf-wrap">
    <div class="mushaf-top">
      <div class="mt-start">
        <button class="icon-btn" data-act="mushafmenu" title="${t('menu')}" aria-label="${t('menu')}"><svg class="ic" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
        <button class="btn ghost sm mback-btn" data-act="mushafback" title="${t('back')}"><svg class="ic" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg><span class="bt-txt">${t('back')}</span></button>
      </div>
      <button class="mtop-pill" data-act="mindexopen" title="${t('mushafIndex')}" aria-label="${t('mushafIndex')}">
        <svg class="ic" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        <span class="mp-surah">${esc(sn)}</span>
        <span class="mp-dot">·</span>
        <span class="mp-juz">${t('juz')} ${jn}</span>
      </button>
      <div class="mt-actions">
        <button class="icon-btn" data-act="mlayout" title="${book ? t('onePage') : t('twoPages')}" aria-label="${book ? t('onePage') : t('twoPages')}">${book ? '<svg class="ic" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' : '<svg class="ic" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>'}</button>
        <div class="mzoom-group" role="group" aria-label="${t('zoomIn')} / ${t('zoomOut')}">
          <button class="icon-btn" data-act="mzoomout" title="${t('zoomOut')}" aria-label="${t('zoomOut')}"><svg class="ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>
          <button class="mzoom-pill" data-act="mzoomreset" title="${t('zoomReset')}" aria-label="${t('zoomReset')}"><span data-mzoom-val>${Math.round((S.mushafZoom || 1) * 100)}%</span></button>
          <button class="icon-btn" data-act="mzoomin" title="${t('zoomIn')}" aria-label="${t('zoomIn')}"><svg class="ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>
        </div>
        <button class="icon-btn" data-act="mfocus" title="${t('focusMode')}" aria-label="${t('focusMode')}"><svg class="ic" viewBox="0 0 24 24"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/></svg></button>
        <button class="icon-btn" data-act="mtheme" title="${t('theme')}" aria-label="${t('theme')}"><svg class="ic" viewBox="0 0 24 24"><path d="M20 13.5A8 8 0 0 1 10.5 4 8 8 0 1 0 20 13.5z"/></svg></button>
        <button class="icon-btn" data-act="mushafexit" title="${t('close')}" aria-label="${t('close')}"><svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
    </div>
    <div class="mushaf-body">
      <div class="mushaf-stage${book ? ' book' : ' single'}${S.mushafZoom > 1.0 ? ' mushaf-zoomed' : ''}" style="--mzoom:${S.mushafZoom || 1}">
        <div class="mushaf-page" data-page="${R}">${img(R)}</div>
        ${L ? `<div class="mushaf-page" data-page="${L}">${img(L)}</div>` : ''}
        <div class="flip-host" id="flipHost"></div>
      </div>
      <button class="mnav prev" data-act="mprev" ${prevOff ? 'disabled' : ''} aria-label="${t('previous')}"><svg class="ic" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
      <button class="mnav next" data-act="mnext" ${nextOff ? 'disabled' : ''} aria-label="${t('next')}"><svg class="ic" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
      <div class="mushaf-corner start">
        <button class="icon-btn" id="mSideBtn" data-act="sidetoggle" title="${t('hidePanel')}" aria-label="${t('hidePanel')}"><svg class="ic" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg></button>
        <button class="icon-btn" data-act="mushafback" title="${t('back')}" aria-label="${t('back')}"><svg class="ic" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
      </div>
      <div class="mushaf-corner end">
        <button class="icon-btn" data-act="mindexopen" title="${t('mushafIndex')}" aria-label="${t('mushafIndex')}"><svg class="ic" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></button>
        <button class="icon-btn" data-act="mlayout" title="${book ? t('onePage') : t('twoPages')}" aria-label="${book ? t('onePage') : t('twoPages')}">${book ? '<svg class="ic" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' : '<svg class="ic" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>'}</button>
        <button class="icon-btn" data-act="mzoomout" title="${t('zoomOut')}" aria-label="${t('zoomOut')}"><svg class="ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>
        <button class="icon-btn" data-act="mzoomin" title="${t('zoomIn')}" aria-label="${t('zoomIn')}"><svg class="ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></button>
        <button class="icon-btn" data-act="mfocus" title="${t('focusMode')}" aria-label="${t('focusMode')}"><svg class="ic" viewBox="0 0 24 24"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/></svg></button>
        <button class="icon-btn" data-act="mtheme" title="${t('theme')}" aria-label="${t('theme')}"><svg class="ic" viewBox="0 0 24 24"><path d="M20 13.5A8 8 0 0 1 10.5 4 8 8 0 1 0 20 13.5z"/></svg></button>
        <button class="icon-btn" data-act="mushafdlall" title="${t('dlPages')}" aria-label="${t('dlPages')}"><svg class="ic" viewBox="0 0 24 24"><path d="M12 3v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4 19h16"/></svg></button>
      </div>
    </div>
    <div class="mushaf-foot">
      <button class="btn sm" data-act="mprev" ${prevOff ? 'disabled' : ''}><svg class="ic" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg><span>${t('previous')}</span></button>
      <input type="range" class="mf-slider" id="mSlider" min="1" max="${MUSHAF_PAGES}" value="${R}" step="1" aria-label="${t('page')}">
      <span class="mf-num">${footNum}</span>
      <button class="btn sm" data-act="mnext" ${nextOff ? 'disabled' : ''}><span>${t('next')}</span><svg class="ic" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
    </div>
    <button class="icon-btn mrestore" data-act="mfocus" data-i18n-title="showPanel" aria-label="${t('showPanel')}"><svg class="ic" viewBox="0 0 24 24"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/></svg></button>
    ${mushafIndexModalHTML()}
  </div>`;
}
/* ═══════════════ PRAYER TIMES ═══════════════ */
const PRAYERS = [['Fajr', 'fajr'], ['Dhuhr', 'dhuhr'], ['Asr', 'asr'], ['Maghrib', 'maghrib'], ['Isha', 'isha']];
const FALLBACK_CITIES = [
  ['وادي العثمانية، ميلة', 36.2662, 6.3118], ['الجزائر العاصمة', 36.7538, 3.0588], ['قسنطينةة', 36.365, 6.6147], ['عنابة', 36.9, 7.7667],
  ['سطيف', 36.19, 5.41], ['باتنة', 35.5556, 6.1747], ['وهران', 35.6971, -0.6308], ['تلمسان', 34.8828, -1.3167],
  ['بجاية', 36.7509, 5.0567], ['تيزي وزو', 36.7169, 4.0497], ['البليدة', 36.4703, 2.8277], ['غرداية', 32.49, 3.67],
  ['مكة المكرمة', 21.4225, 39.8262], ['المدينة المنورة', 24.4672, 39.6111]
];
const PRAYER_EXTRA = [['Sunrise', 'sunrise'], ['Firstthird', 'firstThird'], ['Lastthird', 'lastThird']];
const prayerOff = k => ((S.prayerOffset && S.prayerOffset[k]) || 0) * 60000;
function setPrayerLoc(lat, lng, name, src) {
  S.prayerLoc = { lat: +lat, lng: +lng, name: name || S.prayerLoc.name, src: src || S.prayerLoc.src };
  store.set('prayerLoc', S.prayerLoc); S.prayerData = null; S.prayerKey = null; render();
  if ($('#prayerScrim').classList.contains('open')) openPrayerSettings()
}
async function reverseGeo(lat, lng) {
  try {
    const rlat = (+lat).toFixed(3), rlng = (+lng).toFixed(3);
    const j = await apiFetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${rlat}&longitude=${rlng}&localityLanguage=${S.lang === 'ar' ? 'ar' : 'en'}`, { timeout: 8000, retries: 1, ttl: 86400000 });
    return j.city || j.locality || j.principalSubdivision || ''
  } catch (e) { return '' }
}
function detectGPS() {
  return new Promise(res => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(async p => {
      const { latitude: lat, longitude: lng } = p.coords;
      res({ lat, lng, name: await reverseGeo(lat, lng) })
    }, () => res(null), { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 })
  })
}
async function detectIP() {
  const j = await apiFetch('https://get.geojs.io/v1/ip/geo.json', { timeout: 7000, retries: 0 }).catch(() => null)
    || await apiFetch('https://ipwho.is/', { timeout: 7000, retries: 0 }).catch(() => null)
    || await apiFetch('https://ipapi.co/json/', { timeout: 7000, retries: 0 }).catch(() => null);
  if (!j) return null;
  const lat = j.latitude != null ? j.latitude : j.lat, lng = j.longitude != null ? j.longitude : j.lng;
  if (lat == null || lng == null || isNaN(+lat) || isNaN(+lng)) return null;
  return { lat: +lat, lng: +lng, name: [j.city, j.country].filter(Boolean).join('\u060c ') }
}
async function detectLoc(mode) {
  toast(t('locDetecting'));
  let r = mode === 'net' ? null : await detectGPS(), src = 'gps';
  if (!r && mode !== 'gps') { r = await detectIP(); src = 'net' }
  if (!r || isNaN(r.lat) || isNaN(r.lng)) { toast(t('locFail')); return }
  setPrayerLoc(r.lat, r.lng, r.name, src);
}
function viewPrayer() {
  if (!S.prayerData) setTimeout(loadPrayer, 0);
  const L = S.prayerLoc;
  return `<div class="view-head prayer-head">
    <div><h2>${t('prayerTimes')}</h2></div>
    <button class="back-btn prayer-set-btn" data-act="prayerset" data-i18n-title="settings" aria-label="${t('settings')}">
      <svg class="ic" viewBox="0 0 24 24"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
      <span>${t('settings')}</span>
    </button>
  </div>
  <div class="prayer-wrap">
    <div class="prayer-loc">
      <svg class="ic" viewBox="0 0 24 24"><path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/></svg>
      <b>${esc(L.name)}</b>${L.src === 'net' ? `<span class="loc-approx" title="${t('locApproxT')}">${t('locApprox')}</span>` : ''}
      <button class="icon-btn" data-act="locauto" data-i18n-title="locAuto" aria-label="detect"><svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7.5"/></svg></button>
    </div>
    <div class="prayer-box" id="prayerBox">${S.prayerData ? prayerCardsHTML() : prayerSkeleton()}</div>
  </div>`;
}
function prayerSettingsHTML() {
  const L = S.prayerLoc;
  return `<div class="ps-sec">
      <div class="ps-title"><svg class="ic" viewBox="0 0 24 24"><path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/></svg><span>${t('location')}</span></div>
      <div class="ps-loc-cur">
        <b>${esc(L.name)}</b>${L.src === 'net' ? `<span class="loc-approx" title="${t('locApproxT')}">${t('locApprox')}</span>` : ''}
        <div class="ps-loc-btns">
          <button class="btn sm" data-act="locgps"><svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7.5"/></svg>${t('locGps')}</button>
          <button class="btn sm" data-act="locnet"><svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 4 5.6 4 9s-1.5 6.4-4 9c-2.5-2.6-4-5.6-4-9s1.5-6.4 4-9z"/></svg>${t('locNet')}</button>
        </div>
      </div>
      <div class="ps-loc-search">
        <input id="locQ" placeholder="${t('searchLoc')}">
        <button class="btn primary sm" data-act="locsearch">${t('search')}</button>
      </div>
      <div class="loc-res" id="locRes"></div>
      <div class="loc-chips"><span class="loc-chips-lab">${t('quickCities')}</span>${FALLBACK_CITIES.map(c => `<button class="loc-chip" data-act="citypick" data-lat="${c[1]}" data-lng="${c[2]}" data-name="${c[0]}">${c[0]}</button>`).join('')}</div>
      <div class="ps-privacy" style="font-size:11.5px;color:var(--ink2);margin-top:10px;opacity:.8">${t('locPrivacy')}</div>
    </div>
    <div class="ps-sec">
      <div class="ps-title"><svg class="ic" viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 6a8.5 8.5 0 0 1 0 12"/></svg><span>${t('adhanSec')}</span></div>
    <div class="ps-row">
      <div class="ps-lab"><b>${t('adhan')}</b><span>${t('adhanDesc')}</span></div>
      <div class="seg" id="segAdhanPg">
        <button data-adhpg="on" class="${S.adhanOn ? 'on' : ''}">${t('adhanOn')}</button>
        <button data-adhpg="off" class="${!S.adhanOn ? 'on' : ''}">${t('adhanOff')}</button>
      </div>
    </div>
    <div class="ps-row">
      <div class="ps-lab"><b>${t('adhanMode')}</b><span>${t('adhanModeDesc')}</span></div>
      <div class="seg" id="segAdModePg">
        <button data-admodepg="stop" class="${S.adhanMode !== 'duck' ? 'on' : ''}">${t('adhanStop')}</button>
        <button data-admodepg="duck" class="${S.adhanMode === 'duck' ? 'on' : ''}">${t('adhanDuck')}</button>
      </div>
    </div>
    <div class="ps-row">
      <div class="ps-lab"><b>${t('notify')}</b><span>${t('notifyDesc')}</span></div>
      <div class="seg" id="segNotifyPg">
        <button data-ntfpg="on" class="${S.notifyOn ? 'on' : ''}">${t('adhanOn')}</button>
        <button data-ntfpg="off" class="${!S.notifyOn ? 'on' : ''}">${t('adhanOff')}</button>
      </div>
    </div>
    <div class="ps-row">
      <div class="ps-lab"><b>${t('adhanVoice')}</b><span>${t('adhanVoiceDesc')}</span></div>
      <div class="ps-ctl">
        <select id="adhanVoiceSel" class="ps-sel">${ADHAN_VOICES.map(v => `<option value="${v.id}" ${S.adhanVoice === v.id ? 'selected' : ''}>${esc(S.lang === 'ar' ? v.name : v.name_en || v.name)}</option>`).join('')}</select>
        <button class="btn sm" data-psact="adhanpreview"><svg class="ic fill" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>${t('preview')}</button>
      </div>
    </div>
    <div class="ps-row">
      <div class="ps-lab"><b>${t('prOffset')}</b><span>${t('prOffsetDesc')}</span></div>
      <div class="ps-ctl poff-ctl">
        ${PRAYERS.map(([k, l]) => {
    const v = S.prayerOffset[k] || 0; return `<div class="poff-row"><span class="poff-name">${t(l)}</span>
        <button class="btn sm" data-poff="-5" data-pr="${k}">−5</button>
        <button class="btn sm" data-poff="-1" data-pr="${k}">−1</button>
        <b class="poff-val" dir="ltr">${v > 0 ? '+' : ''}${v}</b>
        <button class="btn sm" data-poff="1" data-pr="${k}">+1</button>
        <button class="btn sm" data-poff="5" data-pr="${k}">+5</button></div>`
  }).join('')}
      </div>
    </div>`;
}
function openPrayerSettings() {
  $('#prayerSetBody').innerHTML = prayerSettingsHTML();
  const q = $('#locQ');
  if (q) q.addEventListener('keydown', ev => { if (ev.key === 'Enter') { const v = q.value.trim(); if (v) prayerSearch(v) } });
  openModal('#prayerScrim');
}
async function fetchPrayer() {
  const L = S.prayerLoc, d = new Date();
  const day = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  const key = `${L.lat},${L.lng},${day}`;
  if (S.prayerData && S.prayerKey === key) return;
  try {
    const j = await apiFetch(`https://api.aladhan.com/v1/timings/${day}?latitude=${L.lat}&longitude=${L.lng}&method=3&iso8601=true`, { timeout: 10000, retries: 1, ttl: 3600000 });
    if (j.code !== 200) throw new Error(j.code);
    S.prayerData = j.data; S.prayerKey = key;
  } catch (e) { S.prayerData = null }
}
async function loadPrayer() {
  await fetchPrayer();
  if (S.prayerData) startPrayerTick();
  if (S.view === 'prayer') render();
}
function nextPrayerKey() {
  if (!S.prayerData) return null;
  const tm = S.prayerData.timings, now = Date.now();
  for (const [k] of PRAYERS) { if (new Date(tm[k]).getTime() + prayerOff(k) > now) return k }
  return 'Fajr';
}
const prayerTime = k => prayerTimeStr(S.prayerData.timings[k], S.prayerOffset && S.prayerOffset[k]);
function prayerCountdownStr() { return countdownStr(S.prayerData.timings, S.prayerOffset, Date.now()) }
const ADHAN_VOICES = [
  { id: 'abdulbasit', name: 'عبد الباسط عبد الصمد', name_en: 'Abdul Basit Abdul Samad', file: adhanUrl, fajrFile: adhanFajrUrl },
  { id: 'qatami', name: 'ناصر القطامي', name_en: 'Nasser Al-Qatami', file: vQatami },
  { id: 'algeria', name: 'أذان جزائري — الشيخ البليدي', name_en: 'Algerian — Sheikh Boulaidi', file: vBaldi },
  { id: 'makkah', name: 'أذان الحرم المكي', name_en: 'Grand Mosque of Makkah', file: vMakkah },
  { id: 'madinah', name: 'المسجد النبوي', name_en: 'Masjid an-Nabawi', file: vMadinah },
  { id: 'aqsa', name: 'المسجد الأقصى', name_en: 'Al-Aqsa Mosque', file: vAqsa },
  { id: 'turkey', name: 'أذان تركي', name_en: 'Turkish adhan', file: vTurkey },
  { id: 'egypt', name: 'أذان مصري — مصطفى إسماعيل', name_en: 'Egyptian — Mustafa Ismail', file: vEgypt }
];
const adhanVoice = () => ADHAN_VOICES.find(v => v.id === S.adhanVoice) || ADHAN_VOICES[0];
function showAdhanBanner(k) {
  const b = $('#adhanBanner'); if (!b) return;
  const v = adhanVoice();
  $('#abText').innerHTML = `<b>${t('adhanNow')} ${t(k.toLowerCase())}</b><span>${esc(S.lang === 'ar' ? v.name : v.name_en || v.name)}</span>`;
  b.classList.add('show');
}
function hideAdhanBanner() { const b = $('#adhanBanner'); if (b) b.classList.remove('show') }
function playAdhan(k) {
  if (!S.adhanAudio) { S.adhanAudio = new Audio(); S.adhanAudio.preload = 'auto' }
  const v = adhanVoice();
  S.adhanAudio.src = (k === 'Fajr' && v.fajrFile) ? v.fajrFile : v.file;
  S.adhanAudio.currentTime = 0;
  S.adhanAudio.onended = endAdhan;
  S.adhanAudio.play().catch(() => { });
  showAdhanBanner(k);
  notifyPrayer(k);
  if (S.adhanMode === 'duck') { S.adhanDuckV = audio.volume; audio.volume = Math.min(audio.volume, 0.15) }
  else if (!audio.paused) audio.pause();
}
function endAdhan() {
  hideAdhanBanner();
  if (S.adhanDuckV != null) { audio.volume = S.adhanDuckV; S.adhanDuckV = null }
}
function stopAdhan() { if (S.adhanAudio) S.adhanAudio.pause(); endAdhan() }
function notifyPrayer(k) {
  if (!S.notifyOn || !('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification(`${t('adhanNow')} ${t(k.toLowerCase())}`, { body: S.prayerLoc.name, tag: 'ouns-adhan' }) } catch (e) { }
}
function adhanTick() {
  if (!S.adhanOn || !S.prayerData) return;
  const tm = S.prayerData.timings, now = Date.now();
  for (const [k] of PRAYERS) {
    const tt = new Date(tm[k]).getTime() + prayerOff(k);
    if (now >= tt && now - tt < 90000) {
      const key = `${S.prayerKey}|${k}`;
      if (S.adhanLast !== key) { S.adhanLast = key; store.set('adhanLast', key); playAdhan(k) }
      break;
    }
  }
}
setInterval(async () => { await fetchPrayer(); adhanTick(); if (S.prayerData && !S.prayerTimer) startPrayerTick() }, 10000);
fetchPrayer().then(() => { if (S.prayerData) { startPrayerTick(); if (S.view === 'home' || S.view === 'prayer') { render(); paintWeather() } } });

/* ═══════════════════ ADHKAR ═══════════════════ */
const AK_CATS = (() => {
  const out = []; for (const c of ADHKAR) {
    if (c.category === 'أذكار الصباح والمساء') { out.push({ name: 'أذكار الصباح', items: c.array }); out.push({ name: 'أذكار المساء', items: c.array }) }
    else out.push({ name: c.category, items: c.array })
  } return out
})();
const AK_CAT_EN = { "أذكار الصباح": "Morning adhkar", "أذكار المساء": "Evening adhkar", "أذكار الصباح والمساء": "Morning & evening adhkar", "أذكار النوم": "Sleep adhkar", "أذكار الاستيقاظ من النوم": "Waking up adhkar", "دعاء دخول الخلاء": "Entering the restroom", "دعاء الخروج من الخلاء": "Leaving the restroom", "الذكر قبل الوضوء": "Before ablution", "الذكر بعد الفراغ من الوضوء": "After ablution", "الذكر عند الخروج من المنزل": "Leaving the house", "الذكر عند دخول المنزل": "Entering the house", "دعاء الذهاب إلى المسجد": "Going to the mosque", "دعاء دخول المسجد": "Entering the mosque", "دعاء الخروج من المسجد": "Leaving the mosque", "أذكار الآذان": "Adhan adhkar", "دعاء ُلبْس الثوب": "Wearing a garment", "دعاء ُلبْس الثوب الجديد": "Wearing a new garment", "الدعاء لمن لبس ثوبا جديدا": "Supplication for one wearing a new garment", "ما يقول إذا وضع ثوبه": "Taking off a garment", "دعاء الاستفتاح": "Opening supplication", "دعاء الركوع": "Bowing (ruku) supplication", "دعاء الرفع من الركوع": "Rising from bowing", "دعاء السجود": "Prostration supplication", "دعاء الجلسة بين السجدتين": "Sitting between the two prostrations", "دعاء سجود التلاوة": "Prostration of recitation", "التشهد": "Tashahhud", "الصلاة على النبي بعد التشهد": "Salawat after tashahhud", "الدعاء بعد التشهد الأخير قبل السلام": "Supplication after the final tashahhud", "الأذكار بعد السلام من الصلاة": "Adhkar after salam", "دعاء صلاة الاستخارة": "Istikhara supplication", "الدعاء إذا تقلب ليلا": "Turning in bed at night", "دعاء الفزع في النوم و من بُلِيَ بالوحشة": "Fright during sleep or loneliness", "ما يفعل من رأى الرؤيا أو الحلم": "Upon seeing a dream", "دعاء قنوت الوتر": "Witr qunut supplication", "الذكر عقب السلام من الوتر": "After the witr salam", "دعاء الهم والحزن": "Anxiety and grief", "دعاء الكرب": "Distress", "دعاء لقاء العدو و ذي السلطان": "Meeting an enemy or a ruler", "دعاء من خاف ظلم السلطان": "Fearing a ruler's injustice", "الدعاء على العدو": "Supplication against an enemy", "ما يقول من خاف قوما": "Fearing a people", "دعاء من أصابه وسوسة في الإيمان": "Doubts in faith", "دعاء قضاء الدين": "Repaying a debt", "دعاء الوسوسة في الصلاة و القراءة": "Whispering in prayer or recitation", "دعاء من استصعب عليه أمر": "Difficult matter", "ما يقول ويفعل من أذنب ذنبا": "After committing a sin", "دعاء طرد الشيطان و وساوسه": "Repelling Satan's whispers", "الدعاء حينما يقع ما لا يرضاه أو ُ غلب على أمره": "When an unwanted matter befalls", "ﺗﻬنئة المولود له وجوابه": "Congratulating a newborn", "ما يعوذ به الأولاد": "Protection for children", "الدعاء للمريض في عيادته": "Visiting the sick", "فضل عيادة المريض": "Virtue of visiting the sick", "دعاء المريض الذي يئس من حياته": "Patient despairing of life", "تلقين المحتضر": "Instructing the dying", "دعاء من أصيب بمصيبة": "Afflicted by a calamity", "الدعاء عند إغماض الميت": "Closing the deceased's eyes", "الدعاء للميت في الصلاة عليه": "Funeral prayer supplication", "الدعاء للفرط في الصلاة عليه": "Funeral prayer for a child", "دعاء التعزية": "Condolence", "الدعاء عند إدخال الميت القبر": "Placing the deceased in the grave", "الدعاء بعد دفن الميت": "After burial", "دعاء زيارة القبور": "Visiting graves", "دعاء الريح": "Wind", "دعاء الرعد": "Thunder", "من أدعية الاستسقاء": "Rain-seeking supplications", "الدعاء إذا نزل المطر": "When rain falls", "الذكر بعد نزول المطر": "After rain", "من أدعية الاستصحاء": "Drought supplications", "دعاء رؤية الهلال": "Seeing the crescent", "الدعاء عند إفطار الصائم": "Breaking the fast", "الدعاء قبل الطعام": "Before eating", "الدعاء عند الفراغ من الطعام": "After eating", "دعاء الضيف لصاحب الطعام": "Guest's supplication for the host", "التعريض بالدعاء لطلب الطعام أو الشراب": "Indirectly asking for food or drink", "الدعاء إذا أفطر عند أهل بيت": "Breaking fast at a host's home", "دعاء الصائم إذا حضر الطعام ولم يفطر": "Fasting person when food is served", "ما يقول الصائم إذا سابه أحد": "When a fasting person is insulted", "الدعاء عند رؤية باكورة الثمر": "Seeing the first fruits", "دعاء العطاس": "Sneezing", "ما يقال للكافر إذا عطس فحمد الله": "A non-Muslim who sneezes", "الدعاء للمتزوج": "For the newlywed", "دعاء المتزوج و شراء الدابة": "Newlywed and buying an animal", "الدعاء قبل إتيان الزوجة": "Before intimacy", "دعاء الغضب": "Anger", "دعاء من رأى مبتلى": "Seeing an afflicted person", "ما يقال في اﻟﻤﺠلس": "In a gathering", "كفارة اﻟﻤﺠلس": "Expiation of a gathering", "الدعاء لمن قال غفر الله لك": "One who says \"May Allah forgive you\"", "الدعاء لمن صنع إليك معروفا": "One who does you a favor", "ما يعصم الله به من الدجال": "Protection from the Dajjal", "الدعاء لمن قال إني أحبك في الله": "One who says \"I love you for Allah\"", "الدعاء لمن عرض عليك ماله": "One who offers you wealth", "الدعاء لمن أقرض عند القضاء": "One who lends money", "دعاء الخوف من الشرك": "Fear of polytheism", "الدعاء لمن قال بارك الله فيك": "One who says \"Barak Allah fik\"", "دعاء كراهية الطيرة": "Bad omens", "دعاء الركوب": "Riding", "دعاء السفر": "Travel", "دعاء دخول القرية أو البلدة": "Entering a town", "دعاء دخول السوق": "Entering the market", "الدعاء إذا تعس المركوب": "Mount stumbling", "دعاء المسافر للمقيم": "Traveler for the resident", "دعاء المقيم للمسافر": "Resident for the traveler", "التكبير و التسبيح في سير السفر": "Takbir while traveling", "دعاء المسافر إذا أسحر": "Traveler at dawn", "الدعاء إذا نزل مترلا في سفر أو غيره": "Camping at night", "ذكر الرجوع من السفر": "Returning from travel", "ما يقول من أتاه أمر يسره أو يكرهه": "Pleasing or displeasing matter", "فضل الصلاة على النبي صلى الله عليه و سلم": "Virtue of salawat", "إفشاء السلام": "Spreading greetings", "كيف يرد السلام على الكافر إذا سلم": "Replying to a non-Muslim's greeting", "الدُّعاءُ عِنْدَ سَمَاعِ صِياحِ الدِّيكِ ونَهِيقِ الْحِمَارِ": "Hearing a rooster or a donkey", "دعاء نباح الكلاب بالليل": "Dogs barking at night", "الدعاء لمن سببته": "One who insults you", "ما يقول المسلم إذا مدح المسلم": "Praising a Muslim", "ما يقول المسلم إذا زكي": "One who praises you", "كيف يلبي المحرم في الحج أو العمرة ؟": "Talbiyah of Ihram", "التكبير إذا أتى الركن الأسود": "Reaching the Black Stone", "الدعاء بين الركن اليماني والحجر الأسود": "Between the Yemani corner and the Black Stone", "دعاء الوقوف على الصفا والمروة": "Safa and Marwa", "الدعاء يوم عرفة": "Day of Arafah", "الذكر عند المشعر الحرام": "Al-Mash'ar al-Haram", "التكبير عند رمي الجمار مع كل حصاة": "Stoning the pillars", "دعاء التعجب والأمر السار": "Wonder and good news", "ما يفعل من أتاه أمر يسره": "Pleasing matter", "ما يقول من أحس وجعا في جسده": "Body pain", "دعاء من خشي أن يصيب شيئا بعينه": "Fear of losing eyesight", "ما يقال عند الفزع": "Fright", "ما يقول عند الذبح أو النحر": "Slaughtering", "ما يقول لرد كيد مردة الشياطين": "Warding off devils", "الاستغفار و التوبة": "Seeking forgiveness and repentance", "فضل التسبيح و التحميد، و التهليل، و التكبير": "Virtue of glorification", "كيف كان النبي يسبح؟": "How the Prophet glorified", "من أنواع الخير والآداب الجامعة": "General goodness and manners" };
const akCatName = n => S.lang === 'ar' ? n : (AK_CAT_EN[n] || n);
function akTodayKey() { const d = new Date(), p = n => String(n).padStart(2, '0'); return `adhkar_${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` }
function akProgress() { return store.get(akTodayKey(), {}) || {} }
function akCatProgress(ci) { return akProgress()[ci] || {} }
function akSave(ci, id, left) { const all = akProgress(); (all[ci] = all[ci] || {})[id] = left; store.set(akTodayKey(), all) }
function akDoneCount(ci) { const p = akCatProgress(ci); return AK_CATS[ci].items.filter(a => (p[a.id] ?? a.count) === 0).length }
function akDoneChip(ci) { const done = akDoneCount(ci), tot = AK_CATS[ci].items.length; return done ? `<span class="ak-prog">${t('akProgress')} ${arDigits(done)}/${arDigits(tot)}</span>` : '' }
function akAutoCat() { const h = new Date().getHours(), m = AK_CATS.findIndex(c => c.name === 'أذكار الصباح'), e = AK_CATS.findIndex(c => c.name === 'أذكار المساء'); if (m < 0 && e < 0) return null; if (m < 0) return e; if (e < 0) return m; return h >= 4 && h < 12 ? m : e }
function akPurgeOld() { try { const today = 'ouns_' + akTodayKey(); for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (/^ouns_adhkar_\d{4}-\d{2}-\d{2}$/.test(k) && k !== today) localStorage.removeItem(k) } } catch (e) { } }
const AK_FEATURED = ['أذكار الصباح', 'أذكار المساء', 'أذكار النوم', 'أذكار الاستيقاظ من النوم', 'الأذكار بعد السلام من الصلاة'];
const AK_ICONS = {
  'أذكار الصباح': '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
  'أذكار المساء': '<path d="M20 12.5A8 8 0 1 1 11.5 4 6.5 6.5 0 0 0 20 12.5z"/>',
  'أذكار النوم': '<path d="M20 12.5A8 8 0 1 1 11.5 4 6.5 6.5 0 0 0 20 12.5z"/><path d="M17 4l.5 1.5L19 6l-1.5.5L17 8l-.5-1.5L15 6l1.5-.5z"/>',
  'أذكار الاستيقاظ من النوم': '<path d="M12 5v3M12 2l1 1M4.9 4.9l2.1 2.1M12 21v-3M5 21h14"/><circle cx="12" cy="13" r="4"/>',
  'الأذكار بعد السلام من الصلاة': '<circle cx="12" cy="10" r="3"/><path d="M12 5V3M12 17v4M7 21h10M5 10a7 7 0 0 1 14 0"/>'
};
function viewAdhkar() {
  if (S.adhkarCat != null) return viewAdhkarCat();
  const q = norm2(S.query || '');
  const feat = AK_CATS.map((c, i) => ({ c, i })).filter(x => AK_FEATURED.includes(x.c.name));
  const rest = AK_CATS.map((c, i) => ({ c, i })).filter(x => !AK_FEATURED.includes(x.c.name) && (!q || norm2(x.c.name).includes(q)));
  return `<div class="view-head"><div><h2>${t('adhkar')}</h2><div class="sub">${t('adhkarSub')}</div></div></div>
  <div class="ak-feat">${feat.map(x => `<button class="ak-hero" data-akcat="${x.i}">
    <svg class="ic" viewBox="0 0 24 24">${AK_ICONS[x.c.name] || AK_ICONS['أذكار الصباح']}</svg>
    <b>${esc(akCatName(x.c.name))}</b><span>${arDigits(x.c.items.length)} ${t('dhikr')}</span>${akDoneChip(x.i)}</button>`).join('')}</div>
  ${q ? `<div class="ak-grid">${rest.map(x => `<button class="ak-cat" data-akcat="${x.i}"><span>${esc(akCatName(x.c.name))}</span><span class="n">${arDigits(x.c.items.length)}</span></button>`).join('') || `<div class="empty"><p>${t('noResults')}</p></div>`}</div>`
      : `<div class="view-head"><div><h2 class="ak-more">${t('allCats')}</h2></div></div>
  <div class="ak-grid">${rest.map(x => `<button class="ak-cat" data-akcat="${x.i}"><span>${esc(akCatName(x.c.name))}</span><span class="n">${arDigits(x.c.items.length)}</span></button>`).join('')}</div>`}`;
}
function viewAdhkarCat() {
  const c = AK_CATS[S.adhkarCat];
  const num = n => S.lang === 'ar' ? arDigits(n) : n;
  const prog = akCatProgress(S.adhkarCat);
  const done = c.items.filter(a => (prog[a.id] ?? a.count) === 0).length;
  return `<button class="back-btn" data-akback><svg class="ic" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>${t('back')}</button>
  <div class="view-head"><div><h2>${esc(akCatName(c.name))}</h2><div class="sub" id="akProg" data-done="${done}" data-total="${c.items.length}">${num(c.items.length)} ${t('dhikr')} · ${t('akProgress')} ${num(done)}/${num(c.items.length)}</div></div></div>
  <div class="ak-list">${c.items.map(a => {
    const rem = prog[a.id] ?? a.count; return `<div class="ak-card${rem === 0 ? ' done' : ''}">
    <p class="ak-text">${esc(a.text)}</p>
    <div class="ak-foot">
      <button class="ak-tap" data-akdec="${a.id}" data-left="${rem}" data-max="${a.count}"${rem === 0 ? ' disabled' : ''}>
        <b>${num(rem)}</b><span>/${num(a.count)}</span>
      </button>
    </div></div>`}).join('')}</div>`;
}
function akTap(btn) {
  let l = +btn.dataset.left;
  if (l <= 0) return;
  l--; btn.dataset.left = l;
  const num = n => S.lang === 'ar' ? arDigits(n) : n;
  btn.innerHTML = `<b>${num(l)}</b><span>/${num(btn.dataset.max)}</span>`;
  akSave(S.adhkarCat, +btn.dataset.akdec, l);
  const card = btn.closest('.ak-card');
  if (l === 0) { card.classList.add('done'); btn.disabled = true; toast(t('akDone')) }
  const pr = $('#akProg');
  if (pr && l === 0) { const d = +pr.dataset.done + 1; pr.dataset.done = d; pr.textContent = `${num(+pr.dataset.total)} ${t('dhikr')} · ${t('akProgress')} ${num(d)}/${num(pr.dataset.total)}` }
}
/* ═══════════════════════════════ YOUTUBE RECITATIONS ═══════════════════════════════ */
const YT_LIST = [
  { id: 'f1F0JkkNPow', reciter: 'عبد الباسط عبد الصمد', title: 'سورة البقرة كاملة', reciter_en: "Abdul Basit Abdul Samad", title_en: "Surah Al-Baqarah — Complete" },
  { id: 'WWYUduHRUHU', reciter: 'عبد الباسط عبد الصمد', title: 'سورة الكهف — مجود', reciter_en: "Abdul Basit Abdul Samad", title_en: "Surah Al-Kahf — Mujawwad" },
  { id: 'fpXW6nZC7WE', reciter: 'محمد صديق المنشاوي', title: 'سورة البقرة — مرتّلة', reciter_en: "Mohamed Siddiq Al-Minshawi", title_en: "Surah Al-Baqarah — Murattal" },
  { id: 'b4i7j6U7Ul8', reciter: 'ماهر المعيقلي', title: 'سورة البقرة — النسخة الأصلية', reciter_en: "Maher Al-Muaiqly", title_en: "Surah Al-Baqarah — Original recording" },
  { id: 'nUXRnSA9fHU', reciter: 'ياسر الدوسري', title: 'سورة البقرة كاملة', reciter_en: "Yasser Al-Dosari", title_en: "Surah Al-Baqarah — Complete" },
  { id: '-k6G1REuPQA', reciter: 'بدر التركي', title: 'سورة البقرة كاملة', reciter_en: "Badr Al-Turki", title_en: "Surah Al-Baqarah — Complete" },
  { id: 'RdNx4qIRHTE', reciter: 'بدر التركي', title: 'سورة يس كاملة', reciter_en: "Badr Al-Turki", title_en: "Surah Yasin — Complete" },
  { id: 'W0C-R4Frf5w', reciter: 'بدر التركي', title: 'سورة الفتح كاملة', reciter_en: "Badr Al-Turki", title_en: "Surah Al-Fath — Complete" },
  { id: 'ylQyd_qg2rg', reciter: 'محمد ديبروف', title: 'سورة البقرة كاملة', reciter_en: "Muhammad Dibirov", title_en: "Surah Al-Baqarah — Complete" },
  { id: 'v0gFVowpBXk', reciter: 'محمد ديبروف', title: 'سورة يس كاملة', reciter_en: "Muhammad Dibirov", title_en: "Surah Yasin — Complete" },
  { id: '63M2JhRGgQQ', reciter: 'سعود الشريم', title: 'سورة البقرة كاملة', reciter_en: "Saud Al-Shuraim", title_en: "Surah Al-Baqarah — Complete" },
  { id: 'SytvCjPesP0', reciter: 'سعود الشريم', title: 'سورة الذاريات كاملة', reciter_en: "Saud Al-Shuraim", title_en: "Surah Adh-Dhariyat — Complete" },
  { id: 'NuWRdPZANNc', reciter: 'سعود الشريم', title: 'سورة القصص كاملة', reciter_en: "Saud Al-Shuraim", title_en: "Surah Al-Qasas — Complete" },
  { id: 'U9PzDaVRmMA', reciter: 'سعود الشريم', title: 'تلاوة خاشعة تهدا العقل وتذهب الهم', reciter_en: "Saud Al-Shuraim", title_en: "A tranquil recitation that calms the mind" },
  { id: 'JgpefhXIPvs', reciter: 'بدر التركي', title: 'سورة الأحزاب ٢١-٢٧ — من المؤمنين رجال صدقوا', reciter_en: "Badr Al-Turki", title_en: "Surah Al-Ahzab 21–27 — Men of truth" },
  { id: '6JdOc53G9Z8', reciter: 'بدر التركي', title: 'سور: يس، الرحمن، الواقعة، الملك', reciter_en: "Badr Al-Turki", title_en: "Surahs Yasin, Ar-Rahman, Al-Waqiah, Al-Mulk" },
  { id: 'Mgtp1SaVvPc', reciter: 'بدر التركي', title: 'تلاوة مؤثرة جداً يأخذك لعالم آخر', reciter_en: "Badr Al-Turki", title_en: "A deeply moving recitation" },
  { id: 'UHKn1WSFJNo', reciter: 'محمد ديبروف', title: 'وما لنا ألا نتوكل على الله وقد هدانا سبلنا', reciter_en: "Muhammad Dibirov", title_en: "Why not rely on Allah — He has guided us" },
  { id: 'KPFnaDJ3l_w', reciter: 'ياسر الدوسري', title: 'قل لمن الأرض ومن فيها — سورة المؤمنون', reciter_en: "Yasser Al-Dosari", title_en: "Say: to whom belongs the earth — Al-Muminun" },
  { id: 'Rfh36mjrLBo', reciter: 'ياسر الدوسري', title: 'سورة المؤمنون — تلاوة خاشعة', reciter_en: "Yasser Al-Dosari", title_en: "Surah Al-Muminun — Tranquil recitation" },
  { id: 'Ect7R47t5XA', reciter: 'محمد صديق المنشاوي', title: 'قرآن الصباح — أجمل ما تبدأ به يومك', reciter_en: "Mohamed Siddiq Al-Minshawi", title_en: "Morning Quran — a beautiful start to your day" },
  { id: 'Wryu6u_ENtE', reciter: 'شريف مصطفى', title: 'سورة الدخان — تلاوة خاشعة', reciter_en: "Sherif Mustafa", title_en: "Surah Ad-Dukhan — Tranquil recitation" },
  { id: 'qmxCz3Sgy94', reciter: 'عبد الرحمن مسعد', title: 'تلاوة مؤثرة أرح سمعك وقلبك', reciter_en: "Abdul Rahman Mosad", title_en: "A moving recitation to soothe your heart" },
  { id: 'hiIqeTznnS8', reciter: 'محمد مسعد', title: 'سورة القيامة — تلاوة هادئة', reciter_en: "Muhammad Mosad", title_en: "Surah Al-Qiyamah — Calm recitation" },
  { id: '0dAwXrtS2aM', reciter: 'محمد مسعد', title: 'ساعة كاملة من أجمل التلاوات — راحة نفسية', reciter_en: "Muhammad Mosad", title_en: "One hour of the most beautiful recitations" },
  { id: 'Ucn4goq4EMI', reciter: 'هيثم الدخين', title: 'روائع التلاوات — أهدأ ما تسمعه', reciter_en: "Haitham Al-Dukayn", title_en: "Among the most tranquil recitations" },
  { id: 'nXt2_Rpb71w', reciter: 'عبدالعزيز السحيم', title: 'سورة الملك — تلاوة مؤثرة', reciter_en: "Abdulaziz Al-Suhaim", title_en: "Surah Al-Mulk — Moving recitation" },
  { id: '-VfaRGe14xc', reciter: 'علاء عقل', title: 'أذكار الصباح — راحة نفسية لا توصف', reciter_en: "Alaa Aqel", title_en: "Morning adhkar — indescribable serenity" },
  { id: 'byM54Y35Qi8', reciter: 'حمزة بوديب', title: 'أذكار الصباح — بأجمل صوت', reciter_en: "Hamza Boudib", title_en: "Morning adhkar — in the most beautiful voice" },
  { id: 'BfwSLOHlPrw', reciter: 'يونس اسويلص', title: 'تلاوة مؤثرة يرق لها القلب', reciter_en: "Younes Aswailas", title_en: "A moving recitation that touches the heart" },
];
let ytApiP = null, ytPlayer = null, ytTimer = null, ytCcOn = false;
function loadYtApi() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (!ytApiP) { ytApiP = new Promise(res => { window.onYouTubeIframeAPIReady = () => res(); const sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api'; document.head.append(sc) }) }
  return ytApiP;
}
function destroyYt() {
  if (ytTimer) { clearInterval(ytTimer); ytTimer = null }
  if (ytPlayer) { try { ytPlayer.destroy() } catch (e) { } ytPlayer = null }
  ytCcOn = false;
}
function ytIdx() { return YT_LIST.findIndex(x => x.id === S.ytId) }
function ytNext(dir) {
  const i = ytIdx(); if (i < 0) return;
  const j = (i + dir + YT_LIST.length) % YT_LIST.length;
  S.ytId = YT_LIST[j].id; render();
}
function ytToggle() {
  if (!ytPlayer || !ytPlayer.getPlayerState) return;
  ytPlayer.getPlayerState() === 1 ? ytPlayer.pauseVideo() : ytPlayer.playVideo();
}
function ytStateUI(st) {
  const box = $('#ytPlayerBox'); if (box) box.classList.toggle('playing', st === 1);
  const ic = $('#ytPlayIc'); if (ic) ic.innerHTML = st === 1 ? '<path d="M8 5h3.5v14H8zM12.5 5H16v14h-3.5z"/>' : '<path d="M7 4.5v15l13-7.5z"/>';
}
function ytBarInit(p) {
  const d = p.getDuration() || 0;
  const sl = $('#ytSeek'); if (sl) sl.max = Math.max(1, Math.round(d));
  const du = $('#ytDur'); if (du) du.textContent = fmt(d);
  if (ytTimer) clearInterval(ytTimer);
  ytTimer = setInterval(() => {
    if (!ytPlayer || !ytPlayer.getCurrentTime) return;
    const c = ytPlayer.getCurrentTime() || 0, dd = ytPlayer.getDuration() || 0;
    const se = $('#ytSeek'); if (se && !se.matches(':active')) { se.max = Math.max(1, Math.round(dd)); se.value = Math.round(c) }
    const tc = $('#ytCur'); if (tc) tc.textContent = fmt(c);
    if (ytPlayer.getPlayerState) ytStateUI(ytPlayer.getPlayerState());
  }, 500);
}
function mountYtPlayer(cur) {
  destroyYt();
  loadYtApi().then(() => {
    if (!$('#ytFrame') || !window.YT || !window.YT.Player) return;
    ytPlayer = new YT.Player('ytFrame', {
      videoId: cur.id,
      playerVars: { controls: 0, rel: 0, modestbranding: 1, iv_load_policy: 3, disablekb: 1, playsinline: 1, autoplay: 1, fs: 0, cc_load_policy: 0, origin: window.location.origin },
      events: {
        onReady: ev => { try { ev.target.setOption('captions', 'track', {}) } catch (e) { } ev.target.playVideo(); ytBarInit(ev.target) },
        onStateChange: ev => { ytStateUI(ev.data); if (ev.data === 0) ytNext(1) },
        onError: () => ytNext(1)
      }
    });
  }).catch(() => { });
}
function viewYt() {
  const cur = S.ytId ? YT_LIST.find(x => x.id === S.ytId) : null;
  return `${cur ? `<button class="back-btn" data-act="ytback"><svg class="ic" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>${t('ytAll')}</button>
  <div class="yt-player" id="ytPlayerBox">
    <div id="ytFrame"></div>
    <div class="yt-grad"></div>
    <div class="yt-big" id="ytOv" role="button" aria-label="${t('play')}"><svg class="ic fill" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg></div>
    <div class="yt-bar">
      <button class="yt-btn" data-ytnav="-1" aria-label="${t('previous')}" title="${t('previous')}"><svg class="ic fill" viewBox="0 0 24 24"><path d="M6 5h2.4v14H6z"/><path d="M20 5v14l-10-7z"/></svg></button>
      <button class="yt-btn big" id="ytPlayBtn" aria-label="${t('play')}" title="${t('play')}"><svg class="ic fill" id="ytPlayIc" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg></button>
      <button class="yt-btn" data-ytnav="1" aria-label="${t('next')}" title="${t('next')}"><svg class="ic fill" viewBox="0 0 24 24"><path d="M15.6 5H18v14h-2.4z"/><path d="M4 5v14l10-7z"/></svg></button>
      <span class="yt-time" id="ytCur" dir="ltr">0:00</span>
      <input type="range" class="yt-seek" id="ytSeek" min="0" max="100" step="1" value="0" dir="ltr" aria-label="${t('kSeek')}">
      <span class="yt-time" id="ytDur" dir="ltr">0:00</span>
      <button class="yt-btn" id="ytMuteBtn" aria-label="${t('mute')}" title="${t('mute')}"><svg class="ic fill" viewBox="0 0 24 24"><path d="M11 5 6.5 9H3v6h3.5L11 19z"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M17.5 6.5a8 8 0 0 1 0 11"/></svg></button>
      <input type="range" class="yt-vol" id="ytVol" min="0" max="100" value="100" dir="ltr" aria-label="${t('volume')}">
      <button class="yt-btn" id="ytCcBtn" aria-label="${t('cc')}" title="${t('cc')}"><svg class="ic" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10.5 10.5a2 2 0 1 0 0 3M17 10.5a2 2 0 1 0 0 3"/></svg></button>
      <button class="yt-btn" id="ytFsBtn" aria-label="${t('expand')}" title="${t('expand')}"><svg class="ic" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
    </div>
    <div class="yt-cap"><b>${esc(S.lang === 'ar' ? cur.reciter : cur.reciter_en || cur.reciter)}</b><span>${esc(S.lang === 'ar' ? cur.title : cur.title_en || cur.title)}</span></div>
  </div>`: ''}
  <div class="view-head"><div><h2>${t('ytView')}</h2><div class="sub">${t('ytSub')}</div></div></div>
  <div class="yt-grid">${YT_LIST.map(v => `<button class="yt-card${S.ytId === v.id ? ' active' : ''}" data-yt="${v.id}">
    <span class="yt-thumb"><img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="" loading="lazy"/>
    <span class="yt-play"><svg class="ic fill" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg></span></span>
    <b>${esc(S.lang === 'ar' ? v.reciter : v.reciter_en || v.reciter)}</b><span>${esc(S.lang === 'ar' ? v.title : v.title_en || v.title)}</span></button>`).join('')}</div>`;
}
function prayerSkeleton() {
  const card = '<div class="skel skel-card"></div>';
  return `<div class="prayer-skel"><div class="skel skel-bar"></div><div class="prayer-grid">${card.repeat(5)}</div><div class="prayer-grid alt">${card.repeat(3)}</div></div>`;
}
function prayerCardsHTML() {
  const tm = S.prayerData.timings, hj = S.prayerData.date.hijri;
  const num = p => S.lang === 'ar' ? arDigits(p) : p;
  const next = nextPrayerKey();
  const cards = PRAYERS.map(([k, l]) => `<div class="prayer-card${k === next ? ' next' : ''}">
    <span>${t(l)}</span><b>${esc(num(prayerTime(k)))}</b>
  </div>`).join('');
  const extra = PRAYER_EXTRA.map(([k, l]) => `<div class="prayer-card alt">
    <span>${t(l)}</span><b>${esc(num(prayerTime(k)))}</b>
  </div>`).join('');
  const hdate = `${esc(num(hj.day))} ${esc(S.lang === 'ar' ? hj.month.ar : hj.month.en)} ${esc(num(hj.year))}`;
  return `<div class="prayer-next">
    <span>${t('nextPrayer')} — ${t(next.toLowerCase())}</span>
    <b id="prCountdown" class="pr-count" dir="ltr">${prayerCountdownStr()}</b>
  </div>
  <div class="pr-sec">${t('prToday')}</div>
  <div class="prayer-grid">${cards}</div>
  <div class="pr-sec">${t('prNight')}</div>
  <div class="prayer-grid alt">${extra}</div>
  <div class="prayer-date">${hdate} · ${esc(S.prayerData.date.readable)}</div>`;
}
function startPrayerTick() {
  clearInterval(S.prayerTimer);
  S.prayerTimer = setInterval(() => {
    if (!S.prayerData) return;
    const str = prayerCountdownStr();
    $$('.pr-count').forEach(el => el.textContent = str);
  }, 1000);
}
async function prayerSearch(q) {
  const box = $('#locRes'); if (!box) return;
  box.innerHTML = `<span class="lr-empty">${t('loading')}</span>`;
  try {
    const list = await nominatimSearch(q, S.lang);
    if (!list.length) { box.innerHTML = `<span class="lr-empty">${t('locNotFound')}</span>`; return }
    box.innerHTML = list.map(r => `<button class="loc-item" data-loc="${r.lat},${r.lon},${esc(r.display_name.split(',').slice(0, 2).join('،'))}">${esc(r.display_name)}</button>`).join('');
  } catch (e) { box.innerHTML = `<span class="lr-empty">${t('locNotFound')}</span>` }
}
/* ═══════════════ FAVORITES ═══════════════ */
const favKey = tr => tr.key;
function isFaved(tr) { return S.favorites.some(f => f.key === favKey(tr)) }
function toggleFav(tr) {
  if (!tr) return;
  const k = favKey(tr); const i = S.favorites.findIndex(f => f.key === k);
  if (i >= 0) {
    const [rm] = S.favorites.splice(i, 1); store.set('favorites', S.favorites);
    toast(t('removedFav'), { label: t('undo'), fn: () => { S.favorites.splice(i, 0, rm); store.set('favorites', S.favorites); refreshFavUI() } })
  }
  else { S.favorites.unshift({ key: k, n: tr.n, rid: tr.rid, mid: tr.mid, server: tr.server, rewaya: tr.rewaya, mname: tr.mname, rar: tr.rar, ren: tr.ren }); store.set('favorites', S.favorites); toast(t('addedFav')) }
  refreshFavUI();
}
function refreshFavUI() {
  updateFavButtons(); updateCounts(); if (S.view === 'favorites' || S.view === 'recent') render(); else markPlayingRows();
  $$('.surah-row [data-fav]').forEach(b => { const on = S.favorites.some(f => f.key === b.dataset.fav); b.classList.toggle('faved', on) })
}
function updateFavButtons() {
  const on = S.current && isFaved(S.current);
  ['npFav', 'pbFav'].forEach(id => { const el = $('#' + id); el.classList.toggle('faved', on); el.classList.toggle('on', on) });
  $('#pbFav').style.color = on ? 'var(--danger)' : '';
  $('#npFav').classList.toggle('faved', on);
}
function updateCounts() { $('#cntFav').textContent = S.favorites.length; $('#cntDl').textContent = DL.jobs.filter(j => j.state === 'done').length }

/* ═══════════════ DOWNLOADS ═══════════════ */
const DL = { jobs: [], active: 0, conc: 2 };
if (window.showDirectoryPicker) $('#folderBtn').hidden = false;
$('#folderBtn').onclick = async () => { try { S.dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' }); toast(t('folderOk') + ' ' + S.dirHandle.name) } catch (e) { } };
function enqueueDownloads(tracks) {
  if (!tracks.length) return;
  $('#dlDrawer').classList.add('open');
  tracks.forEach(tr => {
    const job = { tr, state: 'pending', pct: 0, ctrl: null };
    const el = document.createElement('div'); el.className = 'dl-job';
    el.innerHTML = `<div class="dj-t"><span>${pad(tr.n)} · ${esc(trackName(tr))}</span><span class="dj-s">${t('pending')}</span></div><div class="dj-bar"><i></i></div>`;
    const empty = $('#dlList .empty'); if (empty) empty.remove();
    $('#dlList').prepend(el);
    job.el = el; job.bar = el.querySelector('i'); job.st = el.querySelector('.dj-s');
    DL.jobs.push(job);
  });
  pumpDL();
}
function pumpDL() { while (DL.active < DL.conc) { const j = DL.jobs.find(x => x.state === 'pending'); if (!j) break; j.state = 'downloading'; DL.active++; runDL(j).finally(() => { DL.active--; pumpDL(); updateCounts() }) } }
async function runDL(job) {
  const tr = job.tr; const src = pickSource(tr, S.quality)[0];
  const fname = `${pad(tr.n)} - ${safeName(trackName(tr))}.mp3`;
  job.st.textContent = t('downloading');
  try {
    job.ctrl = new AbortController();
    const res = await fetch(src.url, { signal: job.ctrl.signal }); if (!res.ok) throw new Error(res.status);
    const total = +res.headers.get('content-length') || 0; let blob;
    if (res.body && total) {
      const rd = res.body.getReader(); const chunks = []; let got = 0;
      for (; ;) {
        const { done, value } = await rd.read(); if (done) break; chunks.push(value); got += value.length;
        job.pct = got / total * 100; job.bar.style.width = job.pct + '%'; job.st.textContent = `${Math.round(got / 1048576)}/${Math.round(total / 1048576)} MB`
      }
      blob = new Blob(chunks, { type: 'audio/mpeg' });
    } else { blob = await res.blob(); job.bar.style.width = '100%' }
    await saveBlob(blob, tr, fname);
    job.state = 'done'; job.el.classList.add('done'); job.bar.style.width = '100%'; job.st.textContent = '✓ ' + t('saved');
  } catch (e) {
    if (e.name === 'AbortError') { job.state = 'cancelled'; job.st.textContent = t('cancelled') }
    else {
      job.state = 'err'; job.el.classList.add('err'); job.st.textContent = '↗ ' + t('failed');
      const a = document.createElement('a'); a.href = src.url; a.target = '_blank'; a.rel = 'noopener'; a.download = fname; a.click()
    }
  }
}
async function saveBlob(blob, tr, fname) {
  if (S.dirHandle) {
    let dir = S.dirHandle;
    for (const p of [safeName(trackReciter(tr)), safeName(tr.rewaya)]) dir = await dir.getDirectoryHandle(p, { create: true });
    const fh = await dir.getFileHandle(fname, { create: true }); const w = await fh.createWritable(); await w.write(blob); await w.close();
  } else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${safeName(trackReciter(tr))} - ${fname}`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 30000) }
}
function findTrackByKey(k) {
  let tr = (S.reciterTracks && S.reciterTracks.find(x => x.key === k)) || S.tracks.find(x => x.key === k); if (tr) return tr;
  const f = [...S.favorites, ...S.recent].find(x => x.key === k); return f ? rebuildTrack(f) : null;
}
function trackFromKey(k) {
  if (!k) return null;
  const tr = findTrackByKey(k);
  if (tr) return tr;
  const parts = k.split(':');
  if (parts.length === 3) {
    const rid = +parts[0], mid = +parts[1], n = +parts[2];
    const r = S.reciters.find(x => x.id === rid);
    if (r) {
      const m = (r.moshaf && r.moshaf.find(x => x.id === mid)) || (r.moshaf && r.moshaf[0]);
      if (m) return makeTrack(r, m, n);
    }
  }
  return null;
}

/* ═══════════════ SLEEP TIMER ═══════════════ */
const SLEEP_SHEET = [30, 45, 60, 120, 180];
const fmtMMSS = ms => { const s2 = Math.ceil(ms / 1000); return String(Math.floor(s2 / 60)).padStart(2, '0') + ':' + String(s2 % 60).padStart(2, '0') };
function renderPhoneSleep() {
  const g = $('#mSleepGrid'); if (!g) return;
  g.innerHTML = SLEEP_SHEET.map(m => `<button data-min="${m}" class="${S.sleepMin === m ? 'on' : ''}" aria-pressed="${S.sleepMin === m}">${m} ${t('min')}</button>`).join('')
    + `<button data-min="0" aria-pressed="false">${t('cancel')}</button>`;
  const badge = $('#mSleepBadge'); if (badge) badge.hidden = !S.sleepMin;
}
function setSleep(min) {
  S.sleepMin = min; clearTimeout(S.sleepTimer); clearInterval(S.sleepTick);
  renderPhoneSleep();
  if (!min) return;
  const end = Date.now() + min * 60000; toast(`${t('timerSet')} ${min} ${t('min')}`);
  S.sleepTick = setInterval(() => {
    const ms = Math.max(0, end - Date.now());
    const mb = $('#mSleepBadge'); if (mb) mb.textContent = fmtMMSS(ms)
  }, 1000);
  const mb0 = $('#mSleepBadge'); if (mb0) mb0.textContent = fmtMMSS(min * 60000);
  S.sleepTimer = setTimeout(() => {
    const v0 = audio.volume; let step = 0;
    const fade = setInterval(() => { step++; audio.volume = Math.max(0, v0 * (1 - step / 10)); if (step >= 10) { clearInterval(fade); audio.pause(); audio.volume = v0; clearInterval(S.sleepTick); S.sleepMin = 0; renderPhoneSleep(); toast(t('timerEnd')) } }, 800);
  }, min * 60000);
}

/* ═══════════════ SEEK / VOLUME BARS ═══════════════ */
function paintRange(r) { if (r) r.style.setProperty('--val', ((r.value - r.min) / (r.max - r.min) * 100) + '%') }
function bindBar(el, onPct) {
  const pct = e => { const r = el.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) };
  let mvRaf = 0, active = 0, last = 0;
  el.addEventListener('pointerdown', e => {
    if (active || (e.pointerType === 'mouse' && e.button !== 0)) return;
    active = e.pointerId; last = pct(e);
    let win = null;
    try { el.setPointerCapture(e.pointerId) } catch (err) { win = window }
    el.classList.add('scrub'); onPct(last, true);
    const mv = ev => { if (!active || ev.pointerId !== active) return; last = pct(ev); if (mvRaf) return; mvRaf = requestAnimationFrame(() => { mvRaf = 0; onPct(last, true) }) };
    const up = ev => {
      if (!active || ev.pointerId !== active) return;
      active = 0;
      if (mvRaf) { cancelAnimationFrame(mvRaf); mvRaf = 0 }
      onPct(ev.type === 'pointercancel' ? last : pct(ev), false);
      el.classList.remove('scrub');
      const tgt = win || el;
      tgt.removeEventListener('pointermove', mv); tgt.removeEventListener('pointerup', up); tgt.removeEventListener('pointercancel', up);
    };
    const tgt = win || el;
    tgt.addEventListener('pointermove', mv, { passive: true }); tgt.addEventListener('pointerup', up); tgt.addEventListener('pointercancel', up);
  });
}
bindBar($('#progBar'), (p, drag) => { if (audio.duration && isFinite(audio.duration)) { if (!drag) audio.currentTime = p * audio.duration; const el = $('#progBar'); el.style.setProperty('--p', String(p)); $('#tCur').textContent = fmt(p * audio.duration); el.setAttribute('aria-valuenow', Math.round(p * audio.duration)); el.setAttribute('aria-valuetext', fmt(p * audio.duration) + ' / ' + fmt(audio.duration)) } });
bindBar($('#ovProg'), (p, drag) => { if (audio.duration && isFinite(audio.duration)) { if (!drag) audio.currentTime = p * audio.duration; const el = $('#ovProg'); el.style.setProperty('--p', String(p)); $('#ovCur').textContent = fmt(p * audio.duration); el.setAttribute('aria-valuenow', Math.round(p * audio.duration)); el.setAttribute('aria-valuetext', fmt(p * audio.duration) + ' / ' + fmt(audio.duration)) } });
function barKeys(el, onKey) {
  el.addEventListener('keydown', e => {
    let h = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') h = 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') h = -1;
    else if (e.key === 'Home') h = 'home';
    else if (e.key === 'End') h = 'end';
    if (h === null) return;
    e.preventDefault(); e.stopPropagation(); onKey(h);
  });
}
barKeys($('#progBar'), h => { if (!audio.duration || !isFinite(audio.duration)) return; const d = audio.duration; if (h === 'home') audio.currentTime = 0; else if (h === 'end') audio.currentTime = d; else audio.currentTime = Math.max(0, Math.min(d, audio.currentTime + h * 5)) });
barKeys($('#ovProg'), h => { if (!audio.duration || !isFinite(audio.duration)) return; const d = audio.duration; if (h === 'home') audio.currentTime = 0; else if (h === 'end') audio.currentTime = d; else audio.currentTime = Math.max(0, Math.min(d, audio.currentTime + h * 5)) });
function updateVolUI() {
  const v = audio.muted ? 0 : audio.volume;
  const icon = v === 0 ? '<path d="M11 5 6.5 9H3v6h3.5L11 19z"/><path d="m16 9 5 6M21 9l-5 6"/>' : v < .5 ? '<path d="M11 5 6.5 9H3v6h3.5L11 19z"/><path d="M15 9a4 4 0 0 1 0 6"/>' : '<path d="M11 5 6.5 9H3v6h3.5L11 19z"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M17.5 6.5a8 8 0 0 1 0 11"/>';
  const mI = $('#mVolIcon'); if (mI) mI.innerHTML = icon;
  const mR = $('#mVolRange'); if (mR) { mR.value = Math.round(v * 100); paintRange(mR) }
}

/* ═══════════════ TOAST / CONFIRM ═══════════════ */
function toast(msg, action) {
  const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = `<span>${esc(msg)}</span>`;
  if (action) { const b = document.createElement('button'); b.textContent = action.label; b.onclick = () => { action.fn(); kill() }; el.append(b) }
  $('#toasts').append(el);
  const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300) };
  setTimeout(kill, action ? 6000 : 3200);
}
const scrimPrevFocus = new Map();
function openModal(scrim) {
  const el = typeof scrim === 'string' ? $(scrim) : scrim;
  if (!el) return;
  scrimPrevFocus.set(el, document.activeElement instanceof HTMLElement ? document.activeElement : null);
  el.classList.add('open');
  const target = el.querySelector('button:not([hidden]), [href], input, [tabindex="0"]');
  if (target) try { target.focus({ preventScroll: true }) } catch (_) { }
}
function closeModal(scrim) {
  const el = typeof scrim === 'string' ? $(scrim) : scrim;
  if (!el) return;
  el.classList.remove('open');
  const prev = scrimPrevFocus.get(el);
  if (prev) {
    try { prev.focus({ preventScroll: true }) } catch (_) { }
    scrimPrevFocus.delete(el);
  }
}
let confirmRes = null;
function confirmDlg(title, msg) { $('#confirmTitle').textContent = title; $('#confirmMsg').textContent = msg; openModal('#confirmScrim'); return new Promise(r => confirmRes = r) }
$('#confirmYes').onclick = () => { closeModal('#confirmScrim'); confirmRes && confirmRes(true) };
$('#confirmNo').onclick = () => { closeModal('#confirmScrim'); confirmRes && confirmRes(false) };

/* ═══════════════ THEME / LANG ═══════════════ */
function applyTheme() {
  document.documentElement.dataset.theme = S.theme;
  document.querySelector('meta[name=theme-color]').content = S.theme === 'dark' ? '#000000' : '#F3EFE4';
  $('#themeIcon').innerHTML = S.theme === 'dark' ? '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M19.4 4.6l-1.8 1.8M6.4 17.6l-1.8 1.8"/>' : '<path d="M20 13.5A8 8 0 0 1 10.5 4 8 8 0 1 0 20 13.5z"/>';
  $$('#segTheme button').forEach(b => { const on = b.dataset.th === S.theme; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false') });
}
function applyLang() {
  document.documentElement.lang = S.lang; document.documentElement.dir = S.lang === 'ar' ? 'rtl' : 'ltr';
  $('#langBtn').textContent = S.lang === 'ar' ? 'EN' : 'ع';
  $$('#segLang button').forEach(b => { const on = b.dataset.lg === S.lang; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false') });
  applyI18nStatic(); buildQualitySeg(); renderPhoneSleep();
}
function applyI18nStatic() { $$('[data-i18n]').forEach(el => { const k = el.dataset.i18n; if (I18N[S.lang][k]) el.textContent = I18N[S.lang][k] }); $$('[data-i18n-title]').forEach(el => { const k = el.dataset.i18nTitle; if (I18N[S.lang][k]) el.title = I18N[S.lang][k] }); $$('[data-i18n-aria]').forEach(el => { const k = el.dataset.i18nAria; if (I18N[S.lang][k]) el.setAttribute('aria-label', I18N[S.lang][k]) }); $$('.nav-item').forEach(b => { const k = b.dataset.view || 'downloads'; if (I18N[S.lang][k]) b.title = I18N[S.lang][k] }) }
function buildQualitySeg() { $$('#segQualitySet button').forEach(b => { const on = b.dataset.q === S.quality; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false') }) }
function applySidebar() {
  document.body.classList.toggle('side-collapsed', S.sideMode === 'collapsed');
  const b = $('#sideBtn'); if (b) b.classList.toggle('on', S.sideMode === 'collapsed');
  const mb = $('#mSideBtn'); if (mb) mb.classList.toggle('on', S.sideMode === 'collapsed');
  if (flip) {
    setTimeout(() => { if (flip) try { flip.update() } catch (_) { } }, 260);
  }
}
function applyNpPos() {
  const el = $('.np-panel'); if (!el) return;
  const p = S.npMode === 'float' ? S.npPos : null;
  if (p) { el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; el.style.right = 'auto'; el.style.insetInlineEnd = 'auto' }
  else { el.style.left = ''; el.style.top = ''; el.style.right = ''; el.style.insetInlineEnd = '' }
}
function applyNpPanel() {
  const float = S.npMode === 'float';
  const collapsed = !float && S.npMode !== 'pinned'
  document.body.classList.toggle('np-float', float);
  document.body.classList.toggle('np-collapsed', collapsed);
  const pin = $('#npPin'); if (pin) pin.classList.toggle('on', S.npMode === 'pinned');
  const dock = $('#npDock'); if (dock) dock.classList.toggle('on', float);
  applyNpPos();
}
let themeSettleT = 0;
function setTheme(th) {
  document.documentElement.classList.add('theme-switching');
  S.theme = th; store.set('theme', th); applyTheme();
  clearTimeout(themeSettleT);
  themeSettleT = setTimeout(() => document.documentElement.classList.remove('theme-switching'), 150);
}
function setLang(lg) { S.lang = lg; store.set('lang', lg); applyLang(); render(); if (S.current) updateNowPlaying(); renderQueue(); rotateVerse(true) }

/* ═══════════════ VERSE ROTATOR ═══════════════ */
function rotateVerse(instant = false) {
  const card = $('#verseCard');
  const show = () => {
    const v = VERSES[S.verseIdx % VERSES.length];
    $('#verseText').textContent = S.lang === 'ar' ? v[0] : v[2];
    $('#verseRef').textContent = S.lang === 'ar' ? v[1] : v[3]; card.classList.remove('fade')
  };
  if (instant) { show(); return }
  card.classList.add('fade'); setTimeout(() => { S.verseIdx++; show() }, 500);
}
setInterval(() => rotateVerse(), 22000);

/* ═══════════════ OVERLAYS ═══════════════ */
/* ═══════════ fullscreen waves visualizer ═══════════ */
let acx = null, analyser = null, freqData = null, waveRaf = 0, smLevel = 0, layerLvl = [0, 0, 0], orbLvl = [0, 0, 0], orbPeak = [0, 0, 0], orbBase = [0, 0, 0];
function ensureAnalyser() {
  if (IS_ANDROID || acx !== null || (!window.AudioContext && !window.webkitAudioContext)) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const cand = new Ctx();
    if (cand.state !== 'running') { try { cand.resume() } catch (e) { } }
    if (cand.state !== 'running') { try { cand.close() } catch (e) { } return }
    acx = cand;
    const src = acx.createMediaElementSource(audio);
    analyser = acx.createAnalyser(); analyser.fftSize = 512; analyser.smoothingTimeConstant = .82;
    src.connect(analyser); analyser.connect(acx.destination);
    freqData = new Uint8Array(analyser.frequencyBinCount);
  } catch (e) { acx = null; analyser = null }
}
document.addEventListener('pointerdown', () => { if (acx && acx.state === 'suspended') acx.resume(); else if (!audio.paused && acx === null) ensureAnalyser() }, { capture: true });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') prewarmTrack() });
document.addEventListener('error', e => {
  const el = e.target;
  if (!el || !el.dataset) return;
  if (el.dataset.errRemove != null) { el.remove(); return }
  if (el.dataset.errFallback) { const fb = el.dataset.errFallback; el.removeAttribute('data-err-fallback'); el.setAttribute('src', fb); return }
  if (el.dataset.alts != null) { const alts = el.dataset.alts.split('|').filter(Boolean); if (alts.length) { el.setAttribute('src', alts.shift()); el.dataset.alts = alts.join('|') } else el.classList.add('broken'); return }
  if (el.dataset.errBroken != null) el.classList.add('broken');
}, true);
document.addEventListener('load', e => {
  const el = e.target;
  if (el && el.tagName === 'IMG' && el.classList.contains('m-pic')) el.classList.add('loaded');
}, true);
function setOrbVars(b) {
  const ov = $('#npOverlay'); if (!ov) return;
  ov.style.setProperty('--bass', b[0].toFixed(3));
  ov.style.setProperty('--mid', b[1].toFixed(3));
  ov.style.setProperty('--treble', b[2].toFixed(3));
}
function drawWaves(ts) {
  const cv = $('#ovWaves'); if (!cv) { waveRaf = 0; return }
  const ov = $('#npOverlay');
  if (!ov || !ov.classList.contains('open') || document.hidden) {
    waveRaf = requestAnimationFrame(drawWaves);
    return;
  }
  const dpr = Math.min(1.25, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) { waveRaf = requestAnimationFrame(drawWaves); return }
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr) }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  const playing = !audio.paused;
  let bands = [0, 0, 0], obands = [0, 0, 0];
  if (analyser && freqData && playing) {
    analyser.getByteFrequencyData(freqData);
    const band = (f0, f1, g) => { let s = 0; for (let i = f0; i < f1; i++)s += freqData[i]; return Math.min(1, s / ((f1 - f0) * 255) * g) };
    bands = [band(2, 10, 2.1), band(8, 24, 2.1), band(18, 48, 2.1)];
    obands = [band(2, 10, 1.15), band(8, 24, 1.15), band(18, 48, 1.15)];
  } else if (playing) {
    const tt = ts / 1000;
    bands = [.3 + .2 * Math.sin(tt * 1.1), .24 + .16 * Math.sin(tt * .9 + 1.3), .18 + .13 * Math.sin(tt * .7 + 2.1)];
    obands = bands;
  }
  smLevel += (Math.max(...bands) - smLevel) * .12;
  obands.forEach((v, i) => {
    orbBase[i] += (v - orbBase[i]) * .01;
    const d = Math.max(0, v - orbBase[i]);
    orbPeak[i] = Math.max(d, orbPeak[i] * .995, .05);
    const n = Math.min(1, d / orbPeak[i]);
    orbLvl[i] += (n - orbLvl[i]) * (n > orbLvl[i] ? .4 : playing ? .08 : .25);
  });
  setOrbVars(orbLvl);
  const t = ts / 1000;
  const layers = [[.9, .5, 'rgba(186,151,67,.16)', 0], [1.35, .8, 'rgba(186,151,67,.28)', 1], [1.9, 1.2, 'rgba(186,151,67,.5)', 2]];
  layers.forEach(([wl, sp, col, bi], li) => {
    layerLvl[bi] += ((playing ? bands[bi] : 0) - layerLvl[bi]) * .1;
    const amp = h * (.14 + layerLvl[bi] * .42);
    ctx.beginPath(); ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 12) {
      const p = x / w;
      const y = h * .68
        - Math.sin(p * Math.PI * 2 * wl + t * sp + li * 1.7) * amp * (.55 + .45 * Math.sin(p * Math.PI * 3 + t * .7 + li))
        - Math.sin(p * Math.PI * 7 - t * 1.3 + li * 2.1) * amp * .15;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  });
  waveRaf = requestAnimationFrame(drawWaves);
}
function startWaves() {
  if (waveRaf || !$('#ovWaves')) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  waveRaf = requestAnimationFrame(drawWaves);
}
function stopWaves() {
  if (waveRaf) cancelAnimationFrame(waveRaf);
  waveRaf = 0;
  orbLvl = [0, 0, 0]; orbBase = [0, 0, 0];
  setOrbVars([0, 0, 0]);
  const cv = $('#ovWaves');
  if (cv) { const ctx = cv.getContext('2d'); if (ctx) ctx.clearRect(0, 0, cv.width, cv.height); }
}
window.__waves = () => ({ ctx: acx ? acx.state : 'none', has: !!analyser, lvl: +smLevel.toFixed(3), layers: layerLvl.map(v => +v.toFixed(3)), orbs: orbLvl.map(v => +v.toFixed(3)), paused: audio.paused });
let ovPrevFocus = null;
function openOverlay() {
  const ov = $('#npOverlay'); ov.classList.add('open'); startWaves(); renderQueue();
  if ($('#ovMandala')) $('#ovMandala').innerHTML = $('#npMandala').innerHTML;
  ovPrevFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  try { ov.focus({ preventScroll: true }) } catch (_) { }
}
function closeOverlay() {
  $('#npOverlay').classList.remove('open'); stopWaves();
  if (ovPrevFocus) { try { ovPrevFocus.focus({ preventScroll: true }) } catch (_) { } ovPrevFocus = null }
}
let ovSw = null;
$('#npOverlay').addEventListener('touchstart', e => {
  const ov = $('#npOverlay');
  ovSw = e.target.closest('button, .prog, .ov-progress, .ov-actions') || ov.scrollTop > 0 ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
$('#npOverlay').addEventListener('touchend', e => {
  if (!ovSw) return;
  const t0 = e.changedTouches[0], dy = t0.clientY - ovSw.y, dx = t0.clientX - ovSw.x; ovSw = null;
  if (dy > 90 && Math.abs(dx) < dy * .7) closeOverlay();
}, { passive: true });
$('#npOverlay').addEventListener('touchcancel', () => { ovSw = null }, { passive: true });
function closeSidebar() { $('#sidebar').classList.remove('open'); $('#scrimSide').classList.remove('open') }
$('#menuBtn').onclick = () => { $('#sidebar').classList.add('open'); $('#scrimSide').classList.add('open') };
$('#scrimSide').onclick = closeSidebar;
$('#pbArt').onclick = openOverlay; $('#npExpand').onclick = openOverlay; $('#ovClose').onclick = closeOverlay;
$('#btnExpand').onclick = () => matchMedia('(max-width: 640px)').matches ? openModal('#phoneCtlScrim') : openOverlay();
$('#phoneCtlClose').onclick = () => closeModal('#phoneCtlScrim');
$('#phoneCtlScrim').addEventListener('click', e => {
  const qb = e.target.closest('#segQualitySet button');
  if (qb) { setQuality(qb.dataset.q); return }
  if (e.target === e.currentTarget) closeModal(e.currentTarget)
});
let pbSw = null;
$('.player').addEventListener('touchstart', e => { pbSw = e.target.closest('button, .prog, input') ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY } }, { passive: true });
$('.player').addEventListener('touchend', e => {
  if (!pbSw) return;
  const t0 = e.changedTouches[0], dy = t0.clientY - pbSw.y, dx = t0.clientX - pbSw.x; pbSw = null;
  if (dy < -80 && Math.abs(dx) < Math.abs(dy) * .7) openOverlay();
}, { passive: true });
$('.player').addEventListener('touchcancel', () => { pbSw = null }, { passive: true });
$('#settingsBtn').onclick = () => openModal('#settingsScrim');
$('#settingsClose').onclick = () => closeModal('#settingsScrim');
$('#settingsScrim').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(e.currentTarget) });
$('#prayerSetClose').onclick = () => closeModal('#prayerScrim');
$('#prayerScrim').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(e.currentTarget) });
$('#prayerScrim').addEventListener('click', e => {
  const adhpg = e.target.closest('[data-adhpg]');
  if (adhpg) {
    S.adhanOn = adhpg.dataset.adhpg === 'on'; store.set('adhanOn', S.adhanOn);
    if (!S.adhanOn) stopAdhan();
    $$('#segAdhan button').forEach(b => b.classList.toggle('on', b.dataset.adh === (S.adhanOn ? 'on' : 'off')));
    $$('#segAdhanPg button').forEach(b => b.classList.toggle('on', b.dataset.adhpg === (S.adhanOn ? 'on' : 'off'))); return
  }
  const admode = e.target.closest('[data-admodepg]');
  if (admode) {
    S.adhanMode = admode.dataset.admodepg; store.set('adhanMode', S.adhanMode);
    if (S.adhanMode !== 'duck' && S.adhanDuckV != null) { audio.volume = S.adhanDuckV; S.adhanDuckV = null }
    $$('#segAdModePg button').forEach(b => b.classList.toggle('on', b.dataset.admodepg === S.adhanMode)); return
  }
  const ntf = e.target.closest('[data-ntfpg]');
  if (ntf) {
    const wantOn = ntf.dataset.ntfpg === 'on';
    if (wantOn && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        S.notifyOn = true;
      } else if (Notification.permission === 'denied') {
        S.notifyOn = false;
        toast(t('notifyDenied'));
      } else {
        Notification.requestPermission().then(perm => {
          S.notifyOn = perm === 'granted';
          store.set('notifyOn', S.notifyOn);
          $$('#segNotifyPg button').forEach(b => b.classList.toggle('on', b.dataset.ntfpg === (S.notifyOn ? 'on' : 'off')));
        });
        return;
      }
    } else {
      S.notifyOn = false;
    }
    store.set('notifyOn', S.notifyOn);
    $$('#segNotifyPg button').forEach(b => b.classList.toggle('on', b.dataset.ntfpg === (S.notifyOn ? 'on' : 'off')));
    return;
  }
  const poff = e.target.closest('[data-poff]');
  if (poff) {
    const k = poff.dataset.pr || 'Fajr'; S.prayerOffset[k] = Math.max(-30, Math.min(30, (S.prayerOffset[k] || 0) + (+poff.dataset.poff))); store.set('prayerOffset', S.prayerOffset);
    $('#prayerSetBody').innerHTML = prayerSettingsHTML(); render(); return
  }
  const psa = e.target.closest('[data-psact]');
  if (psa && psa.dataset.psact === 'adhanpreview') { playAdhan(nextPrayerKey() || 'Fajr') }
});
$('#prayerScrim').addEventListener('change', e => {
  if (e.target.id === 'adhanVoiceSel') { S.adhanVoice = e.target.value; store.set('adhanVoice', S.adhanVoice) }
});
$('#confirmScrim').addEventListener('click', e => { if (e.target === e.currentTarget) { closeModal(e.currentTarget); confirmRes && confirmRes(false) } });
$('#navDownloads').onclick = () => { openModal('#dlDrawer'); closeSidebar() };
$('#dlClose').onclick = () => closeModal('#dlDrawer');
$('#mSleepGrid').addEventListener('click', e => { const b = e.target.closest('[data-min]'); if (b) setSleep(+b.dataset.min) });
$('#mMute').onclick = () => { audio.muted = !audio.muted; updateVolUI() };
$('#mVolRange').addEventListener('input', e => { audio.muted = false; audio.volume = Math.max(0, Math.min(1, +e.target.value / 100)); store.set('volume', audio.volume); updateVolUI() });
$('#mSpeedReset').onclick = () => setSpeed(1);

/* ═══════════════ EVENT WIRING ═══════════════ */
$$('.nav-item[data-view]').forEach(b => b.onclick = () => setView(b.dataset.view));
$('#themeBtn').onclick = () => setTheme(S.theme === 'light' ? 'dark' : 'light');
$('#langBtn').onclick = () => setLang(S.lang === 'ar' ? 'en' : 'ar');
$$('#segTheme button').forEach(b => b.onclick = () => setTheme(b.dataset.th));
$$('#segLang button').forEach(b => b.onclick = () => setLang(b.dataset.lg));
$$('#segMushafRw button').forEach(b => { b.onclick = () => setMushafRiwaya(b.dataset.mrw); b.classList.toggle('on', b.dataset.mrw === S.mushafRiwaya) });
function updateAdhanSeg() { $$('#segAdhan button').forEach(b => b.classList.toggle('on', b.dataset.adh === (S.adhanOn ? 'on' : 'off'))) }
$$('#segAdhan button').forEach(b => { b.onclick = () => { S.adhanOn = b.dataset.adh === 'on'; store.set('adhanOn', S.adhanOn); if (!S.adhanOn) stopAdhan(); updateAdhanSeg(); $$('#segAdhanPg button').forEach(x => x.classList.toggle('on', x.dataset.adhpg === (S.adhanOn ? 'on' : 'off'))) } });
updateAdhanSeg();
$('#searchInput').addEventListener('input', e => { S.query = e.target.value; if (S.view === 'home' && S.query) setView('reciters'), S.query = e.target.value, $('#searchInput').value = e.target.value; render() });
function setQuality(q) {
  S.quality = q; store.set('quality', q); buildQualitySeg();
  if (S.current) { const pos = audio.currentTime, was = !audio.paused; S.srcIdx = 0; S.srcOrder = pickSource(S.current, S.quality); setAudioSrc(S.srcOrder[0].url); audio.addEventListener('loadedmetadata', () => { audio.currentTime = pos }, { once: true }); if (was) audio.play().catch(() => { }); updateBadges() }
}
$('#btnSettings').onclick = () => openModal('#phoneCtlScrim');
function setSpeed(v) {
  S.speed = Math.min(2, Math.max(.75, v)); store.set('speed', S.speed); audio.playbackRate = S.speed;
  const mv = $('#mSpeedVal'); if (mv) mv.textContent = S.speed + '\u00d7';
  const mr = $('#mSpeedRange'); if (mr) { mr.value = S.speed; paintRange(mr) }
  const rs = $('#mSpeedReset'); if (rs) rs.hidden = S.speed === 1;
}
$('#mSpeedRange').addEventListener('input', e => setSpeed(+e.target.value));
setSpeed(S.speed); paintRange($('#mVolRange')); renderPhoneSleep();
$('#btnPlay').onclick = togglePlay; $('#btnNext').onclick = nextTrack; $('#btnPrev').onclick = prevTrack;
$('#btnShuffle').onclick = () => { S.shuffle = !S.shuffle; store.set('shuffle', S.shuffle); $('#btnShuffle').classList.toggle('on', S.shuffle); $$('.np-overlay [data-act="shuffle"]').forEach(b => b.classList.toggle('on', S.shuffle)) };
$('#btnRepeat').onclick = () => { S.repeat = (S.repeat + 1) % 3; store.set('repeat', S.repeat); updateRepeatUI() };
function updateRepeatUI() { $('#btnRepeat').classList.toggle('on', S.repeat > 0); $('#repBadge').hidden = S.repeat !== 2; $$('.np-overlay [data-act="repeat"]').forEach(b => b.classList.toggle('on', S.repeat > 0)) }
$('#btnDl').onclick = () => { if (S.current) enqueueDownloads([S.current]) };
$('#npDl').onclick = () => { if (S.current) enqueueDownloads([S.current]) };
$('#npFav').onclick = () => toggleFav(S.current); $('#pbFav').onclick = () => toggleFav(S.current);
$('.np-overlay').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'play') togglePlay(); else if (a === 'next') nextTrack(); else if (a === 'prev') prevTrack();
  else if (a === 'shuffle') $('#btnShuffle').click(); else if (a === 'repeat') $('#btnRepeat').click();
  else if (a === 'fav') toggleFav(S.current); else if (a === 'download' && S.current) enqueueDownloads([S.current]);
  else if (a === 'ovqueue') { const w = $('#ovQueueWrap'); if (w) { w.hidden = !w.hidden; if (!w.hidden) renderQueue() } }
  else if (a === 'openqueueadd') openQueueAddModal();
});
$('#view').addEventListener('click', async e => {
  const stg = e.target.closest('.mushaf-stage');
  if (stg && !e.target.closest('button') && !e.target.closest('.cover-page')) { if (!flip && !mushafBook()) mushafFocus(); return }
  const rdB = e.target.closest('[data-read]'); if (rdB) { mushafGo(+rdB.dataset.read); return }
  const qaddB = e.target.closest('[data-qadd]');
  if (qaddB) {
    const key = qaddB.dataset.qadd;
    const tr = trackFromKey(key) || (qaddB.closest('.surah-row[data-n]') && S.reciter && S.moshaf ? makeTrack(S.reciter, S.moshaf, +qaddB.closest('.surah-row[data-n]').dataset.n) : null);
    if (tr) {
      addTrackToQueueDirect(tr);
      qaddB.classList.add('added');
      qaddB.innerHTML = '<svg class="ic" viewBox="0 0 24 24" style="color:var(--gold-ink)"><path d="m5 13 4 4L19 7"/></svg>';
      setTimeout(() => {
        qaddB.classList.remove('added');
        qaddB.innerHTML = '<svg class="ic" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
      }, 1500);
    }
    return;
  }
  const favB = e.target.closest('[data-fav]'); if (favB) { const tr = findTrackByKey(favB.dataset.fav); if (tr) toggleFav(tr); return }
  const unfavB = e.target.closest('[data-unfav]'); if (unfavB) { const tr = findTrackByKey(unfavB.dataset.unfav); if (tr) toggleFav(tr); return }
  const dlB = e.target.closest('[data-dl]'); if (dlB) { const tr = findTrackByKey(dlB.dataset.dl); if (tr) enqueueDownloads([tr]); return }
  const loc = e.target.closest('[data-loc]');
  if (loc) {
    const [lat, lng, name] = loc.dataset.loc.split(',');
    setPrayerLoc(lat, lng, name, 'manual'); return
  }
  const act = e.target.closest('[data-act]');
  if (act) {
    const a = act.dataset.act;
    if (a === 'browse') setView('reciters');
    else if (a === 'goprayer') setView('prayer');
    else if (a === 'prayerset') { openPrayerSettings(); return }
    else if (a === 'ytback') { S.ytId = null; render() }
    else if (a === 'akback') { S.adhkarCat = null; render() }
    else if (a === 'back') setView('reciters');
    else if (a === 'mushafback') setView('home');
    else if (a === 'mushafexit') setView('home');
    else if (a === 'mushafopen') { if (mushafLastGet() > 1) { S.mushafAsk = true; render() } else mushafGo(1) }
    else if (a === 'mresume') mushafGo(mushafLastGet() || 1);
    else if (a === 'mstart') mushafGo(1);
    else if (a === 'mrwset') setMushafRiwaya(act.dataset.rw);
    else if (a === 'mushafaskclose') { if (e.target === act) { S.mushafAsk = false; render() } }
    else if (a === 'mushafdlall') mushafDownloadAll(act);
    else if (a === 'mfocus') mushafFocus();
    else if (a === 'mindexopen') {
      S.mushafIndexOpen = true;
      S.mushafIndexQuery = '';
      render();
      requestAnimationFrame(() => {
        const cur = document.querySelector('#mIndexBody [aria-current="true"]');
        if (cur) cur.scrollIntoView({ block: 'center' });
        const inp = document.getElementById('mIndexSearch');
        if (inp) inp.focus();
      });
    }
    else if (a === 'mindexclose') {
      if (e.target === act || act.classList.contains('mindex-x')) {
        S.mushafIndexOpen = false;
        render();
      }
    }
    else if (a === 'mindextab') {
      S.mushafIndexTab = act.dataset.tab;
      render();
      requestAnimationFrame(() => {
        const cur = document.querySelector('#mIndexBody [aria-current="true"]');
        if (cur) cur.scrollIntoView({ block: 'center' });
      });
    }
    else if (a === 'mjump') {
      const p = +act.dataset.page;
      S.mushafIndexOpen = false;
      mushafGo(p);
    }
    else if (a === 'mushafmenu') {
      $('#sidebar').classList.add('open');
      $('#scrimSide').classList.add('open');
    }
    else if (a === 'mindexqclear') {
      S.mushafIndexQuery = '';
      render();
    }
    else if (a === 'mlayout') {
      S.mushafLayout = S.mushafLayout === 'single' ? 'book' : 'single';
      store.set('mushafLayout', S.mushafLayout);
      destroyFlip();
      render();
    }
    else if (a === 'mzoomin') mushafZoomStep(1);
    else if (a === 'mzoomout') mushafZoomStep(-1);
    else if (a === 'mzoomreset') setMushafZoom(1.0);
    else if (a === 'mushafside') {
      document.body.classList.toggle('mushaf-noside');
      const closed = document.body.classList.contains('mushaf-noside'), lbl = closed ? t('showPanel') : t('hidePanel');
      act.innerHTML = closed ? '<svg class="ic" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>' : '<svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
      act.title = lbl; act.setAttribute('aria-label', lbl);
      if (flip) {
        requestAnimationFrame(() => { if (flip) try { flip.update() } catch (_) { } });
      }
    }
    else if (a === 'sidetoggle') { S.sideMode = S.sideMode === 'collapsed' ? 'open' : 'collapsed'; store.set('sideMode', S.sideMode); applySidebar() }
    else if (a === 'mssearch') { const inp = $('#msSearch'); if (inp) { inp.hidden = !inp.hidden; if (!inp.hidden) inp.focus(); else inp.value = '' } }
    else if (a === 'locauto') detectLoc('auto')
    else if (a === 'locgps') detectLoc('gps')
    else if (a === 'locnet') detectLoc('net')
    else if (a === 'adhanpreview') { const v = adhanVoice(); const k = nextPrayerKey() || 'Fajr'; playAdhan(k) }
    else if (a === 'locsearch') { const q = $('#locQ').value.trim(); if (q) prayerSearch(q) }
    else if (a === 'citypick') setPrayerLoc(act.dataset.lat, act.dataset.lng, act.dataset.name, 'manual')
    else if (a === 'mtheme') setTheme(S.theme === 'light' ? 'dark' : 'light');
    else if (a === 'mprev') mushafGo(mushafStep(S.readN, -1, mushafBook()));
    else if (a === 'mnext') mushafGo(mushafStep(S.readN, 1, mushafBook()));
    else if (a === 'openrecent') setView('recent');
    else if (a === 'resume' && S.recent[0]) {
      const f = S.recent[0]; const r = S.reciters.find(x => x.id === f.rid);
      if (r) {
        openReciter(r.id, false); const mi = r.moshaf.findIndex(m => m.id === f.mid); if (mi >= 0 && mi !== 0) setMoshaf(mi);
        const tr = (S.reciterTracks && S.reciterTracks.find(x => x.n === f.n)) || makeTrack(r, S.moshaf, f.n);
        S.tracks = [tr]; const sess = store.get('session', null); loadTrack(0, true, sess && sess.n === f.n ? sess.pos : 0);
      }
      else { S.tracks = [rebuildTrack(f)]; loadTrack(0, true) }
    }
    else if (a === 'playall' && ((S.reciterTracks && S.reciterTracks.length) || S.tracks.length)) {
      if (S.reciterTracks && S.reciterTracks.length) S.tracks = [...S.reciterTracks];
      loadTrack(0, true);
    }
    else if (a === 'dlall') {
      const allTr = (S.reciterTracks && S.reciterTracks.length) ? S.reciterTracks : S.tracks;
      if (allTr.length && await confirmDlg(t('confirmDlAll'), t('confirmDlAllMsg'))) enqueueDownloads(allTr);
    }
    else if (a === 'clearrecent') { const bak = [...S.recent]; S.recent = []; store.set('recent', []); render(); toast(t('cleared'), { label: t('undo'), fn: () => { S.recent = bak; store.set('recent', bak); render() } }) }
    return
  }
  const mtab = e.target.closest('[data-mstab]'); if (mtab) { $$('#view .ms-tab').forEach(x => x.classList.toggle('active', x === mtab)); $$('#view .ms-list').forEach(x => x.hidden = x.dataset.mlist !== mtab.dataset.mstab); return }
  const chip = e.target.closest('[data-rw]'); if (chip) { S.rewaya = chip.dataset.rw; render(); return }
  const qs = e.target.closest('[data-surah]'); if (qs) { playQuick(+qs.dataset.surah); return }
  const rc = e.target.closest('[data-rid]'); if (rc) { openReciter(+rc.dataset.rid, false); return }
  const akc = e.target.closest('[data-akcat]'); if (akc) { S.adhkarCat = +akc.dataset.akcat; render(); return }
  const akb = e.target.closest('[data-akback]'); if (akb) { S.adhkarCat = null; render(); return }
  const akd = e.target.closest('[data-akdec]'); if (akd) { akTap(akd); return }
  const ytnav = e.target.closest('[data-ytnav]'); if (ytnav) { ytNext(+ytnav.dataset.ytnav); return }
  if (e.target.closest('#ytPlayBtn') || e.target.id === 'ytOv') { ytToggle(); return }
  if (e.target.closest('#ytMuteBtn')) { if (ytPlayer && ytPlayer.isMuted) { ytPlayer.isMuted() ? ytPlayer.unMute() : ytPlayer.mute() } return }
  if (e.target.closest('#ytCcBtn') && ytPlayer) {
    ytCcOn = !ytCcOn; const b = $('#ytCcBtn'); if (b) b.classList.toggle('active', ytCcOn);
    try {
      if (ytCcOn) { ytPlayer.loadModule('captions'); ytPlayer.setOption('captions', 'track', { languageCode: 'ar' }) }
      else { ytPlayer.setOption('captions', 'track', {}); ytPlayer.unloadModule('captions') }
    } catch (err) { } return
  }
  if (e.target.closest('#ytFsBtn')) {
    const box = $('#ytPlayerBox'); if (!box) return;
    if (document.fullscreenElement) document.exitFullscreen(); else if (box.requestFullscreen) box.requestFullscreen().catch(() => { }); return
  }
  const ytc = e.target.closest('[data-yt]'); if (ytc) { audio.pause(); S.ytId = ytc.dataset.yt; render(); return }
  const coll = e.target.closest('[data-coll]'); if (coll) { playCollection(+coll.dataset.coll, S.view === 'favorites'); return }
  const row = e.target.closest('.surah-row[data-idx]');
  if (row) {
    const idx = +row.dataset.idx;
    const target = (S.reciterTracks && S.reciterTracks[idx]) || trackFromKey(row.dataset.key) || S.tracks[idx];
    if (target) {
      S.tracks = [target];
      loadTrack(0, true);
    }
    return;
  }
});
$('#view').addEventListener('change', e => {
  if (e.target.id === 'sortSel') { S.sort = e.target.value; render() }
  if (e.target.id === 'rwSel') { S.rewaya = e.target.value; render(); return }
  if (e.target.id === 'moshafSel') { setMoshaf(+e.target.value) }
  if (e.target.id === 'mSurahSel' || e.target.id === 'mSurahSelSide') mushafGo(SURAH_PAGE[+e.target.value - 1]);
  if (e.target.id === 'mJuzSel' || e.target.id === 'mJuzSelSide') mushafGo(JUZ_PAGE[+e.target.value - 1]);
  if (e.target.id === 'mSlider' || e.target.id === 'mSliderSide') mushafGo(+e.target.value);
});
$('#view').addEventListener('input', e => {
  if (e.target.id === 'mIndexSearch') {
    S.mushafIndexQuery = e.target.value;
    const body = document.getElementById('mIndexBody');
    if (body) body.innerHTML = mushafIndexItemsHTML();
    return;
  }
  if (e.target.id === 'ytSeek' && ytPlayer && ytPlayer.seekTo) { ytPlayer.seekTo(+e.target.value, true) }
  if (e.target.id === 'ytVol' && ytPlayer && ytPlayer.setVolume) { ytPlayer.setVolume(+e.target.value); ytPlayer.unMute() }
  if (e.target.id !== 'mSlider' && e.target.id !== 'mSliderSide') return;
  const v = +e.target.value;
  $$('#view .mf-num').forEach(el => el.textContent = S.lang === 'ar' ? `${arDigits(v)} / ${arDigits(MUSHAF_PAGES)}` : `${v} / ${MUSHAF_PAGES}`);
});
/* mushaf: touch swipe to turn pages */
let swX = null, swY = null, swT = 0;
$('#view').addEventListener('touchstart', e => {
  if (S.view !== 'mushaf') { swX = null; return }
  const t0 = e.touches[0]; swX = t0.clientX; swY = t0.clientY; swT = Date.now()
}, { passive: true });
$('#view').addEventListener('touchend', e => {
  if (S.view !== 'mushaf' || swX == null || flip) return;
  const t0 = e.changedTouches[0], dx = t0.clientX - swX, dy = t0.clientY - swY; swX = null;
  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.4 || Date.now() - swT > 900) return;
  if (!e.target.closest('.mushaf-stage')) return;
  if (e.target.closest('button,select,input,.mushaf-ask')) return;
  const rtl = document.documentElement.dir === 'rtl';
  const d = (dx > 0) === rtl ? 1 : -1;
  if (S.readN) mushafGo(mushafStep(S.readN, d, mushafBook()))
  else if (d > 0) { if (mushafLastGet() > 1) { S.mushafAsk = true; render() } else mushafGo(1) }
}, { passive: true });
$('#view').addEventListener('touchcancel', () => { swX = null }, { passive: true });
try { window.matchMedia('(min-width:900px)').addEventListener('change', () => { if (S.view === 'mushaf' && S.readN) { destroyFlip(); render() } }) } catch (_) { }
/* queue: click + drag reorder */
let dragIdx = null;
function queueMove(i, dir) {
  const to = i + dir; if (to < 0 || to >= S.tracks.length || i === S.idx) return;
  const curKey = S.current ? S.current.key : null;
  const [m] = S.tracks.splice(i, 1); S.tracks.splice(to, 0, m);
  if (curKey) S.idx = S.tracks.findIndex(x => x.key === curKey);
  renderQueue();
}
function queueDelete(i) {
  if (i < 0 || i >= S.tracks.length || i === S.idx) return;
  const curKey = S.current ? S.current.key : null;
  const [removed] = S.tracks.splice(i, 1);
  if (curKey) S.idx = S.tracks.findIndex(x => x.key === curKey);
  renderQueue();
  if (removed) toast(`${t('removedFromQueue')}: ${trackName(removed)}`);
}
function queueClick(e) {
  const del = e.target.closest('[data-qdel]');
  if (del) {
    e.stopPropagation();
    const it = del.closest('[data-qi]');
    if (it) queueDelete(+it.dataset.qi);
    return;
  }
  const mv = e.target.closest('[data-qmv]');
  if (mv) {
    e.stopPropagation();
    const it = mv.closest('[data-qi]');
    if (it) queueMove(+it.dataset.qi, +mv.dataset.qmv);
    return;
  }
  const addBtn = e.target.closest('[data-act="openqueueadd"]');
  if (addBtn) {
    e.stopPropagation();
    openQueueAddModal();
    return;
  }
  const it = e.target.closest('[data-qi]');
  if (it) loadTrack(+it.dataset.qi, true);
}
['#npQueue', '#ovQueue'].forEach(sel => {
  const el = $(sel); if (!el) return;
  el.addEventListener('click', queueClick);
  el.addEventListener('dragstart', e => { const it = e.target.closest('[data-qi]'); if (it) { dragIdx = +it.dataset.qi; e.dataTransfer.effectAllowed = 'move' } });
  el.addEventListener('dragover', e => { e.preventDefault(); const it = e.target.closest('[data-qi]'); $$('.queue-item').forEach(x => x.classList.remove('dragover')); if (it) it.classList.add('dragover') });
  el.addEventListener('drop', e => {
    e.preventDefault(); const it = e.target.closest('[data-qi]'); if (it && dragIdx != null) {
      const to = +it.dataset.qi; const curKey = S.current ? S.current.key : null;
      const [m] = S.tracks.splice(dragIdx, 1); S.tracks.splice(to, 0, m);
      if (curKey) S.idx = S.tracks.findIndex(x => x.key === curKey); renderQueue();
    } dragIdx = null;
  });
  el.addEventListener('dragend', () => { dragIdx = null; $$('.queue-item').forEach(x => x.classList.remove('dragover')) });
});

/* ── Manual Queue Picker Modal ── */
let qaSelectedReciter = null, qaSelectedMoshaf = null, qaSelectedSurah = null;
function openQueueAddModal() {
  if (!S.reciters.length) { toast(t('loading')); return }
  qaSelectedReciter = S.reciter || S.reciters[0];
  qaSelectedMoshaf = S.moshaf || (qaSelectedReciter.moshaf && qaSelectedReciter.moshaf[0]) || null;
  qaSelectedSurah = null;
  renderQueueAddReciters();
  renderQueueAddMoshafs();
  renderQueueAddSurahs();
  updateQueueAddConfirmBtn();
  const searchInp = $('#qaSurahSearch');
  if (searchInp) searchInp.value = '';
  openModal('#queueAddScrim');
}
function renderQueueAddReciters() {
  const sel = $('#qaReciterSel'); if (!sel) return;
  const list = [...S.reciters].sort((a, b) => reciterName(a).localeCompare(reciterName(b), S.lang === 'ar' ? 'ar' : 'en'));
  sel.innerHTML = list.map(r => `<option value="${r.id}"${qaSelectedReciter && r.id === qaSelectedReciter.id ? ' selected' : ''}>${esc(reciterName(r))}</option>`).join('');
  sel.onchange = () => {
    const r = S.reciters.find(x => x.id === +sel.value);
    if (!r) return;
    qaSelectedReciter = r;
    qaSelectedMoshaf = (r.moshaf && r.moshaf.length) ? r.moshaf[0] : null;
    qaSelectedSurah = null;
    renderQueueAddMoshafs();
    renderQueueAddSurahs();
    updateQueueAddConfirmBtn();
  };
}
function renderQueueAddMoshafs() {
  const field = $('#qaMoshafField'), sel = $('#qaMoshafSel');
  if (!field || !sel) return;
  const moshafs = (qaSelectedReciter && qaSelectedReciter.moshaf) || [];
  if (moshafs.length <= 1) {
    field.style.display = 'none';
    qaSelectedMoshaf = moshafs[0] || null;
    return;
  }
  field.style.display = '';
  sel.innerHTML = moshafs.map((m, idx) => `<option value="${idx}"${qaSelectedMoshaf && m.id === qaSelectedMoshaf.id ? ' selected' : ''}>${esc(moshafRewaya(m))}</option>`).join('');
  sel.onchange = () => {
    qaSelectedMoshaf = moshafs[+sel.value] || moshafs[0];
    qaSelectedSurah = null;
    renderQueueAddSurahs();
    updateQueueAddConfirmBtn();
  };
}
function renderQueueAddSurahs() {
  const listEl = $('#qaSurahList'); if (!listEl) return;
  if (!qaSelectedMoshaf) { listEl.innerHTML = `<div class="qa-surah-empty">${t('noResults')}</div>`; return }
  const q = norm(($('#qaSurahSearch')?.value || '').trim());
  const availableSurahs = parseList(qaSelectedMoshaf.surah_list, qaSelectedMoshaf.surah_total);
  const filtered = availableSurahs.filter(n => {
    if (!q) return true;
    const meta = SURAH[n - 1]; if (!meta) return false;
    const ar = norm(meta[0]), en = (meta[1] || '').toLowerCase();
    return String(n) === q || ar.includes(q) || en.includes(q.toLowerCase());
  });
  if (!filtered.length) { listEl.innerHTML = `<div class="qa-surah-empty">${t('noResults')}</div>`; return }
  listEl.innerHTML = filtered.map(n => {
    const meta = SURAH[n - 1], isSel = qaSelectedSurah === n;
    const sName = S.lang === 'ar' ? meta[0] : meta[1];
    const nStr = S.lang === 'ar' ? arDigits(n) : String(n);
    const ayahsStr = S.lang === 'ar' ? `${arDigits(meta[2])} آية` : `${meta[2]} ayahs`;
    return `<button type="button" class="qa-surah-btn ${isSel ? 'selected' : ''}" data-surah="${n}">
      <span class="qas-num">${nStr}</span>
      <span class="qas-name">${esc(sName)}</span>
      <span class="qas-ayahs">${ayahsStr}</span>
    </button>`;
  }).join('');
}
function updateQueueAddConfirmBtn() {
  const btn = $('#queueAddConfirm');
  if (btn) btn.disabled = !qaSelectedSurah;
}
let lastQueuedOffset = 0;
function addTrackToQueueDirect(tr) {
  if (!tr) return;
  if (!S.current || !S.tracks.length) {
    S.tracks = [tr]; S.idx = 0; lastQueuedOffset = 0; loadTrack(0, true);
  } else {
    lastQueuedOffset++;
    const insertIdx = Math.min(S.tracks.length, S.idx + lastQueuedOffset);
    S.tracks.splice(insertIdx, 0, tr);
    renderQueue();
  }
  toast(`${t('addedToQueue')}: ${trackName(tr)} (${trackReciter(tr)})`);
}
function confirmAddSurahToQueue() {
  if (!qaSelectedReciter || !qaSelectedMoshaf || !qaSelectedSurah) return;
  const tr = makeTrack(qaSelectedReciter, qaSelectedMoshaf, qaSelectedSurah);
  addTrackToQueueDirect(tr);
  closeModal('#queueAddScrim');
  const w = $('#ovQueueWrap');
  if (w && $('#npOverlay').classList.contains('open')) {
    w.hidden = false;
    renderQueue();
  }
}
$('#queueAddClose')?.addEventListener('click', () => closeModal('#queueAddScrim'));
$('#queueAddCancel')?.addEventListener('click', () => closeModal('#queueAddScrim'));
$('#queueAddScrim')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(e.currentTarget) });
$('#queueAddConfirm')?.addEventListener('click', confirmAddSurahToQueue);
$('#qaSurahSearch')?.addEventListener('input', () => renderQueueAddSurahs());
$('#qaSurahList')?.addEventListener('click', e => {
  const btn = e.target.closest('[data-surah]'); if (!btn) return;
  qaSelectedSurah = +btn.dataset.surah;
  $$('#qaSurahList .qa-surah-btn').forEach(b => b.classList.toggle('selected', +b.dataset.surah === qaSelectedSurah));
  updateQueueAddConfirmBtn();
});
$('#qaSurahList')?.addEventListener('dblclick', e => {
  const btn = e.target.closest('[data-surah]'); if (!btn) return;
  qaSelectedSurah = +btn.dataset.surah;
  confirmAddSurahToQueue();
});
$('#ovQueueClose')?.addEventListener('click', () => {
  const w = $('#ovQueueWrap'); if (w) w.hidden = true;
});
$('#ovQueueClearBtn')?.addEventListener('click', async () => {
  if (S.tracks.length <= S.idx + 1) return;
  const ok = await confirmDlg(t('clearQueue'), t('confirmClearQueue'));
  if (ok) {
    S.tracks = S.tracks.slice(0, S.idx + 1);
    renderQueue();
    toast(t('queueCleared'));
  }
});
$('#npQueueAddBtn')?.addEventListener('click', openQueueAddModal);
$('#view').addEventListener('wheel', e => {
  if (S.view === 'mushaf' && e.ctrlKey) {
    e.preventDefault();
    mushafZoomStep(e.deltaY < 0 ? 1 : -1);
  }
}, { passive: false });

if (window.matchMedia) { const mqBook = window.matchMedia('(min-width:900px)'); if (mqBook.addEventListener) mqBook.addEventListener('change', () => { if (S.view === 'mushaf' && S.readN) render() }) }

/* audio events */
bindAudio(audio);
if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', () => audio.play());
  navigator.mediaSession.setActionHandler('pause', () => audio.pause());
  navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
  navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
  navigator.mediaSession.setActionHandler('seekto', e => { if (e.seekTime != null) audio.currentTime = e.seekTime });
}
/* ── Focus trap (F-31): cycle Tab/Shift+Tab inside the topmost open overlay ──
   Priority order = stacking order: confirm dialog first, then modals, drawer,
   fullscreen player, and the sidebar drawer (signalled by #scrimSide.open —
   the sidebar's own .open class is also used for the desktop state). */
const TRAP_ROOTS = [
  ['#confirmScrim', null], ['#prayerScrim', null],
  ['#settingsScrim', null], ['#queueAddScrim', null], ['#dlDrawer', null], ['#npOverlay', null], ['#phoneCtlScrim', null],
  ['#sidebar', '#scrimSide']
];
const FOCUSABLE_SEL = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
function trapTab(e) {
  const active = document.activeElement;
  let root = null;
  for (const [sel, signal] of TRAP_ROOTS) {
    const el = $(sel);
    if (!el || !el.classList.contains('open')) continue;
    if (signal) { const sg = $(signal); if (!sg || !sg.classList.contains('open')) continue }
    if (el.contains(active)) { root = el; break }
    if (!root) root = el;
  }
  if (!root) return false;
  const list = [...root.querySelectorAll(FOCUSABLE_SEL)].filter(el => el.getClientRects().length > 0);
  if (!list.length) return false;
  const next = nextFocusable(list, root.contains(active) ? active : null, e.shiftKey ? -1 : 1);
  if (next && next !== active) { e.preventDefault(); next.focus(); return true }
  return false;
}
/* keyboard */
document.addEventListener('keydown', e => {
  if (e.key === 'Tab' && trapTab(e)) return;
  if (e.target.id === 'msSearch') {
    if (e.key === 'Enter') { e.preventDefault(); mushafSearchGo(e.target.value) }
    else if (e.key === 'Escape') { e.target.value = ''; e.target.hidden = true }
    return
  }
  if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  if (e.code === 'Space' && e.target.closest && e.target.closest('button, a, [role="slider"]')) return;
  if (e.code === 'Space') { e.preventDefault(); togglePlay() }
  else if (S.view === 'mushaf' && S.mushafIndexOpen && e.key === 'Escape') { e.preventDefault(); S.mushafIndexOpen = false; render() }
  else if (S.view === 'mushaf' && S.mushafAsk && e.key === 'Escape') { e.preventDefault(); S.mushafAsk = false; render() }
  else if (S.view === 'mushaf' && !S.readN && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); if (mushafLastGet() > 1) { S.mushafAsk = true; render() } else mushafGo(1) }
  else if (S.view === 'mushaf' && (e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) { e.preventDefault(); mushafZoomStep(1) }
  else if (S.view === 'mushaf' && (e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); mushafZoomStep(-1) }
  else if (S.view === 'mushaf' && (e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); setMushafZoom(1.0) }
  else if (S.view === 'mushaf' && S.readN && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); const rtl = document.documentElement.dir === 'rtl'; mushafGo(mushafStep(S.readN, (e.key === 'ArrowLeft') === rtl ? 1 : -1, mushafBook())) }
  else if (e.key === 'ArrowRight') audio.currentTime = Math.min((audio.duration || 0), audio.currentTime + 5);
  else if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5);
  else if (e.key === 'ArrowUp') { e.preventDefault(); audio.volume = Math.min(1, audio.volume + .05); store.set('volume', audio.volume); updateVolUI() }
  else if (e.key === 'ArrowDown') { e.preventDefault(); audio.volume = Math.max(0, audio.volume - .05); store.set('volume', audio.volume); updateVolUI() }
  else if (e.key === 'm' || e.key === 'M') { audio.muted = !audio.muted; updateVolUI() }
  else if (e.key === 'f' || e.key === 'F') toggleFav(S.current);
  else if (e.key === 'n' || e.key === 'N') nextTrack();
  else if (e.key === 'p' || e.key === 'P') prevTrack();
  else if (e.key === '/') { e.preventDefault(); $('#searchInput').focus() }
  else if (e.key === 'Escape') {
    if ($('#confirmScrim') && $('#confirmScrim').classList.contains('open')) { closeModal('#confirmScrim'); confirmRes && confirmRes(false); return }
    if ($('#queueAddScrim') && $('#queueAddScrim').classList.contains('open')) { closeModal('#queueAddScrim'); return }
    if (S.view === 'mushaf') { if (document.body.classList.contains('mushaf-clean')) { document.body.classList.remove('mushaf-clean'); return } setView('home'); return }
    closeOverlay(); closeModal('#settingsScrim'); closeModal('#prayerScrim'); closeModal('#dlDrawer'); closeModal('#phoneCtlScrim'); closeSidebar();
  }
});
window.addEventListener('beforeunload', saveSession);
window.addEventListener('online', () => {
  S.offline = false;
  toast(S.lang === 'ar' ? 'تمت استعادة الاتصال بالإنترنت' : 'Internet connection restored');
});
window.addEventListener('offline', () => {
  S.offline = true;
  toast(t('offline'));
});
window.addEventListener('storage', e => {
  if (!e.key || !e.key.startsWith('ouns_') || e.newValue == null) return;
  const k = e.key.slice(5);
  try {
    const val = JSON.parse(e.newValue);
    if (k === 'theme' && val !== S.theme) { S.theme = val; applyTheme() }
    else if (k === 'lang' && val !== S.lang) { S.lang = val; applyLang() }
    else if (k === 'favorites') { S.favorites = val; renderFavBadge(); if (S.view === 'fav') render() }
    else if (k === 'recent') { S.recent = val; if (S.view === 'recent') render() }
    else if (k === 'quality' && val !== S.quality) { S.quality = val; buildQualitySeg() }
    else if (k === 'mushafRiwaya' && val !== S.mushafRiwaya) { S.mushafRiwaya = val; if (S.view === 'mushaf') render() }
  } catch (_) { }
});

/* ═══════════════ INIT ═══════════════ */
(async function init() {
  akPurgeOld();
  applyTheme(); applyLang(); buildQualitySeg(); renderPhoneSleep(); updateRepeatUI(); updateVolUI(); applyNpPanel(); applySidebar();
  $('#npPin').onclick = () => { S.npMode = S.npMode === 'pinned' ? 'hidden' : 'pinned'; store.set('npMode', S.npMode); applyNpPanel() }
  $('#npDock').onclick = () => { S.npMode = S.npMode === 'float' ? 'auto' : 'float'; store.set('npMode', S.npMode); applyNpPanel() };
  const npHead = $('.np-head'); let npDrag = null;
  const npEndDrag = () => { if (!npDrag) return; npDrag = null; const el = $('.np-panel'); S.npPos = { x: parseFloat(el.style.left) || 16, y: parseFloat(el.style.top) || 16 }; store.set('npPos', S.npPos) };
  npHead.addEventListener('pointerdown', e => {
    if (S.npMode !== 'float' || e.target.closest('button')) return;
    const el = $('.np-panel'), r = el.getBoundingClientRect();
    npDrag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    el.style.left = r.left + 'px'; el.style.top = r.top + 'px'; el.style.right = 'auto'; el.style.insetInlineEnd = 'auto';
    npHead.setPointerCapture(e.pointerId); e.preventDefault();
  });
  npHead.addEventListener('pointermove', e => {
    if (!npDrag) return;
    const el = $('.np-panel'), w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = Math.min(Math.max(8, e.clientX - npDrag.dx), Math.max(8, innerWidth - w - 8)) + 'px';
    el.style.top = Math.min(Math.max(8, e.clientY - npDrag.dy), Math.max(8, innerHeight - h - 8)) + 'px';
  });
  npHead.addEventListener('pointerup', npEndDrag);
  npHead.addEventListener('pointercancel', npEndDrag);
  $('#sideBtn').onclick = () => { S.sideMode = S.sideMode === 'collapsed' ? 'open' : 'collapsed'; store.set('sideMode', S.sideMode); applySidebar() };
  const shellEl = $('.shell');
  if (shellEl) {
    shellEl.addEventListener('transitionend', e => {
      if (e.target === shellEl && flip) {
        try { flip.update() } catch (_) { }
      }
    });
  }
  $('#adhanStop').onclick = stopAdhan;
  $('#btnShuffle').classList.toggle('on', S.shuffle);
  setSpeed(S.speed);
  $('#view').innerHTML = `<div class="skel-page"><div class="skel skel-hero"></div><div class="skel-grid">${'<div class="skel skel-card"></div>'.repeat(8)}</div></div>`;
  $('#npMandala').innerHTML = mandalaHTML('أُنس', 'أ', 'القرآن الكريم');
  $('#ovMandala').innerHTML = mandalaHTML('أُنس', 'أ', 'القرآن الكريم');
  $('#pbArtImg').src = avatarURI('أُنس', 'أ');
  rotateVerse(true);
  await loadData();
  render();
  /* resume last session (paused) */
  const sess = store.get('session', null);
  if (sess) {
    const r = S.reciters.find(x => x.id === sess.rid);
    if (r) {
      S.reciter = r; S.moshaf = r.moshaf.find(m => m.id === sess.mid) || r.moshaf[0];
      S.reciterTracks = parseList(S.moshaf.surah_list, S.moshaf.surah_total).map(n => makeTrack(r, S.moshaf, n));
      const tr = S.reciterTracks.find(x => x.n === sess.n) || makeTrack(r, S.moshaf, sess.n);
      S.tracks = [tr];
      S.idx = 0; S.current = tr; S.srcOrder = pickSource(S.current, S.quality); S.srcIdx = 0;
      setAudioSrc(S.srcOrder[0].url); audio.addEventListener('loadedmetadata', () => { audio.currentTime = sess.pos || 0; updateProgress() }, { once: true });
      updateNowPlaying(); renderQueue();
    } else { const tr = rebuildTrack(sess); S.tracks = [tr]; S.idx = 0; S.current = tr; S.srcOrder = pickSource(tr, S.quality); setAudioSrc(S.srcOrder[0].url); updateNowPlaying() }
  }
  /* deep link: /?view=... (PWA shortcuts) */
  const dv = new URLSearchParams(location.search).get('view');
  if (dv && ['reciters', 'favorites', 'recent', 'mushaf', 'adhkar', 'prayer', 'yt'].includes(dv)) setView(dv);
})();
