'use strict';
import adhanUrl from '../assets/adhan/adhan.mp3';
import adhanFajrUrl from '../assets/adhan/adhan-fajr.mp3';
import ADHKAR from '../data/adhkar.json';
/* ═══════════════════════ OUNS · Quran Player ═══════════════════════ */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const API='https://mp3quran.net/api/v3';
const pad=n=>String(n).padStart(3,'0');
const norm=s=>(s||'').toString().replace(/[\u064B-\u0652\u0670\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/\s+/g,' ').trim().toLowerCase();
const norm2=s=>norm(s).replace(/\s+/g,'');
const esc=s=>(s||'').toString().replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash=s=>{let h=0;for(let i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))|0}return Math.abs(h)};
const arDigits=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
const fmt=s=>(!isFinite(s)||s<0)?'0:00':`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const safeName=s=>(s||'').replace(/[\\/:*?"<>|]/g,'-').trim().slice(0,80);
const store={get(k,d){try{const v=localStorage.getItem('ouns_'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('ouns_'+k,JSON.stringify(v))}catch(e){}}};

/* ── Surah metadata (114) ── */
const SURAH=[["الفاتحة","Al-Fatihah",7,0],["البقرة","Al-Baqarah",286,1],["آل عمران","Aal-Imran",200,1],["النساء","An-Nisa",176,1],["المائدة","Al-Ma'idah",120,1],["الأنعام","Al-An'am",165,0],["الأعراف","Al-A'raf",206,0],["الأنفال","Al-Anfal",75,1],["التوبة","At-Tawbah",129,1],["يونس","Yunus",109,0],["هود","Hud",123,0],["يوسف","Yusuf",111,0],["الرعد","Ar-Ra'd",43,1],["إبراهيم","Ibrahim",52,0],["الحجر","Al-Hijr",99,0],["النحل","An-Nahl",128,0],["الإسراء","Al-Isra",111,0],["الكهف","Al-Kahf",110,0],["مريم","Maryam",98,0],["طه","Ta-Ha",135,0],["الأنبياء","Al-Anbiya",112,0],["الحج","Al-Hajj",78,1],["المؤمنون","Al-Mu'minun",118,0],["النور","An-Nur",64,1],["الفرقان","Al-Furqan",77,0],["الشعراء","Ash-Shu'ara",227,0],["النمل","An-Naml",93,0],["القصص","Al-Qasas",88,0],["العنكبوت","Al-Ankabut",69,0],["الروم","Ar-Rum",60,0],["لقمان","Luqman",34,0],["السجدة","As-Sajdah",30,0],["الأحزاب","Al-Ahzab",73,1],["سبأ","Saba",54,0],["فاطر","Fatir",45,0],["يس","Ya-Sin",83,0],["الصافات","As-Saffat",182,0],["ص","Sad",88,0],["الزمر","Az-Zumar",75,0],["غافر","Ghafir",85,0],["فصلت","Fussilat",54,0],["الشورى","Ash-Shura",53,0],["الزخرف","Az-Zukhruf",89,0],["الدخان","Ad-Dukhan",59,0],["الجاثية","Al-Jathiyah",37,0],["الأحقاف","Al-Ahqaf",35,0],["محمد","Muhammad",38,1],["الفتح","Al-Fath",29,1],["الحجرات","Al-Hujurat",18,1],["ق","Qaf",45,0],["الذاريات","Adh-Dhariyat",60,0],["الطور","At-Tur",49,0],["النجم","An-Najm",62,0],["القمر","Al-Qamar",55,0],["الرحمن","Ar-Rahman",78,1],["الواقعة","Al-Waqi'ah",96,0],["الحديد","Al-Hadid",29,1],["المجادلة","Al-Mujadila",22,1],["الحشر","Al-Hashr",24,1],["الممتحنة","Al-Mumtahanah",13,1],["الصف","As-Saff",14,1],["الجمعة","Al-Jumu'ah",11,1],["المنافقون","Al-Munafiqun",11,1],["التغابن","At-Taghabun",18,1],["الطلاق","At-Talaq",12,1],["التحريم","At-Tahrim",12,1],["الملك","Al-Mulk",30,0],["القلم","Al-Qalam",52,0],["الحاقة","Al-Haqqah",52,0],["المعارج","Al-Ma'arij",44,0],["نوح","Nuh",28,0],["الجن","Al-Jinn",28,0],["المزمل","Al-Muzzammil",20,0],["المدثر","Al-Muddaththir",56,0],["القيامة","Al-Qiyamah",40,0],["الإنسان","Al-Insan",31,1],["المرسلات","Al-Mursalat",50,0],["النبأ","An-Naba",40,0],["النازعات","An-Nazi'at",46,0],["عبس","Abasa",42,0],["التكوير","At-Takwir",29,0],["الانفطار","Al-Infitar",19,0],["المطففين","Al-Mutaffifin",36,0],["الانشقاق","Al-Inshiqaq",25,0],["البروج","Al-Buruj",22,0],["الطارق","At-Tariq",17,0],["الأعلى","Al-A'la",19,0],["الغاشية","Al-Ghashiyah",26,0],["الفجر","Al-Fajr",30,0],["البلد","Al-Balad",20,0],["الشمس","Ash-Shams",15,0],["الليل","Al-Layl",21,0],["الضحى","Ad-Duha",11,0],["الشرح","Ash-Sharh",8,0],["التين","At-Tin",8,0],["العلق","Al-Alaq",19,0],["القدر","Al-Qadr",5,0],["البينة","Al-Bayyinah",8,1],["الزلزلة","Az-Zalzalah",8,1],["العاديات","Al-Adiyat",11,0],["القارعة","Al-Qari'ah",11,0],["التكاثر","At-Takathur",8,0],["العصر","Al-Asr",3,0],["الهمزة","Al-Humazah",9,0],["الفيل","Al-Fil",5,0],["قريش","Quraysh",4,0],["الماعون","Al-Ma'un",7,0],["الكوثر","Al-Kawthar",3,0],["الكافرون","Al-Kafirun",6,0],["النصر","An-Nasr",3,1],["المسد","Al-Masad",5,0],["الإخلاص","Al-Ikhlas",4,0],["الفلق","Al-Falaq",5,0],["الناس","An-Nas",6,0]];
const surahName=(n,lang)=>lang==='ar'?SURAH[n-1][0]:SURAH[n-1][1];

/* ── Fallback catalog (offline resilience) ── */
const FALLBACK=[["مشاري راشد العفاسي","Mishary Rashid Alafasy","https://server8.mp3quran.net/afs/"],["عبد الرحمن السديس","Abdurrahman As-Sudais","https://server11.mp3quran.net/sds/"],["سعود الشريم","Saud Ash-Shuraim","https://server7.mp3quran.net/shur/"],["ماهر المعيقلي","Maher Al Muaiqly","https://server12.mp3quran.net/maher/"],["محمود خليل الحصري","Mahmoud Khalil Al-Husary","https://server13.mp3quran.net/husr/"],["محمد صديق المنشاوي","Mohamed Siddiq El-Minshawi","https://server10.mp3quran.net/minsh/"],["سعد الغامدي","Saad Al-Ghamdi","https://server7.mp3quran.net/s_gmd/"],["أبو بكر الشاطري","Abu Bakr Ash-Shatri","https://server11.mp3quran.net/shatri/"],["ناصر القطامي","Nasser Al Qatami","https://server6.mp3quran.net/qtm/"],["ياسر الدوسري","Yasser Al-Dosari","https://server11.mp3quran.net/yasser/"],["هاني الرفاعي","Hani Ar-Rifai","https://server8.mp3quran.net/hani/"],["أحمد العجمي","Ahmed Al-Ajmi","https://server10.mp3quran.net/ajm/"],["محمد أيوب","Muhammad Ayyoub","https://server8.mp3quran.net/ayyub/"],["عبد الله بصفر","Abdullah Basfar","https://server6.mp3quran.net/bsfr/"],["علي الحذيفي","Ali Al-Hudhaify","https://server9.mp3quran.net/hthfi/"],["إبراهيم الأخضر","Ibrahim Al-Akhdar","https://server6.mp3quran.net/akdr/"],["خالد القحطاني","Khalid Al-Qahtani","https://server10.mp3quran.net/qht/"],["عبد الباسط عبد الصمد","Abdul Basit Abdus-Samad","https://server7.mp3quran.net/basit/"]].map((r,i)=>({id:9000+i,name:r[0],name_en:r[1],moshaf:[{id:1,server:r[2],rewaya:'حفص عن عاصم',name:'مرتل',surah_list:'1-114',surah_total:114}]}));

/* ── Islamic Network CDN edition matching ── */
const ED_KEYS=[["alafasy","عفاسي","alafasy"],["husary","حصري","husary"],["minshawi","منشاوي","minshawi"],["abdulbasit","عبدالباسط","abdulbasit"],["sudais","سديس","sudais"],["shuraim","شريم","shuraym"],["muaiqly","معيقلي","muaiqly"],["shatri","شاطري","shaatree"],["hudhaify","حذيفي","hudhaify"],["ajmi","عجمي","ajamy"],["ayyoub","ايوب","ayyoub"],["rifai","رفاعي","rifai"],["akhdar","اخضر","akhbar"],["jibreel","جبريل","jibreel"]];
let EDITIONS=[];

/* ── Verses ── */
const VERSES=[["وَإِذَا قُرِئَ الْقُرْآنُ فَاسْتَمِعُوا لَهُ وَأَنصِتُوا لَعَلَّكُمْ تُرْحَمُونَ","الأعراف · ٢٠٤","When the Qur'an is recited, listen to it attentively, so you may receive mercy.","Al-A'raf · 204"],["الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ","الرعد · ٢٨","Those who believe, and whose hearts find comfort in the remembrance of Allah.","Ar-Ra'd · 28"],["وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا","المزمل · ٤","And recite the Qur'an with measured recitation.","Al-Muzzammil · 4"],["إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ","الحجر · ٩","Indeed, it is We who sent down the Reminder, and indeed, We will be its guardian.","Al-Hijr · 9"]];

/* ── i18n ── */
const I18N={
ar:{library:"المكتبة",home:"الرئيسية",reciters:"القرّاء",favorites:"المفضلة",recent:"آخر الاستماع",downloads:"التنزيلات",verseLabel:"آية وتدبّر",tagline:"رفيقك لتلاوة القرآن الكريم",nowPlaying:"يُتلى الآن",chooseReciter:"اختر قارئًا لبدء التلاوة",upNext:"التالي في القائمة",favorite:"المفضلة",download:"تنزيل",settings:"الإعدادات",theme:"المظهر",themeDesc:"نهاري بيج / ليلي OLED",light:"نهاري",dark:"ليلي",language:"اللغة",audioSource:"مصدر الصوت",audioSourceDesc:"يُختار الأعلى جودة تلقائيًا مع تجاوز عند الفشل",shortcuts:"اختصارات لوحة المفاتيح",kPlay:"تشغيل / إيقاف",kSeek:"تقديم / ترجيع ٥ ثوانٍ",kNext:"التالي / السابق",kFav:"المفضلة",kMute:"كتم الصوت",kSearch:"بحث",done:"تم",cancel:"إلغاء",confirm:"تأكيد",chooseFolder:"مجلد الحفظ",noDownloads:"لا توجد تنزيلات بعد",loading:"جارٍ تحميل المكتبة…",offline:"تعذّر الاتصال بالمصدر — عُرضت مكتبة مختصرة تعمل عبر الإنترنت",searchReciters:"ابحث عن قارئ…",searchSurahs:"ابحث عن سورة…",searchFav:"ابحث في المفضلة…",searchRecent:"ابحث في آخر الاستماع…",greetM:"صباح النور والقرآن",greetE:"مساء النور والقرآن",heroSub:"تلاوات خاشعة بأعلى جودة، بروايات متعددة وقرّاء من حول العالم. اختر قارئًا ودع القرآن يؤنسك.",continueL:"واصل الاستماع",browse:"تصفّح القرّاء",featured:"قرّاء مختارون",quickSurahs:"سور يُكثر الاستماع إليها",allRiwayat:"كل الروايات",riwayat:"الروايات",sortName:"الاسم",sortCount:"عدد المصاحف",moshaf:"مصحف",surahs:"سورة",playAll:"تشغيل الكل",downloadAll:"تنزيل الكل",back:"عودة للقرّاء",ayahs:"آية",meccan:"مكية",medinan:"مدنية",noFav:"لا توجد سور في المفضلة بعد — اضغط ♥ على أي سورة",noRecent:"لم تستمع إلى شيء بعد",clearRecent:"مسح السجل",cleared:"تم مسح السجل",undo:"تراجع",addedFav:"أُضيفت إلى المفضلة",removedFav:"أُزيلت من المفضلة",qAuto:"أعلى جودة",qHigh:"١٩٢+",qStd:"١٢٨",qSave:"توفير البيانات",sleep:"مؤقت النوم",sleepOff:"إيقاف",min:"دقيقة",timerSet:"سيتوقف التشغيل بعد",timerEnd:"انتهى مؤقت النوم — تصبح على خير",confirmDlAll:"تنزيل جميع سور هذا المصحف؟",confirmDlAllMsg:"قد يتجاوز الحجم ٥٠٠ ميغابايت. سيبدأ التنزيل في الخلفية.",saved:"تم الحفظ",failed:"فشل",downloading:"جارٍ التنزيل",pending:"بالانتظار",cancelled:"أُلغي",dlDone:"اكتمل التنزيل",errorAudio:"تعذّر تشغيل هذه التلاوة — جرّب مصدرًا آخر",noResults:"لا توجد نتائج مطابقة",reciter:"قارئ",tracks:"تلاوة",kbps:"kbps",provider:"المصدر",resume:"استئناف",playing:"يُتلى الآن",selectReciterFirst:"اختر قارئًا أولًا",favView:"المفضلة",recentView:"آخر الاستماع",favSub:"سورك المحفوظة للتلاوة الدائمة",recentSub:"آخر ما استمعت إليه",recitersSub:"قرّاء من حول العالم، بروايات متعددة",surahCount:"سورة متاحة",dlFolder:"اختر مجلدًا لحفظ التلاوات تلقائيًا",folderOk:"سيتم الحفظ في",quality:"الجودة",speed:"السرعة",volume:"الصوت",mute:"كتم",expand:"ملء الشاشة",close:"إغلاق",previous:"السابق",next:"التالي",shuffle:"عشوائي",repeat:"تكرار",play:"تشغيل",pause:"إيقاف",remove:"إزالة",clear:"مسح",about:"أُنس — مشغل القرآن الكريم",aboutSub:"تلاوات كاملة، روايات متعددة، أعلى جودة",pin:"تثبيت اللوحة",unpin:"إلغاء التثبيت",hidePanel:"إخفاء اللوحة",showPanel:"إظهار اللوحة",floatPanel:"فصل اللوحة كنافذة عائمة",dockPanel:"إرجاع اللوحة إلى الجانب",mushaf:"المصحف",quranName:"القرآن الكريم",startReading:"ابدأ القراءة",continueReading:"تابع القراءة",mushafSub:"قراءة المصحف — رواية حفص عن عاصم",page:"صفحة",juz:"الجزء",rwHafs:"حفص عن عاصم",rwWarsh:"ورش عن نافع",mushafRiwaya:"رواية المصحف",mushafRiwayaDesc:"المصحف المكتوب — حفص عن عاصم / ورش عن نافع",chooseRiwaya:"اختر رواية المصحف",chooseRiwayaDesc:"يمكنك تغييرها لاحقاً من الإعدادات",dlPages:"تحميل جميع الصفحات",prayerTimes:"مواقيت الصلاة",prayerSub:"مواقيت الصلاة لموقعك",nextPrayer:"الصلاة القادمة",fajr:"الفجر",sunrise:"الشروق",dhuhr:"الظهر",asr:"العصر",maghrib:"المغرب",isha:"العشاء",location:"الموقع",changeLoc:"تغيير الموقع",searchLoc:"ابحث عن مدينة…",locNotFound:"لم يتم العثور على الموقع",search:"بحث",adhan:"الأذان",adhanDesc:"تشغيل الأذان تلقائياً عند دخول وقت الصلاة",adhanNow:"حان الآن وقت",stopAdhan:"إيقاف الأذان",adhanOn:"مفعّل",adhanOff:"معطّل",firstThird:"الثلث الأول من الليل",lastThird:"الثلث الأخير من الليل",adhkar:"الأذكار",adhkarSub:"من حصن المسلم",dhikr:"ذكر",allCats:"جميع الأقسام",akDone:"تمّت الأذكار — تقبّل الله",ytView:"أفضل التلاوات",ytSub:"مجموعة مختارة من أجمل التلاوات المرئية",ytAll:"كل التلاوات",prToday:"صلوات اليوم",prNight:"الشروق وأوقات الليل"},
en:{library:"Library",home:"Home",reciters:"Reciters",favorites:"Favorites",recent:"Recently Played",downloads:"Downloads",verseLabel:"Verse & Reflect",tagline:"Your companion for Qur'an listening",nowPlaying:"Now Reciting",chooseReciter:"Choose a reciter to begin",upNext:"Up Next",favorite:"Favorite",download:"Download",settings:"Settings",theme:"Theme",themeDesc:"Beige light / OLED dark",light:"Light",dark:"Dark",language:"Language",audioSource:"Audio source",audioSourceDesc:"Highest quality chosen automatically, with fallback",shortcuts:"Keyboard shortcuts",kPlay:"Play / pause",kSeek:"Seek ±5 seconds",kNext:"Next / previous",kFav:"Favorite",kMute:"Mute",kSearch:"Search",done:"Done",cancel:"Cancel",confirm:"Confirm",chooseFolder:"Save folder",noDownloads:"No downloads yet",loading:"Loading library…",offline:"Could not reach the source — showing a compact online catalog",searchReciters:"Search reciters…",searchSurahs:"Search surahs…",searchFav:"Search favorites…",searchRecent:"Search recent…",greetM:"Good morning, with Qur'an",greetE:"Good evening, with Qur'an",heroSub:"Humble recitations in the highest quality, across multiple riwayat and reciters worldwide. Pick a reciter and let the Qur'an keep you company.",continueL:"Continue listening",browse:"Browse reciters",featured:"Featured reciters",quickSurahs:"Frequently recited surahs",allRiwayat:"All riwayat",riwayat:"Riwayat",sortName:"Name",sortCount:"Mushaf count",moshaf:"mushaf",surahs:"surahs",playAll:"Play all",downloadAll:"Download all",back:"Back to reciters",ayahs:"ayahs",meccan:"Meccan",medinan:"Medinan",noFav:"No favorites yet — tap ♥ on any surah",noRecent:"Nothing played yet",clearRecent:"Clear history",cleared:"History cleared",undo:"Undo",addedFav:"Added to favorites",removedFav:"Removed from favorites",qAuto:"Best quality",qHigh:"192+",qStd:"128",qSave:"Save data",sleep:"Sleep timer",sleepOff:"Off",min:"min",timerSet:"Playback will stop in",timerEnd:"Sleep timer ended — good night",confirmDlAll:"Download all surahs of this mushaf?",confirmDlAllMsg:"Total size may exceed 500 MB. Downloads run in the background.",saved:"Saved",failed:"Failed",downloading:"Downloading",pending:"Pending",cancelled:"Cancelled",dlDone:"Download complete",errorAudio:"Could not play this recitation — try another source",noResults:"No matching results",reciter:"reciters",tracks:"recitations",kbps:"kbps",provider:"Source",resume:"Resume",playing:"Now reciting",selectReciterFirst:"Choose a reciter first",favView:"Favorites",recentView:"Recently Played",favSub:"Your saved surahs for anytime recitation",recentSub:"What you listened to last",recitersSub:"Reciters worldwide, across multiple riwayat",surahCount:"surahs available",dlFolder:"Choose a folder to save recitations automatically",folderOk:"Saving to",quality:"Quality",speed:"Speed",volume:"Volume",mute:"Mute",expand:"Fullscreen",close:"Close",previous:"Previous",next:"Next",shuffle:"Shuffle",repeat:"Repeat",play:"Play",pause:"Pause",remove:"Remove",clear:"Clear",about:"Ouns — Qur'an Player",aboutSub:"Full recitations, multiple riwayat, highest quality",pin:"Pin panel",unpin:"Unpin",hidePanel:"Hide panel",showPanel:"Show panel",floatPanel:"Float panel",dockPanel:"Dock panel",mushaf:"Mushaf",quranName:"The Holy Qur'an",startReading:"Start reading",continueReading:"Continue reading",mushafSub:"Read the Qur'an — Hafs 'an 'Asim",page:"Page",juz:"Juz",rwHafs:"Hafs 'an 'Asim",rwWarsh:"Warsh 'an Nafi'",mushafRiwaya:"Mushaf riwayah",mushafRiwayaDesc:"Written mushaf — Hafs 'an 'Asim / Warsh 'an Nafi'",chooseRiwaya:"Choose mushaf riwayah",chooseRiwayaDesc:"You can change it later in Settings",dlPages:"Download all pages",prayerTimes:"Prayer times",prayerSub:"Prayer times for your location",nextPrayer:"Next prayer",fajr:"Fajr",sunrise:"Sunrise",dhuhr:"Dhuhr",asr:"Asr",maghrib:"Maghrib",isha:"Isha",location:"Location",changeLoc:"Change location",searchLoc:"Search a city…",locNotFound:"Location not found",search:"Search",adhan:"Adhan",adhanDesc:"Play the adhan automatically at prayer time",adhanNow:"It is now time for",stopAdhan:"Stop adhan",adhanOn:"On",adhanOff:"Off",firstThird:"First third of the night",lastThird:"Last third of the night",adhkar:"Adhkar",adhkarSub:"From Hisn al-Muslim",dhikr:"dhikr",allCats:"All categories",akDone:"Adhkar complete — may Allah accept",ytView:"Best recitations",ytSub:"A curated selection of the finest video recitations",ytAll:"All recitations",prToday:"Today's prayers",prNight:"Sunrise & night quarters"}
};
const t=k=>I18N[S.lang][k]??k;

/* ── State ── */
const S={
  lang:store.get('lang','ar'), theme:store.get('theme','light'),
  quality:store.get('quality','auto'), speed:store.get('speed',1),
  view:'home', query:'', rewaya:'__all', sort:'name',
  reciters:[], riwayat:[], editionsReady:false,
  reciter:null, moshaf:null, tracks:[], idx:-1,
  shuffle:store.get('shuffle',false), repeat:store.get('repeat',0),
  favorites:store.get('favorites',[]), recent:store.get('recent',[]),
  current:null, srcIdx:0, dirHandle:null, sleepMin:0, sleepTimer:null, sleepTick:null,
  verseIdx:0, offline:false, npMode:store.get('npMode','auto'), npPos:store.get('npPos',null), sideMode:store.get('sideMode','open'),
  readN:null, mushafPage:store.get('mushafPage',0), mushafRiwaya:store.get('mushafRiwaya','hafs'), mushafAsk:false,
  prayerLoc:store.get('prayerLoc',{name:'وادي العثمانية، ميلة',lat:36.2662,lng:6.3118}), prayerData:null, prayerSearch:null, prayerTimer:null,
  adhanOn:store.get('adhanOn',true), adhanAudio:null, adhanLast:store.get('adhanLast',''),
  adhkarCat:null, ytId:null
};
if(store.get('mushafLast',0)>1&&!store.get('mushafLast_hafs',0))store.set('mushafLast_hafs',store.get('mushafLast',0));
const audio=$('#audio');
audio.volume=store.get('volume',1);

/* ═══════════════ GENERATIVE ISLAMIC ART ═══════════════ */
const PAL=[["#2F5D3A","#A8CBA0","#F4F1E8","#C9A24B"],["#1F4030","#D9C9A3","#F7F3E8","#C9A24B"],["#3E6B48","#8FBC8F","#FBF9F3","#B99745"],["#274C3B","#9DCB9D","#EAF2E6","#D4B36A"],["#41563A","#CBB98A","#F4F1E8","#B99745"],["#2C3E30","#B7C9A8","#F7F9F7","#C2A14D"]];
const pal=seed=>PAL[hash(seed)%PAL.length];
const svgURI=s=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s);
function avatarURI(seed,letter){
  const[bg,pt,ink,gd]=pal(seed);let sq='',dots='';
  for(let i=0;i<4;i++)sq+=`<rect x="40" y="40" width="120" height="120" fill="none" stroke="${pt}" stroke-width="1.4" opacity=".45" transform="rotate(${i*22.5} 100 100)"/>`;
  for(let i=0;i<8;i++){const a=i*Math.PI/4;dots+=`<circle cx="${(100+87*Math.cos(a)).toFixed(1)}" cy="${(100+87*Math.sin(a)).toFixed(1)}" r="3" fill="${pt}" opacity=".85"/>`}
  return svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="${bg}"/>${sq}${dots}<rect x="57" y="57" width="86" height="86" fill="none" stroke="${gd}" stroke-width="1.6" transform="rotate(45 100 100)"/><circle cx="100" cy="100" r="46" fill="${pt}"/><text x="100" y="117" text-anchor="middle" font-size="50" font-family="Amiri,serif" font-weight="700" fill="${bg}">${esc(letter)}</text></svg>`);
}
let FRAME_TPL=null,phSeq=0;
function frameInner(){
  if(FRAME_TPL==null){const el=document.getElementById('playerFrame');FRAME_TPL=el?el.textContent.trim():''}
  return FRAME_TPL.replace(/^[\s\S]*?<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'');
}
function mandalaSVG(seed,numTxt,subTxt,photo,phLetter){
  const C=(2*Math.PI*45.6).toFixed(2),cid='phc'+(hash(seed)>>>0).toString(36)+(phSeq++);
  const center=photo
    ?`<text x="48" y="52.4" text-anchor="middle" class="m-num" fill="#e3d2a5">${esc(phLetter||'ق')}</text><clipPath id="${cid}"><circle cx="48" cy="48" r="15.36"/></clipPath><image href="${photo}" x="32.64" y="32.64" width="30.72" height="30.72" clip-path="url(#${cid})" preserveAspectRatio="xMidYMid slice" onerror="this.remove()"/>`
    :`<circle cx="48" cy="48" r="15.36" fill="#21402f" stroke="#ba9743" stroke-width="0.39"/><text x="48" y="51.8" text-anchor="middle" class="m-num" fill="#e3d2a5">${esc(numTxt)}</text><text x="48" y="60" text-anchor="middle" class="m-sub" fill="#e3d2a5">${esc(subTxt)}</text>`;
  const inner=frameInner()
    .replace(/<g id="mondala">/,'<g class="spin-a">')
    .replace(/<circle id="pr-pill"[^>]*\/>/,`<circle class="pr-fill" cx="48" cy="48" r="45.6" fill="none" stroke="#ba9743" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" transform="rotate(-90 48 48)"/>`)
    .replace(/<circle id="reciter-placeholder"[^>]*\/>/,'__OUNS_CENTER__')
    .replace(/<rect id="Artboar2"[^>]*\/>/,'')
    .replace(/ id="[^"]*"/g,' ')
    .replace('__OUNS_CENTER__',center);
  return `<svg viewBox="0 0 96 96" class="mandala-svg" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${inner}</svg>`;
}
const reciterLetter=r=>{const n=(S.lang==='ar'?r.name:r.name_en||r.name).trim();return n[0]||'ق'};
const reciterName=r=>S.lang==='ar'?r.name:(r.name_en||r.name);
const RECITER_PHOTOS={'منشاوي':'minshawi','عبدالباسط':'abdulbasit','التركي':'badr-turki','شريم':'shuraim','ديبروف':'dibirov','دوسري':'dosari','معيقلي':'muaiqly','الموسى':'al-mousa','سحيم':'suhaim','الدخين':'dukayn'};
const RECITER_PHOTOS_EXACT={'سعودالشريم':'shuraim','ياسرالدوسري':'dosari','محمدصديقالمنشاوي':'minshawi','عبدالباسطعبدالصمد':'abdulbasit','بدرالتركي':'badr-turki','ماهرالمعيقلي':'muaiqly','عبداللهالموسى':'al-mousa','عبدالعزيزسحيم':'suhaim','عبدالعزيزالسحيم':'suhaim','هيثمالدخين':'dukayn','محمدديبروف':'dibirov'};
function photoURL(name,id){const n=norm2(name);const ex=RECITER_PHOTOS_EXACT[n];if(ex)return 'img/'+ex+'.jpg';if(n.includes(norm2('الشريمي'))||n.includes(norm2('الدوسري'))||n.includes(norm2('التركي'))||(n.includes(norm2('منشاوي'))&&n.includes(norm2('طه'))))return id?'img/'+id+'.jpg':'';for(const k in RECITER_PHOTOS){if(n.includes(norm2(k)))return 'img/'+RECITER_PHOTOS[k]+'.jpg'}return id?'img/'+id+'.jpg':''}
const reciterImg=(r,cls='')=>{const p=photoURL(r.name,r.id);const ava=avatarURI(r.name,reciterLetter(r));return p?`<img class="${cls}" src="${p}" alt="${esc(reciterName(r))}" loading="lazy" onerror="this.onerror=null;this.src='${ava}'">`:`<img class="${cls}" src="${ava}" alt="${esc(reciterName(r))}" loading="lazy">`};

