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
  const latestIssueNum = Number(window.__latestIssueNum || 0);

  // 例外を最上段へ → 通常は 号数↓ → 同号内 sequenceNum↑
  const sorted = [...list].sort((a, b) => {
    const A = getIssueInfo(a);
    const B = getIssueInfo(b);

    const isBreakingA = String(a.slug || "").startsWith("S0000");
const isBreakingB = String(b.slug || "").startsWith("S0000");

if (isBreakingA !== isBreakingB) return isBreakingA ? -1 : 1;



    const as = Number(a.sequenceNum ?? a.sequence ?? 999999);
    const bs = Number(b.sequenceNum ?? b.sequence ?? 999999);
    if (as !== bs) return as - bs;

    return String(a.slug || "").localeCompare(String(b.slug || ""));
  });

  const frag = document.createDocumentFragment();

  for (const art of sorted) {
    const { issue, publishDate, issueNum, isBreaking } = getIssueInfo(art);

const slugStr = String(art.slug || art.articleId || "");
const isBreaking = slugStr.startsWith("S0000");

// 通常記事で、最新号なら NEW
const isNewBadge = !isBreaking && issueNum === latestIssueNum;

    const row = document.createElement("div");
    row.className = "article-row";

    // 速報バッジ（赤枠＋赤文字）
if (isBreaking) {
  const badge = document.createElement("span");
  badge.textContent = "速報!";
  badge.style.display = "inline-block";
  badge.style.border = "2px solid #c00";
  badge.style.color = "#c00";
  badge.style.fontWeight = "800";
  badge.style.marginRight = "8px";
  badge.style.padding = "2px 6px";
  badge.style.fontSize = "12px";
  badge.style.lineHeight = "1";
  badge.style.verticalAlign = "middle";
  row.appendChild(badge);
}

// NEWバッジ（黄色文字＋赤縁）
if (isNewBadge) {
  const badge = document.createElement("span");
  badge.textContent = "NEW";
  badge.style.display = "inline-block";
  badge.style.fontWeight = "800";
  badge.style.marginRight = "8px";
  badge.style.lineHeight = "1";
  badge.style.verticalAlign = "middle";

  badge.style.color = "#ffd400";
  badge.style.webkitTextStroke = "1.5px #c00";
  badge.style.textShadow =
    "-1px -1px 0 #c00, 1px -1px 0 #c00, -1px 1px 0 #c00, 1px 1px 0 #c00";

  row.appendChild(badge);
}

    // タイトル（モーダルリンク）
    const a = document.createElement("a");
    a.href = "#";
    a.className = "article-link";
    const slug = String(art.slug || art.articleId || "");
    if (slug) a.dataset.slug = slug;
    a.textContent = art.title || "";
    row.appendChild(a);

    // メタ【No.XXXX(yyyy/mm/dd)】（全文検索と同じ体裁に寄せる）
    const meta = document.createElement("span");
    meta.className = "issue-label";
    const issueLabel = issue ? `No.${issue}` : "";
    const dateLabel = publishDate ? `(${publishDate})` : "";
    meta.textContent = `【${issueLabel}${dateLabel}】`;
    row.appendChild(meta);

    frag.appendChild(row);
  }

  container.innerHTML = "";
  container.appendChild(frag);
}

