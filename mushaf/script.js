let SuraHs = [];

const JuzsData = Array.from({ length: 30 }, (_, i) => {
  const index = i + 1;
  let start = 1 + (index - 1) * 20;
  let end = index * 20;

  if (index === 1) {
    start = 1;
    end = 21;
  } else if (index === 2) {
    start = 22;
    end = 41;
  } else if (index === 30) {
    end = 604;
  } else {
    start = (index - 1) * 20 + 2;
    end = index * 20 + 1;
  }
  return {
    id: index,
    name: `الجزء ${index}`,
    start: start,
    end: end,
  };
});

let pageStates = {};
let streakCount = 0;
let lastActivityDate = "";
let historyLogs = [];
let activeTab = "surahs";
let currentStatusFilter = "all";
let activePageForStatusChange = null;
let deferredInstallPrompt = null;

const installButton = document.getElementById("install-app-btn");
const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

if (installButton && !isStandalone) {
  installButton.classList.remove("hidden");
  installButton.classList.add("flex");
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  document.getElementById("install-app-btn")?.classList.add("hidden");
});

async function installApp() {
  if (!deferredInstallPrompt) return;

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.getElementById("install-app-btn")?.classList.add("hidden");
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js");
}

window.onload = async function () {
  const response = await fetch("./suraHs.json");
  SuraHs = await response.json();

  SuraHs.forEach((s) => {
    if (s.start > 604) s.start = 604;
    if (s.end > 604) s.end = 604;
  });

  loadFromLocalStorage();
  renderDashboard();
  renderSurahsGrid();
  renderJuzGrid();
  renderHistoryLogs();
  updateDailyTarget();

  updateScrollProgress();
};

function loadFromLocalStorage() {
  const savedPages = localStorage.getItem("quran_tracker_pages");
  const savedStreak = localStorage.getItem("quran_tracker_streak");
  const savedLastDate = localStorage.getItem("quran_tracker_last_date");
  const savedLogs = localStorage.getItem("quran_tracker_logs");

  if (savedPages) {
    pageStates = JSON.parse(savedPages);
  } else {
    for (let p = 1; p <= 604; p++) {
      pageStates[p] = 0;
    }

    pageStates[1] = 3;
    pageStates[2] = 1;
    pageStates[3] = 1;
    pageStates[4] = 2;
    pageStates[5] = 2;
    saveToLocalStorage();
  }

  streakCount = savedStreak ? parseInt(savedStreak) : 0;
  lastActivityDate = savedLastDate ? savedLastDate : "";
  historyLogs = savedLogs
    ? JSON.parse(savedLogs)
    : [
        {
          id: 1,
          date: new Date().toLocaleDateString("ar-EG"),
          text: "تم إنشاء حساب تتبع ختمة بنجاح. ابدأ مسيرتك المباركة اليوم!",
        },
      ];

  checkStreakBreak();
}

function saveToLocalStorage() {
  localStorage.setItem("quran_tracker_pages", JSON.stringify(pageStates));
  localStorage.setItem("quran_tracker_streak", streakCount.toString());
  localStorage.setItem("quran_tracker_last_date", lastActivityDate);
  localStorage.setItem("quran_tracker_logs", JSON.stringify(historyLogs));
}

function checkStreakBreak() {
  if (lastActivityDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastDateObj = new Date(lastActivityDate);
    lastDateObj.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(today - lastDateObj);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
      streakCount = 0;
      saveToLocalStorage();
    }
  }
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function updateScrollProgress() {
  const winScroll =
    document.body.scrollTop || document.documentElement.scrollTop;
  const height =
    document.documentElement.scrollHeight -
    document.documentElement.clientHeight;
  const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
  const progressBar = document.getElementById("scroll-progress");
  if (progressBar) {
    progressBar.style.width = scrolled + "%";
  }
}

window.addEventListener("scroll", updateScrollProgress);