/* ═══════════════ DATA ═══════════════ */
async function api(path,params={}){const u=new URL(API+path);Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));const r=await fetch(u);if(!r.ok)throw new Error(r.status);return r.json()}
function parseList(str,total){if(!str)return Array.from({length:total||114},(_,i)=>i+1);const out=new Set();String(str).split(',').forEach(tok=>{tok=tok.trim();if(!tok)return;if(tok.includes('-')){const[a,b]=tok.split('-').map(Number);for(let i=a;i<=b;i++)out.add(i)}else{const n=+tok;if(n)out.add(n)}});return[...out].filter(n=>n>=1&&n<=114).sort((a,b)=>a-b)}
const serverURL=(m,n)=>m.server.replace(/^http:/,'https:').replace(/\/?$/,'/')+pad(n)+'.mp3';
function buildSources(rar,ren,moshaf,n){
  const src=[{provider:'MP3Quran',url:serverURL(moshaf,n),bitrate:128}];
  const nm=norm2(rar+' '+ren), rw=norm2(moshaf.rewaya||''), mj=/مجود|mujawwad|mojawwad/.test(norm2((moshaf.name||'')+(moshaf.rewaya||'')));
  if(/حفص|hafs/.test(rw)&&EDITIONS.length){
    for(const[en,ar,key]of ED_KEYS){if(nm.includes(en)||nm.includes(ar)){
      let cands=EDITIONS.filter(e=>e.identifier.includes(key));
      if(mj)cands=cands.filter(e=>/mujawwad|mojawwad/.test(e.identifier)).length?cands.filter(e=>/mujawwad|mojawwad/.test(e.identifier)):cands;
      else cands=cands.filter(e=>!/mujawwad|mojawwad/.test(e.identifier)).length?cands.filter(e=>!/mujawwad|mojawwad/.test(e.identifier)):cands;
      const e=cands.sort((a,b)=>(b.bitrate||0)-(a.bitrate||0))[0];
      if(e)src.push({provider:'Islamic Network',url:`https://cdn.islamic.network/quran/audio-surah/${e.bitrate||128}/${e.identifier}/${n}.mp3`,bitrate:e.bitrate||128,ed:e.identifier});
      break}}
  }
  return src;
}
function pickSource(track){
  const s=[...track.sources];
  if(S.quality==='high')s.sort((a,b)=>(b.bitrate>=192)-(a.bitrate>=192)||b.bitrate-a.bitrate);
  else if(S.quality==='std')s.sort((a,b)=>Math.abs(a.bitrate-128)-Math.abs(b.bitrate-128));
  else if(S.quality==='save')s.sort((a,b)=>a.bitrate-b.bitrate);
  else s.sort((a,b)=>b.bitrate-a.bitrate);
  return s;
}
function makeTrack(r,m,n){
  const meta=SURAH[n-1];
  return {key:`${r.id}:${m.id}:${n}`,n,name_ar:meta[0],name_en:meta[1],ayahs:meta[2],type:meta[3],
    rid:r.id,mid:m.id,rar:r.name,ren:r.name_en||r.name,rewaya:m.rewaya,mname:m.name||m.rewaya,
    server:m.server,sources:buildSources(r.name,r.name_en||r.name,m,n),duration:0};
}
const trackName=tr=>S.lang==='ar'?tr.name_ar:tr.name_en;
const trackReciter=tr=>S.lang==='ar'?tr.rar:tr.ren;
function rebuildTrack(f){const r={id:f.rid,name:f.rar,name_en:f.ren},m={id:f.mid,server:f.server,rewaya:f.rewaya,name:f.mname};return makeTrack(r,m,f.n)}

