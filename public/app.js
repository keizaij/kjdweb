// ====== 設定（あなたの Hosting パスに合わせて書く） ======
const MANIFEST_URL = '/_manifest.json';
const SEARCH_SOURCE_URL = '/_search_source.json';


// =========================
// 記事リスト描画（号数グループ / フラット両対応）
// =========================
function renderArticles(list, options = {}) {
  const container = document.getElementById("searchResults");
  if (!container) return;

  const mode = options.mode || "grouped"; // "grouped" or "flat"

  if (!Array.isArray(list) || list.length === 0) {
    container.innerHTML =
      '<div class="search-message">該当する記事はありません。</div>';
    return;
  }

  if (mode === "flat") {
    renderFlatList(container, list);
  } else {
    renderGroupedList(container, list);
  }
}

// 号数ごとにまとめて表示
function renderGroupedList(container, list) {
  // 号数↓（新しい号が上）→ 同じ号の中は sequenceNum 昇順
  const sorted = [...list].sort((a, b) => {
    const ai = Number(getIssueInfo(a).issue || "0");
    const bi = Number(getIssueInfo(b).issue || "0");
    if (ai !== bi) return bi - ai;

    const as = a.sequenceNum ?? 999;
    const bs = b.sequenceNum ?? 999;
    if (as !== bs) return as - bs;

    return String(a.slug || "").localeCompare(String(b.slug || ""));
  });

  // 号数 + 日付でグループ化
  const groups = [];
  const map = new Map();

  for (const art of sorted) {
    const { issue, publishDate } = getIssueInfo(art);
    const key = `${issue}|${publishDate}`;
    let g = map.get(key);
    if (!g) {
      g = { issue, publishDate, items: [] };
      map.set(key, g);
      groups.push(g);
    }
    g.items.push(art);
  }

  const frag = document.createDocumentFragment();

  for (const g of groups) {
    const sec = document.createElement("section");
    sec.className = "issue-group";

    const h = document.createElement("h2");
    h.className = "issue-group-header";
    const issueLabel = g.issue ? `No.${g.issue}` : "";
    const dateLabel = g.publishDate ? `(${g.publishDate})` : "";
    h.textContent = `${issueLabel}${dateLabel}`;
    sec.appendChild(h);

    const ul = document.createElement("ul");
    ul.className = "issue-group-list";

    for (const art of g.items) {
      const li = document.createElement("li");
      li.className = "issue-group-item";

      const a = document.createElement("a");
      a.href = "#";
      a.className = "article-link";

      const slug = String(art.slug || art.articleId || "");
      if (slug) a.dataset.slug = slug;

      a.textContent = art.title || "";

      li.appendChild(a);
      ul.appendChild(li);
    }

    sec.appendChild(ul);
    frag.appendChild(sec);
  }

  container.innerHTML = "";
  container.appendChild(frag);
}

// 検索・カテゴリ別用のフラット表示
function renderFlatList(container, list) {
  const frag = document.createDocumentFragment();

  for (const art of list) {
    const { issue, publishDate } = getIssueInfo(art);

    const row = document.createElement("div");
    row.className = "article-row";

    const a = document.createElement("a");
    a.href = "#";
    a.className = "article-link";
    const slug = String(art.slug || art.articleId || "");
    if (slug) a.dataset.slug = slug;
    a.textContent = art.title || "";

    const meta = document.createElement("span");
    meta.className = "issue-label";
    const issueLabel = issue ? `No.${issue}` : "";
    const dateLabel = publishDate ? `(${publishDate})` : "";
    meta.textContent = `【${issueLabel}${dateLabel}】`;

    row.appendChild(a);
    row.appendChild(meta);
    frag.appendChild(row);
  }

  container.innerHTML = "";
  container.appendChild(frag);
}

// 記事から号数と日付を取り出してラベル用に整形
function getIssueInfo(article) {
  // 号数は基本 issue フィールド、なければ slug 先頭4桁
  let issue = (article.issue || "").toString().replace(/\D/g, "");
  if (!issue && article.slug) issue = String(article.slug).slice(0, 4);

  const publishDate = article.publishDate || ""; // "2025/08/08" 想定

  return { issue, publishDate };
}