function updateStreak() {
  const todayStr = new Date().toDateString();
  if (lastActivityDate !== todayStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastDateObj = lastActivityDate ? new Date(lastActivityDate) : null;
    if (lastDateObj) lastDateObj.setHours(0, 0, 0, 0);

    if (
      lastDateObj &&
      Math.ceil(Math.abs(today - lastDateObj) / (1000 * 60 * 60 * 24)) === 1
    ) {
      streakCount++;
    } else if (
      !lastDateObj ||
      Math.ceil(Math.abs(today - lastDateObj) / (1000 * 60 * 60 * 24)) > 1
    ) {
      streakCount = 1;
    }
    lastActivityDate = todayStr;
    saveToLocalStorage();
    const headerStreak = document.getElementById("header-streak-num");
    if (headerStreak) headerStreak.innerText = streakCount;
  }
}

function addHistoryLog(text) {
  const newLog = {
    id: Date.now(),
    date: new Date().toLocaleString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "numeric",
    }),
    text: text,
  };
  historyLogs.unshift(newLog);
  if (historyLogs.length > 20) historyLogs.pop();
  saveToLocalStorage();
  renderHistoryLogs();
}

function clearHistoryLogs() {
  openCustomConfirm(
    "مسح سجل النشاط",
    "هل أنت متأكد من رغبتك في مسح سجل نشاط الحفظ؟ هذا لن يؤثر على صفحاتك المحفوظة بل سيمسح قائمة التواريخ الزمنية فقط.",
    function () {
      historyLogs = [
        {
          id: Date.now(),
          date: new Date().toLocaleDateString("ar-EG"),
          text: "تم تنظيف سجل الإنجازات.",
        },
      ];
      saveToLocalStorage();
      renderHistoryLogs();
    },
  );
}

function renderDashboard() {
  let completed = 0;
  let revision = 0;
  let memorizing = 0;
  let unstarted = 0;

  for (let p = 1; p <= 604; p++) {
    if (pageStates[p] === 3) completed++;
    else if (pageStates[p] === 2) revision++;
    else if (pageStates[p] === 1) memorizing++;
    else unstarted++;
  }

  const compPercent = ((completed / 604) * 100).toFixed(1);
  const revPercent = ((revision / 604) * 100).toFixed(1);
  const memPercent = ((memorizing / 604) * 100).toFixed(1);

  document.getElementById("global-progress-percent").innerText =
    `${compPercent}%`;
  document.getElementById("progress-bar-completed").style.width =
    `${compPercent}%`;
  document.getElementById("progress-bar-revision").style.width =
    `${revPercent}%`;
  document.getElementById("progress-bar-memorizing").style.width =
    `${memPercent}%`;

  document.getElementById("stat-completed-pages").innerText = completed;
  document.getElementById("stat-revision-pages").innerText = revision;
  document.getElementById("stat-memorizing-pages").innerText = memorizing;
  document.getElementById("stat-remaining-pages").innerText = 604 - completed;

  document.getElementById("legend-completed-cnt").innerText = completed;
  document.getElementById("legend-revision-cnt").innerText = revision;
  document.getElementById("legend-memorizing-cnt").innerText = memorizing;
  document.getElementById("legend-unstarted-cnt").innerText = unstarted;

  const headerStreak = document.getElementById("header-streak-num");
  if (headerStreak) headerStreak.innerText = streakCount;

  const remaining = 604 - completed;
  document.getElementById("remaining-days-count").innerText =
    `متبقي لك ${remaining} صفحة`;

  if (remaining === 0) {
    document.getElementById("estimated-date").innerText =
      "مبارك! لقد تم ختم المصحف 🎉";
  } else {
    const daysNeeded = Math.ceil(remaining / 2);
    const estDate = new Date();
    estDate.setDate(estDate.getDate() + daysNeeded);
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    document.getElementById("estimated-date").innerText =
      estDate.toLocaleDateString("ar-EG", options);
  }
}