async function loadData(){
  try{
    const[ar,en]=await Promise.all([api('/reciters',{language:'ar'}),api('/reciters',{language:'eng'})]);
    const enMap=new Map((en.reciters||[]).map(r=>[r.id,r.name]));
    S.reciters=(ar.reciters||[]).filter(r=>r.moshaf&&r.moshaf.length).map(r=>({...r,name_en:enMap.get(r.id)||r.name}));
    if(!S.reciters.length)throw new Error('empty');
  }catch(e){S.reciters=FALLBACK;S.offline=true;toast(t('offline'))}
  try{const r=await fetch('https://api.alquran.cloud/v1/edition?format=audio&language=ar&type=versebyverse');const j=await r.json();EDITIONS=(j.data||[]).filter(e=>e.bitrate)}catch(e){EDITIONS=[]}
  buildRiwayat();
  $('#cntReciters').textContent=S.reciters.length;
}
function buildRiwayat(){
  const map=new Map();
  S.reciters.forEach(r=>r.moshaf.forEach(m=>{const k=norm(m.rewaya);if(!k)return;if(!map.has(k))map.set(k,{key:k,name:m.rewaya,count:0});map.get(k).count++}));
  const rank=k=>/حفص|hafs/.test(k)?0:/ورش|warsh/.test(k)?1:/قالون|qaloon|qalun/.test(k)?2:/الدوري|duri/.test(k)?3:9;
  S.riwayat=[...map.values()].sort((a,b)=>rank(a.key)-rank(b.key)||b.count-a.count);
}
function filteredReciters(){
  const q=norm2(S.query);
  let list=S.reciters.filter(r=>{
    const okR=S.rewaya==='__all'||r.moshaf.some(m=>norm(m.rewaya)===S.rewaya);
    const okQ=!q||norm2(r.name+' '+r.name_en).includes(q);
    return okR&&okQ});
  if(S.sort==='count')list.sort((a,b)=>b.moshaf.length-a.moshaf.length);
  else list.sort((a,b)=>reciterName(a).localeCompare(reciterName(b),S.lang==='ar'?'ar':'en'));
  return list;
}