// =========================
// カテゴリプルダウンの構築
// =========================
function populateCategoryFilter(categoryMap) {
  const select = document.getElementById("categoryFilter");
  if (!select) return;

  // 先頭の「すべて」だけ残して中身を作り直す
  let firstOption = select.options[0] || null;
  select.innerHTML = "";

  if (!firstOption) {
    firstOption = document.createElement("option");
    firstOption.value = "all";
    firstOption.textContent = "すべて";
  } else {
    firstOption.value = "all";
    firstOption.textContent = firstOption.textContent || "すべて";
  }
  select.appendChild(firstOption);

  const entries = Object.entries(categoryMap || {});
  // 名前順（日本語）でソート
  entries.sort((a, b) => a[1].localeCompare(b[1], "ja"));

  for (const [id, name] of entries) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = name;
    select.appendChild(opt);
  }
}

// =========================
// 年プルダウンの構築（publishDate 先頭4桁から）
// =========================
function populateYearFilterFromArticles(articles) {
  const select = document.getElementById("yearFilter");
  if (!select) return;

  // 現在選択されている値を一応覚えておく
  const current = select.value || "all";

  const yearsSet = new Set();

  (articles || []).forEach(a => {
    const d = a.publishDate || a.date || "";
    if (!d) return;
    const y = String(d).slice(0, 4).replace(/\D/g, "");
    if (y.length === 4) {
      yearsSet.add(y);
    }
  });

  // 年が1つも取れなければ何もしない（初期状態"すべての年"のまま）
  if (!yearsSet.size) return;

  // 「すべての年」＋ 年降順
  const years = Array.from(yearsSet).sort((a, b) => b.localeCompare(a, "ja"));

  select.innerHTML = "";

  const optAll = document.createElement("option");
  optAll.value = "all";
  optAll.textContent = "すべての年";
  select.appendChild(optAll);

  years.forEach(y => {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y + "年";
    select.appendChild(opt);
  });

  // 以前の選択がまだ有効なら維持する
  if (current !== "all" && years.includes(current)) {
    select.value = current;
  } else {
    select.value = "all";
  }
}


// =========================
// 記事一覧ローダー
// =========================
async function loadCategoriesThenArticles() {
  const setMsg = (html) => {
    const el = document.getElementById("searchResults");
    if (el) el.innerHTML = html;
  };
  setMsg('<div class="search-message">記事を読み込み中...</div>');

  try {
    // 1) カテゴリ辞書を読み込み
    let categoryMap = {};
    try {
      const catRes = await fetch("/indexes/categories.json", {
        cache: "no-store",
      });
      if (catRes.ok) {
        categoryMap = await catRes.json();
      }
    } catch (e) {
      console.warn("[INDEX] categories.json 読み込み失敗:", e);
    }
    window.categoryMap = categoryMap;
    console.log("[INDEX] categoryMap =", categoryMap);
    populateCategoryFilter(categoryMap);

    // 2) 記事一覧の候補URL（今はマニフェスト 1 本だけ）
    const candidateListUrls = ["/_manifest.json"]; 

    // 3) 最初に成功した一覧 JSON を採用
    let rawList = null;
    let fromManifest = false;
    let usedUrl = "";

    for (const url of candidateListUrls) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) continue;

        const txt = await res.text();
        if (txt.trim().startsWith("<")) continue; // HTML ならスキップ
        const json = JSON.parse(txt);

        // a) 通常の articles 配列
        if (Array.isArray(json.articles)) {
          rawList = json.articles;
          usedUrl = url;
          break;
        }
        // b) items / list / data など名前違い
        if (Array.isArray(json.items)) {
          rawList = json.items;
          usedUrl = url;
          break;
        }
        if (Array.isArray(json.list)) {
          rawList = json.list;
          usedUrl = url;
          break;
        }
        if (Array.isArray(json.data)) {
          rawList = json.data;
          usedUrl = url;
          break;
        }
        // c) マニフェスト形式（個別ファイルの配列）
        if (Array.isArray(json.files)) {
          rawList = json.files;
          usedUrl = url;
          fromManifest = true;
          break;
        }
        if (Array.isArray(json.entries)) {
          rawList = json.entries;
          usedUrl = url;
          fromManifest = true;
          break;
        }
      } catch (e) {
        console.warn("[INDEX] 一覧候補の取得失敗:", url, e);
      }
    }

    if (!rawList) {
      throw new Error("記事一覧の取得に失敗（候補全滅）");
    }

    // 4) マニフェスト形式なら title 等を整形
    let articles = [];
    if (fromManifest) {
      // 期待する要素の形：
      //   { slug:"215301", title:"...", path:"/build_plain_articles/215301.json",
      //     publishDate:"YYYY/MM/DD", categoryIds:["..."] }
      articles = rawList.map((x) => {
        const slug = String(x.slug || x.articleId || x.id || "").trim();
        const path =
          x.path || (slug ? `/build_plain_articles/${slug}.json` : "");
        const catNames = (x.categoryIds || []).map(
          (id) => (categoryMap?.[id] || id)
        );
        return {
          slug,
          articleId: x.articleId || slug || "",
          title: x.title || "",
          publishDate: x.publishDate || x.date || "",
          categoryIds: x.categoryIds || [],
          category: catNames.join(", "),
          _plainPath: path,
        };
      });
    } else {
      // ふつうの集約JSONだった場合
      articles = rawList.map((a) => {
        const slug = String(a.slug || a.articleId || a.id || "").trim();
        const catNames = (a.categoryIds || []).map(
          (id) => (categoryMap?.[id] || id)
        );
        return {
          ...a,
          slug,
          articleId: a.articleId || slug || "",
          category: catNames.join(", "),
        };
      });
    }

    if (!articles.length) {
      setMsg(
        '<div class="search-message">現在、公開されている記事はありません。</div>'
      );
      return;
    }

