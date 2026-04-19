const SUPABASE_URL = "https://vhmhbsaohdksdmlrdpcw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobWhic2FvaGRrc2RtbHJkcGN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NTIyNDAsImV4cCI6MjA5MTEyODI0MH0.uOXvyIctrISmX0I_WM0nqfuvuH2EqTlP1lvhzXtfh4o";
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const state = {
    categories: {},
    globalTags: [],
    currentCategoryForReroll: null,
    currentOpenCategory: null,
    currentMealTags: [],
    editingMealIndex: -1,
    logoClicks: 0,
    currentSession: null,
    currentUser: null,
    dataLoaded: false,
    recentChoices: []
};
const HISTORY_KEY = "dinner-picker:history";
const HISTORY_MAX = 10;
const DEFAULT_CATEGORY_SEED_KEY_PREFIX = "dinner-picker:default-seeded:";

function getDefaultSeedKey(userId) {
    return `${DEFAULT_CATEGORY_SEED_KEY_PREFIX}${userId || "anonymous"}`;
}
function hasSeededDefaultCategory(userId) {
    try { return localStorage.getItem(getDefaultSeedKey(userId)) === "1"; } catch (_) { return false; }
}
function markDefaultCategorySeeded(userId) {
    try { localStorage.setItem(getDefaultSeedKey(userId), "1"); } catch (_) {}
}
function buildStarterCategory() {
    const lang = getLang();
    return {
        name: lang === "en" ? "Easy classics" : "Hverdagsfavoritter",
        meals: [
            lang === "en" ? "Pasta pesto" : "Pasta pesto",
            lang === "en" ? "Tacos" : "Tacos",
            lang === "en" ? "Lasagna" : "Lasagne",
            lang === "en" ? "Tomato soup" : "Tomatsuppe",
            lang === "en" ? "Omelette" : "Omelet",
            lang === "en" ? "Chicken wraps" : "Kyllingewraps",
            lang === "en" ? "Fried rice" : "Stegte ris"
        ].map(name => ({ name, tags: [] })),
        history: []
    };
}
async function ensureStarterCategoryIfNeeded() {
    if (!state.currentUser) return false;
    if (Object.keys(state.categories).length > 0) {
        markDefaultCategorySeeded(state.currentUser.id);
        return false;
    }
    if (hasSeededDefaultCategory(state.currentUser.id)) return false;
    const starter = buildStarterCategory();
    state.categories[starter.name] = { meals: starter.meals, history: starter.history };
    await saveCategory(starter.name);
    markDefaultCategorySeeded(state.currentUser.id);
    return true;
}
try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) state.recentChoices = parsed.slice(0, HISTORY_MAX);
    }
} catch (_) {}