/* ═══════════════ VIEWS ═══════════════ */
function setView(v){S.view=v;S.query='';$('#searchInput').value='';if(v==='mushaf'){S.readN=null;S.mushafAsk=false}S.prayerSearch=null;if(v!=='adhkar')S.adhkarCat=null;if(v!=='yt')S.ytId=null;document.body.classList.toggle('mushaf-full',v==='mushaf');$$('.nav-item[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===v));closeSidebar();render()}
function render(){
  applyI18nStatic();
  const ph={home:'searchReciters',reciters:'searchReciters',surahs:'searchSurahs',favorites:'searchFav',recent:'searchRecent',mushaf:'searchSurahs'}[S.view]||'searchReciters';
  $('#searchInput').placeholder=t(ph);
  const v=$('#view');
  if(S.view==='home')v.innerHTML=viewHome();
  else if(S.view==='reciters')v.innerHTML=viewReciters();
  else if(S.view==='surahs')v.innerHTML=viewSurahs();
  else if(S.view==='favorites')v.innerHTML=viewCollection(S.favorites,'favView','favSub',true);
  else if(S.view==='recent')v.innerHTML=viewCollection(S.recent,'recentView','recentSub',false);
  else if(S.view==='mushaf')v.innerHTML=S.readN?viewRead():viewMushaf();
  else if(S.view==='prayer')v.innerHTML=viewPrayer();
  else if(S.view==='adhkar')v.innerHTML=viewAdhkar();
  else if(S.view==='yt')v.innerHTML=viewYt();
  $('#main').scrollTop=0;
  updateCounts();
}
const orn=`<div class="ornament"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="7" y="7" width="10" height="10"/><rect x="7" y="7" width="10" height="10" transform="rotate(45 12 12)"/></svg></div>`;
function viewHome(){
  const h=new Date().getHours();const greet=h<12?t('greetM'):t('greetE');
  const last=S.recent[0];
  const featKeys=[['صديق المنشاوي','المنشاوي'],['عبد الباسط','عبدالباسط'],['بدر التركي','التركي'],['سعود الشريم','الشريم'],['محمد ديبروف','ديبروف'],['ياسر الدوسري','الدوسري'],['ماهر المعيقلي','المعيقلي'],['عبد الله الموسى','الموسى'],['عبدالعزيز السحيم','عبدالعزيز سحيم','السحيم','سحيم'],['هيثم الدخين','الدخين']];
  let feat=featKeys.map(ks=>ks.map(k=>S.reciters.find(r=>norm2(r.name).includes(norm2(k)))).find(Boolean)).filter(Boolean);
  if(feat.length<6)feat=[...feat,...S.reciters.filter(r=>!feat.includes(r))].slice(0,10);
  const quick=[18,36,55,67,56,2,1,112];
  const heroSeed=last?last.rar:'أُنس';
  const heroNum=last?(S.lang==='ar'?arDigits(last.n):last.n):'أ';
  const heroSub=last?surahName(last.n,S.lang):'القرآن';
  const num=n=>S.lang==='ar'?arDigits(n):n;
  const stats=[["M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z","M5 11a7 7 0 0 0 14 0","M12 18v3",S.reciters.length,t('reciter')],["M4 19.5A2.5 2.5 0 0 1 6.5 17H20","M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 4.5v15A2.5 2.5 0 0 1 6.5 17z","",S.riwayat.length,t('riwayat')],["M12 20.5s-7.5-4.6-9.3-9A5.2 5.2 0 0 1 12 6.6a5.2 5.2 0 0 1 9.3 4.9c-1.8 4.4-9.3 9-9.3 9z","","",S.favorites.length,t('favorites')]];
  return `<section class="hero">
    <div class="mandala-wrap"><div class="mandala-glow"></div>${mandalaSVG(heroSeed,heroNum,heroSub)}</div>
    <div><span class="eyebrow">${t('tagline')}</span><h1>${greet}</h1><p>${t('heroSub')}</p>
      <div class="hero-cta">
        ${last?`<button class="btn primary" data-act="resume"><svg class="ic fill" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>${t('continueL')} · ${esc(surahName(last.n,S.lang))}</button>`:''}
        <button class="btn" data-act="browse"><svg class="ic" viewBox="0 0 24 24"><path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>${t('browse')}</button>
        ${nextPrayerKey()?`<button class="btn gold hero-prayer" data-act="goprayer"><svg class="ic" viewBox="0 0 24 24"><path d="M12 3c2 2 4 3.6 4 6H8c0-2.4 2-4 4-6z"/><path d="M5 21v-8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v8"/><path d="M3 21h18"/><path d="M10 21v-4h4v4"/></svg><span>${t('nextPrayer')} — ${t(nextPrayerKey().toLowerCase())}</span><b class="pr-count" dir="ltr">${prayerCountdownStr()}</b></button>`:''}
      </div>
      <div class="hero-stats">${stats.map(s=>`<span class="stat-chip"><svg class="ic" viewBox="0 0 24 24">${[s[0],s[1],s[2]].map(d=>d?`<path d="${d}"/>`:'' ).join('')}</svg><b>${num(s[3])}</b> ${esc(s[4])}</span>`).join('')}</div>
    </div></section>
  ${S.recent.length?`
  <div class="view-head"><div><h2>${t('recentView')}</h2></div><button class="icon-btn" data-act="openrecent" aria-label="${t('recentView')}"><svg class="ic" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button></div>
  <div class="recent-row">${S.recent.slice(0,10).map((f,i)=>`<button class="recent-card" data-coll="${i}">
    <img src="${avatarURI(f.rar,reciterLetter({name:f.rar,name_en:f.ren}))}" alt="" loading="lazy">
    <span class="rc-txt"><span class="rt">${esc(surahName(f.n,S.lang))}</span><br><span class="rs">${esc(S.lang==='ar'?f.rar:(f.ren||f.rar))} · ${esc(f.rewaya||'')}</span></span>
    <span class="rplay"><svg class="ic fill" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg></span></button>`).join('')}</div>
  ${orn}`:''}
  <div class="view-head"><div><h2>${t('quickSurahs')}</h2></div></div>
  <div class="quick-grid">${quick.map(n=>{const m=SURAH[n-1];return `<button class="quick-surah" data-surah="${n}"><span class="qn">${num(n)}</span><span><span class="qt">${esc(surahName(n,S.lang))}</span><br><span class="qs">${m[2]} ${t('ayahs')} · ${m[3]?t('medinan'):t('meccan')}</span></span><span class="qplay"><svg class="ic fill" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg></span></button>`}).join('')}</div>
  ${orn}
  <div class="view-head"><div><h2>${t('featured')}</h2><div class="sub">${t('recitersSub')}</div></div><button class="btn sm" data-act="browse">${t('browse')}</button></div>
  <div class="reciter-grid">${feat.slice(0,10).map(reciterCard).join('')}</div>`;
}
function reciterCard(r){
  const ms=S.rewaya==='__all'?r.moshaf:r.moshaf.filter(m=>norm(m.rewaya)===S.rewaya);
  const rw=[...new Set(ms.map(m=>m.rewaya))].slice(0,2);
  return `<button class="reciter-card ${S.reciter&&S.reciter.id===r.id?'active':''}" data-rid="${r.id}">
    <div class="ava">${reciterImg(r)}
    <span class="play-ov"><span><svg class="ic" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg></span></span></div>
    <div class="rn">${esc(reciterName(r))}</div>
    <div class="rm">${rw.map(x=>`<span class="tag">${esc(x)}</span>`).join('')}<span class="tag gold">${r.moshaf.length} ${t('moshaf')}</span></div></button>`;
}
function viewReciters(){
  const list=filteredReciters();
  const chips=[{key:'__all',name:t('allRiwayat'),count:S.reciters.length},...S.riwayat];
  return `<div class="view-head"><div><h2>${t('reciters')}</h2><div class="sub">${list.length} ${t('reciter')} · ${t('recitersSub')}</div></div>
    <select id="sortSel" class="btn sm" style="border-radius:30px"><option value="name" ${S.sort==='name'?'selected':''}>${t('sortName')}</option><option value="count" ${S.sort==='count'?'selected':''}>${t('sortCount')}</option></select></div>
  <div class="chips">${chips.map(c=>`<button class="chip ${S.rewaya===c.key?'active':''}" data-rw="${esc(c.key)}">${esc(c.name)}<span class="n">${c.count}</span></button>`).join('')}</div>
  ${list.length?`<div class="reciter-grid">${list.map(reciterCard).join('')}</div>`:`<div class="empty"><p>${t('noResults')}</p></div>`}`;
}
function viewSurahs(){
  if(!S.reciter||!S.moshaf)return viewReciters();
  const r=S.reciter,m=S.moshaf;
  const q=norm2(S.query);
  const list=S.tracks.filter(tr=>!q||norm2(tr.name_ar+' '+tr.name_en+' '+tr.n).includes(q));
  const ms=r.moshaf;
  return `<button class="back-btn" data-act="back"><svg class="ic" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>${t('back')}</button>
  <section class="reciter-hero">${reciterImg(r)}
    <div class="rh-info"><h2>${esc(reciterName(r))}</h2>
      <div class="rh-meta"><span class="tag gold">${esc(m.rewaya)}</span><span class="tag">${esc(m.name||m.rewaya)}</span><span class="tag">${S.tracks.length} ${t('surahCount')}</span></div>
      <div class="rh-actions">
        <button class="btn primary sm" data-act="playall"><svg class="ic fill" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>${t('playAll')}</button>
        <button class="btn sm" data-act="dlall"><svg class="ic" viewBox="0 0 24 24"><path d="M12 3v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4 19h16"/></svg>${t('downloadAll')}</button>
        ${ms.length>1?`<select id="moshafSel">${ms.map((x,i)=>`<option value="${i}" ${x.id===m.id?'selected':''}>${esc(x.name||x.rewaya)} — ${esc(x.rewaya)}</option>`).join('')}</select>`:''}
      </div></div></section>
  <div class="surah-list">${list.length?list.map(tr=>surahRow(tr,S.tracks.indexOf(tr))).join(''):`<div class="empty"><p>${t('noResults')}</p></div>`}</div>`;
}
function surahRow(tr,i){
  const playing=S.current&&S.current.key===tr.key;
  const faved=S.favorites.some(f=>f.key===tr.key);
  const num=S.lang==='ar'?arDigits(tr.n):tr.n;
  const prim=S.lang==='ar'?tr.name_ar:tr.name_en;
  return `<div class="surah-row ${playing?'playing':''}" data-idx="${i}" data-key="${tr.key}">
    <span class="sn">${playing?'<span class="eq"><i></i><i></i><i></i></span>':`<b>${num}</b>`}</span>
    <span class="si"><span class="sa">${esc(prim)}</span><span class="se">${tr.ayahs} ${t('ayahs')} · ${tr.type?t('medinan'):t('meccan')}</span></span>
    <span class="sfoot"><span class="dur">${tr.duration?fmt(tr.duration):'—'}</span>
    <span class="acts">
      <button class="mini-btn ${faved?'faved':''}" data-fav="${tr.key}" aria-label="favorite"><svg class="ic" viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.3-9A5.2 5.2 0 0 1 12 6.6a5.2 5.2 0 0 1 9.3 4.9c-1.8 4.4-9.3 9-9.3 9z"/></svg></button>
      <button class="mini-btn" data-dl="${tr.key}" aria-label="download"><svg class="ic" viewBox="0 0 24 24"><path d="M12 3v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4 19h16"/></svg></button>
    </span></span></div>`;
}
function viewCollection(items,title,sub,isFav){
  const q=norm2(S.query);
  const list=items.filter(f=>!q||norm2(f.rar+' '+f.ren+' '+surahName(f.n,'ar')+' '+surahName(f.n,'en')).includes(q));
  return `<div class="view-head"><div><h2>${t(title)}</h2><div class="sub">${t(sub)}</div></div>
    ${!isFav&&items.length?`<button class="btn sm" data-act="clearrecent">${t('clearRecent')}</button>`:''}</div>
  ${list.length?`<div class="surah-list">${list.map((f,i)=>{const tr=rebuildTrack(f);return collectionRow(f,tr,i,isFav)}).join('')}</div>`:`<div class="empty"><svg class="ic" viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.3-9A5.2 5.2 0 0 1 12 6.6a5.2 5.2 0 0 1 9.3 4.9c-1.8 4.4-9.3 9-9.3 9z"/></svg><p>${isFav?t('noFav'):t('noRecent')}</p></div>`}`;
}
function collectionRow(f,tr,i,isFav){
  const playing=S.current&&S.current.key===tr.key;
  const prim=S.lang==='ar'?tr.name_ar:tr.name_en;
  return `<div class="surah-row ${playing?'playing':''}" data-coll="${i}" data-key="${tr.key}">
    <span class="sn">${playing?'<span class="eq"><i></i><i></i><i></i></span>':`<b>${S.lang==='ar'?arDigits(tr.n):tr.n}</b>`}</span>
    <span class="si"><span class="sa">${esc(prim)}</span><span class="se">${esc(trackReciter(tr))} · ${esc(f.rewaya)}</span></span>
    <span class="sfoot"><span class="tag gold">${esc(f.rewaya)}</span>
    <span class="acts">
      ${isFav?`<button class="mini-btn faved" data-unfav="${tr.key}"><svg class="ic" viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.3-9A5.2 5.2 0 0 1 12 6.6a5.2 5.2 0 0 1 9.3 4.9c-1.8 4.4-9.3 9-9.3 9z"/></svg></button>`:''}
      <button class="mini-btn" data-dl="${tr.key}"><svg class="ic" viewBox="0 0 24 24"><path d="M12 3v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4 19h16"/></svg></button>
    </span></span></div>`;
}

/* ═══════════════ NAVIGATION ACTIONS ═══════════════ */
function openReciter(id,autoplay=false){
  const r=S.reciters.find(x=>x.id===id);if(!r)return;
  S.reciter=r;
  const ms=S.rewaya==='__all'?r.moshaf:r.moshaf.filter(m=>norm(m.rewaya)===S.rewaya);
  S.moshaf=ms[0]||r.moshaf[0];
  S.tracks=parseList(S.moshaf.surah_list,S.moshaf.surah_total).map(n=>makeTrack(r,S.moshaf,n));
  S.view='surahs';S.query='';$('#searchInput').value='';
  $$('.nav-item[data-view]').forEach(b=>b.classList.remove('active'));
  render();
  if(autoplay&&S.tracks.length)loadTrack(0,true);
}
function setMoshaf(i){
  const r=S.reciter;S.moshaf=r.moshaf[i];
  const curN=S.current?S.current.n:null;
  S.tracks=parseList(S.moshaf.surah_list,S.moshaf.surah_total).map(n=>makeTrack(r,S.moshaf,n));
  render();renderQueue();
  if(curN){const idx=S.tracks.findIndex(x=>x.n===curN);if(idx>=0)loadTrack(idx,!audio.paused)}
}
function playQuick(n){
  if(!S.reciter){const r=S.reciters.find(x=>norm2(x.name).includes('عفاسي'))||S.reciters[0];openReciter(r.id,false)}
  const idx=S.tracks.findIndex(x=>x.n===n);
  if(idx>=0)loadTrack(idx,true);else{loadTrack(0,true)}
}
function playCollection(i,isFav){
  const items=isFav?S.favorites:S.recent;const f=items[i];if(!f)return;
  const tr=rebuildTrack(f);
  S.tracks=items.map(rebuildTrack);S.reciter=null;S.moshaf=null;
  loadTrack(i,true);
}

/* ═══════════════ PLAYER ═══════════════ */
function loadTrack(i,autoplay=true,seek=0){
  if(i<0||i>=S.tracks.length)return;
  S.idx=i;const tr=S.tracks[i];S.current=tr;S.srcIdx=0;
  const order=pickSource(tr);S.srcOrder=order;
  audio.src=order[0].url;audio.playbackRate=S.speed;
  if(seek)audio.addEventListener('loadedmetadata',()=>{audio.currentTime=seek},{once:true});
  if(autoplay)audio.play().catch(()=>{});
  updateNowPlaying();renderQueue();markPlayingRows();pushRecent(tr);saveSession();
}
function currentSources(){return S.srcOrder||[]}
function tryNextSource(){
  S.srcIdx++;
  if(S.srcIdx<currentSources().length){audio.src=currentSources()[S.srcIdx].url;audio.play().catch(()=>{});updateBadges();return true}
  toast(t('errorAudio'));return false;
}
function togglePlay(){
  if(!S.current){if(S.tracks.length)loadTrack(0,true);else{setView('reciters');toast(t('selectReciterFirst'))}return}
  audio.paused?audio.play().catch(()=>{}):audio.pause();
}
function nextTrack(){
  if(!S.tracks.length)return;
  if(S.shuffle){let j;do{j=Math.floor(Math.random()*S.tracks.length)}while(j===S.idx&&S.tracks.length>1);loadTrack(j,true);return}
  const n=S.idx+1;
  if(n>=S.tracks.length){if(S.repeat===1)loadTrack(0,true);else{audio.pause();audio.currentTime=0}}
  else loadTrack(n,true);
}
function prevTrack(){
  if(!S.tracks.length)return;
  if(audio.currentTime>3){audio.currentTime=0;return}
  loadTrack(S.idx-1<0?S.tracks.length-1:S.idx-1,true);
}
function updateNowPlaying(){
  const tr=S.current;if(!tr)return;
  const seed=tr.rar,num=S.lang==='ar'?arDigits(tr.n):String(tr.n),sub=trackName(tr);
  const photo=photoURL(tr.rar,tr.rid);
  const args=[seed,num,sub,photo,(S.lang==='ar'?tr.rar:tr.ren).trim()[0]||'ق'];
  $('#npMandala').innerHTML=mandalaSVG(...args);$('#ovMandala').innerHTML=mandalaSVG(...args);
  $('#ovPhoto').innerHTML=photo?`<img src="${photo}" alt="" onerror="this.remove()">`:'';
  const ava=photo||avatarURI(tr.rar,(S.lang==='ar'?tr.rar:tr.ren).trim()[0]||'ق');
  $('#pbArtImg').src=ava;$('#pbArtImg').onerror=function(){this.onerror=null;this.src=avatarURI(tr.rar,'ق')} ;
  $('#npTitle').textContent=trackName(tr);$('#ovTitle').textContent=trackName(tr);
  $('#npArtist').textContent=trackReciter(tr);$('#ovArtist').textContent=trackReciter(tr);
  $('#pbTitle').textContent=`${trackName(tr)} · ${trackReciter(tr)}`;
  $('#pbSub').textContent=[tr.rewaya,tr.mname].filter(Boolean).join(' · ')||trackReciter(tr);
  updateBadges();updateFavButtons();applyNpPanel();
  if('mediaSession'in navigator){
    navigator.mediaSession.metadata=new MediaMetadata({title:trackName(tr),artist:trackReciter(tr),album:tr.rewaya||'',artwork:[{src:ava,sizes:'512x512',type:photo?'image/jpeg':'image/svg+xml'}]});
  }
}
function updateBadges(){
  const tr=S.current;if(!tr)return;
  const src=currentSources()[S.srcIdx]||tr.sources[0];
  const html=`<span class="tag gold">${esc(tr.rewaya)}</span><span class="tag" id="qBadge">${src.bitrate} ${t('kbps')}</span><span class="tag">${esc(src.provider)}</span>`;
  $('#npBadges').innerHTML=html;$('#ovBadges').innerHTML=html;
}
async function probeBitrate(){
  const tr=S.current;if(!tr)return;
  try{
    const h=await fetch(audio.src,{method:'HEAD'});const len=+h.headers.get('content-length');
    if(len&&audio.duration){const k=Math.round(len*8/audio.duration/1000);
      $$('#qBadge').forEach(el=>el.textContent=`${k} ${t('kbps')}`);
      const src=currentSources()[S.srcIdx];if(src)src.bitrate=k;}
  }catch(e){}
}
function markPlayingRows(){
  $$('.surah-row').forEach(row=>{
    const on=S.current&&row.dataset.key===S.current.key;
    row.classList.toggle('playing',on);
    const sn=row.querySelector('.sn');
    if(on&&!sn.querySelector('.eq'))sn.innerHTML='<span class="eq"><i></i><i></i><i></i></span>';
    else if(!on&&sn.querySelector('.eq')){const idx=+row.dataset.idx;const n=S.tracks[idx]?S.tracks[idx].n:(row.dataset.coll!=null?null:null);sn.innerHTML=`<b>${S.lang==='ar'?arDigits(n||''):n||''}</b>`}
  });
  $$('.quick-surah[data-surah]').forEach(q=>q.classList.toggle('playing',!!(S.view==='home'&&S.current&&+q.dataset.surah===S.current.n)));
}
function renderQueue(){
  const q=$('#npQueue');if(!S.tracks.length){q.innerHTML='';return}
  const start=Math.max(0,S.idx);const items=S.tracks.slice(start,start+8);
  q.innerHTML=items.map((tr,k)=>{const i=start+k;return `<div class="queue-item ${i===S.idx?'active':''}" draggable="true" data-qi="${i}">
    <span class="grip"><svg class="ic" viewBox="0 0 24 24"><path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01"/></svg></span>
    <span class="qi-n">${i===S.idx?'▸':(S.lang==='ar'?arDigits(tr.n):tr.n)}</span>
    <span class="qi-t">${esc(trackName(tr))}</span><span class="qi-d">${tr.duration?fmt(tr.duration):''}</span></div>`}).join('');
}
function updateProgress(){
  const d=audio.duration||0,p=d?audio.currentTime/d:0;
  $('#tCur').textContent=fmt(audio.currentTime);$('#tDur').textContent=fmt(d);
  $('#ovCur').textContent=fmt(audio.currentTime);$('#ovDur').textContent=fmt(d);
  $('#progFill').style.width=(p*100)+'%';$('#progThumb').style.insetInlineStart=(p*100)+'%';
  $('#ovFill').style.width=(p*100)+'%';$('#ovThumb').style.insetInlineStart=(p*100)+'%';
  const C=2*Math.PI*45.6;
  $$('.pr-fill').forEach(c=>c.style.strokeDashoffset=C*(1-p));
  if(S.current&&d){S.current.duration=d;const row=$(`.surah-row[data-key="${S.current.key}"] .dur`);if(row)row.textContent=fmt(d)}
}
function updateBuffer(){
  try{if(audio.buffered.length&&audio.duration){const b=audio.buffered.end(audio.buffered.length-1)/audio.duration*100;$('#progBuf').style.width=b+'%';$('#ovBuf').style.width=b+'%'}}catch(e){}
}
function setPlayingUI(on){
  document.body.classList.toggle('playing',on);
  const ic=on?'<svg class="ic" viewBox="0 0 24 24"><rect x="6" y="4.5" width="4" height="15" rx="1.2"/><rect x="14" y="4.5" width="4" height="15" rx="1.2"/></svg>':'<svg class="ic play-ic" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>';
  $('#btnPlay').innerHTML=ic;$$('.np-overlay [data-act="play"]').forEach(b=>b.innerHTML=ic);
  if('mediaSession'in navigator)navigator.mediaSession.playbackState=on?'playing':'paused';
}
function saveSession(){
  if(!S.current)return;
  store.set('session',{rid:S.current.rid,mid:S.current.mid,n:S.current.n,pos:audio.currentTime||0,server:S.current.server,rewaya:S.current.rewaya,mname:S.current.mname,rar:S.current.rar,ren:S.current.ren});
}
function pushRecent(tr){
  const f={key:tr.key,n:tr.n,rid:tr.rid,mid:tr.mid,server:tr.server,rewaya:tr.rewaya,mname:tr.mname,rar:tr.rar,ren:tr.ren,ts:Date.now()};
  S.recent=[f,...S.recent.filter(x=>x.key!==tr.key)].slice(0,30);store.set('recent',S.recent);updateCounts();
}

/* ═══════════════ MUSHAF ═══════════════ */
const MUSHAF_PAGES=604;
const SURAH_PAGE=[1,2,50,77,106,128,151,177,187,208,221,235,249,255,262,267,282,293,305,312,322,332,342,350,359,367,377,385,396,404,411,415,418,428,434,440,446,453,458,467,477,483,489,496,499,502,507,511,515,518,520,523,526,528,531,534,537,542,545,549,551,553,554,556,558,560,562,564,566,568,570,572,574,575,577,578,580,582,583,585,586,587,587,589,590,591,591,592,593,594,595,595,596,596,597,597,598,598,599,599,600,600,601,601,601,602,602,602,603,603,603,604,604,604];
const JUZ_PAGE=[1,22,42,62,82,102,121,142,162,182,201,222,242,262,282,302,322,342,362,382,402,422,442,462,482,502,522,542,562,582];
const MUSHAF_LOCAL={
  hafs:import.meta.glob('../assets/mushaf/*.svg',{eager:true,query:'?url',import:'default'}),
  warsh:import.meta.glob('../assets/mushaf-warsh/*.svg',{eager:true,query:'?url',import:'default'})
};
const MUSHAF_REMOTE={
  hafs:n=>`https://raw.githubusercontent.com/Younes12345698/pro-muslim-mushaf/main/svg/${pad(n)}.svg`,
  warsh:n=>`https://raw.githubusercontent.com/quran-ws/quran-svg/main/mushafs/warsh/kfqc/svg/${pad(n)}.svg`
};
const mushafSVGURL=(n,rw)=>MUSHAF_LOCAL[rw][`../assets/${rw==='warsh'?'mushaf-warsh':'mushaf'}/${pad(n)}.svg`]||MUSHAF_REMOTE[rw](n);
const mushafLastGet=()=>store.get(`mushafLast_${S.mushafRiwaya}`,0);
function setMushafRiwaya(rw){
  S.mushafRiwaya=rw;store.set('mushafRiwaya',rw);store.set('mushafVisited',true);
  $$('#segMushafRw button').forEach(b=>b.classList.toggle('on',b.dataset.mrw===rw));
  if(S.view==='mushaf'){S.readN=null;S.mushafAsk=false;render()}
}
const CRC_TABLE=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c}return t})();
const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC_TABLE[(c^b[i])&0xFF]^(c>>>8);return(c^0xFFFFFFFF)>>>0};
async function mushafZipAll(rw,onProg){
  const enc=new TextEncoder(),parts=[],central=[];
  let offset=0,count=0;
  const u16=v=>new Uint8Array([v&255,(v>>8)&255]);
  const u32=v=>new Uint8Array([v&255,(v>>8)&255,(v>>16)&255,(v>>>24)&255]);
  for(let n=1;n<=MUSHAF_PAGES;n++){
    let txt;
    try{const res=await fetch(mushafSVGURL(n,rw));if(!res.ok)throw new Error(res.status);txt=await res.text()}catch(e){onProg(n);continue}
    const data=enc.encode(txt),crc=crc32(data),nameB=enc.encode(`${pad(n)}.svg`);
    const lh=new Uint8Array(30);lh.set(u32(0x04034b50),0);lh.set(u16(20),4);lh.set(u16(0),8);lh.set(u16(0),10);lh.set(u32(crc),14);
    lh.set(u32(data.length),18);lh.set(u32(data.length),22);lh.set(u16(nameB.length),26);
    parts.push(lh,nameB,data);offset+=lh.length+nameB.length+data.length;
    const ch=new Uint8Array(46);ch.set(u32(0x02014b50),0);ch.set(u16(20),4);ch.set(u16(20),6);ch.set(u32(crc),16);
    ch.set(u32(data.length),20);ch.set(u32(data.length),24);ch.set(u16(nameB.length),28);ch.set(u32(offset-(lh.length+nameB.length+data.length)),42);
    central.push(ch,nameB);count++;onProg(n);
  }
  if(!count)throw new Error('no pages');
  const cdSize=central.reduce((s,a)=>s+a.length,0);
  const eo=new Uint8Array(22);eo.set(u32(0x06054b50),0);eo.set(u16(count),8);eo.set(u16(count),10);eo.set(u32(cdSize),12);eo.set(u32(offset),16);
  return new Blob([...parts,...central,eo],{type:'application/zip'});
}
async function mushafDownloadAll(btn){
  if(btn.dataset.busy)return;btn.dataset.busy='1';btn.disabled=true;
  const rw=S.mushafRiwaya,orig=btn.textContent;
  try{
    const blob=await mushafZipAll(rw,p=>{btn.textContent=`${S.lang==='ar'?arDigits(p):p} / ${S.lang==='ar'?arDigits(MUSHAF_PAGES):MUSHAF_PAGES}`});
    const fname=`mushaf-${rw}-svg.zip`;
    if(S.dirHandle){const fh=await S.dirHandle.getFileHandle(fname,{create:true});const w=await fh.createWritable();await w.write(blob);await w.close()}
    else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fname;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),60000)}
    toast(t('saved'));
  }catch(e){toast(t('failed'))}
  btn.textContent=orig;btn.disabled=false;delete btn.dataset.busy;
}
const mushafPNGURL=n=>`https://raw.githubusercontent.com/SakinaDevGroup/mushaf-madani-cdn/main/light/p${n}.png`;
const mushafJuz=n=>{let j=1;for(let i=0;i<JUZ_PAGE.length;i++)if(JUZ_PAGE[i]<=n)j=i+1;return j};
const mushafSurah=n=>{let s=1;for(let i=0;i<SURAH_PAGE.length;i++)if(SURAH_PAGE[i]<=n)s=i+1;return s};
function mushafGo(n){
  n=Math.round(n)||0;if(n<0)n=0;if(n>MUSHAF_PAGES)n=MUSHAF_PAGES;
  S.mushafPage=n;store.set('mushafPage',n);
  if(n>=1)store.set(`mushafLast_${S.mushafRiwaya}`,n);
  if(S.view!=='mushaf')setView('mushaf');
  S.readN=n;render();
}
function mushafCoverHTML(){
  const last=mushafLastGet()||S.mushafPage;
  const lbl=last>1?`${t('continueReading')} — ${t('page')} ${S.lang==='ar'?arDigits(last):last}`:t('startReading');
  const first=!store.get('mushafVisited',false);
  const ask=first?`<div class="mushaf-ask" data-act="mushafaskclose"><div class="ma-card">
      <b>${t('chooseRiwaya')}</b>
      <span>${t('chooseRiwayaDesc')}</span>
      <button class="btn gold" data-act="mrwset" data-rw="hafs">${t('rwHafs')}</button>
      <button class="btn" data-act="mrwset" data-rw="warsh">${t('rwWarsh')}</button>
    </div></div>`:(S.mushafAsk&&last>1?`<div class="mushaf-ask" data-act="mushafaskclose"><div class="ma-card">
      <b>${t('continueReading')}</b>
      <span>${t('page')} ${S.lang==='ar'?arDigits(last):last} · ${t(S.mushafRiwaya==='warsh'?'rwWarsh':'rwHafs')}</span>
      <button class="btn gold" data-act="mresume">${t('resume')} — ${t('page')} ${S.lang==='ar'?arDigits(last):last}</button>
      <button class="btn" data-act="mstart">${t('startReading')}</button>
    </div></div>`:'');
  return `<div class="mushaf-wrap">
    <div class="mushaf-stage">
      <div class="mushaf-page cover-page" data-act="mushafopen">
        <img src="/mushaf-cover.jpg" alt="${t('quranName')}" onerror="this.classList.add('broken')">
        <button class="btn gold mc-open" data-act="mushafopen">${lbl}</button>
        <button class="btn mc-dl" data-act="mushafdlall">${t('dlPages')}</button>
      </div>
    </div>
    ${ask}
  </div>`;
}
function viewMushaf(){return mushafCoverHTML()}
const mushafBook=()=>typeof window.matchMedia==='function'&&window.matchMedia('(min-width:900px)').matches;
const mushafRight=n=>n<=0?0:(n%2===1?n:(n>=MUSHAF_PAGES?MUSHAF_PAGES-1:n-1));
function mushafStep(n,d){
  if(!mushafBook())return Math.min(Math.max(0,n+d),MUSHAF_PAGES);
  const R=mushafRight(n);
  if(d>0)return R===0?1:Math.min(R+2,MUSHAF_PAGES-1);
  return R<=1?0:R-2;
}
let mushafBarsT;
function mushafBarsUI(show){
  const w=$('#view .mushaf-wrap');if(!w)return;
  w.classList.toggle('bars',show);
  clearTimeout(mushafBarsT);
  if(show)mushafBarsT=setTimeout(()=>{const c=$('#view .mushaf-wrap');if(c)c.classList.remove('bars')},3000);
}
function viewRead(){
  const n=S.readN,book=mushafBook();
  if(n<=0)return mushafCoverHTML();
  const R=book?mushafRight(n):n;
  const L=book&&R+1<=MUSHAF_PAGES?R+1:null;
  const num=p=>S.lang==='ar'?arDigits(p):String(p);
  const tot=S.lang==='ar'?arDigits(MUSHAF_PAGES):MUSHAF_PAGES;
  const jz=mushafJuz(R),jn=S.lang==='ar'?arDigits(jz):jz;
  const sc=mushafSurah(R);
  const sm=SURAH[sc-1],sn=S.lang==='ar'?sm[0]:sm[1];
  const rw=S.mushafRiwaya;
  const img=p=>`<img src="${mushafSVGURL(p,rw)}" alt="${t('mushaf')} — ${t('page')} ${num(p)}" data-png="${rw==='hafs'?mushafPNGURL(p):''}"
      onerror="if(this.dataset.png){this.src=this.dataset.png;this.dataset.png=''}else{this.classList.add('broken')}">`;
  const prevOff=false,nextOff=book?R>=MUSHAF_PAGES-1:n>=MUSHAF_PAGES;
  const footNum=L?`${num(R)} – ${num(L)}`:`${num(R)} / ${tot}`;
  return `<div class="mushaf-wrap">
    <div class="mushaf-top">
      <button class="back-btn" data-act="mushafback"><svg class="ic" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>${t('back')}</button>
      <div class="mt-nav">
        <select class="mt-sel" id="mSurahSel" title="${t('surahs')}">${SURAH.map((s,i)=>`<option value="${i+1}"${i+1===sc?' selected':''}>${esc(S.lang==='ar'?s[0]:s[1])}</option>`).join('')}</select>
        <select class="mt-sel" id="mJuzSel" title="${t('juz')}">${JUZ_PAGE.map((_,j)=>`<option value="${j+1}"${j+1===jz?' selected':''}>${t('juz')} ${S.lang==='ar'?arDigits(j+1):j+1}</option>`).join('')}</select>
      </div>
      <div class="mt-center"><span>${t('page')} ${footNum}</span></div>
      <div class="mt-actions">
        <button class="icon-btn" data-act="mtheme" title="${t('theme')}"><svg class="ic" viewBox="0 0 24 24"><path d="M20 13.5A8 8 0 0 1 10.5 4 8 8 0 1 0 20 13.5z"/></svg></button>
        <button class="icon-btn" data-act="mushafexit" title="${t('close')}"><svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
    </div>
    <div class="mushaf-stage${book?' book':''}">
      <div class="mushaf-page" data-page="${R}">${img(R)}</div>
      ${L?`<div class="mushaf-page" data-page="${L}">${img(L)}</div>`:''}
    </div>
    <div class="mushaf-foot">
      <button class="btn sm" data-act="mprev" ${prevOff?'disabled':''}><svg class="ic" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg><span>${t('previous')}</span></button>
      <input type="range" class="mf-slider" id="mSlider" min="1" max="${MUSHAF_PAGES}" value="${R}" step="1" aria-label="${t('page')}">
      <span class="mf-num">${footNum}</span>
      <button class="btn sm" data-act="mnext" ${nextOff?'disabled':''}><span>${t('next')}</span><svg class="ic" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
    </div>
  </div>`;
}
/* ═══════════════ PRAYER TIMES ═══════════════ */
const PRAYERS=[['Fajr','fajr'],['Dhuhr','dhuhr'],['Asr','asr'],['Maghrib','maghrib'],['Isha','isha']];
const PRAYER_EXTRA=[['Sunrise','sunrise'],['Firstthird','firstThird'],['Lastthird','lastThird']];
const prayerTime=k=>S.prayerData.timings[k].slice(11,16);
function viewPrayer(){
  if(!S.prayerData)setTimeout(loadPrayer,0);
  const L=S.prayerLoc;
  return `<div class="view-head"><h2>${t('prayerTimes')}</h2></div>
  <div class="prayer-wrap">
    <div class="prayer-loc">
      <svg class="ic" viewBox="0 0 24 24"><path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/></svg>
      <b>${esc(L.name)}</b>
      <button class="btn sm" data-act="prayerloc">${t('changeLoc')}</button>
    </div>
    ${S.prayerSearch?`<div class="prayer-search">
      <input id="locQ" placeholder="${t('searchLoc')}" value="${esc(S.prayerSearch.q||'')}">
      <button class="btn primary sm" data-act="locsearch">${t('search')}</button>
      <div class="loc-res" id="locRes">${S.prayerSearch.res||''}</div>
    </div>`:''}
    <div id="prayerBox">${S.prayerData?prayerCardsHTML():`<div class="empty" style="padding:30px"><p>${t('loading')}</p></div>`}</div>
  </div>`;
}
async function fetchPrayer(){
  const L=S.prayerLoc,d=new Date();
  const day=`${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
  const key=`${L.lat},${L.lng},${day}`;
  if(S.prayerData&&S.prayerKey===key)return;
  try{
    const res=await fetch(`https://api.aladhan.com/v1/timings/${day}?latitude=${L.lat}&longitude=${L.lng}&method=3&iso8601=true`);
    const j=await res.json();
    if(j.code!==200)throw new Error(j.code);
    S.prayerData=j.data;S.prayerKey=key;
  }catch(e){S.prayerData=null}
}
async function loadPrayer(){
  await fetchPrayer();
  if(S.prayerData)startPrayerTick();
  if(S.view==='prayer')render();
}
function nextPrayerKey(){
  if(!S.prayerData)return null;
  const tm=S.prayerData.timings,now=Date.now();
  for(const[k]of PRAYERS){if(new Date(tm[k]).getTime()>now)return k}
  return 'Fajr';
}
function prayerCountdownStr(){
  const tm=S.prayerData.timings,now=Date.now();
  let nt=null;
  for(const[k]of PRAYERS){const tt=new Date(tm[k]).getTime();if(tt>now){nt=tt;break}}
  if(nt===null)nt=new Date(tm.Fajr).getTime()+86400000;
  const s=Math.max(0,Math.floor((nt-now)/1000));
  return `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor(s%3600/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}
function playAdhan(k){
  if(!S.adhanAudio){S.adhanAudio=new Audio();S.adhanAudio.preload='auto'}
  S.adhanAudio.src=k==='Fajr'?adhanFajrUrl:adhanUrl;
  S.adhanAudio.currentTime=0;
  S.adhanAudio.play().catch(()=>{});
  toast(`${t('adhanNow')} — ${t(k.toLowerCase())}`,{label:t('stopAdhan'),fn:()=>S.adhanAudio.pause()});
}
function adhanTick(){
  if(!S.adhanOn||!S.prayerData)return;
  const tm=S.prayerData.timings,now=Date.now();
  for(const[k]of PRAYERS){
    const tt=new Date(tm[k]).getTime();
    if(now>=tt&&now-tt<90000){
      const key=`${S.prayerKey}|${k}`;
      if(S.adhanLast!==key){S.adhanLast=key;store.set('adhanLast',key);playAdhan(k)}
      break;
    }
  }
}
setInterval(async()=>{await fetchPrayer();adhanTick();if(S.prayerData&&!S.prayerTimer)startPrayerTick()},10000);
fetchPrayer().then(()=>{if(S.prayerData){startPrayerTick();if(S.view==='home'||S.view==='prayer')render()}});

/* ═══════════════════ ADHKAR ═══════════════════ */
const AK_CATS=(()=>{const out=[];for(const c of ADHKAR){
  if(c.category==='أذكار الصباح والمساء'){out.push({name:'أذكار الصباح',items:c.array});out.push({name:'أذكار المساء',items:c.array})}
  else out.push({name:c.category,items:c.array})}return out})();
const AK_FEATURED=['أذكار الصباح','أذكار المساء','أذكار النوم','أذكار الاستيقاظ من النوم','الأذكار بعد السلام من الصلاة'];
const AK_ICONS={
  'أذكار الصباح':'<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
  'أذكار المساء':'<path d="M20 12.5A8 8 0 1 1 11.5 4 6.5 6.5 0 0 0 20 12.5z"/>',
  'أذكار النوم':'<path d="M20 12.5A8 8 0 1 1 11.5 4 6.5 6.5 0 0 0 20 12.5z"/><path d="M17 4l.5 1.5L19 6l-1.5.5L17 8l-.5-1.5L15 6l1.5-.5z"/>',
  'أذكار الاستيقاظ من النوم':'<path d="M12 5v3M12 2l1 1M4.9 4.9l2.1 2.1M12 21v-3M5 21h14"/><circle cx="12" cy="13" r="4"/>',
  'الأذكار بعد السلام من الصلاة':'<circle cx="12" cy="10" r="3"/><path d="M12 5V3M12 17v4M7 21h10M5 10a7 7 0 0 1 14 0"/>'
};
function viewAdhkar(){
  if(S.adhkarCat!=null)return viewAdhkarCat();
  const q=norm2(S.query||'');
  const feat=AK_CATS.map((c,i)=>({c,i})).filter(x=>AK_FEATURED.includes(x.c.name));
  const rest=AK_CATS.map((c,i)=>({c,i})).filter(x=>!AK_FEATURED.includes(x.c.name)&&(!q||norm2(x.c.name).includes(q)));
  return `<div class="view-head"><div><h2>${t('adhkar')}</h2><div class="sub">${t('adhkarSub')}</div></div></div>
  <div class="ak-feat">${feat.map(x=>`<button class="ak-hero" data-akcat="${x.i}">
    <svg class="ic" viewBox="0 0 24 24">${AK_ICONS[x.c.name]||AK_ICONS['أذكار الصباح']}</svg>
    <b>${esc(x.c.name)}</b><span>${arDigits(x.c.items.length)} ${t('dhikr')}</span></button>`).join('')}</div>
  ${q?`<div class="ak-grid">${rest.map(x=>`<button class="ak-cat" data-akcat="${x.i}"><span>${esc(x.c.name)}</span><span class="n">${arDigits(x.c.items.length)}</span></button>`).join('')||`<div class="empty"><p>${t('noResults')}</p></div>`}</div>`
  :`<div class="view-head"><div><h2 class="ak-more">${t('allCats')}</h2></div></div>
  <div class="ak-grid">${rest.map(x=>`<button class="ak-cat" data-akcat="${x.i}"><span>${esc(x.c.name)}</span><span class="n">${arDigits(x.c.items.length)}</span></button>`).join('')}</div>`}`;
}
function viewAdhkarCat(){
  const c=AK_CATS[S.adhkarCat];
  const num=n=>S.lang==='ar'?arDigits(n):n;
  return `<button class="back-btn" data-akback><svg class="ic" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>${t('back')}</button>
  <div class="view-head"><div><h2>${esc(c.name)}</h2><div class="sub">${num(c.items.length)} ${t('dhikr')}</div></div></div>
  <div class="ak-list">${c.items.map(a=>`<div class="ak-card">
    <p class="ak-text">${esc(a.text)}</p>
    <div class="ak-foot">
      <button class="ak-tap" data-akdec="${a.id}" data-left="${a.count}" data-max="${a.count}">
        <b>${num(a.count)}</b><span>/${num(a.count)}</span>
      </button>
    </div></div>`).join('')}</div>`;
}
function akTap(btn){
  let l=+btn.dataset.left;
  if(l<=0)return;
  l--;btn.dataset.left=l;
  const num=n=>S.lang==='ar'?arDigits(n):n;
  btn.innerHTML=`<b>${num(l)}</b><span>/${num(btn.dataset.max)}</span>`;
  const card=btn.closest('.ak-card');
  if(l===0){card.classList.add('done');btn.disabled=true;toast(t('akDone'))}
}
/* ═══════════════════════════════ YOUTUBE RECITATIONS ═══════════════════════════════ */
const YT_LIST=[
  {id:'f1F0JkkNPow',reciter:'عبد الباسط عبد الصمد',title:'سورة البقرة كاملة'},
  {id:'WWYUduHRUHU',reciter:'عبد الباسط عبد الصمد',title:'سورة الكهف — مجود'},
  {id:'fpXW6nZC7WE',reciter:'محمد صديق المنشاوي',title:'سورة البقرة — مرتّلة'},
  {id:'b4i7j6U7Ul8',reciter:'ماهر المعيقلي',title:'سورة البقرة — النسخة الأصلية'},
  {id:'nUXRnSA9fHU',reciter:'ياسر الدوسري',title:'سورة البقرة كاملة'},
  {id:'-k6G1REuPQA',reciter:'بدر التركي',title:'سورة البقرة كاملة'},
  {id:'RdNx4qIRHTE',reciter:'بدر التركي',title:'سورة يس كاملة'},
  {id:'W0C-R4Frf5w',reciter:'بدر التركي',title:'سورة الفتح كاملة'},
  {id:'ylQyd_qg2rg',reciter:'محمد ديبروف',title:'سورة البقرة كاملة'},
  {id:'v0gFVowpBXk',reciter:'محمد ديبروف',title:'سورة يس كاملة'},
  {id:'63M2JhRGgQQ',reciter:'سعود الشريم',title:'سورة البقرة كاملة'},
  {id:'SytvCjPesP0',reciter:'سعود الشريم',title:'سورة الذاريات كاملة'},
  {id:'NuWRdPZANNc',reciter:'سعود الشريم',title:'سورة القصص كاملة'},
  {id:'U9PzDaVRmMA',reciter:'سعود الشريم',title:'تلاوة خاشعة تهدا العقل وتذهب الهم'},
  {id:'JgpefhXIPvs',reciter:'بدر التركي',title:'سورة الأحزاب ٢١-٢٧ — من المؤمنين رجال صدقوا'},
  {id:'6JdOc53G9Z8',reciter:'بدر التركي',title:'سور: يس، الرحمن، الواقعة، الملك'},
  {id:'Mgtp1SaVvPc',reciter:'بدر التركي',title:'تلاوة مؤثرة جداً يأخذك لعالم آخر'},
  {id:'UHKn1WSFJNo',reciter:'محمد ديبروف',title:'وما لنا ألا نتوكل على الله وقد هدانا سبلنا'},
  {id:'KPFnaDJ3l_w',reciter:'ياسر الدوسري',title:'قل لمن الأرض ومن فيها — سورة المؤمنون'},
  {id:'Ect7R47t5XA',reciter:'محمد صديق المنشاوي',title:'قرآن الصباح — أجمل ما تبدأ به يومك'},
  {id:'Wryu6u_ENtE',reciter:'شريف مصطفى',title:'سورة الدخان — تلاوة خاشعة'},
  {id:'qmxCz3Sgy94',reciter:'عبد الرحمن مسعد',title:'تلاوة مؤثرة أرح سمعك وقلبك'},
  {id:'hiIqeTznnS8',reciter:'محمد مسعد',title:'سورة القيامة — تلاوة هادئة'},
  {id:'0dAwXrtS2aM',reciter:'محمد مسعد',title:'ساعة كاملة من أجمل التلاوات — راحة نفسية'},
  {id:'Ucn4goq4EMI',reciter:'هيثم الدخين',title:'روائع التلاوات — أهدأ ما تسمعه'},
  {id:'nXt2_Rpb71w',reciter:'عبدالعزيز السحيم',title:'سورة الملك — تلاوة مؤثرة'},
  {id:'-VfaRGe14xc',reciter:'علاء عقل',title:'أذكار الصباح — راحة نفسية لا توصف'},
  {id:'byM54Y35Qi8',reciter:'حمزة بوديب',title:'أذكار الصباح — بأجمل صوت'},
  {id:'BfwSLOHlPrw',reciter:'يونس اسويلص',title:'تلاوة مؤثرة يرق لها القلب'}
];
function viewYt(){
  const cur=S.ytId?YT_LIST.find(x=>x.id===S.ytId):null;
  return `${cur?`<button class="back-btn" data-act="ytback"><svg class="ic" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>${t('ytAll')}</button>
  <div class="yt-player"><iframe src="https://www.youtube-nocookie.com/embed/${cur.id}?autoplay=1&rel=0" title="${esc(cur.reciter+' — '+cur.title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`:''}
  <div class="view-head"><div><h2>${t('ytView')}</h2><div class="sub">${t('ytSub')}</div></div></div>
  <div class="yt-grid">${YT_LIST.map(v=>`<button class="yt-card${S.ytId===v.id?' active':''}" data-yt="${v.id}">
    <span class="yt-thumb"><img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="" loading="lazy"/>
    <span class="yt-play"><svg class="ic fill" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg></span></span>
    <b>${esc(v.reciter)}</b><span>${esc(v.title)}</span></button>`).join('')}</div>`;
}
function prayerCardsHTML(){
  const tm=S.prayerData.timings,hj=S.prayerData.date.hijri;
  const num=p=>S.lang==='ar'?arDigits(p):p;
  const next=nextPrayerKey();
  const cards=PRAYERS.map(([k,l])=>`<div class="prayer-card${k===next?' next':''}">
    <span>${t(l)}</span><b>${num(prayerTime(k))}</b>
  </div>`).join('');
  const extra=PRAYER_EXTRA.map(([k,l])=>`<div class="prayer-card alt">
    <span>${t(l)}</span><b>${num(prayerTime(k))}</b>
  </div>`).join('');
  const hdate=`${num(hj.day)} ${S.lang==='ar'?hj.month.ar:hj.month.en} ${num(hj.year)}`;
  return `<div class="prayer-next">
    <span>${t('nextPrayer')} — ${t(next.toLowerCase())}</span>
    <b id="prCountdown" class="pr-count" dir="ltr">${prayerCountdownStr()}</b>
  </div>
  <div class="pr-sec">${t('prToday')}</div>
  <div class="prayer-grid">${cards}</div>
  <div class="pr-sec">${t('prNight')}</div>
  <div class="prayer-grid alt">${extra}</div>
  <div class="prayer-date">${hdate} · ${S.prayerData.date.readable}</div>`;
}
function startPrayerTick(){
  clearInterval(S.prayerTimer);
  S.prayerTimer=setInterval(()=>{
    if(!S.prayerData)return;
    const str=prayerCountdownStr();
    $$('.pr-count').forEach(el=>el.textContent=str);
  },1000);
}
async function prayerSearch(q){
  const box=$('#locRes');if(!box)return;
  box.innerHTML=`<span class="lr-empty">${t('loading')}</span>`;
  try{
    const res=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,{headers:{'Accept-Language':S.lang}});
    const list=await res.json();
    if(!list.length){box.innerHTML=`<span class="lr-empty">${t('locNotFound')}</span>`;return}
    box.innerHTML=list.map(r=>`<button class="loc-item" data-loc="${r.lat},${r.lon},${esc(r.display_name.split(',').slice(0,2).join('،'))}">${esc(r.display_name)}</button>`).join('');
  }catch(e){box.innerHTML=`<span class="lr-empty">${t('locNotFound')}</span>`}
}
/* ═══════════════ FAVORITES ═══════════════ */
const favKey=tr=>tr.key;
function isFaved(tr){return S.favorites.some(f=>f.key===favKey(tr))}
function toggleFav(tr){
  if(!tr)return;
  const k=favKey(tr);const i=S.favorites.findIndex(f=>f.key===k);
  if(i>=0){const[rm]=S.favorites.splice(i,1);store.set('favorites',S.favorites);
    toast(t('removedFav'),{label:t('undo'),fn:()=>{S.favorites.splice(i,0,rm);store.set('favorites',S.favorites);refreshFavUI()}})}
  else{S.favorites.unshift({key:k,n:tr.n,rid:tr.rid,mid:tr.mid,server:tr.server,rewaya:tr.rewaya,mname:tr.mname,rar:tr.rar,ren:tr.ren});store.set('favorites',S.favorites);toast(t('addedFav'))}
  refreshFavUI();
}
function refreshFavUI(){updateFavButtons();updateCounts();if(S.view==='favorites'||S.view==='recent')render();else markPlayingRows();
  $$('.surah-row [data-fav]').forEach(b=>{const on=S.favorites.some(f=>f.key===b.dataset.fav);b.classList.toggle('faved',on)})}
function updateFavButtons(){
  const on=S.current&&isFaved(S.current);
  ['npFav','pbFav'].forEach(id=>{const el=$('#'+id);el.classList.toggle('faved',on);el.classList.toggle('on',on)});
  $('#pbFav').style.color=on?'var(--danger)':'';
  $('#npFav').classList.toggle('faved',on);
}
function updateCounts(){$('#cntFav').textContent=S.favorites.length;$('#cntDl').textContent=DL.jobs.filter(j=>j.state==='done').length}

/* ═══════════════ DOWNLOADS ═══════════════ */
const DL={jobs:[],active:0,conc:2};
if(window.showDirectoryPicker)$('#folderBtn').hidden=false;
$('#folderBtn').onclick=async()=>{try{S.dirHandle=await window.showDirectoryPicker({mode:'readwrite'});toast(t('folderOk')+' '+S.dirHandle.name)}catch(e){}};
function enqueueDownloads(tracks){
  if(!tracks.length)return;
  $('#dlDrawer').classList.add('open');
  tracks.forEach(tr=>{
    const job={tr,state:'pending',pct:0,ctrl:null};
    const el=document.createElement('div');el.className='dl-job';
    el.innerHTML=`<div class="dj-t"><span>${pad(tr.n)} · ${esc(trackName(tr))}</span><span class="dj-s">${t('pending')}</span></div><div class="dj-bar"><i></i></div>`;
    const empty=$('#dlList .empty');if(empty)empty.remove();
    $('#dlList').prepend(el);
    job.el=el;job.bar=el.querySelector('i');job.st=el.querySelector('.dj-s');
    DL.jobs.push(job);
  });
  pumpDL();
}
function pumpDL(){while(DL.active<DL.conc){const j=DL.jobs.find(x=>x.state==='pending');if(!j)break;j.state='downloading';DL.active++;runDL(j).finally(()=>{DL.active--;pumpDL();updateCounts()})}}
async function runDL(job){
  const tr=job.tr;const src=pickSource(tr)[0];
  const fname=`${pad(tr.n)} - ${safeName(trackName(tr))}.mp3`;
  job.st.textContent=t('downloading');
  try{
    job.ctrl=new AbortController();
    const res=await fetch(src.url,{signal:job.ctrl.signal});if(!res.ok)throw new Error(res.status);
    const total=+res.headers.get('content-length')||0;let blob;
    if(res.body&&total){const rd=res.body.getReader();const chunks=[];let got=0;
      for(;;){const{done,value}=await rd.read();if(done)break;chunks.push(value);got+=value.length;
        job.pct=got/total*100;job.bar.style.width=job.pct+'%';job.st.textContent=`${Math.round(got/1048576)}/${Math.round(total/1048576)} MB`}
      blob=new Blob(chunks,{type:'audio/mpeg'});
    }else{blob=await res.blob();job.bar.style.width='100%'}
    await saveBlob(blob,tr,fname);
    job.state='done';job.el.classList.add('done');job.bar.style.width='100%';job.st.textContent='✓ '+t('saved');
  }catch(e){
    if(e.name==='AbortError'){job.state='cancelled';job.st.textContent=t('cancelled')}
    else{job.state='err';job.el.classList.add('err');job.st.textContent='↗ '+t('failed');
      const a=document.createElement('a');a.href=src.url;a.target='_blank';a.rel='noopener';a.download=fname;a.click()}
  }
}
async function saveBlob(blob,tr,fname){
  if(S.dirHandle){
    let dir=S.dirHandle;
    for(const p of[safeName(trackReciter(tr)),safeName(tr.rewaya)])dir=await dir.getDirectoryHandle(p,{create:true});
    const fh=await dir.getFileHandle(fname,{create:true});const w=await fh.createWritable();await w.write(blob);await w.close();
  }else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${safeName(trackReciter(tr))} - ${fname}`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),30000)}
}
function findTrackByKey(k){
  let tr=S.tracks.find(x=>x.key===k);if(tr)return tr;
  const f=[...S.favorites,...S.recent].find(x=>x.key===k);return f?rebuildTrack(f):null;
}

