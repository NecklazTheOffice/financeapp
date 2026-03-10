(() => {
  // ========= CONFIGURE AQUI =========
  const SUPABASE_URL = "COLE_SUA_PROJECT_URL";        // https://xxxx.supabase.co
  const SUPABASE_KEY = "COLE_SUA_KEY_PUBLIC";         // sb_publishable_... ou anon legacy (eyJ...)
  // ================================

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const $ = (id) => document.getElementById(id);

  const el = {
    // views
    authView: $("authView"),
    appView: $("appView"),
    tabs: $("tabs"),

    // header prefs
    localeSelect: $("localeSelect"),
    currencySelect: $("currencySelect"),
    startPageMode: $("startPageMode"),
    logoutBtn: $("logoutBtn"),

    // auth
    authForm: $("authForm"),
    email: $("email"),
    password: $("password"),
    authMsg: $("authMsg"),
    signupBtn: $("signupBtn"),
    guestBtn: $("guestBtn"),

    // month nav
    monthLabel: $("monthLabel"),
    prevMonth: $("prevMonth"),
    nextMonth: $("nextMonth"),
    todayBtn: $("todayBtn"),

    // summary
    balanceValue: $("balanceValue"),
    incomeValue: $("incomeValue"),
    expenseValue: $("expenseValue"),

    // charts
    incomeExpenseChart: $("incomeExpenseChart"),
    categoryChart: $("categoryChart"),
    dailyFlowChart: $("dailyFlowChart"),

    // dashboard
    kpiPaid: $("kpiPaid"),
    kpiForecast: $("kpiForecast"),
    kpiOverdue: $("kpiOverdue"),
    kpiNextDue: $("kpiNextDue"),
    kpiNextDueSub: $("kpiNextDueSub"),
    alertsList: $("alertsList"),
    alertsEmpty: $("alertsEmpty"),

    // sheet
    sheetTable: $("sheetTable"),
    importCsvFile: $("importCsvFile"),
    importCsvBtn: $("importCsvBtn"),
    exportCsvBtn: $("exportCsvBtn"),
    exportXlsxBtn: $("exportXlsxBtn"),

    // tx
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

    // categories
    catForm: $("catForm"),
    catType: $("catType"),
    catName: $("catName"),
    catColor: $("catColor"),
    catList: $("catList"),
    catEmpty: $("catEmpty"),

    // cards + plans
    cardForm: $("cardForm"),
    cardName: $("cardName"),
    cardBrand: $("cardBrand"),
    cardClosing: $("cardClosing"),
    cardDue: $("cardDue"),

    chargeForm: $("chargeForm"),
    chargeCard: $("chargeCard"),
    chargePurchaseDate: $("chargePurchaseDate"),
    chargeTitle: $("chargeTitle"),
    chargeCategory: $("chargeCategory"),
    chargeAmount: $("chargeAmount"),

    planForm: $("planForm"),
    planMethod: $("planMethod"),
    planCard: $("planCard"),
    planPurchaseDate: $("planPurchaseDate"),
    planFirstDue: $("planFirstDue"),
    planTitle: $("planTitle"),
    planCategory: $("planCategory"),
    planTotal: $("planTotal"),
    planN: $("planN"),

    instList: $("instList"),
    instEmpty: $("instEmpty"),

    // statement
    stmtCard: $("stmtCard"),
    stmtMode: $("stmtMode"),
    stmtMonth: $("stmtMonth"),
    stmtSummary: $("stmtSummary"),
    stmtList: $("stmtList"),
    stmtEmpty: $("stmtEmpty"),
    stmtPie: $("stmtPie"),

    // goals
    goalForm: $("goalForm"),
    goalTitle: $("goalTitle"),
    goalTarget: $("goalTarget"),
    goalMode: $("goalMode"),
    goalDeadline: $("goalDeadline"),
    goalsList: $("goalsList"),
    goalsEmpty: $("goalsEmpty"),

    // notes
    noteForm: $("noteForm"),
    noteTitle: $("noteTitle"),
    noteDue: $("noteDue"),
    notePriority: $("notePriority"),
    noteDetails: $("noteDetails"),
    notesList: $("notesList"),
    notesEmpty: $("notesEmpty"),
  };

  const PREFS_KEY = "finance_prefs_v3";
  const GUEST_KEY = "finance_guest_v3";

  const state = {
    user: null, // supabase user or {id:"guest"}
    profile: { locale: "pt-BR", currency: "BRL", startPageMode: "last" },
    monthAnchor: new Date(),

    // month data
    transactions: [],

    // global data
    recurring: [],
    recurringExceptions: [],
    categories: [],
    cards: [],
    plans: [],
    installments: [],
    notes: [],
    goals: [],
    goalContrib: [],

    // guest store
    guest: {}
  };

  // ======== formatters ========
  let fmtMoney, fmtMonth, fmtDate;
  function refreshFormatters(){
    fmtMoney = new Intl.NumberFormat(state.profile.locale, { style:"currency", currency: state.profile.currency });
    fmtMonth = new Intl.DateTimeFormat(state.profile.locale, { month:"long", year:"numeric" });
    fmtDate = new Intl.DateTimeFormat(state.profile.locale);
    document.documentElement.lang = state.profile.locale;
  }

  // ======== helpers ========
  function todayISO(){ return new Date().toISOString().slice(0,10); }
  function iso(d){ return d.toISOString().slice(0,10); }
  function fromISO(s){ return new Date(s + "T00:00:00"); }
  function capitalize(s){ return s ? s[0].toUpperCase() + s.slice(1) : s; }

  function parseMoney(str){
    if(!str) return 0;
    const v = String(str).replace(/\s/g,"").replace(/\./g,"").replace(",",".");
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));
  }

  function isGuest(){ return state.user?.id === "guest"; }

  function firstDayOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
  function lastDayOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }
  function addMonths(d, delta){ const x = new Date(d); x.setMonth(x.getMonth()+delta); return x; }

  function toISODate(d){
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function addMonthsToISO(isoDate, add){
    const d = fromISO(isoDate);
    d.setMonth(d.getMonth() + add);
    return iso(d);
  }

  function isOverdue(isoDate){ return isoDate < todayISO(); }

  function inSameMonth(isoDate, anchor){
    const d = fromISO(isoDate);
    return d.getFullYear() === anchor.getFullYear() && d.getMonth() === anchor.getMonth();
  }

  function arrowHtml(type){
    return type === "income"
      ? `<span class="arrow up">▲</span>`
      : `<span class="arrow down">▼</span>`;
  }

  // ======== local prefs ========
  function loadPrefs(){
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      if (p.locale) state.profile.locale = p.locale;
      if (p.currency) state.profile.currency = p.currency;
      if (p.startPageMode) state.profile.startPageMode = p.startPageMode;
    } catch {}
  }
  function savePrefs(){
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      locale: state.profile.locale,
      currency: state.profile.currency,
      startPageMode: state.profile.startPageMode
    }));
  }

  // ======== guest storage ========
  function loadGuest(){
    try {
      state.guest = JSON.parse(localStorage.getItem(GUEST_KEY) || "{}");
    } catch {
      state.guest = {};
    }
    ensureGuestShape();
  }
  function ensureGuestShape(){
    state.guest.tx = state.guest.tx || [];
    state.guest.recurring = state.guest.recurring || [];
    state.guest.recurringExceptions = state.guest.recurringExceptions || [];

    state.guest.categories = state.guest.categories || [];

    state.guest.cards = state.guest.cards || [];
    state.guest.plans = state.guest.plans || [];
    state.guest.installments = state.guest.installments || [];

    state.guest.notes = state.guest.notes || [];
    state.guest.goals = state.guest.goals || [];
    state.guest.goalContrib = state.guest.goalContrib || [];
  }
  function saveGuest(){
    localStorage.setItem(GUEST_KEY, JSON.stringify(state.guest));
  }

  // ======== start page + tabs ========
  const tabsEl = el.tabs;

  function lastPageKey(){
    const uid = state.user?.id || "guest";
    return `finance_last_page_${uid}`;
  }
  function saveLastPage(page){ localStorage.setItem(lastPageKey(), page); }
  function loadLastPage(){ return localStorage.getItem(lastPageKey()); }

  function showPage(page){
    document.querySelectorAll(".page").forEach(p => {
      p.classList.toggle("hidden", p.getAttribute("data-page") !== page);
    });

    document.querySelectorAll(".tab").forEach(b => {
      b.classList.toggle("is-active", b.getAttribute("data-page") === page);
    });

    if (state.profile.startPageMode === "last") saveLastPage(page);
    if (location.hash !== `#${page}`) history.replaceState(null, "", `#${page}`);
  }

  function initRoute(){
    const valid = ["dashboard","tx","cards","goals","notes"];

    const hashPage = (location.hash || "").replace("#", "");
    if (valid.includes(hashPage)) { showPage(hashPage); return; }

    if (state.profile.startPageMode === "last") {
      const last = loadLastPage();
      if (valid.includes(last)) { showPage(last); return; }
    }
    showPage("dashboard");
  }

  tabsEl?.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    showPage(btn.getAttribute("data-page"));
    renderAll();
  });

  window.addEventListener("hashchange", initRoute);

  // ======== view switching ========
  function showAuth(){
    el.authView.classList.remove("hidden");
    el.appView.classList.add("hidden");
    el.logoutBtn.classList.add("hidden");
    el.tabs.classList.add("hidden");
  }
  function showApp(){
    el.authView.classList.add("hidden");
    el.appView.classList.remove("hidden");
    el.logoutBtn.classList.remove("hidden");
    el.tabs.classList.remove("hidden");
  }

  function setDefaultDates(){
    const now = todayISO();
    if (el.date) el.date.value = now;
    if (el.planPurchaseDate && !el.planPurchaseDate.value) el.planPurchaseDate.value = now;
    if (el.chargePurchaseDate && !el.chargePurchaseDate.value) el.chargePurchaseDate.value = now;

    if (el.stmtMonth && !el.stmtMonth.value) {
      const d = new Date();
      el.stmtMonth.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    }
  }

  // ======== Supabase profile ========
  async function ensureProfile(user){
    await sb.from("profiles").upsert({
      id: user.id,
      locale: state.profile.locale,
      currency: state.profile.currency,
      start_page_mode: state.profile.startPageMode
    });
  }

  async function loadProfile(user){
    const { data, error } = await sb.from("profiles").select("*").eq("id", user.id).single();
    if (error) throw error;
    state.profile = {
      locale: data.locale,
      currency: data.currency,
      startPageMode: data.start_page_mode || "last"
    };
  }

  async function saveProfile(){
    const { error } = await sb.from("profiles")
      .update({
        locale: state.profile.locale,
        currency: state.profile.currency,
        start_page_mode: state.profile.startPageMode
      })
      .eq("id", state.user.id);
    if (error) throw error;
  }

  // ======== categories ========
  function defaultCategories() {
    return {
      expense: [
        ["Alimentação", "#ffb703"],
        ["Mercado", "#ffd166"],
        ["Fast Food", "#f8961e"],
        ["Transporte", "#4cc9f0"],
        ["Moradia", "#b5179e"],
        ["Contas", "#3a86ff"],
        ["Assinaturas", "#8338ec"],
        ["Jogos", "#ff006e"],
        ["Lazer", "#06d6a0"],
        ["Saúde", "#ef476f"],
        ["Educação", "#118ab2"],
        ["Investimentos", "#2ee59d"],
        ["Dívidas", "#ff5c7a"],
        ["Compras", "#8ecae6"],
        ["Outros", "#7c5cff"]
      ],
      income: [
        ["Salário", "#2ee59d"],
        ["Freela", "#06d6a0"],
        ["Rendimentos", "#4cc9f0"],
        ["Vendas", "#ffd166"],
        ["Reembolso", "#8ecae6"],
        ["Outros", "#7c5cff"]
      ]
    };
  }

  async function ensureCategoriesSeeded(){
    const seed = defaultCategories();

    if (isGuest()) {
      if (state.guest.categories.length === 0) {
        for (const [name,color] of seed.expense) state.guest.categories.push({ id: crypto.randomUUID(), type:"expense", name, color });
        for (const [name,color] of seed.income) state.guest.categories.push({ id: crypto.randomUUID(), type:"income", name, color });
        saveGuest();
      }
      state.categories = state.guest.categories;
      return;
    }

    const { data, error } = await sb.from("categories").select("*").eq("user_id", state.user.id);
    if (error) throw error;

    if ((data || []).length === 0) {
      const rows = [
        ...seed.expense.map(([name,color]) => ({ user_id: state.user.id, type:"expense", name, color })),
        ...seed.income.map(([name,color]) => ({ user_id: state.user.id, type:"income", name, color })),
      ];
      const ins = await sb.from("categories").insert(rows);
      if (ins.error) throw ins.error;

      const again = await sb.from("categories").select("*").eq("user_id", state.user.id);
      if (again.error) throw again.error;
      state.categories = again.data || [];
    } else {
      state.categories = data || [];
    }
  }

  function renderCategorySelects(){
    const txType = el.type?.value || "expense";
    const catsForTx = (state.categories || [])
      .filter(c => c.type === txType)
      .sort((a,b) => a.name.localeCompare(b.name));

    if (el.categorySelect) {
      el.categorySelect.innerHTML = catsForTx.map(c =>
        `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`
      ).join("");
    }
  }

  function renderCategoriesManager(){
    if (!el.catList) return;
    const list = (state.categories || []).slice().sort((a,b)=>a.name.localeCompare(b.name));
    el.catList.innerHTML = list.map(c => `
      <div class="txItem">
        <div>
          <div class="txTitle">${escapeHtml(c.name)} <span class="badgePlanned">${c.type}</span></div>
          <div class="txMeta">Cor: ${escapeHtml(c.color)}</div>
          <button class="linkBtn" data-cat-del="${c.id}" type="button">Remover</button>
        </div>
        <div class="txAmount income"><span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:${c.color};border:1px solid rgba(255,255,255,.2)"></span></div>
      </div>
    `).join("");

    el.catEmpty.classList.toggle("hidden", list.length !== 0);

    document.querySelectorAll("[data-cat-del]").forEach(b => {
      b.addEventListener("click", async () => {
        const id = b.getAttribute("data-cat-del");
        if (!confirm("Remover categoria?")) return;

        if (isGuest()) {
          state.guest.categories = state.guest.categories.filter(x => x.id !== id);
          saveGuest();
          state.categories = state.guest.categories;
        } else {
          const { error } = await sb.from("categories").delete().eq("id", id);
          if (error) return alert(error.message);
          await ensureCategoriesSeeded();
        }

        renderCategorySelects();
        renderCategoriesManager();
      });
    });
  }

  el.type?.addEventListener("change", () => {
    renderCategorySelects();
    renderAll();
  });

  el.catForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = el.catType.value;
    const name = el.catName.value.trim();
    const color = el.catColor.value || "#7c5cff";
    if (!name) return;

    if (isGuest()) {
      state.guest.categories.push({ id: crypto.randomUUID(), type, name, color });
      saveGuest();
      state.categories = state.guest.categories;
    } else {
      const { error } = await sb.from("categories").insert({ user_id: state.user.id, type, name, color });
      if (error) return alert(error.message);
      await ensureCategoriesSeeded();
    }

    el.catName.value = "";
    renderCategorySelects();
    renderCategoriesManager();
  });

  // ======== recurring rules + exceptions ========
  async function loadRecurringRules(){
    if (isGuest()) {
      state.recurring = state.guest.recurring.slice().sort((a,b)=> (a.created_at < b.created_at ? 1 : -1));
      return;
    }
    const { data, error } = await sb.from("recurring_rules").select("*").eq("user_id", state.user.id);
    if (error) throw error;
    state.recurring = data || [];
  }

  async function loadRecurringExceptions(){
    if (isGuest()) {
      state.recurringExceptions = state.guest.recurringExceptions || [];
      return;
    }
    const { data, error } = await sb.from("recurring_exceptions").select("*").eq("user_id", state.user.id);
    if (error) throw error;
    state.recurringExceptions = data || [];
  }

  function findException(recurring_id, dateISO){
    return (state.recurringExceptions || []).find(e => e.recurring_id === recurring_id && e.date === dateISO) || null;
  }

  async function upsertException(recurring_id, dateISO, patch){
    if (isGuest()) {
      const arr = state.guest.recurringExceptions;
      const idx = arr.findIndex(e => e.recurring_id === recurring_id && e.date === dateISO);
      const row = {
        id: (idx >= 0 ? arr[idx].id : crypto.randomUUID()),
        recurring_id,
        date: dateISO,
        ...patch
      };
      if (idx >= 0) arr[idx] = row; else arr.push(row);
      saveGuest();
      state.recurringExceptions = arr;
      return;
    }

    const payload = { user_id: state.user.id, recurring_id, date: dateISO, ...patch };
    const { error } = await sb.from("recurring_exceptions").upsert(payload, { onConflict: "user_id,recurring_id,date" });
    if (error) throw error;
    await loadRecurringExceptions();
  }

  // ======== transactions load (month) ========
  async function reloadMonthTransactions(){
    const from = toISODate(firstDayOfMonth(state.monthAnchor));
    const to = toISODate(lastDayOfMonth(state.monthAnchor));

    if (isGuest()) {
      state.transactions = (state.guest.tx || [])
        .filter(tx => tx.date >= from && tx.date <= to)
        .sort((a,b) => (a.date < b.date ? 1 : -1));
      return;
    }

    const { data, error } = await sb.from("transactions")
      .select("*")
      .eq("user_id", state.user.id)
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: false });

    if (error) throw error;
    state.transactions = data || [];
  }

  // ======== cards + plans + installments ========
  async function loadCardsPlansInstallments(){
    if (isGuest()) {
      state.cards = state.guest.cards || [];
      state.plans = state.guest.plans || [];
      state.installments = state.guest.installments || [];
      renderCardsSelects();
      renderInstallmentsPanel();
      return;
    }

    const [c, p, i] = await Promise.all([
      sb.from("cards").select("*").eq("user_id", state.user.id).order("created_at", {ascending:false}),
      sb.from("payment_plans").select("*").eq("user_id", state.user.id).order("created_at", {ascending:false}),
      sb.from("payment_installments").select("*").eq("user_id", state.user.id).order("due_date", {ascending:true}),
    ]);
    if (c.error) throw c.error;
    if (p.error) throw p.error;
    if (i.error) throw i.error;

    state.cards = c.data || [];
    state.plans = p.data || [];
    state.installments = i.data || [];

    renderCardsSelects();
    renderInstallmentsPanel();
  }

  function renderCardsSelects(){
    const options = [`<option value="">—</option>`]
      .concat((state.cards||[]).map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`));

    if (el.planCard) el.planCard.innerHTML = options.join("");
    if (el.chargeCard) el.chargeCard.innerHTML = options.join("");

    if (el.stmtCard) {
      el.stmtCard.innerHTML = [`<option value="">Selecione um cartão</option>`]
        .concat((state.cards||[]).map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`))
        .join("");
    }
  }

  function renderInstallmentsPanel(){
    if (!el.instList) return;

    const today = todayISO();
    const horizon = addMonthsToISO(today, 2);

    const open = (state.installments || [])
      .filter(x => !x.paid && x.due_date >= today && x.due_date <= horizon)
      .slice(0, 40);

    el.instList.innerHTML = open.map(inst => {
      const plan = (state.plans || []).find(p => p.id === inst.plan_id);
      const title = plan?.title || "Parcelamento";
      const badge = inst.due_date < today ? `<span class="badgeOverdue">ATRASADO</span>` : "";
      const money = fmtMoney.format(Number(inst.amount));

      return `
        <div class="txItem">
          <div>
            <div class="txTitle">${escapeHtml(title)} ${badge}</div>
            <div class="txMeta">Vence ${escapeHtml(inst.due_date)} • Parcela ${inst.installment_no}/${plan?.installments || "?"}</div>
          </div>
          <div class="txAmount expense"><span class="arrow down">▼</span>${money}</div>
        </div>
      `;
    }).join("");

    el.instEmpty.classList.toggle("hidden", open.length !== 0);
  }

  // ======== card cycle (auto due date) ========
  function clampDay(y, m, day){
    const last = new Date(y, m + 1, 0).getDate();
    return Math.min(day, last);
  }

  function computeFirstDueDateForPurchase(card, purchaseISO){
    const p = fromISO(purchaseISO);
    const y = p.getFullYear();
    const m = p.getMonth();
    const day = p.getDate();

    const closingMonth = (day <= card.closing_day) ? m : (m + 1);
    const closingDate = new Date(y, closingMonth, clampDay(y, closingMonth, card.closing_day));

    const dueMonth = (card.due_day > card.closing_day) ? closingDate.getMonth() : (closingDate.getMonth() + 1);
    const dueYear = closingDate.getFullYear() + (dueMonth > 11 ? 1 : 0);
    const dueMonthNorm = (dueMonth % 12);

    const dueDate = new Date(dueYear, dueMonthNorm, clampDay(dueYear, dueMonthNorm, card.due_day));
    return iso(dueDate);
  }

  function refreshAutoFirstDue(){
    if (!el.planMethod || !el.planPurchaseDate || !el.planFirstDue) return;

    const method = el.planMethod.value;
    if (method === "card") {
      el.planFirstDue.readOnly = true;
      const cardId = el.planCard.value;
      const purchase = el.planPurchaseDate.value;
      if (!cardId || !purchase) return;

      const card = (state.cards || []).find(c => c.id === cardId);
      if (!card) return;

      el.planFirstDue.value = computeFirstDueDateForPurchase(card, purchase);
    } else {
      el.planFirstDue.readOnly = false;
      // PIX: deixa usuário escolher o primeiro vencimento
    }
  }

  el.planMethod?.addEventListener("change", refreshAutoFirstDue);
  el.planCard?.addEventListener("change", refreshAutoFirstDue);
  el.planPurchaseDate?.addEventListener("change", refreshAutoFirstDue);

  // ======== create card ========
  el.cardForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      name: el.cardName.value.trim(),
      brand: el.cardBrand.value.trim() || null,
      closing_day: Number(el.cardClosing.value || 25),
      due_day: Number(el.cardDue.value || 5),
      currency: state.profile.currency
    };
    if (!payload.name) return;

    if (isGuest()) {
      state.guest.cards.push({ id: crypto.randomUUID(), ...payload, created_at: new Date().toISOString() });
      saveGuest();
      await loadCardsPlansInstallments();
      el.cardName.value = ""; el.cardBrand.value = "";
      refreshAutoFirstDue();
      renderAll();
      return;
    }

    const { error } = await sb.from("cards").insert({ user_id: state.user.id, ...payload });
    if (error) return alert(error.message);

    el.cardName.value = ""; el.cardBrand.value = "";
    await loadCardsPlansInstallments();
    refreshAutoFirstDue();
    renderAll();
  });

  // ======== create charge 1x (card) ========
  el.chargeForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const card_id = el.chargeCard.value;
    const purchase_date = el.chargePurchaseDate.value;
    const title = el.chargeTitle.value.trim();
    const category = el.chargeCategory.value.trim();
    const total = parseMoney(el.chargeAmount.value);

    if (!card_id) return alert("Selecione um cartão.");
    if (!purchase_date) return alert("Informe a data da compra.");
    if (!title) return alert("Informe a descrição.");
    if (!category) return alert("Informe a categoria.");
    if (!total || total <= 0) return alert("Valor inválido.");

    const card = (state.cards || []).find(c => c.id === card_id);
    if (!card) return alert("Cartão não encontrado.");

    const first_due_date = computeFirstDueDateForPurchase(card, purchase_date);

    if (isGuest()) {
      const planId = crypto.randomUUID();
      state.guest.plans.push({
        id: planId,
        method: "card",
        card_id,
        title,
        category,
        currency: state.profile.currency,
        total_amount: total,
        installments: 1,
        purchase_date,
        first_due_date,
        created_at: new Date().toISOString()
      });
      state.guest.installments.push({
        id: crypto.randomUUID(),
        plan_id: planId,
        installment_no: 1,
        due_date: first_due_date,
        amount: Number(total.toFixed(2)),
        paid: false,
        paid_tx_id: null,
        created_at: new Date().toISOString()
      });
      saveGuest();
      await loadCardsPlansInstallments();
      await reloadMonthTransactions();
      renderAll();
      el.chargeTitle.value = ""; el.chargeCategory.value = ""; el.chargeAmount.value = "";
      return;
    }

    const planRes = await sb.from("payment_plans").insert({
      user_id: state.user.id,
      method: "card",
      card_id,
      title,
      category,
      currency: state.profile.currency,
      total_amount: total,
      installments: 1,
      purchase_date,
      first_due_date
    }).select("id").single();

    if (planRes.error) return alert(planRes.error.message);

    const instRes = await sb.from("payment_installments").insert({
      user_id: state.user.id,
      plan_id: planRes.data.id,
      installment_no: 1,
      due_date: first_due_date,
      amount: Number(total.toFixed(2))
    });

    if (instRes.error) return alert(instRes.error.message);

    await loadCardsPlansInstallments();
    await reloadMonthTransactions();
    renderAll();
    el.chargeTitle.value = ""; el.chargeCategory.value = ""; el.chargeAmount.value = "";
  });

  // ======== create plan (pix/card) ========
  el.planForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const method = el.planMethod.value;
    const card_id = method === "card" ? (el.planCard.value || null) : null;
    const purchase_date = el.planPurchaseDate.value;

    if (method === "card" && !card_id) return alert("Selecione um cartão.");
    if (!purchase_date) return alert("Informe a data da compra.");

    const title = el.planTitle.value.trim();
    const category = el.planCategory.value.trim();
    const total = parseMoney(el.planTotal.value);
    const n = Number(el.planN.value);

    if (!title) return alert("Informe um título.");
    if (!category) return alert("Informe uma categoria.");
    if (!total || total <= 0) return alert("Valor total inválido.");
    if (!n || n < 1 || n > 60) return alert("Parcelas inválidas.");

    let first_due_date = el.planFirstDue.value;
    if (method === "card") {
      const card = (state.cards || []).find(c => c.id === card_id);
      first_due_date = computeFirstDueDateForPurchase(card, purchase_date);
      el.planFirstDue.value = first_due_date;
    } else {
      if (!first_due_date) return alert("Informe o 1º vencimento (PIX).");
    }

    const per = Number((total / n).toFixed(2));

    if (isGuest()) {
      const planId = crypto.randomUUID();

      state.guest.plans.push({
        id: planId,
        method, card_id,
        title, category,
        currency: state.profile.currency,
        total_amount: total,
        installments: n,
        purchase_date,
        first_due_date,
        created_at: new Date().toISOString()
      });

      for (let k=1; k<=n; k++){
        state.guest.installments.push({
          id: crypto.randomUUID(),
          plan_id: planId,
          installment_no: k,
          due_date: addMonthsToISO(first_due_date, k-1),
          amount: per,
          paid: false,
          paid_tx_id: null,
          created_at: new Date().toISOString()
        });
      }

      saveGuest();
      await loadCardsPlansInstallments();
      await reloadMonthTransactions();
      renderAll();
      return;
    }

    const planRes = await sb.from("payment_plans").insert({
      user_id: state.user.id,
      method, card_id,
      title, category,
      currency: state.profile.currency,
      total_amount: total,
      installments: n,
      purchase_date,
      first_due_date
    }).select("id").single();

    if (planRes.error) return alert(planRes.error.message);

    const planId = planRes.data.id;
    const instRows = [];
    for (let k=1; k<=n; k++){
      instRows.push({
        user_id: state.user.id,
        plan_id: planId,
        installment_no: k,
        due_date: addMonthsToISO(first_due_date, k-1),
        amount: per
      });
    }

    const instRes = await sb.from("payment_installments").insert(instRows);
    if (instRes.error) return alert(instRes.error.message);

    await loadCardsPlansInstallments();
    await reloadMonthTransactions();
    renderAll();
  });

  // ======== planned items (recurring + installments) ========
  function plannedFromRecurring(anchor){
    const rules = state.recurring || [];
    const existing = new Set(
      (state.transactions || [])
        .filter(t => t.recurring_id)
        .map(t => `${t.recurring_id}|${t.date}`)
    );

    const out = [];
    const y = anchor.getFullYear();
    const m = anchor.getMonth();

    for (const r of rules) {
      if (!r.active) continue;

      const occ = new Date(y, m, r.day_of_month);
      const occISO = iso(occ);
      if (r.start_date && occISO < r.start_date) continue;

      const ex = findException(r.id, occISO);
      if (ex && ex.action === "skip") continue;

      const key = `${r.id}|${occISO}`;
      if (existing.has(key)) continue;

      const amount = ex?.action === "override" && ex.override_amount != null ? Number(ex.override_amount) : Number(r.amount);
      const currency = ex?.action === "override" && ex.override_currency ? ex.override_currency : r.currency;
      const category = ex?.action === "override" && ex.override_category ? ex.override_category : r.category;
      const description = ex?.action === "override" && ex.override_description ? ex.override_description : (r.description || `${category} (recorrente)`);

      out.push({
        pid: `recurring|${r.id}|${occISO}`,
        kind: "recurring",
        status: "planned",
        recurring_id: r.id,
        date: occISO,
        type: r.type,
        amount,
        currency,
        category,
        description,
        overdue: isOverdue(occISO)
      });
    }

    return out;
  }

  function plannedFromInstallments(anchor){
    if (!state.installments || !state.plans) return [];
    const out = [];

    for (const i of state.installments) {
      if (i.paid) continue;
      if (!inSameMonth(i.due_date, anchor)) continue;

      const plan = state.plans.find(p => p.id === i.plan_id);
      if (!plan) continue;

      out.push({
        pid: `installment|${i.id}`,
        kind: "installment",
        status: "planned",
        installment_id: i.id,
        plan_id: i.plan_id,
        date: i.due_date,
        type: "expense",
        amount: Number(i.amount),
        currency: plan.currency,
        category: plan.category,
        description: `${plan.title} (parcela ${i.installment_no}/${plan.installments})`,
        overdue: isOverdue(i.due_date)
      });
    }
    return out;
  }

  function getPaidAndPlannedForMonth(){
    const paid = (state.transactions || []).map(t => ({ ...t, status:"paid", kind:"tx" }));
    const planned = [
      ...plannedFromRecurring(state.monthAnchor),
      ...plannedFromInstallments(state.monthAnchor),
    ];
    return { paid, planned };
  }

  async function payPlannedItem(item){
    const tx = {
      type: item.type,
      amount: Number(item.amount),
      currency: item.currency,
      category: item.category,
      date: item.date,
      description: item.description || null,
      recurring_id: item.recurring_id || null
    };

    let txId = null;

    if (isGuest()) {
      txId = crypto.randomUUID();
      state.guest.tx.push({ id: txId, ...tx, created_at: new Date().toISOString() });
      saveGuest();
    } else {
      const ins = await sb.from("transactions")
        .insert({ user_id: state.user.id, ...tx })
        .select("id")
        .single();

      if (ins.error) return alert(ins.error.message);
      txId = ins.data.id;
    }

    if (item.kind === "installment") {
      if (isGuest()) {
        const target = state.guest.installments.find(x => x.id === item.installment_id);
        if (target) { target.paid = true; target.paid_tx_id = txId; }
        saveGuest();
      } else {
        const up = await sb.from("payment_installments")
          .update({ paid: true, paid_tx_id: txId })
          .eq("id", item.installment_id);
        if (up.error) return alert(up.error.message);
      }
    }

    await reloadMonthTransactions();
    await loadCardsPlansInstallments();
    renderAll();
  }

  async function editPlannedRecurring(item){
    const newAmount = prompt("Novo valor (ex: 120,50):", String(item.amount).replace(".", ","));
    if (newAmount === null) return;
    const amount = parseMoney(newAmount);
    if (!amount || amount <= 0) return alert("Valor inválido.");

    const newCategory = prompt("Categoria:", item.category);
    if (newCategory === null || !newCategory.trim()) return;

    const newDesc = prompt("Descrição:", item.description || "");
    if (newDesc === null) return;

    await upsertException(item.recurring_id, item.date, {
      action: "override",
      override_amount: amount,
      override_currency: item.currency,
      override_category: newCategory.trim(),
      override_description: newDesc.trim()
    });

    renderAll();
  }

  async function skipPlannedRecurring(item){
    await upsertException(item.recurring_id, item.date, { action: "skip" });
    renderAll();
  }

  async function editPlannedInstallment(item){
    const newDue = prompt("Nova data (YYYY-MM-DD):", item.date);
    if (newDue === null) return;

    const newAmountStr = prompt("Novo valor (ex: 120,50):", String(item.amount).replace(".", ","));
    if (newAmountStr === null) return;

    const amount = parseMoney(newAmountStr);
    if (!amount || amount <= 0) return alert("Valor inválido.");

    if (isGuest()) {
      const inst = state.guest.installments.find(x => x.id === item.installment_id);
      if (inst) { inst.due_date = newDue; inst.amount = amount; }
      saveGuest();
    } else {
      const { error } = await sb.from("payment_installments").update({ due_date: newDue, amount }).eq("id", item.installment_id);
      if (error) return alert(error.message);
    }

    await reloadMonthTransactions();
    await loadCardsPlansInstallments();
    renderAll();
  }

  // ======== add/remove transactions ========
  async function addTransaction(payload){
    if (isGuest()) {
      state.guest.tx.push({ id: crypto.randomUUID(), ...payload, created_at: new Date().toISOString() });
      saveGuest();
      await reloadMonthTransactions();
      renderAll();
      return;
    }

    const { error } = await sb.from("transactions").insert({ user_id: state.user.id, ...payload });
    if (error) throw error;

    await reloadMonthTransactions();
    renderAll();
  }

  async function removeTransaction(id){
    if (!confirm("Remover este lançamento?")) return;

    if (isGuest()) {
      state.guest.tx = state.guest.tx.filter(t => t.id !== id);
      saveGuest();
      await reloadMonthTransactions();
      renderAll();
      return;
    }

    const { error } = await sb.from("transactions").delete().eq("id", id);
    if (error) return alert(error.message);

    await reloadMonthTransactions();
    renderAll();
  }

  // ======== render month label + summary ========
  function renderMonthHeader(){
    if (el.monthLabel) el.monthLabel.textContent = capitalize(fmtMonth.format(state.monthAnchor));
  }

  function sumIncomeExpense(list){
    let income = 0, expense = 0;
    for (const tx of list){
      if (tx.currency !== state.profile.currency) continue;
      const a = Number(tx.amount);
      if (tx.type === "income") income += a;
      else expense += a;
    }
    return { income, expense, net: income - expense };
  }

  function renderSummary(){
    const { paid, planned } = getPaidAndPlannedForMonth();
    const paidSum = sumIncomeExpense(paid);

    el.incomeValue.textContent = fmtMoney.format(paidSum.income);
    el.expenseValue.textContent = fmtMoney.format(paidSum.expense);

    // saldo do card com seta baseada no pago
    const arrow = paidSum.net >= 0 ? `<span class="arrow up">▲</span>` : `<span class="arrow down">▼</span>`;
    el.balanceValue.innerHTML = `${arrow}${fmtMoney.format(paidSum.net)}`;
  }

  // ======== render list (paid + planned editable) ========
  function renderTransactions(){
    const { paid, planned } = getPaidAndPlannedForMonth();
    let list = [...paid, ...planned];

    const type = el.filterType?.value || "all";
    const q = (el.search?.value || "").trim().toLowerCase();

    list = list.filter(tx => {
      const okType = type === "all" ? true : tx.type === type;
      const text = `${tx.description || ""} ${tx.category}`.toLowerCase();
      const okQ = q ? text.includes(q) : true;
      return okType && okQ;
    });

    if (el.txCount) el.txCount.textContent = `${list.length} item(ns)`;

    if (!el.txList) return;

    el.txList.innerHTML = list
      .sort((a,b) => (a.date > b.date ? 1 : -1))
      .map(tx => {
        const cls = tx.type === "income" ? "income" : "expense";
        const money = new Intl.NumberFormat(state.profile.locale, { style:"currency", currency:tx.currency })
          .format(Number(tx.amount));

        const plannedBadge = tx.status === "planned" ? `<span class="badgePlanned">PREVISTO</span>` : "";
        const overdueBadge = tx.status === "planned" && tx.overdue ? `<span class="badgeOverdue">ATRASADO</span>` : "";

        const buttons = tx.status === "paid"
          ? `<button class="linkBtn" data-remove="${tx.id}" type="button">Remover</button>`
          : (tx.kind === "recurring"
              ? `
                <button class="linkBtn" data-pay="${tx.pid}" type="button">Marcar como pago</button>
                <button class="linkBtn" data-edit="${tx.pid}" type="button">Editar</button>
                <button class="linkBtn" data-skip="${tx.pid}" type="button">Ignorar este mês</button>
              `
              : `
                <button class="linkBtn" data-pay="${tx.pid}" type="button">Marcar como pago</button>
                <button class="linkBtn" data-edit="${tx.pid}" type="button">Editar parcela</button>
              `
            );

        return `
          <div class="txItem">
            <div>
              <div class="txTitle">${escapeHtml(tx.description || tx.category)} ${plannedBadge} ${overdueBadge}</div>
              <div class="txMeta">${escapeHtml(tx.category)} • ${escapeHtml(tx.date)}</div>
              <div class="txActions">${buttons}</div>
            </div>
            <div class="txAmount ${cls}">${arrowHtml(tx.type)}${money}</div>
          </div>
        `;
      }).join("");

    el.emptyState?.classList.toggle("hidden", list.length !== 0);

    // binds
    document.querySelectorAll("[data-remove]").forEach(btn => {
      btn.addEventListener("click", async () => removeTransaction(btn.getAttribute("data-remove")));
    });

    const plannedNow = planned;
    const findByPid = (pid) => plannedNow.find(x => x.pid === pid);

    document.querySelectorAll("[data-pay]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const item = findByPid(btn.getAttribute("data-pay"));
        if (!item) return alert("Previsto não encontrado.");
        await payPlannedItem(item);
      });
    });

    document.querySelectorAll("[data-edit]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const item = findByPid(btn.getAttribute("data-edit"));
        if (!item) return alert("Previsto não encontrado.");
        if (item.kind === "recurring") await editPlannedRecurring(item);
        else await editPlannedInstallment(item);
      });
    });

    document.querySelectorAll("[data-skip]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const item = findByPid(btn.getAttribute("data-skip"));
        if (!item) return alert("Previsto não encontrado.");
        if (item.kind === "recurring") await skipPlannedRecurring(item);
      });
    });
  }

  el.filterType?.addEventListener("change", renderTransactions);
  el.search?.addEventListener("input", renderTransactions);

  // ======== TX form submit ========
  el.txForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const type = el.type.value;
    const amount = parseMoney(el.amount.value);
    const category = el.categorySelect.value;
    const date = el.date.value;
    const description = el.description.value.trim();

    if (!amount || amount <= 0) return alert("Valor inválido.");
    if (!category) return alert("Categoria obrigatória.");
    if (!date) return alert("Data obrigatória.");

    const payload = {
      type,
      amount,
      currency: state.profile.currency,
      category,
      date,
      description: description || null
    };

    try {
      await addTransaction(payload);
      el.amount.value = "";
      el.description.value = "";
    } catch (err) {
      alert(err.message || String(err));
    }
  });

  // ======== charts (paid vs forecast) ========
  let chIncomeExpense = null;
  let chCategory = null;
  let chDaily = null;
  let chStmtPie = null;

  function totalsByCategoryExpense(list){
    const m = new Map();
    for (const tx of list) {
      if (tx.currency !== state.profile.currency) continue;
      if (tx.type !== "expense") continue;
      const key = tx.category || "Outros";
      m.set(key, (m.get(key) || 0) + Number(tx.amount));
    }
    return [...m.entries()].map(([category,total]) => ({category,total})).sort((a,b)=>b.total-a.total);
  }

  function dailyCumulative(list){
    const anchor = state.monthAnchor;
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const netByDay = Array.from({ length: daysInMonth }, () => 0);

    for (const tx of list) {
      if (tx.currency !== state.profile.currency) continue;
      const d = fromISO(tx.date);
      const day = d.getDate();
      const amt = Number(tx.amount);
      netByDay[day - 1] += (tx.type === "income" ? amt : -amt);
    }

    const labels = netByDay.map((_, i) => String(i + 1).padStart(2, "0"));
    const cumulative = [];
    let acc = 0;
    for (const v of netByDay) { acc += v; cumulative.push(acc); }

    return { labels, cumulative };
  }

  function renderCharts(){
    if (!window.Chart) return;

    const { paid, planned } = getPaidAndPlannedForMonth();
    const paidSum = sumIncomeExpense(paid);
    const projSum = sumIncomeExpense([...paid, ...planned]);

    if (el.incomeExpenseChart) {
      chIncomeExpense?.destroy();
      chIncomeExpense = new Chart(el.incomeExpenseChart.getContext("2d"), {
        type: "bar",
        data: {
          labels: ["Receitas", "Despesas"],
          datasets: [
            { label: "Pago", data: [paidSum.income, paidSum.expense] },
            { label: "Previsto (total)", data: [projSum.income, projSum.expense] }
          ]
        },
        options: {
          plugins: {
            tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmtMoney.format(c.raw)}` } }
          }
        }
      });
    }

    if (el.categoryChart) {
      const catsPaid = totalsByCategoryExpense(paid);
      const catsProj = totalsByCategoryExpense([...paid, ...planned]);
      const top = catsProj.slice(0, 8).map(x => x.category);

      const paidMap = new Map(catsPaid.map(x => [x.category, x.total]));
      const projMap = new Map(catsProj.map(x => [x.category, x.total]));

      const paidArr = top.map(c => paidMap.get(c) || 0);
      const projArr = top.map(c => projMap.get(c) || 0);

      const colorMap = new Map((state.categories || []).map(c => [c.name, c.color]));
      const colors = top.map(c => colorMap.get(c) || "#7c5cff");

      chCategory?.destroy();
      chCategory = new Chart(el.categoryChart.getContext("2d"), {
        type: "doughnut",
        data: {
          labels: top,
          datasets: [
            { label: "Pago", data: paidArr, backgroundColor: colors, borderWidth: 0 },
            { label: "Previsto (total)", data: projArr, backgroundColor: colors, borderWidth: 0 }
          ]
        },
        options: {
          plugins: {
            tooltip: { callbacks: { label: (c) => `${c.dataset.label} • ${c.label}: ${fmtMoney.format(c.raw)}` } }
          }
        }
      });
    }

    if (el.dailyFlowChart) {
      const flowPaid = dailyCumulative(paid);
      const flowProj = dailyCumulative([...paid, ...planned]);

      chDaily?.destroy();
      chDaily = new Chart(el.dailyFlowChart.getContext("2d"), {
        type: "line",
        data: {
          labels: flowPaid.labels,
          datasets: [
            { label: "Pago", data: flowPaid.cumulative, tension: 0.25 },
            { label: "Previsto", data: flowProj.cumulative, tension: 0.25 }
          ]
        },
        options: {
          plugins: {
            tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmtMoney.format(c.raw)}` } }
          }
        }
      });
    }
  }

  // ======== dashboard KPIs + alerts ========
  function getOverdueInstallmentsAll(){
    const today = todayISO();
    return (state.installments || []).filter(i => !i.paid && i.due_date < today);
  }

  function getNextUnpaidInstallment(){
    const open = (state.installments || []).filter(i => !i.paid);
    if (!open.length) return null;
    open.sort((a,b) => (a.due_date > b.due_date ? 1 : -1));
    return open[0];
  }

  function planTitleByInstallment(inst){
    const plan = (state.plans || []).find(p => p.id === inst.plan_id);
    return plan?.title || "Parcelamento";
  }

  function buildAlerts(){
    const alerts = [];

    const overdueInst = getOverdueInstallmentsAll()
      .sort((a,b) => (a.due_date > b.due_date ? 1 : -1))
      .slice(0, 6);

    for (const inst of overdueInst){
      const title = planTitleByInstallment(inst);
      alerts.push({
        title: `${title} — parcela atrasada`,
        meta: `Venceu ${inst.due_date}`,
        amount: Number(inst.amount),
        currency: state.profile.currency,
        isExpense: true
      });
    }

    const { planned } = getPaidAndPlannedForMonth();
    const overduePlanned = planned.filter(p => p.overdue).slice(0, 6);
    for (const p of overduePlanned){
      alerts.push({
        title: `${p.description || p.category} — previsto atrasado`,
        meta: `Venceu ${p.date}`,
        amount: Number(p.amount),
        currency: p.currency,
        isExpense: p.type === "expense"
      });
    }

    const today = todayISO();
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    const in7ISO = iso(in7);

    const next7 = (state.installments || [])
      .filter(i => !i.paid && i.due_date >= today && i.due_date <= in7ISO)
      .sort((a,b) => (a.due_date > b.due_date ? 1 : -1))
      .slice(0, 6);

    for (const inst of next7){
      const title = planTitleByInstallment(inst);
      alerts.push({
        title: `${title} — vence em breve`,
        meta: `Vence ${inst.due_date}`,
        amount: Number(inst.amount),
        currency: state.profile.currency,
        isExpense: true
      });
    }

    return alerts.slice(0, 10);
  }

  function renderDashboard(){
    if (!el.kpiPaid) return;

    const { paid, planned } = getPaidAndPlannedForMonth();
    const paidSum = sumIncomeExpense(paid);
    const projSum = sumIncomeExpense([...paid, ...planned]);

    el.kpiPaid.innerHTML =
      (paidSum.net >= 0 ? `<span class="arrow up">▲</span>` : `<span class="arrow down">▼</span>`) +
      fmtMoney.format(paidSum.net);

    el.kpiForecast.innerHTML =
      (projSum.net >= 0 ? `<span class="arrow up">▲</span>` : `<span class="arrow down">▼</span>`) +
      fmtMoney.format(projSum.net);

    const overdueCount = getOverdueInstallmentsAll().length + planned.filter(p => p.overdue).length;
    el.kpiOverdue.innerHTML =
      (overdueCount > 0 ? `<span class="badgeOverdue">ATRASO</span> ` : "") + String(overdueCount);

    const nextInst = getNextUnpaidInstallment();
    if (!nextInst) {
      el.kpiNextDue.textContent = "—";
      el.kpiNextDueSub.textContent = "Nenhuma parcela em aberto";
    } else {
      const title = planTitleByInstallment(nextInst);
      el.kpiNextDue.innerHTML = `<span class="arrow down">▼</span>${fmtMoney.format(Number(nextInst.amount))}`;
      el.kpiNextDueSub.textContent = `${title} • ${nextInst.due_date}`;
    }

    const alerts = buildAlerts();
    el.alertsList.innerHTML = alerts.map(a => {
      const arrow = a.isExpense ? `<span class="arrow down">▼</span>` : `<span class="arrow up">▲</span>`;
      const money = new Intl.NumberFormat(state.profile.locale, { style:"currency", currency: a.currency || state.profile.currency })
        .format(Number(a.amount));
      return `
        <div class="txItem">
          <div>
            <div class="txTitle">${escapeHtml(a.title)}</div>
            <div class="txMeta">${escapeHtml(a.meta)}</div>
          </div>
          <div class="txAmount ${a.isExpense ? "expense" : "income"}">${arrow}${money}</div>
        </div>
      `;
    }).join("");

    el.alertsEmpty.classList.toggle("hidden", alerts.length !== 0);
  }

  // ======== sheet + import/export ========
  function detectDelimiter(line) {
    const commas = (line.match(/,/g) || []).length;
    const semis = (line.match(/;/g) || []).length;
    return semis > commas ? ";" : ",";
  }

  function parseCsvLine(line, delim) {
    const out = [];
    let cur = "", inQ = false;
    for (let i=0;i<line.length;i++){
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i+1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === delim && !inQ) {
        out.push(cur); cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out.map(s => s.trim());
  }

  function normHeader(s){
    return (s||"")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function parseAnyDate(s){
    if (!s) return null;
    const v = String(s).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
      const [dd,mm,yyyy] = v.split("/");
      return `${yyyy}-${mm}-${dd}`;
    }
    return null;
  }

  function inferTypeFromAmount(n){ return n < 0 ? "expense" : "income"; }

  function mapCsvToTransactions(text){
    const lines = text.split(/\r?\n/).filter(l => l.trim().length);
    if (!lines.length) return [];

    const delim = detectDelimiter(lines[0]);
    const headersRaw = parseCsvLine(lines[0], delim);
    const headers = headersRaw.map(normHeader);

    const idx = (names) => headers.findIndex(h => names.includes(h));

    const iDate = idx(["date","data","transaction date","posted date"]);
    const iType = idx(["type","tipo"]);
    const iAmount = idx(["amount","valor","value","montante","quantia"]);
    const iDesc = idx(["description","descricao","desc","memo","historico","nome"]);
    const iCat = idx(["category","categoria"]);
    const iCur = idx(["currency","moeda"]);
    const iDebit = idx(["debit","debito","saida","out"]);
    const iCredit = idx(["credit","credito","entrada","in"]);

    const out = [];

    for (let r=1; r<lines.length; r++){
      const cols = parseCsvLine(lines[r], delim);

      const date = parseAnyDate(iDate >= 0 ? cols[iDate] : null) || todayISO();

      let amount = 0;
      if (iAmount >= 0) amount = Number(String(cols[iAmount]||"").replace(/\./g,"").replace(",","."));
      else if (iDebit >= 0 || iCredit >= 0) {
        const d = iDebit >= 0 ? Number(String(cols[iDebit]||"").replace(/\./g,"").replace(",", ".")) : 0;
        const c = iCredit >= 0 ? Number(String(cols[iCredit]||"").replace(/\./g,"").replace(",", ".")) : 0;
        amount = (c || 0) - (d || 0);
      }

      if (!Number.isFinite(amount) || amount === 0) continue;

      const type = iType >= 0
        ? (String(cols[iType]||"").toLowerCase().includes("inc") ? "income"
          : String(cols[iType]||"").toLowerCase().includes("rec") ? "income"
          : String(cols[iType]||"").toLowerCase().includes("des") ? "expense"
          : String(cols[iType]||"").toLowerCase().includes("exp") ? "expense"
          : inferTypeFromAmount(amount))
        : inferTypeFromAmount(amount);

      const absAmount = Math.abs(amount);

      const description = iDesc >= 0 ? (cols[iDesc] || "") : "";
      const category = iCat >= 0 ? (cols[iCat] || "Outros") : "Outros";
      const currency = iCur >= 0 ? (cols[iCur] || state.profile.currency) : state.profile.currency;

      out.push({
        type,
        amount: absAmount,
        currency,
        category,
        date,
        description: description || null
      });
    }

    return out;
  }

  async function insertTransactionsBatched(rows, batchSize = 400){
    for (let i=0;i<rows.length;i+=batchSize){
      const batch = rows.slice(i, i+batchSize);

      if (isGuest()){
        for (const r of batch){
          state.guest.tx.push({ id: crypto.randomUUID(), ...r, created_at: new Date().toISOString() });
        }
        saveGuest();
      } else {
        const payload = batch.map(r => ({ user_id: state.user.id, ...r }));
        const { error } = await sb.from("transactions").insert(payload);
        if (error) throw error;
      }
    }
  }

  function renderSheetTable(){
    if (!el.sheetTable) return;

    const { paid, planned } = getPaidAndPlannedForMonth();
    const rows = [...paid, ...planned]
      .map(tx => ({
        status: tx.status === "paid" ? "Pago" : "Previsto",
        date: tx.date,
        type: tx.type,
        category: tx.category || "Outros",
        description: tx.description || "",
        currency: tx.currency,
        amount: Number(tx.amount),
      }))
      .sort((a,b) => (a.date > b.date ? 1 : -1));

    el.sheetTable.innerHTML = `
      <thead>
        <tr>
          <th>Status</th><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Moeda</th><th style="text-align:right">Valor</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => {
          const arrow = r.type === "income"
            ? `<span class="arrow up">▲</span>`
            : `<span class="arrow down">▼</span>`;
          const money = new Intl.NumberFormat(state.profile.locale, { style:"currency", currency:r.currency }).format(r.amount);

          return `
            <tr>
              <td>${escapeHtml(r.status)}</td>
              <td>${escapeHtml(r.date)}</td>
              <td>${escapeHtml(r.type)}</td>
              <td>${escapeHtml(r.category)}</td>
              <td>${escapeHtml(r.description)}</td>
              <td>${escapeHtml(r.currency)}</td>
              <td style="text-align:right">${arrow}${money}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    `;
  }

  function exportMonthCSV(){
    const { paid } = getPaidAndPlannedForMonth();
    const header = ["date","type","category","description","currency","amount"];
    const lines = [header.join(",")];

    for (const tx of paid) {
      const row = [
        tx.date,
        tx.type,
        (tx.category || "").replaceAll('"','""'),
        (tx.description || "").replaceAll('"','""'),
        tx.currency,
        Number(tx.amount)
      ];
      lines.push(row.map(v => `"${v}"`).join(","));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `finance_${state.monthAnchor.getFullYear()}-${String(state.monthAnchor.getMonth()+1).padStart(2,"0")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportMonthXLSX(){
    if (!window.XLSX) return alert("XLSX lib não carregou.");

    const { paid } = getPaidAndPlannedForMonth();
    const data = paid.map(tx => ({
      Date: tx.date,
      Type: tx.type,
      Category: tx.category,
      Description: tx.description || "",
      Currency: tx.currency,
      Amount: Number(tx.amount),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Month");
    XLSX.writeFile(wb, `finance_${state.monthAnchor.getFullYear()}-${String(state.monthAnchor.getMonth()+1).padStart(2,"0")}.xlsx`);
  }

  el.exportCsvBtn?.addEventListener("click", exportMonthCSV);
  el.exportXlsxBtn?.addEventListener("click", exportMonthXLSX);

  el.importCsvBtn?.addEventListener("click", () => el.importCsvFile?.click());
  el.importCsvFile?.addEventListener("change", async () => {
    const file = el.importCsvFile.files?.[0];
    if (!file) return;

    try{
      const text = await file.text();
      const rows = mapCsvToTransactions(text);
      if (!rows.length) return alert("Não consegui identificar linhas válidas nesse CSV.");

      await insertTransactionsBatched(rows, 400);
      await reloadMonthTransactions();
      renderAll();
      alert(`Importado: ${rows.length} linhas.`);
    } catch (e){
      alert(e.message || String(e));
    } finally {
      el.importCsvFile.value = "";
    }
  });

  // ======== statement (due/closing + exact dates) ========
  function pad2(n){ return String(n).padStart(2,"0"); }

  function dateFromYMDay(y, m1to12, day){
    const m = m1to12 - 1;
    const last = new Date(y, m + 1, 0).getDate();
    const dd = Math.min(day, last);
    return new Date(y, m, dd);
  }

  function addDaysISO(isoDate, add){
    const d = fromISO(isoDate);
    d.setDate(d.getDate() + add);
    return iso(d);
  }

  function addMonthsYM(y, m1to12, add){
    const d = new Date(y, (m1to12 - 1) + add, 1);
    return { y: d.getFullYear(), m: d.getMonth() + 1 };
  }

  function fmtISO(isoDate){
    return new Intl.DateTimeFormat(state.profile.locale).format(fromISO(isoDate));
  }

  function monthKeyFromInput(value){
    if (!value) return null;
    const [y,m] = value.split("-").map(Number);
    return { y, m };
  }

  function sameMonthISO(isoDate, y, m1to12){
    const d = fromISO(isoDate);
    return d.getFullYear() === y && (d.getMonth()+1) === m1to12;
  }

  function closingMonthFromDueDate(card, dueISO){
    const d = fromISO(dueISO);
    let y = d.getFullYear();
    let m = d.getMonth(); // due month (0..11)

    if (!(card.due_day > card.closing_day)) {
      m = m - 1;
      if (m < 0) { m = 11; y -= 1; }
    }
    return { y, m: m + 1 };
  }

  function statementDates(card, y, m, mode){
    let closingY = y, closingM = m;
    let dueY = y, dueM = m;

    if (mode === "closing") {
      const dueRef = (card.due_day > card.closing_day) ? { y, m } : addMonthsYM(y, m, +1);
      dueY = dueRef.y; dueM = dueRef.m;
    } else {
      const closingRef = (card.due_day > card.closing_day) ? { y, m } : addMonthsYM(y, m, -1);
      closingY = closingRef.y; closingM = closingRef.m;
      dueY = y; dueM = m;
    }

    const closingISO = iso(dateFromYMDay(closingY, closingM, card.closing_day));
    const dueISO = iso(dateFromYMDay(dueY, dueM, card.due_day));

    const prevClosingRef = addMonthsYM(closingY, closingM, -1);
    const prevClosingISO = iso(dateFromYMDay(prevClosingRef.y, prevClosingRef.m, card.closing_day));

    const periodStartISO = addDaysISO(prevClosingISO, 1);
    const periodEndISO = closingISO;

    return { closingISO, dueISO, periodStartISO, periodEndISO };
  }

  function getStatementItems(cardId, y, m, mode){
    const plans = state.plans || [];
    const inst = state.installments || [];
    const card = (state.cards || []).find(c => c.id === cardId);
    if (!card) return [];

    const planIds = new Set(plans.filter(p => p.method === "card" && p.card_id === cardId).map(p => p.id));

    const items = inst
      .filter(i => planIds.has(i.plan_id))
      .filter(i => {
        if (mode === "due") return sameMonthISO(i.due_date, y, m);
        const ck = closingMonthFromDueDate(card, i.due_date);
        return ck.y === y && ck.m === m;
      })
      .map(i => {
        const p = plans.find(x => x.id === i.plan_id);
        return {
          installment_id: i.id,
          title: p?.title || "Compra",
          category: p?.category || "Outros",
          due_date: i.due_date,
          amount: Number(i.amount),
          paid: !!i.paid
        };
      })
      .sort((a,b) => (a.due_date > b.due_date ? 1 : -1));

    return items;
  }

  function renderStatement(){
    if (!el.stmtCard || !el.stmtMonth || !el.stmtList) return;

    const cardId = el.stmtCard.value;
    const mk = monthKeyFromInput(el.stmtMonth.value);
    const mode = el.stmtMode?.value || "due";

    if (!cardId || !mk) {
      el.stmtList.innerHTML = "";
      el.stmtEmpty.classList.remove("hidden");
      el.stmtSummary.textContent = "Selecione cartão e mês.";
      return;
    }

    const card = (state.cards || []).find(c => c.id === cardId);
    if (!card) return;

    const dates = statementDates(card, mk.y, mk.m, mode);
    const items = getStatementItems(cardId, mk.y, mk.m, mode);

    el.stmtEmpty.classList.toggle("hidden", items.length !== 0);

    const today = todayISO();
    const total = items.reduce((s,x)=>s+x.amount,0);
    const paid = items.filter(x=>x.paid).reduce((s,x)=>s+x.amount,0);
    const open = total - paid;
    const overdueCount = items.filter(x => !x.paid && x.due_date < today).length;

    el.stmtSummary.innerHTML = `
      <div>Fechamento: <strong>${fmtISO(dates.closingISO)}</strong></div>
      <div>Vencimento: <strong>${fmtISO(dates.dueISO)}</strong></div>
      <div>Período: <strong>${fmtISO(dates.periodStartISO)}</strong> → <strong>${fmtISO(dates.periodEndISO)}</strong></div>
      <hr style="border:0;border-top:1px solid rgba(255,255,255,.12);margin:10px 0;">
      <div>Total: <strong>${fmtMoney.format(total)}</strong></div>
      <div>Em aberto: <strong>${fmtMoney.format(open)}</strong></div>
      <div>Pago: <strong>${fmtMoney.format(paid)}</strong></div>
      <div>Atrasadas: <strong>${overdueCount}</strong></div>
    `;

    el.stmtList.innerHTML = items.map(x => {
      const overdue = (!x.paid && x.due_date < today) ? `<span class="badgeOverdue">ATRASADO</span>` : "";
      const status = x.paid ? `<span class="badgePlanned">PAGO</span>` : `<span class="badgePlanned">ABERTO</span>`;
      return `
        <div class="txItem">
          <div>
            <div class="txTitle">${escapeHtml(x.title)} ${status} ${overdue}</div>
            <div class="txMeta">${escapeHtml(x.category)} • vence ${escapeHtml(x.due_date)}</div>
          </div>
          <div class="txAmount expense"><span class="arrow down">▼</span>${fmtMoney.format(x.amount)}</div>
        </div>
      `;
    }).join("");

    // pie by category
    const byCat = new Map();
    for (const it of items) byCat.set(it.category, (byCat.get(it.category)||0) + it.amount);

    const labels = [...byCat.keys()];
    const values = [...byCat.values()];

    if (el.stmtPie && window.Chart) {
      chStmtPie?.destroy();
      chStmtPie = new Chart(el.stmtPie.getContext("2d"), {
        type: "pie",
        data: { labels, datasets: [{ data: values, borderWidth: 0 }] },
        options: {
          plugins: {
            tooltip: { callbacks: { label: (c) => `${c.label}: ${fmtMoney.format(c.raw)}` } }
          }
        }
      });
    }
  }

  el.stmtCard?.addEventListener("change", renderStatement);
  el.stmtMonth?.addEventListener("change", renderStatement);
  el.stmtMode?.addEventListener("change", renderStatement);

  // ======== notes + goals (simples) ========
  async function loadNotesGoals(){
    if (isGuest()) {
      state.notes = state.guest.notes || [];
      state.goals = state.guest.goals || [];
      state.goalContrib = state.guest.goalContrib || [];
      return;
    }

    const [n, g, c] = await Promise.all([
      sb.from("notes").select("*").eq("user_id", state.user.id).order("done", {ascending:true}).order("due_date", {ascending:true}),
      sb.from("goals").select("*").eq("user_id", state.user.id).order("created_at", {ascending:false}),
      sb.from("goal_contributions").select("*").eq("user_id", state.user.id).order("date", {ascending:false}),
    ]);
    if (n.error) throw n.error;
    if (g.error) throw g.error;
    if (c.error) throw c.error;

    state.notes = n.data || [];
    state.goals = g.data || [];
    state.goalContrib = c.data || [];
  }

  function renderNotes(){
    if (!el.notesList) return;

    el.notesList.innerHTML = (state.notes || []).map(n => {
      const due = n.due_date ? ` • ${n.due_date}` : "";
      const pr = n.priority === 1 ? "Alta" : (n.priority === 2 ? "Média" : "Baixa");
      const done = n.done ? `<span class="badgePlanned">FEITO</span>` : "";
      return `
        <div class="txItem">
          <div>
            <div class="txTitle">${escapeHtml(n.title)} ${done}</div>
            <div class="txMeta">Prioridade: ${pr}${due}</div>
            <div class="txMeta">${escapeHtml(n.details || "")}</div>
            <button class="linkBtn" data-note-toggle="${n.id}" type="button">Alternar feito</button>
            <button class="linkBtn" data-note-del="${n.id}" type="button">Remover</button>
          </div>
          <div class="txAmount income"></div>
        </div>
      `;
    }).join("");

    el.notesEmpty?.classList.toggle("hidden", (state.notes || []).length !== 0);

    document.querySelectorAll("[data-note-toggle]").forEach(b => b.onclick = () => toggleNote(b.getAttribute("data-note-toggle")));
    document.querySelectorAll("[data-note-del]").forEach(b => b.onclick = () => deleteNote(b.getAttribute("data-note-del")));
  }

  async function toggleNote(id){
    const note = (state.notes || []).find(n => n.id === id);
    if (!note) return;

    if (isGuest()) {
      const target = state.guest.notes.find(n => n.id === id);
      target.done = !target.done;
      saveGuest();
      await loadNotesGoals();
      renderNotes();
      return;
    }

    const { error } = await sb.from("notes").update({ done: !note.done }).eq("id", id);
    if (error) return alert(error.message);

    await loadNotesGoals();
    renderNotes();
  }

  async function deleteNote(id){
    if (!confirm("Remover nota?")) return;

    if (isGuest()) {
      state.guest.notes = state.guest.notes.filter(n => n.id !== id);
      saveGuest();
      await loadNotesGoals();
      renderNotes();
      return;
    }

    const { error } = await sb.from("notes").delete().eq("id", id);
    if (error) return alert(error.message);

    await loadNotesGoals();
    renderNotes();
  }

  el.noteForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      title: el.noteTitle.value.trim(),
      details: el.noteDetails.value.trim() || null,
      due_date: el.noteDue.value || null,
      priority: Number(el.notePriority.value),
      done: false
    };
    if (!payload.title) return;

    if (isGuest()) {
      state.guest.notes.unshift({ id: crypto.randomUUID(), ...payload, created_at: new Date().toISOString() });
      saveGuest();
      await loadNotesGoals();
      renderNotes();
      el.noteTitle.value = ""; el.noteDetails.value = ""; el.noteDue.value = ""; el.notePriority.value = "2";
      return;
    }

    const { error } = await sb.from("notes").insert({ user_id: state.user.id, ...payload });
    if (error) return alert(error.message);

    await loadNotesGoals();
    renderNotes();
    el.noteTitle.value = ""; el.noteDetails.value = ""; el.noteDue.value = ""; el.notePriority.value = "2";
  });

  function renderGoals(){
    if (!el.goalsList) return;

    // soma aportes por meta
    const sumByGoal = new Map();
    for (const c of (state.goalContrib || [])) {
      sumByGoal.set(c.goal_id, (sumByGoal.get(c.goal_id) || 0) + Number(c.amount));
    }

    el.goalsList.innerHTML = (state.goals || []).map(g => {
      const contrib = sumByGoal.get(g.id) || 0;
      const manual = Number(g.manual_amount || 0);
      const current =
        g.mode === "manual" ? manual :
        g.mode === "contributions" ? contrib :
        (contrib + manual);

      const pct = Math.min(100, Math.round((current / Number(g.target_amount)) * 100));
      const status = current >= Number(g.target_amount) ? `<span class="badgePlanned">OK</span>` : "";

      return `
        <div class="txItem">
          <div>
            <div class="txTitle">${escapeHtml(g.title)} ${status}</div>
            <div class="txMeta">${fmtMoney.format(current)} / ${fmtMoney.format(Number(g.target_amount))} (${pct}%) • modo: ${escapeHtml(g.mode)}</div>
            <button class="linkBtn" data-goal-add="${g.id}" type="button">Adicionar aporte</button>
            <button class="linkBtn" data-goal-manual="${g.id}" type="button">Ajustar manual</button>
            <button class="linkBtn" data-goal-del="${g.id}" type="button">Remover</button>
          </div>
          <div class="txAmount income"></div>
        </div>
      `;
    }).join("");

    el.goalsEmpty?.classList.toggle("hidden", (state.goals || []).length !== 0);

    document.querySelectorAll("[data-goal-add]").forEach(b => b.onclick = () => addGoalContribution(b.getAttribute("data-goal-add")));
    document.querySelectorAll("[data-goal-manual]").forEach(b => b.onclick = () => adjustGoalManual(b.getAttribute("data-goal-manual")));
    document.querySelectorAll("[data-goal-del]").forEach(b => b.onclick = () => deleteGoal(b.getAttribute("data-goal-del")));
  }

  el.goalForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = el.goalTitle.value.trim();
    const target = parseMoney(el.goalTarget.value);
    const mode = el.goalMode.value;
    const deadline = el.goalDeadline.value || null;

    if (!title) return alert("Nome obrigatório.");
    if (!target || target <= 0) return alert("Alvo inválido.");

    const payload = {
      title,
      target_amount: target,
      currency: state.profile.currency,
      deadline,
      mode,
      manual_amount: 0
    };

    if (isGuest()) {
      state.guest.goals.unshift({ id: crypto.randomUUID(), ...payload, created_at: new Date().toISOString() });
      saveGuest();
      await loadNotesGoals();
      renderGoals();
      el.goalTitle.value = ""; el.goalTarget.value = ""; el.goalDeadline.value = "";
      return;
    }

    const { error } = await sb.from("goals").insert({ user_id: state.user.id, ...payload });
    if (error) return alert(error.message);

    await loadNotesGoals();
    renderGoals();
    el.goalTitle.value = ""; el.goalTarget.value = ""; el.goalDeadline.value = "";
  });

  async function addGoalContribution(goalId){
    const v = prompt("Valor do aporte (ex: 50,00):", "50,00");
    if (v === null) return;
    const amount = parseMoney(v);
    if (!amount || amount <= 0) return alert("Valor inválido.");

    const date = prompt("Data (YYYY-MM-DD):", todayISO());
    if (date === null || !date) return;

    const note = prompt("Nota (opcional):", "") ?? "";

    if (isGuest()) {
      state.guest.goalContrib.unshift({ id: crypto.randomUUID(), goal_id: goalId, amount, date, note, created_at: new Date().toISOString() });
      saveGuest();
      await loadNotesGoals();
      renderGoals();
      return;
    }

    const { error } = await sb.from("goal_contributions").insert({ user_id: state.user.id, goal_id: goalId, amount, date, note: note || null });
    if (error) return alert(error.message);

    await loadNotesGoals();
    renderGoals();
  }

  async function adjustGoalManual(goalId){
    const g = (state.goals || []).find(x => x.id === goalId);
    if (!g) return;

    const v = prompt("Valor manual acumulado (ex: 200,00):", String(g.manual_amount || 0).replace(".", ","));
    if (v === null) return;
    const amount = parseMoney(v);
    if (amount < 0) return alert("Valor inválido.");

    if (isGuest()) {
      const target = state.guest.goals.find(x => x.id === goalId);
      target.manual_amount = amount;
      saveGuest();
      await loadNotesGoals();
      renderGoals();
      return;
    }

    const { error } = await sb.from("goals").update({ manual_amount: amount }).eq("id", goalId);
    if (error) return alert(error.message);

    await loadNotesGoals();
    renderGoals();
  }

  async function deleteGoal(goalId){
    if (!confirm("Remover meta?")) return;

    if (isGuest()) {
      state.guest.goals = state.guest.goals.filter(g => g.id !== goalId);
      state.guest.goalContrib = state.guest.goalContrib.filter(c => c.goal_id !== goalId);
      saveGuest();
      await loadNotesGoals();
      renderGoals();
      return;
    }

    const { error } = await sb.from("goals").delete().eq("id", goalId);
    if (error) return alert(error.message);

    await loadNotesGoals();
    renderGoals();
  }

  // ======== render all ========
  function renderAll(){
    renderMonthHeader();
    renderCategorySelects();
    renderCategoriesManager();

    renderSummary();
    renderTransactions();
    renderSheetTable();
    renderCharts();
    renderDashboard();

    renderInstallmentsPanel();
    renderStatement();

    renderNotes();
    renderGoals();
  }

  // ======== auth flow ========
  function withTimeout(promise, ms, label){
    let tmr;
    const timeout = new Promise((_, rej) => {
      tmr = setTimeout(() => rej(new Error(`${label} demorou demais (timeout). Verifique rede/URL/KEY.`)), ms);
    });
    return Promise.race([promise.finally(() => clearTimeout(tmr)), timeout]);
  }

  el.authForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    el.authMsg.textContent = "Entrando...";

    try {
      const email = el.email.value.trim();
      const password = el.password.value;

      const res = await withTimeout(sb.auth.signInWithPassword({ email, password }), 12000, "Login");
      if (res.error) throw res.error;

      // login imediato
      await onLogin(res.data.user);
      el.authMsg.textContent = "";
    } catch (err) {
      console.error(err);
      el.authMsg.textContent = err.message || String(err);
    }
  });

  el.signupBtn?.addEventListener("click", async () => {
    el.authMsg.textContent = "Criando conta...";
    try {
      const email = el.email.value.trim();
      const password = el.password.value;

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        el.authMsg.textContent = "Email inválido.";
        return;
      }
      if ((password || "").length < 6) {
        el.authMsg.textContent = "Senha deve ter pelo menos 6 caracteres.";
        return;
      }

      const res = await withTimeout(
        sb.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } }),
        12000,
        "Criar conta"
      );

      if (res.error) throw res.error;
      el.authMsg.textContent = "Conta criada. Confirme o email e depois entre.";
    } catch (err) {
      console.error(err);
      el.authMsg.textContent = err.message || String(err);
    }
  });

  el.guestBtn?.addEventListener("click", async () => {
    state.user = { id: "guest" };
    showApp();

    // guest data
    state.recurring = state.guest.recurring;
    state.recurringExceptions = state.guest.recurringExceptions;
    state.categories = state.guest.categories;
    state.cards = state.guest.cards;
    state.plans = state.guest.plans;
    state.installments = state.guest.installments;

    await ensureCategoriesSeeded();
    renderCategorySelects();

    await reloadMonthTransactions();
    await loadNotesGoals();
    refreshAutoFirstDue();

    savePrefs();
    renderAll();
    initRoute();
  });

  el.logoutBtn?.addEventListener("click", async () => {
    if (isGuest()) {
      state.user = null;
      showAuth();
      return;
    }
    await sb.auth.signOut();
  });

  sb.auth.onAuthStateChange(async (_evt, session2) => {
    if (!session2) {
      state.user = null;
      showAuth();
      return;
    }
    await onLogin(session2.user);
  });

  async function onLogin(user){
    state.user = user;
    showApp();

    try{
      await ensureProfile(user);
      await loadProfile(user);
      savePrefs();

      refreshFormatters();

      if (el.localeSelect) el.localeSelect.value = state.profile.locale;
      if (el.currencySelect) el.currencySelect.value = state.profile.currency;
      if (el.startPageMode) el.startPageMode.value = state.profile.startPageMode;

      await ensureCategoriesSeeded();
      renderCategorySelects();

      await loadRecurringRules();
      await loadRecurringExceptions();

      await loadCardsPlansInstallments();
      await reloadMonthTransactions();

      await loadNotesGoals();

      refreshAutoFirstDue();

      renderAll();
      initRoute();
    } catch (e){
      console.error(e);
      alert(e.message || String(e));
      showAuth();
    }
  }

  // ======== prefs listeners ========
  el.localeSelect?.addEventListener("change", async () => {
    state.profile.locale = el.localeSelect.value;
    savePrefs();
    refreshFormatters();
    renderAll();
    if (state.user && !isGuest()) { try { await saveProfile(); } catch {} }
  });

  el.currencySelect?.addEventListener("change", async () => {
    state.profile.currency = el.currencySelect.value;
    savePrefs();
    refreshFormatters();
    renderAll();
    if (state.user && !isGuest()) { try { await saveProfile(); } catch {} }
  });

  el.startPageMode?.addEventListener("change", async () => {
    state.profile.startPageMode = el.startPageMode.value;
    savePrefs();
    if (state.user && !isGuest()) { try { await saveProfile(); } catch {} }
    initRoute();
  });

  // ======== month navigation ========
  el.prevMonth?.addEventListener("click", async () => {
    state.monthAnchor = addMonths(state.monthAnchor, -1);
    await reloadMonthTransactions();
    renderAll();
  });
  el.nextMonth?.addEventListener("click", async () => {
    state.monthAnchor = addMonths(state.monthAnchor, +1);
    await reloadMonthTransactions();
    renderAll();
  });
  el.todayBtn?.addEventListener("click", async () => {
    state.monthAnchor = new Date();
    if (el.date) el.date.value = todayISO();
    await reloadMonthTransactions();
    renderAll();
  });

  // ======== init ========
  (async function init(){
    loadPrefs();
    loadGuest();
    refreshFormatters();

    if (el.localeSelect) el.localeSelect.value = state.profile.locale;
    if (el.currencySelect) el.currencySelect.value = state.profile.currency;
    if (el.startPageMode) el.startPageMode.value = state.profile.startPageMode;

    setDefaultDates();

    const { data: { session } } = await sb.auth.getSession();
    if (session) await onLogin(session.user);
    else showAuth();
  })();

})();