function updateDailyTarget() {
  let startPage = -1;
  let endPage = -1;

  for (let p = 1; p <= 604; p++) {
    if (pageStates[p] !== 3) {
      startPage = p;
      break;
    }
  }

  if (startPage === -1) {
    document.getElementById("today-target-title").innerText =
      "الحمد لله! لقد ختمت القرآن كاملاً";
    document.getElementById("today-target-desc").innerText =
      "تستطيع الاستمرار في وضع صفحاتك بالكامل قيد المراجعة الدورية وتصفيتها في أي وقت لمراجعة الختمة.";
    document.getElementById("btn-target-complete").classList.add("hidden");
    return;
  }

  endPage =
    startPage < 604 && pageStates[startPage + 1] !== 3
      ? startPage + 1
      : startPage;

  const surah1Obj = SuraHs.find(
    (s) => startPage >= s.start && startPage <= s.end,
  );
  const surah2Obj = SuraHs.find((s) => endPage >= s.start && endPage <= s.end);

  let locationText = `سورة ${surah1Obj.name}`;
  if (surah1Obj.id !== surah2Obj.id) {
    locationText += ` و سورة ${surah2Obj.name}`;
  }

  const pageRangeText =
    startPage === endPage
      ? `صفحة ${startPage}`
      : `الصفحات ${startPage} - ${endPage}`;

  document.getElementById("today-target-title").innerText =
    `${pageRangeText} (${locationText})`;
  document.getElementById("today-target-desc").innerText =
    `وردك اليوم يقع في الأجزاء المقابلة لهذه السور. ركز جيداً، استمع للقراءة، ثم قم بحفظ وتثبيت الوجهين لتحديث تقدمك.`;
  document.getElementById("btn-target-complete").classList.remove("hidden");

  document.getElementById("btn-target-complete").dataset.start = startPage;
  document.getElementById("btn-target-complete").dataset.end = endPage;
}

function completeTodayTarget() {
  const btn = document.getElementById("btn-target-complete");
  const start = parseInt(btn.dataset.start);
  const end = parseInt(btn.dataset.end);

  for (let p = start; p <= end; p++) {
    pageStates[p] = 3;
  }

  const surahObj = SuraHs.find((s) => start >= s.start && start <= s.end);
  addHistoryLog(
    `إنجاز ورد اليوم: تم حفظ الصفحات (${start} - ${end}) من سورة ${surahObj.name}.`,
  );
  updateStreak();
  saveToLocalStorage();
  renderDashboard();
  renderSurahsGrid();
  renderJuzGrid();
  updateDailyTarget();

  const banner = btn.parentElement.parentElement;
  banner.classList.add("scale-[1.02]", "bg-emerald-600");
  setTimeout(() => {
    banner.classList.remove("scale-[1.02]", "bg-emerald-600");
  }, 300);
}