/* ═══════════════ SLEEP TIMER ═══════════════ */
const SLEEP_OPTS=[0,5,10,15,30,45,60];
function renderSleepPop(){
  $('#sleepPop').innerHTML=SLEEP_OPTS.map(m=>`<button data-min="${m}" class="${S.sleepMin===m?'on':''}"><span>${m===0?t('sleepOff'):m+' '+t('min')}</span>${S.sleepMin===m?'✓':''}</button>`).join('');
}
function setSleep(min){
  S.sleepMin=min;clearTimeout(S.sleepTimer);clearInterval(S.sleepTick);
  $('#sleepBadge').hidden=!min;$('#btnSleep').classList.toggle('on',!!min);renderSleepPop();$('#sleepPop').classList.remove('open');
  if(!min)return;
  const end=Date.now()+min*60000;toast(`${t('timerSet')} ${min} ${t('min')}`);
  S.sleepTick=setInterval(()=>{const left=Math.max(0,Math.round((end-Date.now())/60000));$('#sleepBadge').textContent=left||'<1'},10000);
  $('#sleepBadge').textContent=min;
  S.sleepTimer=setTimeout(()=>{
    const v0=audio.volume;let step=0;
    const fade=setInterval(()=>{step++;audio.volume=Math.max(0,v0*(1-step/10));if(step>=10){clearInterval(fade);audio.pause();audio.volume=v0;clearInterval(S.sleepTick);S.sleepMin=0;$('#sleepBadge').hidden=true;$('#btnSleep').classList.remove('on');renderSleepPop();toast(t('timerEnd'))}},800);
  },min*60000);
}

