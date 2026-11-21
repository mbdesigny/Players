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
  const setThemeLight = qs('setThemeLight');
  const setThemeDark = qs('setThemeDark');

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('ouns_theme', JSON.stringify(t)) } catch { /* تجاهل */ }
    setThemeLight.setAttribute('aria-pressed', String(t === 'light'));
    setThemeDark.setAttribute('aria-pressed', String(t === 'dark'));
  }

  themeBtn.addEventListener('click', () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
  setThemeLight.addEventListener('click', () => applyTheme('light'));
  setThemeDark.addEventListener('click', () => applyTheme('dark'));
  setThemeLight.setAttribute('aria-pressed', String(currentTheme() === 'light'));
  setThemeDark.setAttribute('aria-pressed', String(currentTheme() === 'dark'));

  // ═══ اللغة: تبديل dir/lang + المشي على data-i18n + الحفظ في ouns_lang ═══
  const langBtn = qs('langBtn');
  const setLangAr = qs('setLangAr');
  const setLangEn = qs('setLangEn');
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
    setLangAr.setAttribute('aria-pressed', String(l === 'ar'));
    setLangEn.setAttribute('aria-pressed', String(l === 'en'));
    try { localStorage.setItem('ouns_lang', JSON.stringify(l)) } catch { /* تجاهل */ }
    if (onLang) onLang(l, dict);
  }

  langBtn.addEventListener('click', () => {
    applyLang(document.documentElement.lang === 'ar' ? 'en' : 'ar');
  });
  setLangAr.addEventListener('click', () => applyLang('ar'));
  setLangEn.addEventListener('click', () => applyLang('en'));

  // الإقلاع: طبّق اللغة المحفوظة فورًا (نفس القيمة التي طبّقها سكربت Base قبل أول رسم)
  let savedLang = 'ar';
  try {
    const raw = JSON.parse(localStorage.getItem('ouns_lang'));
    if (raw === 'ar' || raw === 'en') savedLang = raw;
  } catch { /* تجاهل — قيمة محفوظة غير صالحة */ }
  applyLang(savedLang);

  // ═══ الإعدادات المنبثقة + Escape: فتح/غلق والغلق عند النقر خارجها ═══
  const settingsBtn = qs('settingsBtn');
  const settingsPop = qs('settingsPop');

  function setPop(open) {
    settingsPop.hidden = !open;
    settingsBtn.setAttribute('aria-expanded', String(open));
  }

  settingsBtn.addEventListener('click', () => setPop(settingsPop.hidden));
  document.addEventListener('click', (e) => {
    if (settingsPop.hidden) return;
    if (!settingsPop.contains(e.target) && !settingsBtn.contains(e.target)) setPop(false);
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      setPop(false);
      setSide(false);
    }
  });

  return { lang: () => lang, applyLang };
}