// ★ isHidden フィルタ：非表示記事を除外する
articles = articles.filter(a => !a.isHidden);
    window.allArticles = articles;

    // 年フィルタを articles から構築
    try {
      populateYearFilterFromArticles(articles);
    } catch (e) {
      console.warn("[INDEX] populateYearFilterFromArticles error:", e);
    }

    // 最初は号数グループ表示
    renderArticles(articles, { mode: "grouped" });

    console.log("[INDEX] ok from:", usedUrl, "count=", articles.length);

  } catch (err) {
    console.error("[INDEX] loadCategoriesThenArticles failed:", err);
    setMsg(
      '<div class="search-message">記事データの読み込みに失敗しました。</div>'
    );
  }
}

// =========================
// 年・カテゴリ・全文検索（静的インデックス）
// =========================

// 静的インデックス（/indexes/search-index.json）をキャッシュ
let staticSearchIndex   = null;
let staticSearchLoaded  = false;
let staticSearchLoading = false;

/**
 * 年・カテゴリの条件に合う記事一覧を allArticles から絞り込む
 */
function filterBaseArticlesByYearCategory() {
  const yearSel     = document.getElementById("yearFilter");
  const categorySel = document.getElementById("categoryFilter");

  const year     = yearSel ? yearSel.value : "all";
  const category = categorySel ? categorySel.value : "all";

  let base = Array.isArray(window.allArticles) ? [...window.allArticles] : [];

  // 年フィルタ（publishDate 先頭4桁）
  if (year !== "all") {
    base = base.filter((a) => {
      const y = a.publishDate ? String(a.publishDate).slice(0, 4) : "";
      return y === year;
    });
  }

  // カテゴリフィルタ
  if (category !== "all") {
    base = base.filter((a) => {
      // categoryIds 配列優先
      if (Array.isArray(a.categoryIds) && a.categoryIds.includes(category)) {
        return true;
      }
      // category の文字列にも一応対応
      if (a.category) {
        const cats = String(a.category)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        return cats.includes(category);
      }
      return false;
    });
  }

  return { base, year, category };
}

