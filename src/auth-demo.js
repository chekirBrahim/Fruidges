/* UI simulation only. Not authentication or an authorization boundary. */
(() => {
  const demoAccounts = Object.freeze({
    'supplier@demo.test': 'fournisseur',
    'buyer@demo.test': 'acheteur',
    'restaurant@demo.test': 'restaurant',
    'admin@demo.test': 'admin'
  });
  let sessionRole = null;
  let language = 'en';
  const copy = {
    en: {title:'Welcome to Fruidges', intro:'Sign in to your professional workspace.', email:'Email address', password:'Demo access code', submit:'Sign in', error:'Unknown demo account or incorrect demo code.', notice:'DEMO ONLY — no real authentication. Use sample accounts only.', help:'Demo accounts', code:'Shared demo code: fruidges-demo', logout:'Sign out', request:'Request access'},
    ar: {title:'مرحباً بك في Fruidges', intro:'سجّل الدخول إلى مساحة عملك المهنية.', email:'البريد الإلكتروني', password:'رمز الدخول التجريبي', submit:'تسجيل الدخول', error:'الحساب التجريبي غير معروف أو الرمز غير صحيح.', notice:'نسخة تجريبية فقط — لا توجد مصادقة حقيقية. استخدم الحسابات التجريبية فقط.', help:'حسابات تجريبية', code:'الرمز التجريبي المشترك: fruidges-demo', logout:'تسجيل الخروج', request:'طلب الوصول'}
  };
  const originalEnter = window.enter;
  const originalGo = window.go;
  const originalRender = window.render;
  function login() {
    const t = copy[language];
    role = ''; page = '';
    if (map) { map.remove(); map = null; }
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.querySelector('.toplinks').innerHTML = `<button class="btn alt" onclick="fruidgesToggleLoginLanguage()">${language==='en'?'العربية':'English'}</button>`;
    document.getElementById('root').innerHTML = `<main style="max-width:520px;margin:48px auto;padding:0 20px"><section class="card"><h1>${t.title}</h1><p>${t.intro}</p><div class="alert">${t.notice}</div><form id="loginForm"><div class="field"><label for="loginEmail">${t.email}</label><input id="loginEmail" name="email" type="email" autocomplete="off" required dir="ltr"></div><div class="field" style="margin:18px 0"><label for="loginCode">${t.password}</label><input id="loginCode" name="code" type="password" autocomplete="off" required></div><p id="loginError" role="alert" style="color:#a22121"></p><button class="btn" type="submit" style="width:100%">${t.submit}</button></form><button class="link" style="margin-top:20px" onclick="requestModal()">${t.request}</button><details style="margin-top:24px"><summary>${t.help}</summary><p>${t.code}</p><ul dir="ltr">${Object.keys(demoAccounts).map(email=>`<li>${email}</li>`).join('')}</ul></details></section></main>`;
    document.getElementById('loginForm').addEventListener('submit', event => {
      event.preventDefault();
      const form = new FormData(event.target);
      const selected = demoAccounts[String(form.get('email')).trim().toLowerCase()];
      if (!selected || form.get('code') !== 'fruidges-demo') {
        document.getElementById('loginError').textContent = t.error; return;
      }
      sessionRole = selected;
      document.querySelector('.toplinks').innerHTML = `<span>${names[selected]}</span><button class="btn alt" onclick="fruidgesSignOut()">${t.logout}</button>`;
      uiLang = language;
      // Existing buyer module is the only navigation in the buyer workspace.
      originalEnter(selected, selected === 'acheteur' ? 'catalogue' : 'dashboard');
    });
  }
  window.fruidgesSignOut = () => {
    sessionRole = null; basket = []; closeModal();
    document.querySelector('.v7-floating')?.classList.remove('show');
    login();
  };
  window.fruidgesToggleLoginLanguage = () => { language = language === 'en' ? 'ar' : 'en'; login(); };
  window.enter = (requested, destination) => {
    if (!sessionRole || requested !== sessionRole) return login();
    originalEnter(requested, destination);
  };
  window.go = destination => {
    if (!sessionRole) return login();
    if (!(menus[sessionRole] || []).some(([id]) => id === destination)) return;
    originalGo(destination);
  };
  window.render = () => {
    if (!sessionRole || role !== sessionRole) return login();
    originalRender();
    if (sessionRole === 'acheteur') {
      document.querySelector('aside')?.remove();
      const app = document.querySelector('.app');
      if (app) app.style.gridTemplateColumns = '1fr';
      document.querySelector('.v7-toptools')?.remove();
      document.querySelector('.v7-floating')?.classList.remove('show');
    }
  };
  window.landing = () => sessionRole ? window.render() : login();
  login();
})();