// ==================== I18N ====================
const I18N = {
    da: {
        // Static labels
        title: "Aftensmadsvælger 🍽️",
        heading: "Aftensmadsvælger",
        subheading: "Hvad skal vi spise i aften?",
        logoTitle: "Dobbeltklik for global random",
        globalRandomTitle: "Vælg en tilfældig ret fra alle kategorier",
        globalRandom: "Bare vælg",
        themeTitle: "Skift mellem lyst og mørkt tema",
        themeAria: "Skift tema",
        langTitle: "Skift sprog",
        langAria: "Skift sprog",
        historyTitle: "Historik",
        historyAria: "Vis historik",
        historyDesc: "De sidste 10 valgte retter.",
        historyEmpty: "Ingen valgte retter endnu. Vælg en ret for at fylde historikken 🍽️",
        clearHistory: "Ryd historik",
        historyCleared: "Historik ryddet 🧹",
        justNow: "lige nu",
        minutesAgo: (n) => `${n} min siden`,
        hoursAgo: (n) => `${n} t siden`,
        daysAgo: (n) => `${n} d siden`,
        signOut: "Log ud",
        addCategory: "Tilføj kategori",
        addTags: "Tilføj tags",
        randomByTags: "Random efter tags",
        emptyHeading: "Ingen kategorier endnu",
        emptyText: "Tryk på \u201CTilføj kategori\u201D for at komme i gang.",
        newCategory: "Ny kategori",
        categoryPlaceholder: "f.eks. Italiensk",
        cancel: "Annuller",
        createCategory: "Opret kategori",
        editing: "Redigerer",
        cancelEdit: "Annuller redigering",
        mealPlaceholder: "Navn på måltid",
        addEditTags: "🏷️ Tilføj / rediger tags",
        addSaveMeal: "+ Tilføj / gem måltid",
        deleteCategory: "🗑️ Slet kategori",
        close: "Luk",
        manageTags: "Administrer tags",
        newTagPlaceholder: "Nyt tag...",
        create: "Opret",
        chooseMealTags: "Vælg tags til måltidet",
        saveTags: "Gem tags",
        chooseRandomTags: "Vælg tags til random",
        chooseRandomDesc: "Marker de tags du vil filtrere efter.",
        findMeal: "Find måltid",
        searching: "Leder efter noget lækkert…",
        chooseAgain: "Vælg igen",
        signIn: "Log ind",
        signInDesc: "Brug email og kodeord for at komme ind.",
        email: "Email",
        password: "Kodeord",
        signUp: "Opret bruger",
        authNote: "Hvis du opretter en ny bruger, kan du blive bedt om at bekræfte emailen, afhængigt af dine Supabase-indstillinger.",
        // Dynamic
        editMeals: "Rediger måltider",
        randomMeal: "🎲 Vælg tilfældig aftensmad",
        mealCount: (n) => `${n} måltider`,
        mealNoName: "Måltid uden navn",
        editingMeal: (name) => `Redigerer: ${name}`,
        saveChanges: "Gem ændringer",
        noMealsYet: "Ingen måltider tilføjet endnu...",
        noTagsYet: "Ingen tags endnu \u2013 opret nogle nedenfor.",
        createTagsFirst: "Opret først tags via \u201CTilføj tags\u201D i toppen.",
        noTagsSimple: "Ingen tags endnu.",
        noTagsLabel: "Ingen tags",
        deleteTagTitle: (t) => `Slet tag \u201C${t}\u201D`,
        // Toasts
        loginFirst: "Log ind først 🔐",
        enterEmailPassword: "Skriv email og kodeord først 😅",
        loginFailed: "Login fejlede 😬",
        signupFailed: "Oprettelse fejlede 😬",
        loggedIn: "Logget ind ✨",
        signedUpAndIn: "Bruger oprettet og logget ind ✨",
        signedUpCheckEmail: "Bruger oprettet. Tjek emailen for bekræftelse ✉️",
        couldNotSignOut: "Kunne ikke logge ud 😵",
        loggedOut: "Logget ud 👋",
        welcomeBack: "Velkommen tilbage ✨",
        enterName: "Indtast et navn 😅",
        alreadyExists: (name) => `\u201C${name}\u201D findes allerede 👀`,
        categoryCreated: (name) => `Kategori oprettet: ${name} ✨`,
        confirmDeleteCategory: (name) => `Slet hele kategorien \u201C${name}\u201D?`,
        confirmDeleteCategoryFull: (name) => `Slet kategorien \u201C${name}\u201D og alle måltider?`,
        couldNotDeleteCategory: "Kunne ikke slette kategorien 😵",
        categoryDeleted: (name) => `Kategori slettet: ${name}`,
        saveError: "Noget gik galt ved gemning 😵",
        enterMealName: "Skriv et navn på måltidet først 😅",
        mealAlreadyExists: (name) => `\u201C${name}\u201D findes allerede i kategorien 👀`,
        mealUpdated: "Måltid opdateret ✨",
        mealAdded: (name) => `Måltid tilføjet: ${name} 🍽️`,
        confirmDeleteMeal: "Slet dette måltid?",
        mealDeleted: "Måltid slettet",
        editingMealToast: "Redigerer måltid ✏️",
        editCancelled: "Redigering annulleret",
        tagAlreadyExists: (t) => `Tag findes allerede: ${t} 👀`,
        couldNotCreateTag: "Kunne ikke oprette tag 😵",
        tagCreated: (t) => `Tag oprettet: ${t} 🏷️`,
        confirmDeleteTag: (t) => `Slet tagget \u201C${t}\u201D? Det fjernes også fra alle måltider.`,
        couldNotDeleteTag: "Kunne ikke slette tag 😵",
        tagDeleted: (t) => `Tag slettet: ${t}`,
        chooseAtLeastOneTag: "Vælg mindst ét tag!",
        noMealsMatchTags: "Ingen måltider matcher de valgte tags.",
        addMealToCategoryFirst: (name) => `Tilføj mindst ét måltid til \u201C${name}\u201D først!`,
        noMealsAtAll: "Ingen måltider endnu!",
        eggSoupValue: "🥣 Hemmelig suppe af dagen",
        eggSoupMessage: "🍲 Du har fundet den hemmelige suppe-easter-egg!",
        eggFridayValue: "🍕 Fredagsfavorit",
        eggFridayMessage: "🎉 Fredag opdaget. Meget god stemning her.",
        eggPizzaValue: "🍕 Pizza, men med charme",
        eggPizzaMessage: "😄 Den stavning fik lige en kærlig opgradering."
    },
    en: {
        title: "Dinner Picker 🍽️",
        heading: "Dinner Picker",
        subheading: "What should we eat tonight?",
        logoTitle: "Double-click for global random",
        globalRandomTitle: "Pick a random meal from all categories",
        globalRandom: "Just pick",
        themeTitle: "Switch between light and dark theme",
        themeAria: "Toggle theme",
        langTitle: "Change language",
        langAria: "Change language",
        historyTitle: "History",
        historyAria: "Show history",
        historyDesc: "The last 10 chosen meals.",
        historyEmpty: "No meals chosen yet. Pick one to start filling the history 🍽️",
        clearHistory: "Clear history",
        historyCleared: "History cleared 🧹",
        justNow: "just now",
        minutesAgo: (n) => `${n} min ago`,
        hoursAgo: (n) => `${n} h ago`,
        daysAgo: (n) => `${n} d ago`,
        signOut: "Sign out",
        addCategory: "Add category",
        addTags: "Add tags",
        randomByTags: "Random by tags",
        emptyHeading: "No categories yet",
        emptyText: "Click \u201CAdd category\u201D to get started.",
        newCategory: "New category",
        categoryPlaceholder: "e.g. Italian",
        cancel: "Cancel",
        createCategory: "Create category",
        editing: "Editing",
        cancelEdit: "Cancel editing",
        mealPlaceholder: "Meal name",
        addEditTags: "🏷️ Add / edit tags",
        addSaveMeal: "+ Add / save meal",
        deleteCategory: "🗑️ Delete category",
        close: "Close",
        manageTags: "Manage tags",
        newTagPlaceholder: "New tag...",
        create: "Create",
        chooseMealTags: "Choose tags for the meal",
        saveTags: "Save tags",
        chooseRandomTags: "Choose tags for random",
        chooseRandomDesc: "Select the tags you want to filter by.",
        findMeal: "Find meal",
        searching: "Looking for something tasty…",
        chooseAgain: "Pick again",
        signIn: "Sign in",
        signInDesc: "Use email and password to log in.",
        email: "Email",
        password: "Password",
        signUp: "Sign up",
        authNote: "If you create a new user, you may be asked to confirm your email depending on your Supabase settings.",
        editMeals: "Edit meals",
        randomMeal: "🎲 Pick a random meal",
        mealCount: (n) => `${n} ${n === 1 ? "meal" : "meals"}`,
        mealNoName: "Untitled meal",
        editingMeal: (name) => `Editing: ${name}`,
        saveChanges: "Save changes",
        noMealsYet: "No meals added yet...",
        noTagsYet: "No tags yet \u2013 create some below.",
        createTagsFirst: "First create tags via \u201CAdd tags\u201D at the top.",
        noTagsSimple: "No tags yet.",
        noTagsLabel: "No tags",
        deleteTagTitle: (t) => `Delete tag \u201C${t}\u201D`,
        loginFirst: "Sign in first 🔐",
        enterEmailPassword: "Enter email and password first 😅",
        loginFailed: "Login failed 😬",
        signupFailed: "Sign-up failed 😬",
        loggedIn: "Signed in ✨",
        signedUpAndIn: "Account created and signed in ✨",
        signedUpCheckEmail: "Account created. Check your email to confirm ✉️",
        couldNotSignOut: "Could not sign out 😵",
        loggedOut: "Signed out 👋",
        welcomeBack: "Welcome back ✨",
        enterName: "Enter a name 😅",
        alreadyExists: (name) => `\u201C${name}\u201D already exists 👀`,
        categoryCreated: (name) => `Category created: ${name} ✨`,
        confirmDeleteCategory: (name) => `Delete the entire category \u201C${name}\u201D?`,
        confirmDeleteCategoryFull: (name) => `Delete category \u201C${name}\u201D and all its meals?`,
        couldNotDeleteCategory: "Could not delete the category 😵",
        categoryDeleted: (name) => `Category deleted: ${name}`,
        saveError: "Something went wrong while saving 😵",
        enterMealName: "Type a meal name first 😅",
        mealAlreadyExists: (name) => `\u201C${name}\u201D already exists in this category 👀`,
        mealUpdated: "Meal updated ✨",
        mealAdded: (name) => `Meal added: ${name} 🍽️`,
        confirmDeleteMeal: "Delete this meal?",
        mealDeleted: "Meal deleted",
        editingMealToast: "Editing meal ✏️",
        editCancelled: "Edit cancelled",
        tagAlreadyExists: (t) => `Tag already exists: ${t} 👀`,
        couldNotCreateTag: "Could not create tag 😵",
        tagCreated: (t) => `Tag created: ${t} 🏷️`,
        confirmDeleteTag: (t) => `Delete the tag \u201C${t}\u201D? It will also be removed from all meals.`,
        couldNotDeleteTag: "Could not delete tag 😵",
        tagDeleted: (t) => `Tag deleted: ${t}`,
        chooseAtLeastOneTag: "Pick at least one tag!",
        noMealsMatchTags: "No meals match the selected tags.",
        addMealToCategoryFirst: (name) => `Add at least one meal to \u201C${name}\u201D first!`,
        noMealsAtAll: "No meals yet!",
        eggSoupValue: "🥣 Secret soup of the day",
        eggSoupMessage: "🍲 You found the secret soup easter egg!",
        eggFridayValue: "🍕 Friday favourite",
        eggFridayMessage: "🎉 Friday detected. Great vibes in here.",
        eggPizzaValue: "🍕 Pizza, but with charm",
        eggPizzaMessage: "😄 That spelling just got a loving upgrade."
    }
};

