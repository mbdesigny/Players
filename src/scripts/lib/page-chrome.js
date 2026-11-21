// ═══ عناصر التحكم الثابتة المشتركة بين كل الصفحات الثابتة ═══
// السايدبار (درج/طي) + الثيم + اللغة + قائمة الإعدادات المنبثقة
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

  // ═══ الثيم: تبديل data-theme + الحفظ في ouns_theme (نفس مفاتيح التطبيق) ═══
  const themeBtn = qs('themeBtn');
  const segTheme = qs('segTheme');

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function syncThemeSegs(t) {
    segTheme.querySelectorAll('button').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.th === t));
    });
  }

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('ouns_theme', JSON.stringify(t)) } catch { /* تجاهل */ }
    syncThemeSegs(t);
  }

  themeBtn.addEventListener('click', () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
  segTheme.querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => applyTheme(b.dataset.th));
  });
  syncThemeSegs(currentTheme());

  // ═══ اللغة: تبديل dir/lang + المشي على data-i18n + الحفظ في ouns_lang ═══
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
      b.setAttribute('aria-pressed', String(b.dataset.lg === l));
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

  // ═══ مودال الإعدادات (#settingsScrim): فتح/غلق بنفس نمط openModal في التطبيق ═══
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

  return { lang: () => lang, applyLang };
}