// 検索・カテゴリ別用のフラット表示
function renderFlatList(container, list) {
  const latestIssueNum = Number(window.__latestIssueNum || 0);
  const frag = document.createDocumentFragment();

  for (const art of list) {
    const { issue, publishDate, issueNum, isBreaking } = getIssueInfo(art);

// 通常記事で、最新号なら NEW
const isNewBadge = !isBreaking && issueNum === latestIssueNum;

    const row = document.createElement("div");
    row.className = "article-row";

    if (isNewBadge) {
      const badge = document.createElement("span");
      badge.textContent = "NEW";
      badge.style.color = "#c00";
      badge.style.fontWeight = "700";
      badge.style.marginRight = "8px";
      row.appendChild(badge);
    }

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

// 記事から号数と日付を取り出してラベル用に整形（速報S系対応）
function getIssueInfo(article) {
  const rawIssue = String(article.issue ?? "").trim();
  const slugStr  = String(article.slug || article.articleId || "").trim();

  // 速報（S0000xx）は slug で判定（最も確実）
  const isBreaking = slugStr.startsWith("S0000");

  // 表示用（No.XXXX）とソート用の issueNum
  let issueLabel = "";
  let issueNum = 0;

  if (rawIssue) {
    // 速報は issue が "S0000" として入ってくる想定
    if (/^S\d{4}$/i.test(rawIssue)) {
      issueLabel = rawIssue.toUpperCase(); // "S0000"
      issueNum = 0; // latestIssue 判定から除外する（後述の最新号算出でも除外）
    } else {
      const digits = rawIssue.replace(/\D/g, "");
      issueLabel = digits ? digits.padStart(4, "0") : rawIssue;
      issueNum = Number(digits || 0);
    }
  } else if (slugStr) {
    // issue が無ければ slug 先頭4文字が "0001" などの場合だけ拾う
    const head = slugStr.slice(0, 4).replace(/\D/g, "");
    if (head) {
      issueLabel = head.padStart(4, "0");
      issueNum = Number(head || 0);
    }
  }

  const publishDate = article.publishDate || ""; // "2025/08/08" 想定
  return { issue: issueLabel, issueNum, publishDate, isBreaking };
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
  // 例: entries = Object.entries(categoriesMap);
entries.sort((a, b) => String(a?.[1] ?? "").localeCompare(String(b?.[1] ?? ""), "ja"));


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
    let categoryMapRaw = {};
    try {
      const catRes = await fetch("/indexes/categories.json", { cache: "no-store" });
      if (catRes.ok) {
        categoryMapRaw = await catRes.json();
      }
    } catch (e) {
      console.warn("[INDEX] categories.json 読み込み失敗:", e);
    }

    // ★正規化してから使う
    const categoryMap = normalizeCategoriesToMap(categoryMapRaw);

    window.categoryMap = categoryMap;
    console.log("[INDEX] categoryMap(normalized) =", categoryMap);

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

        if (Array.isArray(json.articles)) { rawList = json.articles; usedUrl = url; break; }
        if (Array.isArray(json.items))    { rawList = json.items;    usedUrl = url; break; }
        if (Array.isArray(json.list))     { rawList = json.list;     usedUrl = url; break; }
        if (Array.isArray(json.data))     { rawList = json.data;     usedUrl = url; break; }

        if (Array.isArray(json.files))    { rawList = json.files;    usedUrl = url; fromManifest = true; break; }
        if (Array.isArray(json.entries))  { rawList = json.entries;  usedUrl = url; fromManifest = true; break; }
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
      articles = rawList.map((x) => {
        const slug = String(x.slug || x.articleId || x.id || "").trim();
        const path = x.path || (slug ? `/build_plain_articles/${slug}.json` : "");
        const catNames = (x.categoryIds || []).map((id) => (categoryMap?.[id] || id));

        const isHidden =
          x.isHidden === true || x.isHidden === "true" ||
          x.hidden   === true || x.hidden   === "true";

        return {
          slug,
          articleId: x.articleId || slug || "",
          title: x.title || "",
          publishDate: x.publishDate || x.date || "",
      issue: x.issue || "",                // ★追加（あれば使う）
      sequence: x.sequence || "",          // ★追加（あれば使う）
      sequenceNum: x.sequenceNum ?? null,  // ★追加（あれば使う）
      categoryIds: x.categoryIds || [],
      category: catNames.join(", "),
      _plainPath: path,
      isHidden,
        };
      });
    } else {
      articles = rawList.map((a) => {
        const slug = String(a.slug || a.articleId || a.id || "").trim();
        const catNames = (a.categoryIds || []).map((id) => (categoryMap?.[id] || id));

        const isHidden =
          a.isHidden === true || a.isHidden === "true" ||
          a.hidden   === true || a.hidden   === "true";

        return {
          ...a,
          slug,
          articleId: a.articleId || slug || "",
          category: catNames.join(", "),
          isHidden,
        };
      });
    }

    if (!articles.length) {
      setMsg('<div class="search-message">現在、公開されている記事はありません。</div>');
      return;
    }

    // ★ isHidden フィルタ：非表示記事を除外する
    articles = articles.filter((a) => !a.isHidden);

// ★最新号（通常号）の判定：最大の号数（数字）を latest とする
const latestIssueNum = (() => {
  let max = 0;
  for (const a of articles) {
    const { issueNum, isBreaking } = getIssueInfo(a);
if (isBreaking) continue;      // 速報は latest 判定から除外
if (issueNum > max) max = issueNum;
  }
  return max;
})();
window.__latestIssueNum = latestIssueNum;


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
    setMsg('<div class="search-message">記事データの読み込みに失敗しました。</div>');
  }
}

// 追加：categories.json の形を吸収して「{id: name}」に揃える
function normalizeCategoriesToMap(raw) {
  // 新形式: { version, updatedAt, categories:[{id,name,order}] }
  if (raw && Array.isArray(raw.categories)) {
    const map = {};
    for (const c of raw.categories) {
      if (c && c.id && c.name) map[String(c.id)] = String(c.name);
    }
    return map;
  }

  // 旧形式: { "id":"name", ... }（valueが文字列じゃない事故も吸収）
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const map = {};
    for (const [id, name] of Object.entries(raw)) {
      if (!id) continue;
      map[String(id)] = String(name ?? "");
    }
    return map;
  }

  return {};
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

    // 👉 デフォルトは grouped
    let mode = "grouped";

    // 👉 カテゴリが絞られているときだけ flat にする
    if (isCatSpecific) {
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

window.allArticles = window.allArticles.filter(a => !a.isHidden);

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
      isHidden: !!raw.isHidden,
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