function renderSurahsGrid() {
  const container = document.getElementById("surahs-container");
  container.innerHTML = "";

  SuraHs.forEach((surah) => {
    let sComplete = 0;
    let sRevision = 0;
    let sMemorizing = 0;
    const totalPages = surah.end - surah.start + 1;

    for (let p = surah.start; p <= surah.end; p++) {
      if (pageStates[p] === 3) sComplete++;
      else if (pageStates[p] === 2) sRevision++;
      else if (pageStates[p] === 1) sMemorizing++;
    }

    let statusBadge = "";
    let cardBorder = "border-slate-200";
    let computedStatus = "unstarted";

    if (sComplete === totalPages) {
      statusBadge = `<span class="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full"><i class="fa-solid fa-circle-check"></i> تم الحفظ</span>`;
      cardBorder = "border-green-200 hover:border-green-300";
      computedStatus = "completed";
    } else if (sRevision > 0 && sComplete === 0 && sMemorizing === 0) {
      statusBadge = `<span class="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full"><i class="fa-solid fa-clock-rotate-left"></i> قيد المراجعة</span>`;
      cardBorder = "border-amber-200 hover:border-amber-300";
      computedStatus = "revision";
    } else if (sMemorizing > 0 || (sComplete > 0 && sComplete < totalPages)) {
      statusBadge = `<span class="bg-sky-100 text-sky-800 text-xs font-semibold px-2.5 py-0.5 rounded-full"><i class="fa-solid fa-pen-nib animate-pulse"></i> جاري الحفظ</span>`;
      cardBorder = "border-sky-200 hover:border-sky-300";
      computedStatus = "memorizing";
    } else {
      statusBadge = `<span class="bg-slate-100 text-slate-500 text-xs px-2.5 py-0.5 rounded-full">لم تبدأ</span>`;
      computedStatus = "unstarted";
    }

    const startingJuz = JuzsData.find(
      (j) => surah.start >= j.start && surah.start <= j.end,
    );

    const card = document.createElement("div");
    card.id = `surah-card-${surah.id}`;
    card.className = `bg-white rounded-2xl p-5 border ${cardBorder} shadow-sm transition-all duration-200 hover:shadow-md flex flex-col justify-between`;
    card.dataset.status = computedStatus;
    card.dataset.name = surah.name;

    let pagesHtml = "";
    for (let p = surah.start; p <= surah.end; p++) {
      let pageBg = "bg-slate-100 hover:bg-slate-200 text-slate-500";
      if (pageStates[p] === 3)
        pageBg = "bg-brand-mint text-white border-green-300";
      else if (pageStates[p] === 2)
        pageBg = "bg-amber-400 text-slate-800 border-amber-300";
      else if (pageStates[p] === 1)
        pageBg = "bg-sky-400 text-white border-sky-300";

      pagesHtml += `
                        <button onclick="triggerPageStatusChange(${p}, event)" title="صفحة ${p} - اضغط للتعديل" class="w-8 h-8 rounded-lg text-xs font-bold border transition flex items-center justify-center ${pageBg}">
                            ${p}
                        </button>
                    `;
    }

    card.innerHTML = `
                    <div>
                        <div class="flex justify-between items-start mb-3">
                            <div class="flex items-center gap-2">
                                <span class="bg-brand-emerald text-brand-cream text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center font-cairo">
                                    ${surah.id}
                                </span>
                                <h4 class="font-bold text-lg text-brand-dark font-cairo">${surah.name}</h4>
                            </div>
                            <span class="text-xs text-slate-400 font-medium">${surah.type} | الجزء ${startingJuz ? startingJuz.id : "..."}</span>
                        </div>
                        
                        <div class="flex justify-between items-center text-xs mb-4">
                            <span class="text-slate-500">من صفحة ${surah.start} إلى ${surah.end} (${totalPages} ${totalPages > 10 ? "صفحة" : "صفحات"})</span>
                            ${statusBadge}
                        </div>

                        <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-4">
                            <div class="bg-brand-mint h-full" style="width: ${(sComplete / totalPages) * 100}%"></div>
                        </div>

                        <div id="pages-detail-${surah.id}" class="hidden mt-4 pt-4 border-t border-slate-100">
                            <div class="flex justify-between items-center mb-3">
                                <span class="text-xs font-bold text-slate-600">اختر صفحة لتعديل حالتها الفردية:</span>
                                <span class="text-[10px] text-slate-400">انقر للتعديل السريع</span>
                            </div>
                            <div class="flex flex-wrap gap-2 justify-center">
                                ${pagesHtml}
                            </div>
                        </div>
                    </div>

                    <div class="mt-5 pt-3 border-t border-slate-100 flex gap-2 justify-between items-center">
                        <button onclick="toggleSurahDetails(${surah.id})" class="text-xs text-brand-emerald hover:text-brand-dark font-bold flex items-center gap-1">
                            <i class="fa-solid fa-expand" id="expand-icon-${surah.id}"></i>
                            <span id="expand-text-${surah.id}">عرض الصفحات</span>
                        </button>

                        <div class="relative">
                            <select onchange="bulkSetSurahStatus(${surah.id}, this)" class="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs px-2 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-emerald">
                                <option value="" disabled selected>تعيين سريع لجميع صفحاتها...</option>
                                <option value="3">تم الحفظ كاملاً</option>
                                <option value="2">قيد المراجعة</option>
                                <option value="1">قيد الحفظ الآن</option>
                                <option value="0">لم تبدأ بعد</option>
                            </select>
                        </div>
                    </div>
                `;

    container.appendChild(card);
  });
}