/* ═══════════════ SEEK / VOLUME BARS ═══════════════ */
function bindBar(el,onPct){
  const pct=e=>{const r=el.getBoundingClientRect();const rtl=getComputedStyle(el).direction==='rtl';const x=rtl?r.right-e.clientX:e.clientX-r.left;return Math.max(0,Math.min(1,x/r.width))};
  el.addEventListener('pointerdown',e=>{el.setPointerCapture(e.pointerId);el.classList.add('scrub');onPct(pct(e),true);
    const mv=ev=>onPct(pct(ev),true);const up=ev=>{onPct(pct(ev),false);el.classList.remove('scrub');el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up)};
    el.addEventListener('pointermove',mv);el.addEventListener('pointerup',up)});
}
bindBar($('#progBar'),(p,drag)=>{if(audio.duration){if(!drag)audio.currentTime=p*audio.duration;$('#progFill').style.width=p*100+'%';$('#progThumb').style.insetInlineStart=p*100+'%';$('#tCur').textContent=fmt(p*audio.duration)}});
bindBar($('#ovProg'),(p,drag)=>{if(audio.duration){if(!drag)audio.currentTime=p*audio.duration;$('#ovFill').style.width=p*100+'%';$('#ovThumb').style.insetInlineStart=p*100+'%';$('#ovCur').textContent=fmt(p*audio.duration)}});
bindBar($('#volBar'),p=>{audio.volume=p;store.set('volume',p);updateVolUI()});
function updateVolUI(){
  const v=audio.muted?0:audio.volume;
  $('#volFill').style.width=v*100+'%';$('#volThumb').style.insetInlineStart=v*100+'%';
  $('#volIcon').innerHTML=v===0?'<path d="M11 5 6.5 9H3v6h3.5L11 19z"/><path d="m16 9 5 6M21 9l-5 6"/>':v<.5?'<path d="M11 5 6.5 9H3v6h3.5L11 19z"/><path d="M15 9a4 4 0 0 1 0 6"/>':'<path d="M11 5 6.5 9H3v6h3.5L11 19z"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M17.5 6.5a8 8 0 0 1 0 11"/>';
}