// =========================
// /indexes/search-index.json または /_search_source.json を読み込み
// 形式は { docs:[...] } / { items:[...] } / [...] / { key: obj, ... } のどれでもOK
// =========================
async function loadStaticSearchIndex() {
  if (staticSearchLoaded && staticSearchIndex) return staticSearchIndex;

  if (staticSearchLoading) {
    while (staticSearchLoading) {
      await new Promise((r) => setTimeout(r, 50));
    }
    return staticSearchIndex;
  }

  staticSearchLoading = true;

  try {
    // ★ここだけパスを合わせる
    const res = await fetch("/build_plain_articles/_search_source.json", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("_search_source.json が見つかりません");
    }
    const json = await res.json();

    // 🔹 オブジェクトの中の文字列を全部つなげて1本のテキストにするヘルパー
    const collectStrings = (v) => {
      const buf = [];
      const walk = (x) => {
        if (x == null) return;
        if (typeof x === "string") {
          buf.push(x);
        } else if (Array.isArray(x)) {
          for (const y of x) walk(y);
        } else if (typeof x === "object") {
          for (const k in x) {
            if (Object.prototype.hasOwnProperty.call(x, k)) {
              walk(x[k]);
            }
          }
        }
      };
      walk(v);
      return buf.join(" ");
    };

    let docsArray;

    // ★ここを最優先：articles 配列があればそれを使う
    if (Array.isArray(json?.articles)) {
      docsArray = json.articles.map((d, idx) => {
        const rawId = String(d.slug || d.articleId || d.id || idx);
        const numericId = rawId.replace(/\D/g, "") || rawId;
        return {
          ...d,
          id: numericId,
          slug: d.slug || numericId,
          articleId: d.articleId || numericId,
          text: d.text || collectStrings(d),
        };
      });
    } else if (Array.isArray(json?.docs)) {
      // 形式: { "docs": [ { slug, articleId, text, ... }, ... ] }
      docsArray = json.docs.map((d, idx) => {
        const rawId = String(d.slug || d.articleId || d.id || idx);
        const numericId = rawId.replace(/\D/g, "") || rawId;
        return {
          ...d,
          id: numericId,
          slug: d.slug || numericId,
          articleId: d.articleId || numericId,
          text: d.text || collectStrings(d),
        };
      });
    } else if (Array.isArray(json)) {
      // 形式: [ { slug, articleId, text, ... }, ... ]
      docsArray = json.map((d, idx) => {
        const rawId = String(d.slug || d.articleId || d.id || idx);
        const numericId = rawId.replace(/\D/g, "") || rawId;
        return {
          ...d,
          id: numericId,
          slug: d.slug || numericId,
          articleId: d.articleId || numericId,
          text: d.text || collectStrings(d),
        };
      });
    } else if (json && typeof json === "object") {
      // 汎用フォールバック: { "215303": { ... }, ... } みたいな場合用
      docsArray = Object.entries(json).map(([id, value]) => {
        const rawId = String(id);
        const numericId = rawId.replace(/\D/g, "") || rawId;
        return {
          id: numericId,
          slug: numericId,
          articleId: numericId,
          text: collectStrings(value),
        };
      });
    } else {
      docsArray = [];
    }

    staticSearchIndex = docsArray;
    staticSearchLoaded = true;

    console.log(
      "[SEARCH] static index loaded from /_search_source.json. docs =",
      staticSearchIndex.length
    );
    if (staticSearchIndex.length > 0) {
      console.log("[SEARCH] sample doc =", staticSearchIndex[0]);
    }

    return staticSearchIndex;
  } finally {
    staticSearchLoading = false;
  }
}

// クエリの正規化（とりあえず trim のみ）
function normalizeQuery(q) {
  return (q || "").trim();
}

// 日本語2文字でもまとめて扱うシンプル版（スペースで分割）
function simpleTokenize(str) {
  const s = String(str || "").trim();
  if (!s) return [];
  // 全角スペースも含めて区切る
  return s
    .split(/[ \u3000]+/)
    .map(t => t.trim())
    .filter(Boolean);
}


/**
 * 年・カテゴリ・キーワードを総合して検索→描画
 */