function toggleSurahDetails(id) {
  const detailDiv = document.getElementById(`pages-detail-${id}`);
  const textSpan = document.getElementById(`expand-text-${id}`);
  const icon = document.getElementById(`expand-icon-${id}`);

  if (detailDiv.classList.contains("hidden")) {
    detailDiv.classList.remove("hidden");
    textSpan.innerText = "إخفاء الصفحات";
    icon.className = "fa-solid fa-compress";
  } else {
    detailDiv.classList.add("hidden");
    textSpan.innerText = "عرض الصفحات";
    icon.className = "fa-solid fa-expand";
  }
}

function scrollToActiveSurah() {
  const startPage = parseInt(
    document.getElementById("btn-target-complete").dataset.start,
  );
  if (!startPage) return;

  const activeSurah = SuraHs.find(
    (s) => startPage >= s.start && startPage <= s.end,
  );
  if (activeSurah) {
    switchTab("surahs");
    const card = document.getElementById(`surah-card-${activeSurah.id}`);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      const detailDiv = document.getElementById(
        `pages-detail-${activeSurah.id}`,
      );
      if (detailDiv.classList.contains("hidden")) {
        toggleSurahDetails(activeSurah.id);
      }
      card.classList.add("ring-2", "ring-brand-accent");
      setTimeout(() => {
        card.classList.remove("ring-2", "ring-brand-accent");
      }, 1500);
    }
  }
}

function triggerPageStatusChange(page, event) {
  event.stopPropagation();
  activePageForStatusChange = page;
  document.getElementById("status-modal-title").innerText =
    `تعديل حالة الصفحة رقم ${page}`;
  document.getElementById("status-modal").classList.remove("hidden");
}

function closeStatusModal() {
  document.getElementById("status-modal").classList.add("hidden");
  activePageForStatusChange = null;
}

function setSpecificPageState(state) {
  if (activePageForStatusChange === null) return;
  const page = activePageForStatusChange;

  pageStates[page] = state;

  const statesNames = {
    0: "غير مبدوء",
    1: "جاري الحفظ",
    2: "قيد المراجعة",
    3: "تم الحفظ",
  };
  const surahObj = SuraHs.find((s) => page >= s.start && page <= s.end);
  addHistoryLog(
    `تم تعديل حالة صفحة ${page} بسورة ${surahObj.name} إلى: ${statesNames[state]}`,
  );

  updateStreak();
  saveToLocalStorage();
  renderDashboard();
  renderSurahsGrid();
  renderJuzGrid();
  updateDailyTarget();
  closeStatusModal();
}

function bulkSetSurahStatus(surahId, selectElement) {
  const state = parseInt(selectElement.value);
  if (isNaN(state)) return;

  const surah = SuraHs.find((s) => s.id === surahId);
  if (!surah) return;

  for (let p = surah.start; p <= surah.end; p++) {
    pageStates[p] = state;
  }

  const statesNames = {
    0: "غير مبدوء",
    1: "جاري حفظه",
    2: "قيد المراجعة",
    3: "تم حفظه",
  };
  addHistoryLog(
    `تم تعيين حالة سورة ${surah.name} بالكامل كـ: ${statesNames[state]}.`,
  );

  updateStreak();
  saveToLocalStorage();
  renderDashboard();
  renderSurahsGrid();
  renderJuzGrid();
  updateDailyTarget();

  selectElement.selectedIndex = 0;
}