/* ═══════════════ TOAST / CONFIRM ═══════════════ */
function toast(msg,action){
  const el=document.createElement('div');el.className='toast';el.innerHTML=`<span>${esc(msg)}</span>`;
  if(action){const b=document.createElement('button');b.textContent=action.label;b.onclick=()=>{action.fn();kill()};el.append(b)}
  $('#toasts').append(el);
  const kill=()=>{el.classList.add('out');setTimeout(()=>el.remove(),300)};
  setTimeout(kill,action?6000:3200);
}
let confirmRes=null;
function confirmDlg(title,msg){$('#confirmTitle').textContent=title;$('#confirmMsg').textContent=msg;$('#confirmScrim').classList.add('open');return new Promise(r=>confirmRes=r)}
$('#confirmYes').onclick=()=>{$('#confirmScrim').classList.remove('open');confirmRes&&confirmRes(true)};
$('#confirmNo').onclick=()=>{$('#confirmScrim').classList.remove('open');confirmRes&&confirmRes(false)};

/* ═══════════════ THEME / LANG ═══════════════ */
function applyTheme(){
  document.body.dataset.theme=S.theme;
  document.querySelector('meta[name=theme-color]').content=S.theme==='dark'?'#000000':'#F3EFE4';
  $('#themeIcon').innerHTML=S.theme==='dark'?'<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M19.4 4.6l-1.8 1.8M6.4 17.6l-1.8 1.8"/>':'<path d="M20 13.5A8 8 0 0 1 10.5 4 8 8 0 1 0 20 13.5z"/>';
  $$('#segTheme button').forEach(b=>b.classList.toggle('on',b.dataset.th===S.theme));
}
function applyLang(){
  document.documentElement.lang=S.lang;document.documentElement.dir=S.lang==='ar'?'rtl':'ltr';
  $('#langBtn').textContent=S.lang==='ar'?'EN':'ع';
  $$('#segLang button').forEach(b=>b.classList.toggle('on',b.dataset.lg===S.lang));
  applyI18nStatic();buildQualitySelect();renderSleepPop();
}
function applyI18nStatic(){$$('[data-i18n]').forEach(el=>{const k=el.dataset.i18n;if(I18N[S.lang][k])el.textContent=I18N[S.lang][k]});$$('[data-i18n-title]').forEach(el=>{const k=el.dataset.i18nTitle;if(I18N[S.lang][k])el.title=I18N[S.lang][k]});$$('.nav-item').forEach(b=>{const k=b.dataset.view||'downloads';if(I18N[S.lang][k])b.title=I18N[S.lang][k]})}
function buildQualitySelect(){
  const sel=$('#selQuality');const cur=S.quality;
  sel.innerHTML=[['auto',t('qAuto')],['high',t('qHigh')],['std',t('qStd')],['save',t('qSave')]].map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
  sel.value=cur;
}
function applySidebar(){
  document.body.classList.toggle('side-collapsed',S.sideMode==='collapsed');
  const b=$('#sideBtn');if(b)b.classList.toggle('on',S.sideMode==='collapsed');
}
function applyNpPos(){
  const el=$('.np-panel');if(!el)return;
  const p=S.npMode==='float'?S.npPos:null;
  if(p){el.style.left=p.x+'px';el.style.top=p.y+'px';el.style.right='auto';el.style.insetInlineEnd='auto'}
  else{el.style.left='';el.style.top='';el.style.right='';el.style.insetInlineEnd=''}
}
function applyNpPanel(){
  const float=S.npMode==='float';
  const collapsed=!float&&(S.npMode==='hidden'||(S.npMode==='auto'&&!S.current));
  document.body.classList.toggle('np-float',float);
  document.body.classList.toggle('np-collapsed',collapsed);
  const pin=$('#npPin');if(pin)pin.classList.toggle('on',S.npMode==='pinned');
  const dock=$('#npDock');if(dock)dock.classList.toggle('on',float);
  const tg=$('#npToggle');if(tg)tg.classList.toggle('on',S.npMode==='hidden');
  applyNpPos();
}
function setTheme(th){S.theme=th;store.set('theme',th);applyTheme();if(S.view==='mushaf')render()}
function setLang(lg){S.lang=lg;store.set('lang',lg);applyLang();render();if(S.current)updateNowPlaying();renderQueue();rotateVerse(true)}

/* ═══════════════ VERSE ROTATOR ═══════════════ */
function rotateVerse(instant=false){
  const card=$('#verseCard');
  const show=()=>{const v=VERSES[S.verseIdx%VERSES.length];
    $('#verseText').textContent=S.lang==='ar'?v[0]:v[2];
    $('#verseRef').textContent=S.lang==='ar'?v[1]:v[3];card.classList.remove('fade')};
  if(instant){show();return}
  card.classList.add('fade');setTimeout(()=>{S.verseIdx++;show()},500);
}
setInterval(()=>rotateVerse(),22000);

/* ═══════════════ OVERLAYS ═══════════════ */
function openOverlay(){$('#npOverlay').classList.add('open')}
function closeOverlay(){$('#npOverlay').classList.remove('open')}
function closeSidebar(){$('#sidebar').classList.remove('open');$('#scrimSide').classList.remove('open')}
$('#menuBtn').onclick=()=>{$('#sidebar').classList.add('open');$('#scrimSide').classList.add('open')};
$('#scrimSide').onclick=closeSidebar;
$('#pbArt').onclick=openOverlay;$('#btnExpand').onclick=openOverlay;$('#npExpand').onclick=openOverlay;$('#ovClose').onclick=closeOverlay;
$('#settingsBtn').onclick=()=>$('#settingsScrim').classList.add('open');
$('#settingsClose').onclick=()=>$('#settingsScrim').classList.remove('open');
$('#settingsScrim').addEventListener('click',e=>{if(e.target===e.currentTarget)e.currentTarget.classList.remove('open')});
$('#confirmScrim').addEventListener('click',e=>{if(e.target===e.currentTarget){e.currentTarget.classList.remove('open');confirmRes&&confirmRes(false)}});
$('#navDownloads').onclick=()=>{$('#dlDrawer').classList.add('open');closeSidebar()};
$('#dlClose').onclick=()=>$('#dlDrawer').classList.remove('open');
$('#btnSleep').onclick=e=>{e.stopPropagation();renderSleepPop();$('#sleepPop').classList.toggle('open')};
document.addEventListener('click',e=>{if(!e.target.closest('.sleep-wrap'))$('#sleepPop').classList.remove('open')});
$('#sleepPop').addEventListener('click',e=>{const b=e.target.closest('[data-min]');if(b)setSleep(+b.dataset.min)});

