// ═══ عناصر التحكم الثابتة المشتركة بين كل الصفحات الثابتة ═══
// السايدبار (درج/طي) + الثيم + اللغة + مودال الإعدادات #settingsScrim الأصلي
// الاستخدام: initPageChrome({ i18n, onLang })

export function initPageChrome({ i18n, onLang } = {}) {
  const qs = (id) => document.getElementById(id);

  // ═══ السايدبار: درج على الشاشات الصغيرة + طي/توسيع على سطح المكتب ═══
  const side = qs('sidebar');
  const scrim = qs('scrimSide');
  const menuBtn = qs('menuBtn');
  const sideBtn = qs('sideBtn');

  function setSide(open) {
    side.classList.toggle('open', open);
    scrim.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  }

  try {
    if (localStorage.getItem('ouns_sideMode') === '"collapsed"') {
      document.body.classList.add('side-collapsed');
      sideBtn.classList.add('on');
      sideBtn.setAttribute('aria-pressed', 'true');
    }
  } catch { /* تجاهل — localStorage قد يكون محجوبًا */ }

  sideBtn.addEventListener('click', () => {
    const collapsed = document.body.classList.toggle('side-collapsed');
    sideBtn.classList.toggle('on', collapsed);
    sideBtn.setAttribute('aria-pressed', String(collapsed));
    try { localStorage.setItem('ouns_sideMode', JSON.stringify(collapsed ? 'collapsed' : 'open')) } catch { /* تجاهل */ }
  });

  menuBtn.addEventListener('click', () => setSide(true));
  scrim.addEventListener('click', () => setSide(false));

  // ═══ الثيم: تبديل data-theme + أيقونة قمر/شمس (نفس أسطر app.js) + segTheme ═══
  const themeBtn = qs('themeBtn');
  const themeIcon = qs('themeIcon');
  const segTheme = qs('segTheme');
  const SUN_IC = '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M19.4 4.6l-1.8 1.8M6.4 17.6l-1.8 1.8"/>';
  const MOON_IC = '<path d="M20 13.5A8 8 0 0 1 10.5 4 8 8 0 1 0 20 13.5z"/>';

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('ouns_theme', JSON.stringify(t)) } catch { /* تجاهل */ }
    themeIcon.innerHTML = t === 'dark' ? SUN_IC : MOON_IC;
    segTheme.querySelectorAll('button').forEach((b) => {
      const on = b.dataset.th === t;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  themeBtn.addEventListener('click', () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
  segTheme.querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => applyTheme(b.dataset.th));
  });
  applyTheme(currentTheme());

  // ═══ اللغة: تبديل dir/lang + المشي على data-i18n + الحفظ في ouns_lang + segLang ═══
  const langBtn = qs('langBtn');
  const segLang = qs('segLang');
  let lang = 'ar';

  function applyLang(l) {
    lang = l;
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    const dict = i18n ? i18n[l] : {};
    if (i18n) {
      document.querySelectorAll('[data-i18n]').forEach((el) => {
        const v = dict[el.getAttribute('data-i18n')];
        if (v) el.textContent = v;
      });
      document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
        const v = dict[el.getAttribute('data-i18n-aria')];
        if (v) el.setAttribute('aria-label', v);
      });
    }
    langBtn.textContent = l === 'ar' ? 'EN' : 'ع';
    segLang.querySelectorAll('button').forEach((b) => {
      const on = b.dataset.lg === l;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    try { localStorage.setItem('ouns_lang', JSON.stringify(l)) } catch { /* تجاهل */ }
    if (onLang) onLang(l, dict);
  }

  langBtn.addEventListener('click', () => {
    applyLang(document.documentElement.lang === 'ar' ? 'en' : 'ar');
  });
  segLang.querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => applyLang(b.dataset.lg));
  });

  // الإقلاع: طبّق اللغة المحفوظة فورًا (نفس القيمة التي طبّقها سكربت Base قبل أول رسم)
  let savedLang = 'ar';
  try {
    const raw = JSON.parse(localStorage.getItem('ouns_lang'));
    if (raw === 'ar' || raw === 'en') savedLang = raw;
  } catch { /* تجاهل — قيمة محفوظة غير صالحة */ }
  applyLang(savedLang);

  // ═══ مودال الإعدادات (#settingsScrim الأصلي من Modals.astro): فتح/غلق بنفس نمط openModal ═══
  const settingsBtn = qs('settingsBtn');
  const settingsScrim = qs('settingsScrim');
  const settingsClose = qs('settingsClose');

  function setSettings(open) {
    settingsScrim.classList.toggle('open', open);
    settingsBtn.setAttribute('aria-expanded', String(open));
  }

  settingsBtn.addEventListener('click', () => setSettings(true));
  settingsClose.addEventListener('click', () => setSettings(false));
  settingsScrim.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) setSettings(false);
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      setSettings(false);
      setSide(false);
    }
  });

  // ═══ رواية المصحف + الأذان داخل المودال الأصلي — حفظ بنفس مفاتيح app.js ═══
  const segMushafRw = qs('segMushafRw');
  const segAdhan = qs('segAdhan');

  let riwaya = 'hafs';
  let adhanOn = false;
  try { riwaya = JSON.parse(localStorage.getItem('ouns_mushafRiwaya')) === 'warsh' ? 'warsh' : 'hafs' } catch { /* تجاهل */ }
  try { adhanOn = JSON.parse(localStorage.getItem('ouns_adhanOn')) === true } catch { /* تجاهل */ }

  function syncSettingsSegs() {
    segMushafRw.querySelectorAll('button').forEach((b) => {
      const on = b.dataset.mrw === riwaya;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    segAdhan.querySelectorAll('button').forEach((b) => {
      const on = b.dataset.adh === (adhanOn ? 'on' : 'off');
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  segMushafRw.querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => {
      riwaya = b.dataset.mrw;
      try { localStorage.setItem('ouns_mushafRiwaya', JSON.stringify(riwaya)) } catch { /* تجاهل */ }
      syncSettingsSegs();
    });
  });
  segAdhan.querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => {
      adhanOn = b.dataset.adh === 'on';
      try { localStorage.setItem('ouns_adhanOn', JSON.stringify(adhanOn)) } catch { /* تجاهل */ }
      syncSettingsSegs();
    });
  });
  syncSettingsSegs();

  return { lang: () => lang, applyLang };
}
