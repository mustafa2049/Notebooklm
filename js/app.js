/* Takvimli NoFap — çevrimdışı seri takibi
   Tüm veriler localStorage'da tutulur, hiçbir yere gönderilmez. */
(() => {
  'use strict';

  const STORAGE_KEY = 'nofap-takvim-v1';

  const TRIGGERS = [
    'Stres', 'Yalnızlık', 'Can sıkıntısı', 'Sosyal medya',
    'Uykusuzluk', 'Gece geç saat', 'Yorgunluk', 'Tartışma'
  ];

  const MILESTONES = [
    { d: 1,   n: 'İlk adım',    i: '🌱' },
    { d: 3,   n: 'Kıvılcım',    i: '🔥' },
    { d: 7,   n: 'Bir hafta',   i: '⭐' },
    { d: 14,  n: 'İki hafta',   i: '💪' },
    { d: 21,  n: 'Alışkanlık',  i: '🧠' },
    { d: 30,  n: 'Bir ay',      i: '🏅' },
    { d: 60,  n: 'İki ay',      i: '🛡️' },
    { d: 90,  n: 'Yeniden doğuş', i: '🦅' },
    { d: 180, n: 'Altı ay',     i: '💎' },
    { d: 365, n: 'Bir yıl',     i: '👑' }
  ];

  const QUOTES = [
    'Bu istek bir dalga. Binmezsen kendi kendine kırılır. Ortalama 15 dakika sürer.',
    'Bugün vazgeçersen dünkü emeğin de gider. Yarınki sen bu anı hatırlayacak.',
    'İstek "hemen" der. Sen "20 dakika sonra konuşuruz" de. Genelde geri gelmez.',
    'Yalnız kalma. Kalk, odayı değiştir, dışarı çık, birine yaz.',
    'Sıfırlanmak bir felaket değil ama gereksiz. Seriyi korumak her zaman daha kolaydır.',
    'Ekranı kapat, telefonu başka odaya bırak, 20 şınav çek. Beynini yeniden başlat.',
    'Her "hayır" bir sonrakini kolaylaştırır. Beyin de kas gibi çalışır.',
    'İlerlemek düz bir çizgi değildir. Düşersen kaldığın yerden değil, ayağa kalktığın yerden devam et.',
    'Şu an hissettiğin şey acele. Acele hiç iyi karar verdirmedi.',
    'Kendine sor: 10 dakika sonra bunu yapmış olmaktan memnun olacak mıyım?'
  ];

  /* ---------- Tarih yardımcıları ---------- */
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = k => {
    const [y, m, d] = k.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  };
  const todayKey = () => keyOf(new Date());
  const addDays = (k, n) => {
    const d = parseKey(k);
    d.setDate(d.getDate() + n);
    return keyOf(d);
  };
  const diffDays = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);

  const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
    'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const DAYS_LONG = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  const fmtLong = k => {
    const d = parseKey(k);
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${DAYS_LONG[d.getDay()]}`;
  };
  const fmtShort = k => {
    const d = parseKey(k);
    return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  };
  /* Pazartesi = 0 olacak şekilde hafta günü */
  const dowMon = d => (d.getDay() + 6) % 7;

  /* ---------- Durum ---------- */
  const defaults = () => ({
    version: 1,
    startDate: todayKey(),
    goal: 90,
    theme: 'dark',
    days: {}
  });

  let state = load();
  let viewMonth = new Date();
  let viewYear = new Date().getFullYear();
  let editingKey = null;
  let draft = null;
  let breathTimer = null;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults();
      const parsed = JSON.parse(raw);
      return Object.assign(defaults(), parsed, { days: parsed.days || {} });
    } catch (e) {
      console.warn('Kayıt okunamadı, sıfırdan başlanıyor.', e);
      return defaults();
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      toast('Kaydedilemedi — tarayıcı depolaması dolu olabilir.');
    }
  }

  const dayOf = k => state.days[k] || null;

  function setDay(k, patch) {
    const cur = state.days[k] || { status: null, mood: null, note: '', triggers: [] };
    const next = Object.assign(cur, patch);
    const empty = !next.status && !next.mood && !(next.note || '').trim() && !(next.triggers || []).length;
    if (empty) delete state.days[k];
    else state.days[k] = next;
    save();
  }

  /* ---------- Hesaplamalar ---------- */
  function relapseKeys() {
    return Object.keys(state.days)
      .filter(k => state.days[k].status === 'relapse')
      .sort();
  }

  function stats() {
    const today = todayKey();
    const start = state.startDate > today ? today : state.startDate;
    const relapses = relapseKeys().filter(k => k >= start && k <= today);

    // Güncel seri: son kaymadan (yoksa başlangıçtan) bugüne kadar
    const last = relapses.length ? relapses[relapses.length - 1] : null;
    const base = last ? addDays(last, 1) : start;
    const current = base > today ? 0 : diffDays(base, today) + 1;

    // En uzun seri: kaymalarla bölünmüş aralıkların en uzunu
    let longest = 0;
    let segStart = start;
    for (const r of relapses) {
      const segEnd = addDays(r, -1);
      if (segEnd >= segStart) longest = Math.max(longest, diffDays(segStart, segEnd) + 1);
      segStart = addDays(r, 1);
    }
    if (segStart <= today) longest = Math.max(longest, diffDays(segStart, today) + 1);
    longest = Math.max(longest, current);

    const total = diffDays(start, today) + 1;
    const clean = total - relapses.length;
    const rate = total > 0 ? Math.round((clean / total) * 100) : 0;

    return { current, longest, clean, total, relapses: relapses.length, rate, lastRelapse: last };
  }

  /* Bir günün takvimdeki durumu */
  function dayStatus(k) {
    const today = todayKey();
    const rec = dayOf(k);
    if (rec && rec.status === 'relapse') return 'relapse';
    if (k > today) return 'future';
    if (k < state.startDate) return 'out';
    return 'clean';
  }

  /* ---------- Kısa yollar ---------- */
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }

  /* ---------- Görünüm: özet ---------- */
  function renderHero() {
    const s = stats();
    const goal = Math.max(1, Number(state.goal) || 90);
    const pct = Math.min(1, s.current / goal);
    const C = 2 * Math.PI * 52;

    $('#ringFg').style.strokeDashoffset = String(C * (1 - pct));
    $('#ringFg').style.stroke = s.current === 0 ? 'var(--warn)' : 'var(--accent)';
    $('#streakDays').textContent = s.current;
    $('#goalText').textContent = `${s.current} / ${goal}`;

    if (s.current === 0) {
      $('#streakTitle').textContent = 'Yeni bir başlangıç';
      $('#streakSub').textContent = s.lastRelapse
        ? `Son kayma: ${fmtLong(s.lastRelapse)}. Yarın 1. gün.`
        : 'Bugünü işaretleyerek başla.';
    } else {
      $('#streakTitle').textContent = `${s.current}. gündesin`;
      $('#streakSub').textContent = `Seri başlangıcı: ${fmtLong(addDays(todayKey(), -(s.current - 1)))}`;
    }

    const next = MILESTONES.find(m => m.d > s.current);
    $('#nextMilestone').textContent = next
      ? `${next.i} ${next.n} — ${next.d - s.current} gün`
      : '👑 Hepsi tamam';

    $('#stLongest').textContent = s.longest;
    $('#stClean').textContent = s.clean;
    $('#stRelapse').textContent = s.relapses;
    $('#stRate').textContent = `%${s.rate}`;

    const t = dayOf(todayKey());
    $('#checkinBtn').textContent = t && t.status === 'clean' ? 'Bugün işaretlendi ✓' : 'Bugünü İşaretle';
  }

  /* ---------- Görünüm: takvim ---------- */
  function renderCalendar() {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    $('#monthLabel').textContent = `${MONTHS[m]} ${y}`;

    const grid = $('#calGrid');
    grid.textContent = '';

    const first = new Date(y, m, 1);
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const lead = dowMon(first);
    const today = todayKey();
    const frag = document.createDocumentFragment();

    for (let i = 0; i < lead; i++) {
      const b = document.createElement('div');
      b.className = 'day blank';
      frag.appendChild(b);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const k = `${y}-${pad(m + 1)}-${pad(d)}`;
      const st = dayStatus(k);
      const rec = dayOf(k);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `day ${st}`;
      if (k === today) btn.classList.add('today');
      btn.textContent = String(d);
      btn.dataset.key = k;

      const labels = { clean: 'temiz', relapse: 'kayma', future: 'gelecek', out: 'başlangıç öncesi' };
      btn.title = `${fmtLong(k)} — ${labels[st]}`;
      btn.setAttribute('aria-label', btn.title);

      if (st === 'future' || st === 'out') btn.disabled = true;

      if (rec && ((rec.note || '').trim() || rec.mood)) {
        const dot = document.createElement('i');
        dot.className = 'mark';
        btn.appendChild(dot);
      }
      frag.appendChild(btn);
    }
    grid.appendChild(frag);
  }

  /* ---------- Görünüm: yıllık ısı haritası ---------- */
  function renderHeatmap() {
    $('#yearLabel').textContent = String(viewYear);

    const grid = $('#heatGrid');
    const months = $('#heatMonths');
    grid.textContent = '';
    months.textContent = '';

    const jan1 = new Date(viewYear, 0, 1);
    const dec31 = new Date(viewYear, 11, 31);
    const cursor = new Date(jan1);
    cursor.setDate(cursor.getDate() - dowMon(jan1)); // haftanın pazartesisine geri sar

    const today = todayKey();
    let cleanCount = 0, relapseCount = 0;
    let col = 0;
    const monthCols = new Map();
    const frag = document.createDocumentFragment();

    while (cursor <= dec31 || dowMon(cursor) !== 0) {
      const k = keyOf(cursor);
      const cell = document.createElement('div');

      if (cursor.getFullYear() !== viewYear) {
        cell.className = 'heat-cell empty';
      } else {
        const st = dayStatus(k);
        cell.className = `heat-cell ${st}`;
        cell.title = `${fmtLong(k)} — ${st === 'relapse' ? 'kayma' : st === 'clean' ? 'temiz' : 'kayıt yok'}`;
        if (k <= today) {
          if (st === 'relapse') relapseCount++;
          else if (st === 'clean') cleanCount++;
        }
        if (dowMon(cursor) === 0 && !monthCols.has(cursor.getMonth())) {
          monthCols.set(cursor.getMonth(), col);
        }
      }
      frag.appendChild(cell);

      if (dowMon(cursor) === 6) col++;
      cursor.setDate(cursor.getDate() + 1);
    }
    grid.appendChild(frag);

    const mFrag = document.createDocumentFragment();
    const lastCol = col;
    let prev = 0;
    for (const [mi, c] of [...monthCols.entries()].sort((a, b) => a[1] - b[1])) {
      for (let i = prev; i < c; i++) mFrag.appendChild(document.createElement('span'));
      const s = document.createElement('span');
      s.textContent = MONTHS_SHORT[mi];
      mFrag.appendChild(s);
      prev = c + 1;
    }
    for (let i = prev; i <= lastCol; i++) mFrag.appendChild(document.createElement('span'));
    months.appendChild(mFrag);

    $('#yearSummary').textContent = cleanCount + relapseCount === 0
      ? `${viewYear} için kayıt yok.`
      : `${viewYear}: ${cleanCount} temiz gün · ${relapseCount} kayma`;

    // Dar ekranlarda içinde bulunulan aya kaydır
    const scroller = $('.heat-scroll');
    const now = new Date();
    if (viewYear === now.getFullYear()) {
      const ratio = (now.getMonth() + 1) / 12;
      scroller.scrollLeft = Math.max(0, scroller.scrollWidth * ratio - scroller.clientWidth);
    } else {
      scroller.scrollLeft = 0;
    }
  }

  /* ---------- Görünüm: rozetler ---------- */
  function renderBadges() {
    const s = stats();
    const box = $('#badges');
    box.textContent = '';
    for (const m of MILESTONES) {
      const el = document.createElement('div');
      el.className = 'badge' + (s.longest >= m.d ? ' on' : '');
      el.innerHTML =
        `<div class="ico">${m.i}</div><div class="d">${m.d} gün</div><div class="n">${m.n}</div>`;
      el.title = s.longest >= m.d ? 'Kazanıldı' : `${m.d - s.current} gün kaldı`;
      box.appendChild(el);
    }
  }

  /* ---------- Görünüm: günlük ---------- */
  function renderJournal() {
    const box = $('#journal');
    box.textContent = '';
    const keys = Object.keys(state.days)
      .filter(k => {
        const r = state.days[k];
        return (r.note || '').trim() || r.mood || r.status === 'relapse';
      })
      .sort()
      .reverse()
      .slice(0, 20);

    if (!keys.length) {
      const p = document.createElement('p');
      p.className = 'muted small';
      p.textContent = 'Henüz kayıt yok. Takvimden bir güne dokunup not ekleyebilirsin.';
      box.appendChild(p);
      return;
    }

    const faces = { 1: '😣', 2: '🙁', 3: '😐', 4: '🙂', 5: '😄' };
    for (const k of keys) {
      const r = state.days[k];
      const el = document.createElement('div');
      el.className = `entry ${r.status === 'relapse' ? 'relapse' : 'clean'}`;

      const left = document.createElement('div');
      left.innerHTML = `<div class="e-date">${fmtShort(k)}</div>` +
        (r.mood ? `<div class="e-mood">${faces[r.mood]}</div>` : '');

      const right = document.createElement('div');
      const txt = document.createElement('div');
      txt.className = 'e-text';
      txt.textContent = (r.note || '').trim() ||
        (r.status === 'relapse' ? 'Kayma kaydedildi.' : 'Not yok.');
      right.appendChild(txt);

      if ((r.triggers || []).length) {
        const tags = document.createElement('div');
        tags.className = 'e-tags';
        for (const t of r.triggers) {
          const s = document.createElement('span');
          s.textContent = t;
          tags.appendChild(s);
        }
        right.appendChild(tags);
      }

      el.append(left, right);
      box.appendChild(el);
    }
  }

  function renderAll() {
    renderHero();
    renderCalendar();
    renderHeatmap();
    renderBadges();
    renderJournal();
  }

  /* ---------- Gün düzenleme ---------- */
  function openDay(k) {
    editingKey = k;
    const rec = dayOf(k);
    draft = {
      status: rec ? rec.status : (dayStatus(k) === 'clean' ? 'clean' : null),
      mood: rec ? rec.mood : null,
      note: rec ? (rec.note || '') : '',
      triggers: rec ? [...(rec.triggers || [])] : []
    };

    $('#dayTitle').textContent = fmtLong(k);
    $('#dayNote').value = draft.note;
    paintDraft();
    $('#dayModal').hidden = false;
    setTimeout(() => $('#dayNote').focus(), 60);
  }

  function paintDraft() {
    $$('#statusSeg button').forEach(b => {
      const val = b.dataset.status === 'none' ? null : b.dataset.status;
      b.setAttribute('aria-pressed', String(draft.status === val));
    });
    $$('#moodRow button').forEach(b => {
      b.setAttribute('aria-pressed', String(draft.mood === Number(b.dataset.mood)));
    });
    $$('#triggerRow button').forEach(b => {
      b.setAttribute('aria-pressed', String(draft.triggers.includes(b.dataset.trigger)));
    });
    $('#triggerField').hidden = draft.status !== 'relapse';
  }

  function closeModals() {
    $$('.modal').forEach(m => { m.hidden = true; });
    stopBreathing();
  }

  /* ---------- Nefes egzersizi ---------- */
  function stopBreathing() {
    clearTimeout(breathTimer);
    breathTimer = null;
    const c = $('#breathCircle');
    if (c) {
      c.className = 'breath-circle';
      $('#breathText').textContent = 'Hazır';
      $('#breathBtn').textContent = 'Nefes egzersizi';
    }
  }

  function startBreathing() {
    const phases = [
      { cls: 'inhale', text: 'Burnundan al', ms: 4000 },
      { cls: 'hold', text: 'Tut', ms: 7000 },
      { cls: 'exhale', text: 'Ağzından ver', ms: 8000 }
    ];
    const circle = $('#breathCircle');
    const label = $('#breathText');
    let i = 0, cycles = 0;
    $('#breathBtn').textContent = 'Durdur';

    const step = () => {
      const p = phases[i];
      circle.className = 'breath-circle ' + p.cls;
      label.textContent = p.text;
      breathTimer = setTimeout(() => {
        i = (i + 1) % phases.length;
        if (i === 0) cycles++;
        if (cycles >= 4) {
          stopBreathing();
          $('#breathText').textContent = 'Aferin 👏';
          return;
        }
        step();
      }, p.ms);
    };
    step();
  }

  function newQuote() {
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    $('#quote').textContent = q;
  }

  /* ---------- Tema ---------- */
  function applyTheme() {
    document.documentElement.dataset.theme = state.theme === 'light' ? 'light' : 'dark';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', state.theme === 'light' ? '#f5f7fb' : '#0f1115');
  }

  /* ---------- Veri aktarımı ---------- */
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nofap-yedek-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Yedek indirildi.');
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || typeof data !== 'object' || typeof data.days !== 'object') {
          throw new Error('format');
        }
        state = Object.assign(defaults(), data, { days: data.days || {} });
        save();
        applyTheme();
        syncSettingsInputs();
        renderAll();
        toast('Yedek geri yüklendi.');
      } catch (e) {
        toast('Dosya okunamadı — geçerli bir yedek değil.');
      }
    };
    reader.readAsText(file);
  }

  function syncSettingsInputs() {
    $('#startDate').value = state.startDate;
    $('#goalInput').value = state.goal;
  }

  /* ---------- Olaylar ---------- */
  function bind() {
    // Tetikleyici çipleri
    const row = $('#triggerRow');
    for (const t of TRIGGERS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.trigger = t;
      b.textContent = t;
      b.setAttribute('aria-pressed', 'false');
      row.appendChild(b);
    }

    // Takvim
    $('#calGrid').addEventListener('click', e => {
      const btn = e.target.closest('.day');
      if (btn && btn.dataset.key) openDay(btn.dataset.key);
    });
    $('#prevMonth').addEventListener('click', () => {
      viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
      renderCalendar();
    });
    $('#nextMonth').addEventListener('click', () => {
      viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
      renderCalendar();
    });
    $('#todayBtn').addEventListener('click', () => {
      viewMonth = new Date();
      renderCalendar();
    });

    // Isı haritası
    $('#prevYear').addEventListener('click', () => { viewYear--; renderHeatmap(); });
    $('#nextYear').addEventListener('click', () => { viewYear++; renderHeatmap(); });

    // Hızlı işlemler
    $('#checkinBtn').addEventListener('click', () => {
      setDay(todayKey(), { status: 'clean' });
      renderAll();
      const s = stats();
      toast(`Bugün işaretlendi — ${s.current}. gün 💪`);
    });
    $('#relapseBtn').addEventListener('click', () => openDay(todayKey()));

    // Gün penceresi
    $('#statusSeg').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      draft.status = b.dataset.status === 'none' ? null : b.dataset.status;
      if (draft.status !== 'relapse') draft.triggers = [];
      paintDraft();
    });
    $('#moodRow').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      const v = Number(b.dataset.mood);
      draft.mood = draft.mood === v ? null : v;
      paintDraft();
    });
    row.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      const t = b.dataset.trigger;
      draft.triggers = draft.triggers.includes(t)
        ? draft.triggers.filter(x => x !== t)
        : [...draft.triggers, t];
      paintDraft();
    });
    $('#daySave').addEventListener('click', () => {
      draft.note = $('#dayNote').value;
      setDay(editingKey, draft);
      closeModals();
      renderAll();
      toast('Kaydedildi.');
    });
    $('#dayDelete').addEventListener('click', () => {
      delete state.days[editingKey];
      save();
      closeModals();
      renderAll();
      toast('Kayıt silindi.');
    });

    // Ayarlar
    $('#settingsBtn').addEventListener('click', () => {
      syncSettingsInputs();
      $('#settingsModal').hidden = false;
    });
    $('#startDate').addEventListener('change', e => {
      const v = e.target.value;
      if (!v) return;
      if (v > todayKey()) {
        toast('Başlangıç ileri bir tarih olamaz.');
        e.target.value = state.startDate;
        return;
      }
      state.startDate = v;
      save();
      renderAll();
    });
    $('#goalInput').addEventListener('change', e => {
      const v = Math.min(3650, Math.max(1, Number(e.target.value) || 90));
      state.goal = v;
      e.target.value = v;
      save();
      renderHero();
    });
    $('#exportBtn').addEventListener('click', exportData);
    $('#importBtn').addEventListener('click', () => $('#importFile').click());
    $('#importFile').addEventListener('change', e => {
      const f = e.target.files && e.target.files[0];
      if (f) importData(f);
      e.target.value = '';
    });
    $('#resetBtn').addEventListener('click', () => {
      if (!confirm('Tüm kayıtlar kalıcı olarak silinecek. Emin misin?')) return;
      state = defaults();
      save();
      applyTheme();
      syncSettingsInputs();
      closeModals();
      renderAll();
      toast('Her şey sıfırlandı.');
    });

    // Tema
    $('#themeBtn').addEventListener('click', () => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      save();
      applyTheme();
    });

    // Acil durum
    $('#panicBtn').addEventListener('click', () => {
      newQuote();
      $('#panicModal').hidden = false;
    });
    $('#quoteBtn').addEventListener('click', newQuote);
    $('#breathBtn').addEventListener('click', () => {
      if (breathTimer) stopBreathing();
      else startBreathing();
    });

    // Kapatma
    $$('.modal').forEach(m => {
      m.addEventListener('click', e => {
        if (e.target === m || e.target.closest('[data-close]')) closeModals();
      });
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModals();
    });

    // Gece yarısını geçince tazele
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) renderAll();
    });
  }

  /* ---------- Başlat ---------- */
  applyTheme();
  bind();
  syncSettingsInputs();
  renderAll();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