async function doSearchAndRender() {
  const searchBox = document.getElementById("searchInput");
  const yearSel   = document.getElementById("yearFilter");
  const catSel    = document.getElementById("categoryFilter");
  const resultEl  = document.getElementById("searchResults");

  const query = normalizeQuery(searchBox ? searchBox.value : "");
  const year  = (yearSel ? yearSel.value : "all").trim();
  const cat   = (catSel ? catSel.value : "all").trim();

  // まずは年・カテゴリだけで絞り込み
  const { base } = filterBaseArticlesByYearCategory();

  // 🔹クエリが空なら、年&カテゴリのみ
  if (!query) {
    const isYearSpecific = year !== "all";
    const isCatSpecific  = cat  !== "all";

    let mode = "grouped";
    if (isYearSpecific || isCatSpecific) {
      mode = "flat";
    }

    renderArticles(base, { mode });

    if (base.length === 0 && resultEl) {
      resultEl.innerHTML =
        '<div class="search-message">該当する記事はありません。</div>';
    }
    return;
  }

  // 🔹検索中メッセージ
  if (resultEl) {
    resultEl.innerHTML = '<div class="search-message">検索中...</div>';
  }

  // 🔹静的インデックス読み込み
  let docs;
  try {
    docs = await loadStaticSearchIndex();
  } catch (e) {
    console.error("[SEARCH] 静的インデックス読み込み失敗:", e);
    // フォールバック: タイトルだけで検索
    const qLower = query.toLowerCase();
    const fallback = base.filter((a) =>
      (a.title || "").toLowerCase().includes(qLower)
    );
    renderArticles(fallback, { mode: "flat" });
    if (!fallback.length && resultEl) {
      resultEl.innerHTML =
        '<div class="search-message">該当する記事はありません。</div>';
    }
    return;
  }

  const tokens = simpleTokenize(query);
  if (!tokens.length) {
    renderArticles(base, { mode: "flat" });
    return;
  }

  // 🔹 docs の想定: { slug, articleId, text } の配列
  const hits = [];
  outer: for (const d of docs) {
    const text = String(d.text || "").toLowerCase();
    if (!text) continue; // 空テキストはスキップ
    for (const t of tokens) {
      if (!text.includes(t.toLowerCase())) {
        continue outer;
      }
    }
    hits.push(d);
  }

  // 🔹 今の年&カテゴリ条件に合う slug/ID だけに絞る
  const allowedIds = new Set();
  const idToArticle = new Map();

  for (const a of base) {
    const rawId = String(a.slug || a.articleId || "").trim();
    if (!rawId) continue;

    // そのままのID
    allowedIds.add(rawId);
    idToArticle.set(rawId, a);

    // 数字だけのIDも許可（"215301.json" と "215301" のズレ吸収）
    const numericId = rawId.replace(/\D/g, "");
    if (numericId && numericId !== rawId) {
      allowedIds.add(numericId);
      if (!idToArticle.has(numericId)) {
        idToArticle.set(numericId, a);
      }
    }
  }

  const finalList = [];
  for (const d of hits) {
    let id = String(d.slug || d.articleId || d.id || "").trim();
    if (!id) continue;

    let numericId = id.replace(/\D/g, "");

    const candidates = [id];
    if (numericId && numericId !== id) {
      candidates.push(numericId);
    }

    let foundArticle = null;
    for (const cid of candidates) {
      if (allowedIds.has(cid)) {
        foundArticle = idToArticle.get(cid);
        if (foundArticle) break;
      }
    }

    if (foundArticle) {
      finalList.push(foundArticle);
    }
  }

  // 🔹 もし全文インデックスではヒットしたのに ID がズレている場合
  //    → タイトル・カテゴリの単純検索でフォールバック
  if (!finalList.length) {
    const qLower = query.toLowerCase();
    const fallback = base.filter((a) => {
      const t = String(a.title || "").toLowerCase();
      const c = String(a.category || "").toLowerCase();
      return t.includes(qLower) || c.includes(qLower);
    });

    renderArticles(fallback, { mode: "flat" });
    if (!fallback.length && resultEl) {
      resultEl.innerHTML =
        '<div class="search-message">該当する記事はありません。</div>';
    }
    return;
  }

// ★ 非表示除外
const visibleList = finalList.filter(a => !a.isHidden);

  renderArticles(finalList, { mode: "flat" });

  if (!finalList.length && resultEl) {
    resultEl.innerHTML =
      '<div class="search-message">該当する記事はありません。</div>';
  }}

// ===============================
// 記事一覧ロード本体 (GitHub _manifest.json)
// ===============================

// ★ここを「kjdweb-data のサイトURL」に差し替え
const DATA_ORIGIN = "";
const manifestUrl = "/_manifest.json";
// 例： "https://kjdweb-data.web.app" や "https://data.example.com" など