function renderJuzGrid() {
  const container = document.getElementById("tab-content-juzs");
  container.innerHTML = "";

  JuzsData.forEach((juz) => {
    let total = juz.end - juz.start + 1;
    let completed = 0;

    for (let p = juz.start; p <= juz.end; p++) {
      if (pageStates[p] === 3) completed++;
    }

    const percent = ((completed / total) * 100).toFixed(0);

    const card = document.createElement("div");
    card.className =
      "bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between";
    card.innerHTML = `
                    <div>
                        <div class="flex justify-between items-center mb-3">
                            <h4 class="font-bold text-brand-emerald font-cairo text-lg">${juz.name}</h4>
                            <span class="text-xs bg-brand-light text-brand-emerald font-bold px-2.5 py-0.5 rounded-full">${percent}%</span>
                        </div>
                        <p class="text-xs text-slate-400 mb-4">من صفحة ${juz.start} إلى صفحة ${juz.end} (${total} صفحة)</p>
                        
                        <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
                            <div class="bg-brand-accent h-full" style="width: ${percent}%"></div>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="setWholeJuzState(${juz.id}, 3)" class="flex-grow bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold py-2 rounded-lg transition">تم حفظ الجزء</button>
                        <button onclick="filterSurahListByJuz(${juz.start}, ${juz.end})" class="bg-brand-emerald hover:bg-brand-dark text-white text-xs px-3 py-2 rounded-lg transition" title="عرض سور الجزء">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    </div>
                `;
    container.appendChild(card);
  });
}

function setWholeJuzState(juzId, state) {
  const juz = JuzsData.find((j) => j.id === juzId);
  if (!juz) return;

  openCustomConfirm(
    `حفظ الجزء ${juzId} كاملاً`,
    `هل تود بالفعل تحديد جميع الصفحات من ${juz.start} إلى ${juz.end} (الجزء ${juzId}) كحالة "تم الحفظ"؟`,
    function () {
      for (let p = juz.start; p <= juz.end; p++) {
        pageStates[p] = state;
      }
      addHistoryLog(`تم تعيين الجزء رقم ${juzId} بالكامل كـ تم الحفظ.`);
      updateStreak();
      saveToLocalStorage();
      renderDashboard();
      renderSurahsGrid();
      renderJuzGrid();
      updateDailyTarget();
    },
  );
}

function filterSurahListByJuz(startPage, endPage) {
  switchTab("surahs");

  const cards = document.querySelectorAll("#surahs-container > div");
  cards.forEach((card) => {
    const surahName = card.dataset.name;
    const surah = SuraHs.find((s) => s.name === surahName);
    if (
      surah &&
      ((surah.start >= startPage && surah.start <= endPage) ||
        (surah.end >= startPage && surah.end <= endPage))
    ) {
      card.classList.remove("hidden");
    } else {
      card.classList.add("hidden");
    }
  });

  document.querySelectorAll('[id^="filter-btn-"]').forEach((btn) => {
    btn.className =
      "bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition";
  });
}

function renderHistoryLogs() {
  const container = document.getElementById("history-logs-container");
  container.innerHTML = "";

  if (historyLogs.length === 0) {
    container.innerHTML = `
                    <div class="text-center py-8 text-slate-400">
                        <i class="fa-solid fa-scroll text-4xl mb-2 block"></i>
                        سجل نشاطك فارغ الآن، ابدأ الحفظ ومستويات التفاعل لتظهر هنا.
                    </div>
                `;
    return;
  }

  historyLogs.forEach((log) => {
    const element = document.createElement("div");
    element.className =
      "flex gap-3 items-start p-3 hover:bg-slate-50 rounded-xl transition border-b border-dashed border-slate-100 last:border-none";
    element.innerHTML = `
                    <div class="bg-emerald-100 text-brand-emerald p-1.5 rounded-full text-xs mt-0.5">
                        <i class="fa-solid fa-heart-pulse"></i>
                    </div>
                    <div>
                        <p class="text-xs text-slate-400 font-medium">${log.date}</p>
                        <p class="text-sm text-slate-700 mt-0.5 font-medium">${log.text}</p>
                    </div>
                `;
    container.appendChild(element);
  });
}