function getLang() {
    var l = document.documentElement.getAttribute("data-lang");
    return l === "en" ? "en" : "da";
}
function t(key, ...args) {
    var dict = I18N[getLang()] || I18N.da;
    var v = dict[key];
    if (v == null) v = I18N.da[key];
    if (typeof v === "function") return v(...args);
    return v != null ? v : key;
}
function applyI18n() {
    var lang = getLang();
    var dict = I18N[lang] || I18N.da;
    document.querySelectorAll("[data-i18n]").forEach(function(elNode) {
        var key = elNode.getAttribute("data-i18n");
        var val = dict[key];
        if (typeof val === "string") {
            if (elNode.tagName === "TITLE") document.title = val;
            else elNode.textContent = val;
        }
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function(elNode) {
        var key = elNode.getAttribute("data-i18n-placeholder");
        var val = dict[key];
        if (typeof val === "string") elNode.setAttribute("placeholder", val);
    });
    document.querySelectorAll("[data-i18n-title]").forEach(function(elNode) {
        var key = elNode.getAttribute("data-i18n-title");
        var val = dict[key];
        if (typeof val === "string") elNode.setAttribute("title", val);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function(elNode) {
        var key = elNode.getAttribute("data-i18n-aria");
        var val = dict[key];
        if (typeof val === "string") elNode.setAttribute("aria-label", val);
    });
    var langIcon = document.getElementById("lang-toggle-icon");
    if (langIcon) langIcon.textContent = lang === "da" ? "🇬🇧" : "🇩🇰";
    var themeIcon = document.getElementById("theme-toggle-icon");
    if (themeIcon) {
        var theme = document.documentElement.getAttribute("data-theme");
        themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
    }
    // Re-render dynamic UI in current language
    if (state.dataLoaded || Object.keys(state.categories).length) renderCategories();
    if (state.currentOpenCategory) {
        renderMealList();
        syncEditUI();
    }
    renderGlobalTagsList();
    renderMealTagsList();
    renderTagRandomList();
}
function toggleLang() {
    var cur = getLang();
    var next = cur === "en" ? "da" : "en";
    document.documentElement.setAttribute("data-lang", next);
    document.documentElement.setAttribute("lang", next);
    try { localStorage.setItem("lang", next); } catch (e) {}
    applyI18n();
}
function toggleTheme() {
    var cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    var next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
    var icon = document.getElementById("theme-toggle-icon");
    if (icon) icon.textContent = next === "dark" ? "☀️" : "🌙";
}

console.log("✅ Dinner Picker fully loaded 🍽️");

// ==================== TOASTS ====================
let toastContainerCreated = false;
function ensureToastContainer() {
    if (toastContainerCreated) return;
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        document.body.appendChild(container);
    }
    toastContainerCreated = true;
}
function showToast(message, type = "info") {
    ensureToastContainer();
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type === "error" ? "toast-error" : "toast-info"}`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => { toast.classList.add("show"); });
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 250);
    }, 2200);
}

// ==================== HELPERS ====================
function el(id) { return document.getElementById(id); }
function safeText(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
function normalizeTags(tags) {
    if (!Array.isArray(tags)) return [];
    return [...new Set(tags.map(tag => safeText(String(tag))).filter(Boolean))];
}
function normalizeMeal(meal) {
    if (typeof meal === "string") {
        return { name: meal.trim() || t("mealNoName"), tags: [] };
    }
    if (!meal || typeof meal !== "object") {
        return { name: t("mealNoName"), tags: [] };
    }
    return { name: safeText(meal.name, t("mealNoName")), tags: normalizeTags(meal.tags) };
}
function escapeForCssId(value) {
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "_");
}
function lockBodyScroll() {
    const anyModalOpen =
        !el("add-modal").classList.contains("hidden") ||
        !el("detail-modal").classList.contains("hidden") ||
        !el("global-tags-modal").classList.contains("hidden") ||
        !el("meal-tags-popup").classList.contains("hidden") ||
        !el("tag-random-modal").classList.contains("hidden") ||
        !el("chosen-display").classList.contains("hidden") ||
        !el("auth-modal").classList.contains("hidden");
    document.body.classList.toggle("overflow-hidden", anyModalOpen);
}
function openModal(id) { el(id).classList.remove("hidden"); lockBodyScroll(); }
function closeModal(id) { el(id).classList.add("hidden"); lockBodyScroll(); }

function showAuthModal() {
    const modal = el("auth-modal");
    if (!modal) return;
    modal.classList.remove("hidden");
    lockBodyScroll();
    setTimeout(() => el("auth-email-input")?.focus(), 50);
}
function hideAuthModal() {
    const modal = el("auth-modal");
    if (!modal) return;
    modal.classList.add("hidden");
    lockBodyScroll();
}
function closeAllAppModals() {
    ["add-modal","detail-modal","global-tags-modal","meal-tags-popup","tag-random-modal","chosen-display"].forEach(id => {
        const node = el(id);
        if (node) node.classList.add("hidden");
    });
    lockBodyScroll();
}
function requireAuth() {
    if (state.currentUser) return true;
    showAuthModal();
    showToast(t("loginFirst"), "error");
    return false;
}
function makeTagChip(text, extraClass = "") {
    const span = document.createElement("span");
    span.className = `tag ${extraClass}`.trim();
    span.textContent = text;
    return span;
}
function makeActionButton(text, className) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    return button;
}
function syncEditUI() {
    const banner = el("edit-state-banner");
    const submitBtn = el("meal-submit-button");
    if (!banner || !submitBtn) return;
    if (state.editingMealIndex >= 0) {
        const currentMeal = state.categories[state.currentOpenCategory]?.meals?.[state.editingMealIndex];
        const normalized = normalizeMeal(currentMeal);
        banner.classList.remove("hidden");
        el("edit-state-text").textContent = t("editingMeal", normalized.name);
        submitBtn.textContent = t("saveChanges");
    } else {
        banner.classList.add("hidden");
        el("edit-state-text").textContent = "";
        submitBtn.textContent = t("addSaveMeal");
    }
}
function resetMealEditor(keepTags = false) {
    const input = el("new-meal-input");
    if (input) input.value = "";
    state.editingMealIndex = -1;
    if (!keepTags) state.currentMealTags = [];
    syncEditUI();
}
function resetAppStateForLogout() {
    state.categories = {};
    state.globalTags = [];
    state.currentCategoryForReroll = null;
    state.currentOpenCategory = null;
    state.currentMealTags = [];
    state.editingMealIndex = -1;
    state.logoClicks = 0;
    state.dataLoaded = false;
    renderCategories();
    renderGlobalTagsList();
    syncEditUI();
    closeAllAppModals();
}
function categoryExists(name) {
    const normalized = safeText(name).toLowerCase();
    return Object.keys(state.categories).some(catName => catName.toLowerCase() === normalized);
}
function tagExists(name) {
    const normalized = safeText(name).toLowerCase();
    return state.globalTags.some(tag => tag.toLowerCase() === normalized);
}
function mealNameExistsInCurrentCategory(name, ignoreIndex = -1) {
    const meals = state.categories[state.currentOpenCategory]?.meals || [];
    const normalized = safeText(name).toLowerCase();
    return meals.some((meal, index) => {
        if (index === ignoreIndex) return false;
        return normalizeMeal(meal).name.toLowerCase() === normalized;
    });
}
function attachAutofillGuards() {
    const guardedInputs = [
        el("auth-email-input"), el("auth-password-input"),
        el("category-name-input"), el("new-meal-input"), el("new-global-tag-input")
    ];
    guardedInputs.forEach(input => {
        if (!input) return;
        input.setAttribute("autocomplete", input.id === "auth-email-input" ? "email" : "new-password");
        input.setAttribute("data-lpignore", "true");
        input.setAttribute("data-1p-ignore", "true");
        input.setAttribute("spellcheck", "false");
        input.setAttribute("autocapitalize", "off");
    });
}

// ==================== AUTH ====================
async function signInUser() {
    const email = safeText(el("auth-email-input").value);
    const password = safeText(el("auth-password-input").value);
    if (!email || !password) { showToast(t("enterEmailPassword"), "error"); return; }
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) { console.error("signInUser error:", error); showToast(error.message || t("loginFailed"), "error"); return; }
    showToast(t("loggedIn"));
}
async function signUpUser() {
    const email = safeText(el("auth-email-input").value);
    const password = safeText(el("auth-password-input").value);
    if (!email || !password) { showToast(t("enterEmailPassword"), "error"); return; }
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) { console.error("signUpUser error:", error); showToast(error.message || t("signupFailed"), "error"); return; }
    showToast(data?.session ? t("signedUpAndIn") : t("signedUpCheckEmail"));
}
async function signOutUser() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) { console.error("signOutUser error:", error); showToast(t("couldNotSignOut"), "error"); return; }
    const emailInput = el("auth-email-input");
    const passwordInput = el("auth-password-input");
    if (emailInput) emailInput.value = "";
    if (passwordInput) passwordInput.value = "";
    showToast(t("loggedOut"));
}
function updateUserBar() {
    const userBar = el("user-bar");
    const userEmail = el("user-email");
    if (!userBar || !userEmail) return;
    if (state.currentUser) {
        userBar.classList.remove("hidden");
        userBar.classList.add("flex");
        userEmail.textContent = state.currentUser.email || t("loggedIn");
    } else {
        userBar.classList.add("hidden");
        userBar.classList.remove("flex");
        userEmail.textContent = "";
    }
}
async function loadAppData() {
    if (!state.currentUser) return;
    state.dataLoaded = false;
    await Promise.all([loadGlobalTags(), loadData()]);
    state.dataLoaded = true;
}
async function handleAuthSession(session) {
    state.currentSession = session;
    state.currentUser = session?.user || null;
    closeAllAppModals();
    updateUserBar();
    if (state.currentUser) {
        hideAuthModal();
        if (!state.dataLoaded) {
            await loadAppData();
            showToast(t("welcomeBack"));
        }
    } else {
        resetAppStateForLogout();
        showAuthModal();
    }
}

// ==================== KONFETTI ====================
function launchConfetti() {
    const canvas = document.createElement("canvas");
    Object.assign(canvas.style, { position: "fixed", top: "0", left: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "9999" });
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const colors = ["#10b981", "#34d399", "#fbbf24", "#ec4899", "#8b5cf6"];
    const particles = [];
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height - canvas.height;
            this.size = Math.random() * 12 + 8;
            this.speed = Math.random() * 8 + 5;
            this.angle = Math.random() * 360;
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }
        update() { this.y += this.speed; this.angle += 3; }
        draw() {
            ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle * Math.PI / 180);
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
            ctx.restore();
        }
    }
    for (let i = 0; i < 180; i++) particles.push(new Particle());
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach((p, i) => { p.update(); p.draw(); if (p.y > canvas.height) particles.splice(i, 1); });
        if (particles.length > 0) requestAnimationFrame(animate); else canvas.remove();
    }
    animate();
}

// ==================== LOAD & SAVE ====================
async function loadGlobalTags() {
    if (!state.currentUser) { state.globalTags = []; renderGlobalTagsList(); return; }
    const { data, error } = await supabaseClient.from("tags").select("name").order("name", { ascending: true });
    if (error) { console.error("loadGlobalTags error:", error); state.globalTags = []; return; }
    state.globalTags = [...new Set((data || []).map(item => safeText(item.name)).filter(Boolean))];
}
async function saveCategory(name) {
    if (!state.currentUser) return;
    const cat = state.categories[name];
    if (!cat) return;
    const payload = {
        user_id: state.currentUser.id, name,
        meals: (cat.meals || []).map(normalizeMeal),
        history: Array.isArray(cat.history) ? cat.history.slice(0, 3) : []
    };
    const { error } = await supabaseClient.from("categories").upsert(payload, { onConflict: "user_id,name" });
    if (error) { console.error("saveCategory error:", error); showToast(t("saveError"), "error"); }
}
async function loadData() {
    if (!state.currentUser) { state.categories = {}; renderCategories(); return; }
    const { data, error } = await supabaseClient.from("categories").select("name, meals, history").order("name", { ascending: true });
    if (error) { console.error("loadData error:", error); state.categories = {}; renderCategories(); return; }
    const nextCategories = {};
    const dirtyCategories = [];
    for (const item of data || []) {
        const rawMeals = Array.isArray(item.meals) ? item.meals : [];
        const normalizedMeals = rawMeals.map(normalizeMeal);
        const normalizedHistory = Array.isArray(item.history) ? item.history.map(v => safeText(v)).filter(Boolean).slice(0, 3) : [];
        nextCategories[item.name] = { meals: normalizedMeals, history: normalizedHistory };
        if (JSON.stringify(rawMeals) !== JSON.stringify(normalizedMeals)) dirtyCategories.push(item.name);
    }
    state.categories = nextCategories;
    const seededStarter = await ensureStarterCategoryIfNeeded();
    renderCategories();
    for (const name of dirtyCategories) await saveCategory(name);
    if (seededStarter) showToast(getLang() === "en" ? "Starter category added ✨" : "Startkategori tilføjet ✨");
}

// ==================== RENDER ====================
function getEmojiForCategory(name) {
    const map = {
        "Italiensk": "🍝", "Italian": "🍝",
        "Asiatisk": "🍜", "Asian": "🍜",
        "Dansk": "🇩🇰", "Danish": "🇩🇰",
        "Mexicansk": "🌮", "Mexican": "🌮",
        "Vegetarisk": "🥑", "Vegetarian": "🥑",
        "Suppe": "🥣", "Soup": "🥣"
    };
    return map[name] || "🍽️";
}
function renderCategories() {
    const container = el("categories-container");
    const emptyState = el("empty-state");
    if (!container || !emptyState) return;
    container.innerHTML = "";
    const names = Object.keys(state.categories);
    if (names.length === 0) { emptyState.classList.remove("hidden"); return; }
    emptyState.classList.add("hidden");
    names.sort((a, b) => a.localeCompare(b, getLang()));
    for (const name of names) {
        const cat = state.categories[name];
        const card = document.createElement("article");
        card.className = "category-card bg-white/90 backdrop-blur rounded-3xl shadow-lg p-8 border border-slate-100";
        const top = document.createElement("div");
        top.className = "flex items-start justify-between gap-4";
        const left = document.createElement("div");
        const emoji = document.createElement("div");
        emoji.className = "text-5xl mb-4";
        emoji.textContent = getEmojiForCategory(name);
        const title = document.createElement("h3");
        title.className = "text-2xl font-semibold text-slate-900 break-words";
        title.textContent = name;
        const count = document.createElement("p");
        count.className = "text-emerald-600 mt-2 font-medium";
        count.textContent = t("mealCount", cat.meals.length);
        left.append(emoji, title, count);
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "text-2xl text-red-500 hover:text-red-600 active:scale-95";
        deleteBtn.textContent = "🗑️";
        deleteBtn.addEventListener("click", async (e) => { e.stopPropagation(); await deleteCategory(name); });
        top.append(left, deleteBtn);
        const actions = document.createElement("div");
        actions.className = "mt-8 flex flex-col gap-3";
        const editBtn = makeActionButton(t("editMeals"), "w-full bg-slate-100 hover:bg-slate-200 text-slate-700 h-12 rounded-3xl font-medium");
        editBtn.addEventListener("click", (e) => { e.stopPropagation(); openCategory(name); });
        const randomBtn = makeActionButton(t("randomMeal"), "w-full bg-emerald-600 hover:bg-emerald-700 text-white h-14 rounded-3xl font-semibold text-lg flex items-center justify-center gap-2");
        randomBtn.addEventListener("click", async (e) => { e.stopPropagation(); await quickRandomSelect(name); });
        actions.append(editBtn, randomBtn);
        card.append(top, actions);
        card.addEventListener("click", (e) => { if (!e.target.closest("button")) openCategory(name); });
        container.appendChild(card);
    }
}

// ==================== CATEGORY CRUD ====================
async function createEmptyCategory() {
    if (!requireAuth()) return;
    const input = el("category-name-input");
    const name = safeText(input.value);
    if (!name) { showToast(t("enterName"), "error"); return; }
    if (categoryExists(name)) { showToast(t("alreadyExists", name), "error"); return; }
    state.categories[name] = { meals: [], history: [] };
    await saveCategory(name);
    input.value = "";
    hideAddModal();
    renderCategories();
    showToast(t("categoryCreated", name));
}
function showAddCategoryModal() {
    if (!requireAuth()) return;
    el("category-name-input").value = "";
    openModal("add-modal");
    setTimeout(() => el("category-name-input").focus(), 50);
}
function hideAddModal() { closeModal("add-modal"); }
async function deleteCategory(name) {
    if (!requireAuth()) return;
    if (!confirm(t("confirmDeleteCategory", name))) return;
    delete state.categories[name];
    const { error } = await supabaseClient.from("categories").delete().eq("user_id", state.currentUser.id).eq("name", name);
    if (error) { console.error("deleteCategory error:", error); showToast(t("couldNotDeleteCategory"), "error"); return; }
    renderCategories();
    showToast(t("categoryDeleted", name), "info");
}
async function deleteCurrentCategory() {
    if (!requireAuth()) return;
    if (!state.currentOpenCategory) return;
    const name = state.currentOpenCategory;
    if (!confirm(t("confirmDeleteCategoryFull", name))) return;
    delete state.categories[name];
    const { error } = await supabaseClient.from("categories").delete().eq("user_id", state.currentUser.id).eq("name", name);
    if (error) { console.error("deleteCurrentCategory error:", error); showToast(t("couldNotDeleteCategory"), "error"); return; }
    closeDetailModal();
    renderCategories();
    showToast(t("categoryDeleted", name), "info");
}

// ==================== DETAIL MODAL ====================
function openCategory(name) {
    if (!requireAuth()) return;
    state.currentOpenCategory = name;
    state.editingMealIndex = -1;
    state.currentMealTags = [];
    el("modal-category-name").textContent = name;
    el("new-meal-input").value = "";
    syncEditUI();
    openModal("detail-modal");
    renderMealList();
    setTimeout(() => el("new-meal-input").focus(), 50);
}
function closeDetailModal() {
    closeModal("detail-modal");
    state.currentOpenCategory = null;
    state.editingMealIndex = -1;
    state.currentMealTags = [];
    el("new-meal-input").value = "";
    syncEditUI();
}
function renderMealList() {
    const container = el("meal-list");
    if (!container) return;
    container.innerHTML = "";
    const meals = state.categories[state.currentOpenCategory]?.meals || [];
    if (meals.length === 0) {
        const empty = document.createElement("p");
        empty.className = "text-slate-400 italic py-4";
        empty.textContent = t("noMealsYet");
        container.appendChild(empty);
        return;
    }
    meals.forEach((meal, index) => {
        const normalized = normalizeMeal(meal);
        const row = document.createElement("div");
        row.className = "flex items-center justify-between gap-4 bg-slate-50 px-5 py-4 rounded-2xl hover:bg-slate-100";
        const left = document.createElement("div");
        left.className = "min-w-0 flex-1";
        const name = document.createElement("div");
        name.className = "text-lg font-medium text-slate-900 break-words";
        name.textContent = normalized.name;
        left.appendChild(name);
        if (normalized.tags.length) {
            const tagsWrap = document.createElement("div");
            tagsWrap.className = "mt-2 flex flex-wrap gap-2";
            normalized.tags.forEach(tag => tagsWrap.appendChild(makeTagChip(tag)));
            left.appendChild(tagsWrap);
        }
        const actions = document.createElement("div");
        actions.className = "flex items-center gap-2 flex-shrink-0";
        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "text-emerald-600 hover:text-emerald-700 text-xl px-2";
        editBtn.textContent = "✏️";
        editBtn.addEventListener("click", (e) => { e.stopPropagation(); editMeal(index); });
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "text-red-500 hover:text-red-600 text-xl px-2";
        deleteBtn.textContent = "✕";
        deleteBtn.addEventListener("click", (e) => { e.stopPropagation(); deleteMeal(index); });
        actions.append(editBtn, deleteBtn);
        row.append(left, actions);
        container.appendChild(row);
    });
}

// ==================== MEAL CRUD ====================
async function addMealToCurrentCategory() {
    if (!requireAuth()) return;
    const input = el("new-meal-input");
    const mealName = safeText(input.value);
    if (!mealName || !state.currentOpenCategory) { showToast(t("enterMealName"), "error"); return; }
    if (mealNameExistsInCurrentCategory(mealName, state.editingMealIndex)) { showToast(t("mealAlreadyExists", mealName), "error"); return; }
    if (!state.categories[state.currentOpenCategory]) state.categories[state.currentOpenCategory] = { meals: [], history: [] };
    const meal = { name: mealName, tags: [...state.currentMealTags] };
    if (state.editingMealIndex >= 0) {
        state.categories[state.currentOpenCategory].meals[state.editingMealIndex] = meal;
        state.editingMealIndex = -1;
        showToast(t("mealUpdated"));
    } else {
        state.categories[state.currentOpenCategory].meals.push(meal);
        showToast(t("mealAdded", mealName));
    }
    await saveCategory(state.currentOpenCategory);
    input.value = "";
    state.currentMealTags = [];
    syncEditUI();
    renderMealList();
    renderCategories();
}
async function deleteMeal(index) {
    if (!requireAuth()) return;
    if (!state.currentOpenCategory) return;
    if (!confirm(t("confirmDeleteMeal"))) return;
    state.categories[state.currentOpenCategory].meals.splice(index, 1);
    await saveCategory(state.currentOpenCategory);
    renderMealList();
    renderCategories();
    if (state.editingMealIndex === index) resetMealEditor();
    showToast(t("mealDeleted"), "info");
}
function editMeal(index) {
    const meal = state.categories[state.currentOpenCategory]?.meals?.[index];
    if (!meal) return;
    const normalized = normalizeMeal(meal);
    el("new-meal-input").value = normalized.name;
    state.currentMealTags = [...normalized.tags];
    state.editingMealIndex = index;
    syncEditUI();
    renderMealList();
    showToast(t("editingMealToast"));
}
function cancelMealEdit() {
    resetMealEditor();
    el("new-meal-input").value = "";
    renderMealList();
    showToast(t("editCancelled"), "info");
}

// ==================== TAGS ====================
function showGlobalTagsModal() {
    if (!requireAuth()) return;
    openModal("global-tags-modal");
    renderGlobalTagsList();
    setTimeout(() => el("new-global-tag-input").focus(), 50);
}
function hideGlobalTagsModal() { closeModal("global-tags-modal"); }
function renderGlobalTagsList() {
    const container = el("global-tags-list");
    if (!container) return;
    container.innerHTML = "";
    if (!state.globalTags.length) {
        const p = document.createElement("p");
        p.className = "text-slate-400 italic";
        p.textContent = t("noTagsYet");
        container.appendChild(p);
        return;
    }
    state.globalTags.forEach(tag => {
        const wrap = document.createElement("div");
        wrap.className = "inline-flex items-center gap-2";
        const chip = makeTagChip(tag);
        chip.className = "tag";
        const del = document.createElement("button");
        del.type = "button";
        del.className = "w-7 h-7 rounded-full bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 flex items-center justify-center text-lg leading-none";
        del.title = t("deleteTagTitle", tag);
        del.textContent = "×";
        del.addEventListener("click", () => deleteGlobalTag(tag));
        wrap.append(chip, del);
        container.appendChild(wrap);
    });
}
async function addGlobalTag() {
    if (!requireAuth()) return;
    const input = el("new-global-tag-input");
    const tag = safeText(input.value);
    if (!tag) return;
    if (tagExists(tag)) { showToast(t("tagAlreadyExists", tag), "error"); return; }
    const { error } = await supabaseClient.from("tags").upsert({ user_id: state.currentUser.id, name: tag }, { onConflict: "user_id,name" });
    if (error) { console.error("addGlobalTag error:", error); showToast(t("couldNotCreateTag"), "error"); return; }
    input.value = "";
    await loadGlobalTags();
    renderGlobalTagsList();
    showToast(t("tagCreated", tag));
}
async function deleteGlobalTag(tag) {
    if (!requireAuth()) return;
    if (!confirm(t("confirmDeleteTag", tag))) return;
    const { error } = await supabaseClient.from("tags").delete().eq("user_id", state.currentUser.id).eq("name", tag);
    if (error) { console.error("deleteGlobalTag error:", error); showToast(t("couldNotDeleteTag"), "error"); return; }
    state.globalTags = state.globalTags.filter(x => x !== tag);
    for (const [categoryName, category] of Object.entries(state.categories)) {
        let changed = false;
        category.meals = (category.meals || []).map(meal => {
            const normalized = normalizeMeal(meal);
            if (normalized.tags.includes(tag)) {
                changed = true;
                return { name: normalized.name, tags: normalized.tags.filter(x => x !== tag) };
            }
            return normalized;
        });
        if (changed) await saveCategory(categoryName);
    }
    if (state.currentMealTags.includes(tag)) state.currentMealTags = state.currentMealTags.filter(x => x !== tag);
    renderGlobalTagsList();
    renderMealTagsList();
    renderMealList();
    renderCategories();
    showToast(t("tagDeleted", tag), "info");
}
function showMealTagsPopup() {
    if (!requireAuth()) return;
    openModal("meal-tags-popup");
    renderMealTagsList();
}
function hideMealTagsPopup() { closeModal("meal-tags-popup"); }
function renderMealTagsList() {
    const container = el("meal-tags-list");
    if (!container) return;
    container.innerHTML = "";
    if (!state.globalTags.length) {
        const p = document.createElement("p");
        p.className = "text-slate-400 italic";
        p.textContent = t("createTagsFirst");
        container.appendChild(p);
        return;
    }
    state.globalTags.forEach(tag => {
        const isSelected = state.currentMealTags.includes(tag);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = isSelected
            ? "px-5 py-2.5 rounded-3xl text-sm font-medium bg-emerald-600 text-white shadow-md scale-105"
            : "px-5 py-2.5 rounded-3xl text-sm font-medium bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 hover:bg-emerald-50";
        btn.textContent = tag;
        btn.addEventListener("click", () => {
            if (state.currentMealTags.includes(tag)) state.currentMealTags = state.currentMealTags.filter(x => x !== tag);
            else state.currentMealTags.push(tag);
            renderMealTagsList();
        });
        container.appendChild(btn);
    });
}
function saveMealTags() {
    hideMealTagsPopup();
    const inputValue = safeText(el("new-meal-input").value);
    if (state.editingMealIndex >= 0 || inputValue) addMealToCurrentCategory();
}

// ==================== TAG RANDOM ====================
function showTagRandomModal() {
    if (!requireAuth()) return;
    openModal("tag-random-modal");
    renderTagRandomList();
}
function hideTagRandomModal() { closeModal("tag-random-modal"); }
function renderTagRandomList() {
    const container = el("tag-random-list");
    if (!container) return;
    container.innerHTML = "";
    if (!state.globalTags.length) {
        const p = document.createElement("p");
        p.className = "text-slate-400 italic col-span-2 text-center py-8";
        p.textContent = t("noTagsSimple");
        container.appendChild(p);
        return;
    }
    state.globalTags.forEach(tag => {
        const id = `tagcheck-${escapeForCssId(tag)}`;
        const wrap = document.createElement("label");
        wrap.className = "flex items-center gap-3 p-3 rounded-2xl border border-slate-200 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.id = id;
        input.dataset.tag = tag;
        input.className = "w-5 h-5 accent-emerald-600";
        const text = document.createElement("span");
        text.className = "cursor-pointer";
        text.textContent = tag;
        wrap.append(input, text);
        container.appendChild(wrap);
    });
}
async function performTagRandom() {
    const selectedTags = Array.from(document.querySelectorAll("#tag-random-list input[type='checkbox']:checked"))
        .map(input => input.dataset.tag).filter(Boolean);
    if (!selectedTags.length) { showToast(t("chooseAtLeastOneTag"), "error"); return; }
    hideTagRandomModal();
    const matching = [];
    Object.entries(state.categories).forEach(([catName, cat]) => {
        (cat.meals || []).forEach(meal => {
            const normalized = normalizeMeal(meal);
            if (normalized.tags.some(x => selectedTags.includes(x))) matching.push({ category: catName, meal: normalized });
        });
    });
    if (!matching.length) { showToast(t("noMealsMatchTags"), "error"); return; }
    const random = chooseSmartCandidate(matching, 5);
    showChosenModal(random.category, random.meal);
}

// ==================== CHOSEN MODAL ====================
function showChosenModal(categoryName, meal) {
    state.currentCategoryForReroll = categoryName;
    const normalizedMeal = normalizeMeal(meal);
    openModal("chosen-display");
    el("spinner-container").classList.remove("hidden");
    el("result-container").classList.add("hidden");
    setTimeout(() => {
        el("spinner-container").classList.add("hidden");
        el("result-container").classList.remove("hidden");
        const badge = el("chosen-category-badge");
        badge.innerHTML = "";
        const badgeEmoji = document.createElement("span");
        badgeEmoji.className = "text-xl";
        badgeEmoji.textContent = getEmojiForCategory(categoryName);
        const badgeText = document.createElement("span");
        badgeText.textContent = categoryName;
        badge.append(badgeEmoji, badgeText);
        el("meal-emoji").textContent = getEmojiForCategory(categoryName);
        el("chosen-meal-name").textContent = normalizedMeal.name;
        const tagsContainer = el("chosen-tags");
        tagsContainer.innerHTML = "";
        if (normalizedMeal.tags.length) {
            normalizedMeal.tags.forEach(tag => tagsContainer.appendChild(makeTagChip(tag)));
        } else {
            const empty = document.createElement("span");
            empty.className = "text-slate-400 text-sm";
            empty.textContent = t("noTagsLabel");
            tagsContainer.appendChild(empty);
        }
        launchConfetti();
    }, 1350);
    recordHistory(categoryName, normalizedMeal);
}
function hideChosenModal() { closeModal("chosen-display"); }

// ==================== HISTORY ====================
function persistHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(state.recentChoices)); } catch (_) {}
}
function recordHistory(categoryName, meal) {
    if (!meal || !meal.name) return;
    state.recentChoices.unshift({
        category: categoryName,
        name: meal.name,
        tags: Array.isArray(meal.tags) ? meal.tags.slice() : [],
        at: Date.now()
    });
    if (state.recentChoices.length > HISTORY_MAX) state.recentChoices = state.recentChoices.slice(0, HISTORY_MAX);
    persistHistory();
    if (!el("history-modal").classList.contains("hidden")) renderHistoryList();
}
function formatRelativeTime(ts) {
    const diff = Math.max(0, Date.now() - ts);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("justNow");
    if (mins < 60) return t("minutesAgo", mins);
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t("hoursAgo", hours);
    const days = Math.floor(hours / 24);
    return t("daysAgo", days);
}
function renderHistoryList() {
    const list = el("history-list");
    if (!list) return;
    list.innerHTML = "";
    if (!state.recentChoices.length) {
        const empty = document.createElement("p");
        empty.className = "text-slate-500 text-center py-10";
        empty.textContent = t("historyEmpty");
        list.appendChild(empty);
        return;
    }
    state.recentChoices.forEach((entry, idx) => {
        const row = document.createElement("div");
        row.className = "flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200";
        const num = document.createElement("div");
        num.className = "flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center justify-center text-sm";
        num.textContent = String(idx + 1);
        const emoji = document.createElement("div");
        emoji.className = "text-3xl flex-shrink-0";
        emoji.textContent = getEmojiForCategory(entry.category);
        const info = document.createElement("div");
        info.className = "flex-1 min-w-0";
        const name = document.createElement("div");
        name.className = "font-semibold text-slate-900 truncate";
        name.textContent = entry.name;
        const meta = document.createElement("div");
        meta.className = "text-xs text-slate-500 truncate";
        meta.textContent = `${entry.category} · ${formatRelativeTime(entry.at)}`;
        info.append(name, meta);
        row.append(num, emoji, info);
        list.appendChild(row);
    });
}
function showHistoryModal() {
    renderHistoryList();
    openModal("history-modal");
}
function hideHistoryModal() { closeModal("history-modal"); }
function clearHistory() {
    state.recentChoices = [];
    persistHistory();
    renderHistoryList();
    showToast(t("historyCleared"));
}
function rerollSameCategory() {
    if (!state.currentCategoryForReroll) return;
    hideChosenModal();
    setTimeout(() => quickRandomSelect(state.currentCategoryForReroll), 300);
}
async function quickRandomSelect(categoryName) {
    if (!requireAuth()) return;
    const cat = state.categories[categoryName];
    if (!cat || !cat.meals.length) { showToast(t("addMealToCategoryFirst", categoryName), "error"); openCategory(categoryName); return; }
    const candidates = (cat.meals || []).map(meal => ({ category: categoryName, meal: normalizeMeal(meal) }));
    const chosenEntry = chooseSmartCandidate(candidates, 5);
    const chosen = normalizeMeal(chosenEntry.meal);
    if (!Array.isArray(cat.history)) cat.history = [];
    cat.history.push(chosen.name);
    if (cat.history.length > 3) cat.history = cat.history.slice(-3);
    await saveCategory(categoryName);
    showChosenModal(categoryName, chosen);
}

function getRecentMealKeys(limit = 5) {
    return state.recentChoices
        .slice(0, limit)
        .map(entry => `${safeText(entry.category)}__${safeText(entry.name).toLowerCase()}`);
}
function chooseSmartCandidate(candidates, limit = 5) {
    if (!Array.isArray(candidates) || !candidates.length) return null;
    const recent = new Set(getRecentMealKeys(limit));
    const fresh = candidates.filter(item => !recent.has(`${safeText(item.category)}__${safeText(item.meal?.name).toLowerCase()}`));
    const pool = fresh.length ? fresh : candidates;
    return pool[Math.floor(Math.random() * pool.length)];
}
async function globalQuickPick() {
    if (!requireAuth()) return;
    const allMeals = [];
    Object.entries(state.categories).forEach(([catName, cat]) => {
        (cat.meals || []).forEach(meal => allMeals.push({ category: catName, meal: normalizeMeal(meal) }));
    });
    if (!allMeals.length) { showToast(t("noMealsAtAll"), "error"); return; }
    const chosen = chooseSmartCandidate(allMeals, 5);
    hideChosenModal();
    setTimeout(() => showChosenModal(chosen.category, chosen.meal), 200);
}

// ==================== EASTER EGGS ====================
function triggerTinyFoodMagic(mealName) {
    const lower = mealName.toLowerCase();
    if (lower === "suppe" || lower === "soup") {
        return { handled: true, value: t("eggSoupValue"), message: t("eggSoupMessage") };
    }
    if (lower === "fredag" || lower.includes("fredags") || lower === "friday" || lower.includes("friday")) {
        return { handled: true, value: t("eggFridayValue"), message: t("eggFridayMessage") };
    }
    if (lower === "pizzaa") {
        return { handled: true, value: t("eggPizzaValue"), message: t("eggPizzaMessage") };
    }
    return { handled: false };
}
function handleLogoClick() {
    state.logoClicks++;
    if (state.logoClicks >= 2) {
        state.logoClicks = 0;
        globalQuickPick();
    }
}

// ==================== KEYBOARD ====================
function setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;
        if (e.key && e.key.toLowerCase() === "r" && state.currentOpenCategory) quickRandomSelect(state.currentOpenCategory);
        if (e.key && e.key.toLowerCase() === "t") showTagRandomModal();
        if (e.key === "Escape") {
            if (!el("chosen-display").classList.contains("hidden")) hideChosenModal();
            else if (!el("history-modal").classList.contains("hidden")) hideHistoryModal();
            else if (!el("tag-random-modal").classList.contains("hidden")) hideTagRandomModal();
            else if (!el("meal-tags-popup").classList.contains("hidden")) hideMealTagsPopup();
            else if (!el("global-tags-modal").classList.contains("hidden")) hideGlobalTagsModal();
            else if (!el("detail-modal").classList.contains("hidden")) closeDetailModal();
            else if (!el("add-modal").classList.contains("hidden")) hideAddModal();
        }
    });
    const catInput = el("category-name-input");
    const mealInput = el("new-meal-input");
    const tagInput = el("new-global-tag-input");
    const authEmail = el("auth-email-input");
    const authPassword = el("auth-password-input");
    if (catInput) catInput.addEventListener("keydown", (e) => { if (e.key === "Enter") createEmptyCategory(); });
    if (mealInput) {
        mealInput.addEventListener("keydown", (e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const value = safeText(mealInput.value);
            const egg = triggerTinyFoodMagic(value);
            if (egg.handled) { mealInput.value = egg.value; showToast(egg.message); launchConfetti(); return; }
            addMealToCurrentCategory();
        });
    }
    if (tagInput) tagInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addGlobalTag(); });
    if (authEmail) authEmail.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); authPassword?.focus(); } });
    if (authPassword) authPassword.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); signInUser(); } });
    attachAutofillGuards();
}

// ==================== START ====================
window.addEventListener("load", async () => {
    setupKeyboardShortcuts();
    attachAutofillGuards();
    applyI18n();
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) console.error("getSession error:", error);
    await handleAuthSession(data?.session || null);
    supabaseClient.auth.onAuthStateChange((event, session) => { void handleAuthSession(session); });
});