// ここから新しい loadArticles 本体
async function loadArticles() {
  console.log('[LOAD] start');

  const res = await fetch('/_manifest.json', { cache: 'no-store' });
  if (!res.ok) {
    console.error('[LOAD] manifest HTTP error', res.status);
    throw new Error('manifest load failed: ' + res.status);
  }

  const manifest = await res.json();

  let items;

  if (Array.isArray(manifest)) {
    items = manifest;
  } else if (Array.isArray(manifest.articles)) {
    items = manifest.articles;
  } else if (Array.isArray(manifest.items)) {
    items = manifest.items;
  } else if (manifest && typeof manifest === 'object') {
    items = Object.values(manifest);
  } else {
    items = [];
  }

  console.log('[LOAD] manifest ok, items =', items.length);

  if (!items.length) {
    window.allArticles = [];
    renderArticles([], { mode: 'default' });
    return;
  }

  const now = new Date();
  const NEW_DAYS = 14;

  window.allArticles = items.map((raw) => {
    const articleId =
      raw.articleId ||
      raw.slug ||
      raw.id ||
      String(raw.issue || raw.issueNumber || '');

    const publishDate =
      raw.publishDate ||
      raw.date ||
      raw.pub_date ||
      '';

    let isNew = false;
    if (publishDate) {
      const d = new Date(publishDate.replace(/-/g, '/'));
      if (!isNaN(d)) {
        const diff = (now - d) / (1000 * 60 * 60 * 24);
        isNew = diff >= 0 && diff <= NEW_DAYS;
      }
    }

    const catIds =
      raw.categoryIds ||
      raw.category_ids ||
      (Array.isArray(raw.categories) ? raw.categories : []);
    const catName =
      raw.category ||
      raw.categoryName ||
      '';

    return {
      articleId,
      slug: articleId,
      title: raw.title || '(無題)',
      publishDate,
      issueNumber: raw.issue || raw.issueNumber || '',
      category: catName,
      categoryIds: catIds,
      isNewArticle: !!(raw.isNewArticle ?? isNew),
    };
  });

  try {
    populateFilters(window.allArticles);
  } catch (e) {
    console.warn('[LOAD] populateFilters error', e);
  }

  try {
    populateCategoryFilter(window.allArticles, window.categoryMap || {});
  } catch (e) {
    console.warn('[LOAD] populateCategoryFilter error', e);
  }

  try {
    renderArticles(window.allArticles, { mode: 'default' });
  } catch (e) {
    console.warn('[LOAD] renderArticles error', e);
  }

  try {
    initSearchUI();
  } catch (e) {
    console.warn('[LOAD] initSearchUI error', e);
  }

  console.log('[LOAD] done');
} // ←←← ここで「本体の」カッコ閉じる

// ===============================
// グローバル公開：HTML 側のハンドラ
// ===============================
window.loadCategoriesThenArticles = loadCategoriesThenArticles;
window.loadArticles = function () {
  try {
    loadCategoriesThenArticles();
  } catch (e) {
    console.error('[BOOT] loadArticles failed:', e);
    const el = document.getElementById('searchResults');
    if (el) {
      el.innerHTML =
        '<div class="search-message">記事データの読み込みに失敗しました。</div>';
    }
  }
}; // ← ラッパーの function を閉じる



// 検索・フィルタボタン / onkeyup から呼ばれる関数
window.search = function () {
  doSearchAndRender().catch((e) => {
    console.error("[SEARCH] search error:", e);
    const el = document.getElementById("searchResults");
    if (el) {
      el.innerHTML =
        '<div class="search-message">検索中にエラーが発生しました。</div>';
    }
  });
};

window.filterResults = function () {
  window.search();
};

// 旧HTML互換：onkeyup="searchArticles()" 用
window.searchArticles = function () {
  if (typeof window.search === "function") {
    window.search();
  }
};

window.resetSearch = function () {
  const searchBox   = document.getElementById("searchInput");
  const yearSel     = document.getElementById("yearFilter");
  const categorySel = document.getElementById("categoryFilter");

  if (searchBox)   searchBox.value   = "";
  if (yearSel)     yearSel.value     = "all";
  if (categorySel) categorySel.value = "all";

  const list = Array.isArray(window.allArticles) ? window.allArticles : [];
  renderArticles(list, { mode: "grouped" });

  const el = document.getElementById("searchResults");
  if (el && !list.length) {
    el.innerHTML =
      '<div class="search-message">該当する記事はありません。</div>';
  }
};