function filterSurahs() {
  const query = document.getElementById("search-surah-input").value.trim();
  const cards = document.querySelectorAll("#surahs-container > div");

  cards.forEach((card) => {
    const name = card.dataset.name;
    if (name.includes(query) || query === "") {
      if (
        currentStatusFilter === "all" ||
        card.dataset.status === currentStatusFilter
      ) {
        card.classList.remove("hidden");
      } else {
        card.classList.add("hidden");
      }
    } else {
      card.classList.add("hidden");
    }
  });
}

function filterByStatus(status) {
  currentStatusFilter = status;

  document.querySelectorAll('[id^="filter-btn-"]').forEach((btn) => {
    btn.className =
      "bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition";
  });
  document.getElementById(`filter-btn-${status}`).className =
    "bg-brand-emerald text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition";

  const cards = document.querySelectorAll("#surahs-container > div");
  cards.forEach((card) => {
    const matchesStatus = status === "all" || card.dataset.status === status;
    const query = document.getElementById("search-surah-input").value.trim();
    const matchesSearch = query === "" || card.dataset.name.includes(query);

    if (matchesStatus && matchesSearch) {
      card.classList.remove("hidden");
    } else {
      card.classList.add("hidden");
    }
  });
}

function switchTab(tabId) {
  activeTab = tabId;

  document.querySelectorAll('[id^="tab-btn-"]').forEach((btn) => {
    btn.className =
      "px-5 py-3 font-semibold text-sm transition-all duration-200 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-2 whitespace-nowrap";
  });
  document.getElementById(`tab-btn-${tabId}`).className =
    "px-5 py-3 font-semibold text-sm transition-all duration-200 border-b-2 border-brand-emerald text-brand-emerald flex items-center gap-2 whitespace-nowrap";

  document.getElementById("tab-content-surahs").classList.add("hidden");
  document.getElementById("tab-content-juzs").classList.add("hidden");
  document.getElementById("tab-content-history").classList.add("hidden");

  document.getElementById(`tab-content-${tabId}`).classList.remove("hidden");
}

let currentConfirmCallback = null;

function openCustomConfirm(title, message, onConfirm) {
  document.getElementById("modal-title").innerText = title;
  document.getElementById("modal-message").innerText = message;

  const confirmBtn = document.getElementById("modal-confirm-btn");
  confirmBtn.className =
    "px-4 py-2 bg-brand-emerald hover:bg-brand-dark text-white text-sm font-semibold rounded-xl transition";
  confirmBtn.innerText = "تأكيد الإجراء";

  currentConfirmCallback = onConfirm;

  const modal = document.getElementById("custom-modal");
  modal.classList.remove("hidden");
  setTimeout(() => {
    modal.classList.remove("opacity-0");
    document.getElementById("modal-card").classList.remove("translate-y-4");
  }, 50);

  confirmBtn.onclick = function () {
    if (currentConfirmCallback) currentConfirmCallback();
    closeCustomModal();
  };
}

function openResetModal() {
  openCustomConfirm(
    "تهيئة وتصفير الحساب",
    "تحذير هام: هل أنت متأكد من رغبتك في إعادة ضبط وإعادة تصفير جميع الصفحات المحفوظة وحذف تقدمك في القرآن الكريم؟ لا يمكن التراجع عن هذا الإجراء مطلقاً.",
    function () {
      for (let p = 1; p <= 604; p++) {
        pageStates[p] = 0;
      }
      streakCount = 0;
      lastActivityDate = "";
      historyLogs = [
        {
          id: Date.now(),
          date: new Date().toLocaleDateString("ar-EG"),
          text: "تمت تهيئة تتبع التقدم بالكامل وإعادة المصحف لحالته الأولى.",
        },
      ];

      saveToLocalStorage();
      renderDashboard();
      renderSurahsGrid();
      renderJuzGrid();
      renderHistoryLogs();
      updateDailyTarget();
    },
  );
}

function closeCustomModal() {
  const modal = document.getElementById("custom-modal");
  modal.classList.add("opacity-0");
  document.getElementById("modal-card").classList.add("translate-y-4");
  setTimeout(() => {
    modal.classList.add("hidden");
  }, 300);
  currentConfirmCallback = null;
}
