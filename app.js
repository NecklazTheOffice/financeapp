(() => {
  if (window.__NECKLAZ_APP_LOADED__) return;
  window.__NECKLAZ_APP_LOADED__ = true;

  const SUPABASE_URL = "https://etxeuwcpqgfffgmywuab.supabase.co";  // https://xxxx.supabase.co
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0eGV1d2NwcWdmZmZnbXl3dWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjA5OTQsImV4cCI6MjA4ODYzNjk5NH0.6lVAjFGIUMcsnQNaKzDo89h-feE50ERC7gb45uNejdY";  // sb_publishable_... (ou eyJ...)
  const AUTH_STORAGE_KEY = "necklaz_finance_auth_v1";

  const PREFS_KEY = "necklaz_finance_prefs_v1";
  const GUEST_KEY = "necklaz_finance_guest_v1";

  const $ = (id) => document.getElementById(id);

  const el = {
    authView: $("authView"),
    appView: $("appView"),
    tabs: $("tabs"),

    localeSelect: $("localeSelect"),
    currencySelect: $("currencySelect"),
    startPageMode: $("startPageMode"),
    logoutBtn: $("logoutBtn"),

    authForm: $("authForm"),
    loginBtn: $("loginBtn"),
    signupBtn: $("signupBtn"),
    guestBtn: $("guestBtn"),
    forgotBtn: $("forgotBtn"),
    rememberEmail: $("rememberEmail"),
    keepSignedIn: $("keepSignedIn"),
    email: $("email"),
    password: $("password"),
    authMsg: $("authMsg"),

    monthLabel: $("monthLabel"),
    prevMonth: $("prevMonth"),
    nextMonth: $("nextMonth"),
    todayBtn: $("todayBtn"),

    balanceValue: $("balanceValue"),
    incomeValue: $("incomeValue"),
    expenseValue: $("expenseValue"),

    txForm: $("txForm"),
    type: $("type"),
    amount: $("amount"),
    categorySelect: $("categorySelect"),
    date: $("date"),
    description: $("description"),

    txList: $("txList"),
    txCount: $("txCount"),
    emptyState: $("emptyState"),
    filterType: $("filterType"),
    search: $("search"),

    noteForm: $("noteForm"),
    noteTitle: $("noteTitle"),
    noteDue: $("noteDue"),
    notePriority: $("notePriority"),
    noteDetails: $("noteDetails"),
    notesList: $("notesList"),
    notesEmpty: $("notesEmpty"),
  };

  const state = {
    user: null, // supabase user or {id:"guest"}
    profile: {
      locale: "pt-BR",
      currency: "BRL",
      startPageMode: "last",
      rememberEmail: true,
      keepSignedIn: true,
      savedEmail: ""
    },
    monthAnchor: new Date(),
    transactions: [],
    categories: [],
    notes: [],
    guest: { tx: [], categories: [], notes: [] }
  };

  // ---------- prefs ----------
  function loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      Object.assign(state.profile, p);
    } catch {}
  }
  function savePrefs() {
    localStorage.setItem(PREFS_KEY, JSON.stringify(state.profile));
  }

  // ---------- guest ----------
  function loadGuest() {
    try { state.guest = JSON.parse(localStorage.getItem(GUEST_KEY) || "{}"); } catch {}
    state.guest.tx = state.guest.tx || [];
    state.guest.categories = state.guest.categories || [];
    state.guest.notes = state.guest.notes || [];
  }
  function saveGuest() {
    localStorage.setItem(GUEST_KEY, JSON.stringify(state.guest));
  }

  // ---------- supabase ----------
  let sb = null;
  function buildSupabaseClient() {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        storageKey: AUTH_STORAGE_KEY,
        persistSession: !!state.profile.keepSignedIn,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  // ---------- ui ----------
  function showAuth() {
    el.authView.classList.remove("hidden");
    el.appView.classList.add("hidden");
    el.tabs.classList.add("hidden");
    el.logoutBtn.classList.add("hidden");
  }
  function showApp() {
    el.authView.classList.add("hidden");
    el.appView.classList.remove("hidden");
    el.tabs.classList.remove("hidden");
    el.logoutBtn.classList.remove("hidden");
  }

  // ---------- helpers ----------
  function todayISO(){ return new Date().toISOString().slice(0,10); }
  function toISODate(d){
    const yyyy=d.getFullYear();
    const mm=String(d.getMonth()+1).padStart(2,"0");
    const dd=String(d.getDate()).padStart(2,"0");
    return `${yyyy}-${mm}-${dd}`;
  }
  function firstDayOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
  function lastDayOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }
  function addMonths(d, n){ const x=new Date(d); x.setMonth(x.getMonth()+n); return x; }
  function parseMoney(str){
    if(!str) return 0;
    const v = String(str).replace(/\s/g,"").replace(/\./g,"").replace(",",".");
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, (c)=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));
  }

  // ---------- remember email / keep signed in ----------
  function applyRememberEmailUI(){
    el.rememberEmail.checked = !!state.profile.rememberEmail;
    el.keepSignedIn.checked = !!state.profile.keepSignedIn;
    if (state.profile.rememberEmail && state.profile.savedEmail) el.email.value = state.profile.savedEmail;
  }

  el.rememberEmail.addEventListener("change", () => {
    state.profile.rememberEmail = el.rememberEmail.checked;
    if (!state.profile.rememberEmail) state.profile.savedEmail = "";
    savePrefs();
  });

  el.keepSignedIn.addEventListener("change", () => {
    state.profile.keepSignedIn = el.keepSignedIn.checked;
    savePrefs();
    // recria client com persistSession novo
    location.reload();
  });

  // ---------- routing ----------
  function lastPageKey(){
    const uid = state.user?.id || "guest";
    return `necklaz_last_page_${uid}`;
  }
  function saveLastPage(page){ localStorage.setItem(lastPageKey(), page); }
  function loadLastPage(){ return localStorage.getItem(lastPageKey()); }

  function showPage(page){
    saveLastPage(page);
    document.querySelectorAll(".page").forEach(p => {
      p.classList.toggle("hidden", p.getAttribute("data-page") !== page);
    });
    document.querySelectorAll(".tab").forEach(b => {
      b.classList.toggle("is-active", b.getAttribute("data-page") === page);
    });
    if (location.hash !== `#${page}`) history.replaceState(null,"",`#${page}`);
  }

  function initRoute(){
    const valid = ["dashboard","tx","cards","notes"];
    const hashPage = (location.hash || "").replace("#","");
    const last = loadLastPage();

    if (state.profile.startPageMode === "last" && valid.includes(last)) {
      showPage(last); return;
    }
    if (valid.includes(hashPage)) { showPage(hashPage); return; }
    showPage("dashboard");
  }

  el.tabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    showPage(btn.getAttribute("data-page"));
  });
  window.addEventListener("hashchange", initRoute);

  // ---------- categories (seed simples) ----------
  function defaultCategories(){
    return ["Alimentação","Mercado","Fast Food","Transporte","Moradia","Contas","Assinaturas","Jogos","Lazer","Saúde","Educação","Investimentos","Dívidas","Compras","Outros"];
  }

  async function loadCategories(){
    if (state.user?.id === "guest") {
      if (!state.guest.categories.length) { state.guest.categories = defaultCategories(); saveGuest(); }
      state.categories = state.guest.categories;
      return;
    }

    const { data, error } = await sb.from("categories")
      .select("name")
      .eq("user_id", state.user.id)
      .eq("type","expense")
      .order("name",{ascending:true});

    if (error) throw error;

    if (!data.length) {
      const rows = defaultCategories().map(name => ({ user_id: state.user.id, type:"expense", name, color:"#7c5cff" }));
      const ins = await sb.from("categories").insert(rows);
      if (ins.error) throw ins.error;

      const again = await sb.from("categories").select("name")
        .eq("user_id", state.user.id).eq("type","expense");
      if (again.error) throw again.error;

      state.categories = again.data.map(x=>x.name);
    } else {
      state.categories = data.map(x=>x.name);
    }
  }

  function renderCategorySelect(){
    el.categorySelect.innerHTML = state.categories
      .slice().sort((a,b)=>a.localeCompare(b))
      .map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
      .join("");
  }

  // ---------- transactions ----------
  async function loadTransactionsMonth(){
    const from = toISODate(firstDayOfMonth(state.monthAnchor));
    const to = toISODate(lastDayOfMonth(state.monthAnchor));

    if (state.user?.id === "guest") {
      state.transactions = (state.guest.tx || []).filter(t => t.date >= from && t.date <= to);
      return;
    }

    const { data, error } = await sb.from("transactions")
      .select("*")
      .eq("user_id", state.user.id)
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending:false });

    if (error) throw error;
    state.transactions = data || [];
  }

  async function addTransaction(tx){
    if (state.user?.id === "guest") {
      state.guest.tx.unshift({ id: crypto.randomUUID(), ...tx, created_at: new Date().toISOString() });
      saveGuest();
      await loadTransactionsMonth();
      renderAll();
      return;
    }

    const { error } = await sb.from("transactions").insert({ user_id: state.user.id, ...tx });
    if (error) throw error;
    await loadTransactionsMonth();
    renderAll();
  }

  function renderTransactions(){
    const type = el.filterType.value;
    const q = (el.search.value || "").trim().toLowerCase();

    let list = state.transactions.slice();

    list = list.filter(tx => {
      const okType = type === "all" ? true : tx.type === type;
      const text = `${tx.description || ""} ${tx.category}`.toLowerCase();
      const okQ = q ? text.includes(q) : true;
      return okType && okQ;
    });

    el.txCount.textContent = `${list.length} item(ns)`;

    el.txList.innerHTML = list.map(tx => {
      const cls = tx.type === "income" ? "income" : "expense";
      const arrow = tx.type === "income"
        ? `<span class="arrow up">▲</span>`
        : `<span class="arrow down">▼</span>`;

      const money = new Intl.NumberFormat(state.profile.locale, { style:"currency", currency: tx.currency })
        .format(Number(tx.amount));

      return `
        <div class="txItem">
          <div>
            <div class="txTitle">${escapeHtml(tx.description || tx.category)}</div>
            <div class="txMeta">${escapeHtml(tx.category)} • ${escapeHtml(tx.date)}</div>
          </div>
          <div class="txAmount ${cls}">${arrow}${money}</div>
        </div>
      `;
    }).join("");

    el.emptyState.classList.toggle("hidden", list.length !== 0);
  }

  // ---------- summary ----------
  function renderMonthLabel(){
    const fmt = new Intl.DateTimeFormat(state.profile.locale, { month:"long", year:"numeric" });
    el.monthLabel.textContent = fmt.format(state.monthAnchor);
  }

  function renderSummary(){
    let income=0, expense=0;
    for (const tx of state.transactions){
      if (tx.currency !== state.profile.currency) continue;
      if (tx.type === "income") income += Number(tx.amount);
      else expense += Number(tx.amount);
    }
    const net = income - expense;

    const fmt = new Intl.NumberFormat(state.profile.locale, { style:"currency", currency: state.profile.currency });
    el.incomeValue.textContent = fmt.format(income);
    el.expenseValue.textContent = fmt.format(expense);

    const arrow = net >= 0 ? `<span class="arrow up">▲</span>` : `<span class="arrow down">▼</span>`;
    el.balanceValue.innerHTML = `${arrow}${fmt.format(net)}`;
  }

  // ---------- notes ----------
  async function loadNotes(){
    if (state.user?.id === "guest") { state.notes = state.guest.notes || []; return; }

    const { data, error } = await sb.from("notes")
      .select("*")
      .eq("user_id", state.user.id)
      .order("done",{ascending:true})
      .order("due_date",{ascending:true});

    if (error) throw error;
    state.notes = data || [];
  }

  function renderNotes(){
    el.notesList.innerHTML = (state.notes || []).map(n => {
      const due = n.due_date ? ` • ${n.due_date}` : "";
      const done = n.done ? " (feito)" : "";
      return `
        <div class="txItem">
          <div>
            <div class="txTitle">${escapeHtml(n.title)}${done}</div>
            <div class="txMeta">Prioridade: ${n.priority}${due}</div>
            <div class="txMeta">${escapeHtml(n.details || "")}</div>
          </div>
          <div class="txAmount income"></div>
        </div>
      `;
    }).join("");

    el.notesEmpty.classList.toggle("hidden", (state.notes || []).length !== 0);
  }

  // ---------- renderAll ----------
  function renderAll(){
    renderCategorySelect();
    renderMonthLabel();
    renderTransactions();
    renderSummary();
    renderNotes();
  }

  // ---------- auth busy ----------
  let authBusy = false;
  function setAuthBusy(b){
    authBusy = b;
    el.loginBtn.disabled = b;
    el.signupBtn.disabled = b;
    el.guestBtn.disabled = b;
    el.forgotBtn.disabled = b;
  }

  // ---------- forgot password ----------
  async function forgotPassword(){
    const email = el.email.value.trim();
    if (!email) { el.authMsg.textContent = "Digite seu email para recuperar."; return; }

    try {
      setAuthBusy(true);
      el.authMsg.textContent = "Enviando email de recuperação...";
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      if (error) throw error;
      el.authMsg.textContent = "Email enviado. Verifique caixa de entrada/spam.";
    } catch (e) {
      console.error(e);
      el.authMsg.textContent = e.message || String(e);
    } finally {
      setAuthBusy(false);
    }
  }

  el.forgotBtn.addEventListener("click", forgotPassword);

  // ---------- logout (não apaga conta) ----------
  async function logout(){
    try {
      await sb.auth.signOut({ scope: "local" });
    } catch (e) {
      console.warn("signOut falhou:", e);
    }

    // remove SOMENTE o token local. Isso não apaga usuário do Supabase.
    try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch {}
    try { sessionStorage.removeItem(AUTH_STORAGE_KEY); } catch {}

    state.user = null;
    showAuth();
    location.hash = "";
  }
  el.logoutBtn.addEventListener("click", logout);

  // ---------- login/signup handlers (não chama onLogin aqui) ----------
  el.authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (authBusy) return;

    const email = el.email.value.trim();
    const password = el.password.value;

    try {
      setAuthBusy(true);
      el.authMsg.textContent = "Entrando...";
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      el.authMsg.textContent = "Login OK. Carregando...";
    } catch (e2) {
      console.error(e2);
      el.authMsg.textContent = e2.message || String(e2);
    } finally {
      setAuthBusy(false);
    }
  });

  el.signupBtn.addEventListener("click", async () => {
    if (authBusy) return;

    const email = el.email.value.trim();
    const password = el.password.value;

    try {
      setAuthBusy(true);
      el.authMsg.textContent = "Criando conta...";
      const { error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      if (error) throw error;
      el.authMsg.textContent = "Conta criada. Confirme o email e depois entre.";
    } catch (e2) {
      console.error(e2);
      el.authMsg.textContent = e2.message || String(e2);
    } finally {
      setAuthBusy(false);
    }
  });

  el.guestBtn.addEventListener("click", async () => {
    state.user = { id: "guest" };
    showApp();
    await loadCategories();
    await loadTransactionsMonth();
    await loadNotes();
    renderAll();
    initRoute();
  });

  // ---------- tx form ----------
  el.txForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const tx = {
      type: el.type.value,
      amount: parseMoney(el.amount.value),
      currency: state.profile.currency,
      category: el.categorySelect.value,
      date: el.date.value,
      description: el.description.value.trim() || null
    };

    if (!tx.amount || tx.amount <= 0) return alert("Valor inválido.");
    await addTransaction(tx);

    el.amount.value = "";
    el.description.value = "";
  });

  el.filterType.addEventListener("change", renderTransactions);
  el.search.addEventListener("input", renderTransactions);

  // ---------- month nav ----------
  el.prevMonth.addEventListener("click", async () => {
    state.monthAnchor = addMonths(state.monthAnchor, -1);
    await loadTransactionsMonth();
    renderAll();
  });
  el.nextMonth.addEventListener("click", async () => {
    state.monthAnchor = addMonths(state.monthAnchor, +1);
    await loadTransactionsMonth();
    renderAll();
  });
  el.todayBtn.addEventListener("click", async () => {
    state.monthAnchor = new Date();
    el.date.value = todayISO();
    await loadTransactionsMonth();
    renderAll();
  });

  // ---------- note form ----------
  el.noteForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      title: el.noteTitle.value.trim(),
      details: el.noteDetails.value.trim() || null,
      due_date: el.noteDue.value || null,
      priority: Number(el.notePriority.value),
      done: false
    };
    if (!payload.title) return;

    if (state.user?.id === "guest") {
      state.guest.notes.unshift({ id: crypto.randomUUID(), ...payload, created_at: new Date().toISOString() });
      saveGuest();
      await loadNotes();
      renderNotes();
    } else {
      const { error } = await sb.from("notes").insert({ user_id: state.user.id, ...payload });
      if (error) return alert(error.message);
      await loadNotes();
      renderNotes();
    }

    el.noteTitle.value = "";
    el.noteDetails.value = "";
    el.noteDue.value = "";
    el.notePriority.value = "2";
  });

  // ---------- prefs selects ----------
  el.localeSelect.addEventListener("change", () => {
    state.profile.locale = el.localeSelect.value;
    savePrefs();
    renderAll();
  });
  el.currencySelect.addEventListener("change", () => {
    state.profile.currency = el.currencySelect.value;
    savePrefs();
    renderAll();
  });
  el.startPageMode.addEventListener("change", () => {
    state.profile.startPageMode = el.startPageMode.value;
    savePrefs();
    initRoute();
  });

  // ---------- onLogin ----------
  async function onLogin(user){
    state.user = user;
    showApp();

    if (state.profile.rememberEmail) {
      state.profile.savedEmail = el.email.value.trim();
      savePrefs();
    }

    await sb.from("profiles").upsert({
      id: user.id,
      locale: state.profile.locale,
      currency: state.profile.currency,
      start_page_mode: state.profile.startPageMode
    });

    const prof = await sb.from("profiles").select("*").eq("id", user.id).single();
    if (!prof.error) {
      state.profile.locale = prof.data.locale;
      state.profile.currency = prof.data.currency;
      state.profile.startPageMode = prof.data.start_page_mode || "last";
      savePrefs();
    }

    el.localeSelect.value = state.profile.locale;
    el.currencySelect.value = state.profile.currency;
    el.startPageMode.value = state.profile.startPageMode;

    await loadCategories();
    await loadTransactionsMonth();
    await loadNotes();
    renderAll();
    initRoute();
  }

  // ---------- auth state (único lugar que chama onLogin) ----------
  function hookAuth(){
    sb.auth.onAuthStateChange(async (_evt, session) => {
      if (!session) {
        state.user = null;
        showAuth();
        return;
      }
      try { await onLogin(session.user); }
      catch (e) {
        console.error(e);
        el.authMsg.textContent = e.message || String(e);
        showAuth();
      }
    });
  }

  // ---------- init ----------
  (async function init(){
    loadPrefs();
    loadGuest();
    buildSupabaseClient();

    el.localeSelect.value = state.profile.locale;
    el.currencySelect.value = state.profile.currency;
    el.startPageMode.value = state.profile.startPageMode;

    applyRememberEmailUI();
    el.date.value = todayISO();

    hookAuth();

    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      await onLogin(session.user);
      return;
    }

    showAuth();
  })();
})();