/* ═══════════════ EVENT WIRING ═══════════════ */
$$('.nav-item[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('#themeBtn').onclick=()=>setTheme(S.theme==='light'?'dark':'light');
$('#langBtn').onclick=()=>setLang(S.lang==='ar'?'en':'ar');
$$('#segTheme button').forEach(b=>b.onclick=()=>setTheme(b.dataset.th));
$$('#segLang button').forEach(b=>b.onclick=()=>setLang(b.dataset.lg));
$$('#segMushafRw button').forEach(b=>{b.onclick=()=>setMushafRiwaya(b.dataset.mrw);b.classList.toggle('on',b.dataset.mrw===S.mushafRiwaya)});
function updateAdhanSeg(){$$('#segAdhan button').forEach(b=>b.classList.toggle('on',b.dataset.adh===(S.adhanOn?'on':'off')))}
$$('#segAdhan button').forEach(b=>{b.onclick=()=>{S.adhanOn=b.dataset.adh==='on';store.set('adhanOn',S.adhanOn);if(!S.adhanOn&&S.adhanAudio)S.adhanAudio.pause();updateAdhanSeg()}});
updateAdhanSeg();
$('#searchInput').addEventListener('input',e=>{S.query=e.target.value;if(S.view==='home'&&S.query)setView('reciters'),S.query=e.target.value,$('#searchInput').value=e.target.value;render()});
$('#selQuality').onchange=e=>{S.quality=e.target.value;store.set('quality',S.quality);
  if(S.current){const pos=audio.currentTime,was=!audio.paused;S.srcIdx=0;S.srcOrder=pickSource(S.current);audio.src=S.srcOrder[0].url;audio.addEventListener('loadedmetadata',()=>{audio.currentTime=pos},{once:true});if(was)audio.play().catch(()=>{});updateBadges()}};
$('#selSpeed').onchange=e=>{S.speed=+e.target.value;store.set('speed',S.speed);audio.playbackRate=S.speed};
$('#btnPlay').onclick=togglePlay;$('#btnNext').onclick=nextTrack;$('#btnPrev').onclick=prevTrack;
$('#btnShuffle').onclick=()=>{S.shuffle=!S.shuffle;store.set('shuffle',S.shuffle);$('#btnShuffle').classList.toggle('on',S.shuffle);$$('.np-overlay [data-act="shuffle"]').forEach(b=>b.classList.toggle('on',S.shuffle))};
$('#btnRepeat').onclick=()=>{S.repeat=(S.repeat+1)%3;store.set('repeat',S.repeat);updateRepeatUI()};
function updateRepeatUI(){$('#btnRepeat').classList.toggle('on',S.repeat>0);$('#repBadge').hidden=S.repeat!==2;$$('.np-overlay [data-act="repeat"]').forEach(b=>b.classList.toggle('on',S.repeat>0))}
$('#btnMute').onclick=()=>{audio.muted=!audio.muted;updateVolUI()};
$('#btnDl').onclick=()=>{if(S.current)enqueueDownloads([S.current])};
$('#npDl').onclick=()=>{if(S.current)enqueueDownloads([S.current])};
$('#npFav').onclick=()=>toggleFav(S.current);$('#pbFav').onclick=()=>toggleFav(S.current);
$('.np-overlay').addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;
  const a=b.dataset.act;
  if(a==='play')togglePlay();else if(a==='next')nextTrack();else if(a==='prev')prevTrack();
  else if(a==='shuffle')$('#btnShuffle').click();else if(a==='repeat')$('#btnRepeat').click();
  else if(a==='fav')toggleFav(S.current);else if(a==='download'&&S.current)enqueueDownloads([S.current]);
});
$('#view').addEventListener('click',async e=>{
  const stg=e.target.closest('.mushaf-stage');
  if(stg&&!e.target.closest('button')&&!e.target.closest('.cover-page')){const w=$('#view .mushaf-wrap');if(w)mushafBarsUI(!w.classList.contains('bars'));return}
  const rdB=e.target.closest('[data-read]');if(rdB){mushafGo(+rdB.dataset.read);return}
  const favB=e.target.closest('[data-fav]');if(favB){const tr=findTrackByKey(favB.dataset.fav);if(tr)toggleFav(tr);return}
  const unfavB=e.target.closest('[data-unfav]');if(unfavB){const tr=findTrackByKey(unfavB.dataset.unfav);if(tr)toggleFav(tr);return}
  const dlB=e.target.closest('[data-dl]');if(dlB){const tr=findTrackByKey(dlB.dataset.dl);if(tr)enqueueDownloads([tr]);return}
  const act=e.target.closest('[data-act]');
  if(act){const a=act.dataset.act;
    if(a==='browse')setView('reciters');
    else if(a==='goprayer')setView('prayer');
    else if(a==='ytback'){S.ytId=null;render()}
    else if(a==='akback'){S.adhkarCat=null;render()}
    else if(a==='back')setView('reciters');
    else if(a==='mushafback')setView('home');
    else if(a==='mushafexit')setView('home');
    else if(a==='mushafopen'){if(mushafLastGet()>1){S.mushafAsk=true;render()}else mushafGo(1)}
    else if(a==='mresume')mushafGo(mushafLastGet()||1);
    else if(a==='mstart')mushafGo(1);
    else if(a==='mrwset')setMushafRiwaya(act.dataset.rw);
    else if(a==='mushafaskclose'){if(e.target===act){S.mushafAsk=false;render()}}
    else if(a==='mushafdlall')mushafDownloadAll(act);
    else if(a==='prayerloc'){S.prayerSearch={};render()}
    else if(a==='locsearch'){const q=$('#locQ').value.trim();if(q)prayerSearch(q)}
    else if(a==='mtheme')setTheme(S.theme==='light'?'dark':'light');
    else if(a==='mprev')mushafGo(mushafStep(S.readN,-1));
    else if(a==='mnext')mushafGo(mushafStep(S.readN,1));
    else if(a==='openrecent')setView('recent');
    else if(a==='resume'&&S.recent[0]){const f=S.recent[0];const r=S.reciters.find(x=>x.id===f.rid);
      if(r){openReciter(r.id,false);const mi=r.moshaf.findIndex(m=>m.id===f.mid);if(mi>=0&&mi!==0)setMoshaf(mi);
        const idx=S.tracks.findIndex(x=>x.n===f.n);const sess=store.get('session',null);loadTrack(idx>=0?idx:0,true,sess&&sess.n===f.n?sess.pos:0)}
      else{S.tracks=[rebuildTrack(f)];loadTrack(0,true)}}
    else if(a==='playall'&&S.tracks.length)loadTrack(0,true);
    else if(a==='dlall'){if(await confirmDlg(t('confirmDlAll'),t('confirmDlAllMsg')))enqueueDownloads(S.tracks)}
    else if(a==='clearrecent'){const bak=[...S.recent];S.recent=[];store.set('recent',[]);render();toast(t('cleared'),{label:t('undo'),fn:()=>{S.recent=bak;store.set('recent',bak);render()}})}
    return}
  const chip=e.target.closest('[data-rw]');if(chip){S.rewaya=chip.dataset.rw;render();return}
  const qs=e.target.closest('[data-surah]');if(qs){playQuick(+qs.dataset.surah);return}
  const rc=e.target.closest('[data-rid]');if(rc){openReciter(+rc.dataset.rid,false);return}
  const akc=e.target.closest('[data-akcat]');if(akc){S.adhkarCat=+akc.dataset.akcat;render();return}
  const akb=e.target.closest('[data-akback]');if(akb){S.adhkarCat=null;render();return}
  const akd=e.target.closest('[data-akdec]');if(akd){akTap(akd);return}
  const ytc=e.target.closest('[data-yt]');if(ytc){audio.pause();S.ytId=ytc.dataset.yt;render();return}
  const coll=e.target.closest('[data-coll]');if(coll){playCollection(+coll.dataset.coll,S.view==='favorites');return}
  const row=e.target.closest('.surah-row[data-idx]');if(row){loadTrack(+row.dataset.idx,true);return}
});
$('#view').addEventListener('click',e=>{
  const loc=e.target.closest('[data-loc]');
  if(loc){const[lat,lng,name]=loc.dataset.loc.split(',');
    S.prayerLoc={lat:+lat,lng:+lng,name};store.set('prayerLoc',S.prayerLoc);
    S.prayerSearch=null;S.prayerData=null;render();return}
});
$('#view').addEventListener('change',e=>{
  if(e.target.id==='sortSel'){S.sort=e.target.value;render()}
  if(e.target.id==='moshafSel'){setMoshaf(+e.target.value)}
  if(e.target.id==='mSurahSel')mushafGo(SURAH_PAGE[+e.target.value-1]);
  if(e.target.id==='mJuzSel')mushafGo(JUZ_PAGE[+e.target.value-1]);
  if(e.target.id==='mSlider')mushafGo(+e.target.value);
});
$('#view').addEventListener('input',e=>{
  if(e.target.id!=='mSlider')return;
  const v=+e.target.value,el=$('#view .mf-num');
  if(el)el.textContent=S.lang==='ar'?`${arDigits(v)} / ${arDigits(MUSHAF_PAGES)}`:`${v} / ${MUSHAF_PAGES}`;
});
/* queue: click + drag reorder */
let dragIdx=null;
$('#npQueue').addEventListener('click',e=>{const it=e.target.closest('[data-qi]');if(it)loadTrack(+it.dataset.qi,true)});
$('#npQueue').addEventListener('dragstart',e=>{const it=e.target.closest('[data-qi]');if(it){dragIdx=+it.dataset.qi;e.dataTransfer.effectAllowed='move'}});
$('#npQueue').addEventListener('dragover',e=>{e.preventDefault();const it=e.target.closest('[data-qi]');$$('.queue-item').forEach(x=>x.classList.remove('dragover'));if(it)it.classList.add('dragover')});
$('#npQueue').addEventListener('drop',e=>{e.preventDefault();const it=e.target.closest('[data-qi]');if(it&&dragIdx!=null){
  const to=+it.dataset.qi;const curKey=S.current?S.current.key:null;
  const[m]=S.tracks.splice(dragIdx,1);S.tracks.splice(to,0,m);
  if(curKey)S.idx=S.tracks.findIndex(x=>x.key===curKey);renderQueue()}dragIdx=null});
$('#npQueue').addEventListener('dragend',()=>{dragIdx=null;$$('.queue-item').forEach(x=>x.classList.remove('dragover'))});

if(window.matchMedia){const mqBook=window.matchMedia('(min-width:900px)');if(mqBook.addEventListener)mqBook.addEventListener('change',()=>{if(S.view==='mushaf'&&S.readN)render()})}

/* audio events */
audio.addEventListener('play',()=>setPlayingUI(true));
audio.addEventListener('pause',()=>{setPlayingUI(false);saveSession()});
audio.addEventListener('timeupdate',()=>{updateProgress();if(Math.floor(audio.currentTime)%5===0)saveSession()});
audio.addEventListener('progress',updateBuffer);
audio.addEventListener('loadedmetadata',()=>{updateProgress();probeBitrate()});
audio.addEventListener('ended',()=>{if(S.repeat===2){audio.currentTime=0;audio.play().catch(()=>{})}else nextTrack()});
audio.addEventListener('error',()=>{if(S.current&&audio.src)tryNextSource()});
if('mediaSession'in navigator){
  navigator.mediaSession.setActionHandler('play',()=>audio.play());
  navigator.mediaSession.setActionHandler('pause',()=>audio.pause());
  navigator.mediaSession.setActionHandler('previoustrack',prevTrack);
  navigator.mediaSession.setActionHandler('nexttrack',nextTrack);
  navigator.mediaSession.setActionHandler('seekto',e=>{if(e.seekTime!=null)audio.currentTime=e.seekTime});
}
/* keyboard */
document.addEventListener('keydown',e=>{
  if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
  if(e.code==='Space'){e.preventDefault();togglePlay()}
  else if(S.view==='mushaf'&&S.mushafAsk&&e.key==='Escape'){e.preventDefault();S.mushafAsk=false;render()}
  else if(S.view==='mushaf'&&!S.readN&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();if(mushafLastGet()>1){S.mushafAsk=true;render()}else mushafGo(1)}
  else if(S.view==='mushaf'&&S.readN&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();const rtl=document.documentElement.dir==='rtl';mushafGo(mushafStep(S.readN,(e.key==='ArrowLeft')===rtl?1:-1));mushafBarsUI(true)}
  else if(e.key==='ArrowRight')audio.currentTime=Math.min((audio.duration||0),audio.currentTime+5);
  else if(e.key==='ArrowLeft')audio.currentTime=Math.max(0,audio.currentTime-5);
  else if(e.key==='ArrowUp'){e.preventDefault();audio.volume=Math.min(1,audio.volume+.05);store.set('volume',audio.volume);updateVolUI()}
  else if(e.key==='ArrowDown'){e.preventDefault();audio.volume=Math.max(0,audio.volume-.05);store.set('volume',audio.volume);updateVolUI()}
  else if(e.key==='m'||e.key==='M')$('#btnMute').click();
  else if(e.key==='f'||e.key==='F')toggleFav(S.current);
  else if(e.key==='n'||e.key==='N')nextTrack();
  else if(e.key==='p'||e.key==='P')prevTrack();
  else if(e.key==='/'){e.preventDefault();$('#searchInput').focus()}
  else if(e.key==='Escape'){if(S.view==='mushaf'){setView('home');return}closeOverlay();$('#settingsScrim').classList.remove('open');$('#dlDrawer').classList.remove('open');closeSidebar()}
});
window.addEventListener('beforeunload',saveSession);

/* ═══════════════ INIT ═══════════════ */
(async function init(){
  applyTheme();applyLang();buildQualitySelect();renderSleepPop();updateRepeatUI();updateVolUI();applyNpPanel();applySidebar();
  $('#npPin').onclick=()=>{S.npMode=S.npMode==='pinned'?'auto':'pinned';store.set('npMode',S.npMode);applyNpPanel()};
  $('#npToggle').onclick=()=>{S.npMode=S.npMode==='hidden'?'auto':'hidden';store.set('npMode',S.npMode);applyNpPanel()};
  $('#npDock').onclick=()=>{S.npMode=S.npMode==='float'?'auto':'float';store.set('npMode',S.npMode);applyNpPanel()};
  const npHead=$('.np-head');let npDrag=null;
  const npEndDrag=()=>{if(!npDrag)return;npDrag=null;const el=$('.np-panel');S.npPos={x:parseFloat(el.style.left)||16,y:parseFloat(el.style.top)||16};store.set('npPos',S.npPos)};
  npHead.addEventListener('pointerdown',e=>{
    if(S.npMode!=='float'||e.target.closest('button'))return;
    const el=$('.np-panel'),r=el.getBoundingClientRect();
    npDrag={dx:e.clientX-r.left,dy:e.clientY-r.top};
    el.style.left=r.left+'px';el.style.top=r.top+'px';el.style.right='auto';el.style.insetInlineEnd='auto';
    npHead.setPointerCapture(e.pointerId);e.preventDefault();
  });
  npHead.addEventListener('pointermove',e=>{
    if(!npDrag)return;
    const el=$('.np-panel'),w=el.offsetWidth,h=el.offsetHeight;
    el.style.left=Math.min(Math.max(8,e.clientX-npDrag.dx),Math.max(8,innerWidth-w-8))+'px';
    el.style.top=Math.min(Math.max(8,e.clientY-npDrag.dy),Math.max(8,innerHeight-h-8))+'px';
  });
  npHead.addEventListener('pointerup',npEndDrag);
  npHead.addEventListener('pointercancel',npEndDrag);
  $('#sideBtn').onclick=()=>{S.sideMode=S.sideMode==='collapsed'?'open':'collapsed';store.set('sideMode',S.sideMode);applySidebar()};
  $('#btnShuffle').classList.toggle('on',S.shuffle);
  $('#selSpeed').value=String(S.speed);
  $('#view').innerHTML=`<div class="loading"><div class="spinner"></div><span>${t('loading')}</span></div>`;
  $('#npMandala').innerHTML=mandalaSVG('أُنس','أ','القرآن الكريم');
  $('#ovMandala').innerHTML=mandalaSVG('أُنس','أ','القرآن الكريم');
  $('#pbArtImg').src=avatarURI('أُنس','أ');
  rotateVerse(true);
  await loadData();
  render();
  /* resume last session (paused) */
  const sess=store.get('session',null);
  if(sess){
    const r=S.reciters.find(x=>x.id===sess.rid);
    if(r){S.reciter=r;S.moshaf=r.moshaf.find(m=>m.id===sess.mid)||r.moshaf[0];
      S.tracks=parseList(S.moshaf.surah_list,S.moshaf.surah_total).map(n=>makeTrack(r,S.moshaf,n));
      const idx=S.tracks.findIndex(x=>x.n===sess.n);
      if(idx>=0){S.idx=idx;S.current=S.tracks[idx];S.srcOrder=pickSource(S.current);S.srcIdx=0;
        audio.src=S.srcOrder[0].url;audio.addEventListener('loadedmetadata',()=>{audio.currentTime=sess.pos||0;updateProgress()},{once:true});
        updateNowPlaying();renderQueue()}
    }else{const tr=rebuildTrack(sess);S.tracks=[tr];S.idx=0;S.current=tr;S.srcOrder=pickSource(tr);audio.src=S.srcOrder[0].url;updateNowPlaying()}
  }
})();
