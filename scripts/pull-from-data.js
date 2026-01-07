// scripts/pull-from-data.js
// kjdweb-data リポジトリから静的ファイルを引っ張ってきて public/ 以下にコピーするスクリプト
// Node 20 前提（Actions でも使えるように純正 fetch + fs のみで書いてます）

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ==== 設定 ====

// データ専用リポジトリ
const DATA_OWNER  = "keizaij";
const DATA_REPO   = "kjdweb-data";
const DATA_BRANCH = "main";

// GitHub PAT を環境変数から取る（ローカルなら自分でセット、Actions なら secrets）
const GITHUB_TOKEN = process.env.DATA_REPO_TOKEN || "";

// kjdweb（本番サイト）の public ディレクトリ
const PUBLIC_ROOT = path.join(__dirname, "..", "public");

// 同期したい「単体ファイル」
const SINGLE_FILES = [
  "_manifest.json",
  "build_plain_articles/_search_source.json",
];

// 同期したい「ディレクトリ」
const DIR_PREFIXES = [
  "build_plain_articles/",
  "photo/",
];

// ==== 共通ヘルパー ====

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function fetchJson(url) {
  const headers = { "Accept": "application/vnd.github+json" };
  if (GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

async function fetchContent(pathInRepo) {
  const apiUrl = `https://api.github.com/repos/${DATA_OWNER}/${DATA_REPO}/contents/${encodeURIComponent(pathInRepo)}?ref=${encodeURIComponent(DATA_BRANCH)}`;
  const headers = { "Accept": "application/vnd.github+json" };
  if (GITHUB_TOKEN) headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`;

  const res = await fetch(apiUrl, { headers });
  if (!res.ok) throw new Error(`fetchContent HTTP ${res.status} for ${pathInRepo}`);

  const json = await res.json();

  // 通常サイズ：base64本文
  if (json && json.content && json.encoding === "base64") {
    const b64 = json.content.replace(/\n/g, "");
    return Buffer.from(b64, "base64");
  }

  // 大きめ or LFS：download_url から生取得
  if (json && json.download_url) {
    const res2 = await fetch(json.download_url, {
      headers: GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : undefined
    });
    if (!res2.ok) throw new Error(`download_url HTTP ${res2.status} for ${pathInRepo}`);
    const ab = await res2.arrayBuffer();
    return Buffer.from(ab);
  }

  throw new Error(`Unexpected content format for ${pathInRepo}`);
}

// ==== メイン処理 ====

async function main() {
  console.log("=== Sync from data repo to public/ ===");
  console.log(`Repo: ${DATA_OWNER}/${DATA_REPO}@${DATA_BRANCH}`);
  console.log(`Public root: ${PUBLIC_ROOT}`);
  if (!GITHUB_TOKEN) {
    console.warn("※ DATA_REPO_TOKEN が未設定です（リポジトリが private の場合は必要）");
  }

  // 1) リポジトリのツリーを全部取る
  const treeUrl = `https://api.github.com/repos/${DATA_OWNER}/${DATA_REPO}/git/trees/${encodeURIComponent(DATA_BRANCH)}?recursive=1`;
  const treeJson = await fetchJson(treeUrl);
  if (!Array.isArray(treeJson.tree)) {
    throw new Error("invalid tree response from GitHub");
  }

  // 2) 対象ファイルを列挙
  const targets = new Set();

  for (const item of treeJson.tree) {
    if (item.type !== "blob" || !item.path) continue;
    const p = item.path;

    // 単体ファイル
    if (SINGLE_FILES.includes(p)) {
      targets.add(p);
      continue;
    }

    // ディレクトリ配下
    for (const prefix of DIR_PREFIXES) {
      if (p.startsWith(prefix)) {
        targets.add(p);
        break;
      }
    }
  }

  const files = Array.from(targets);
  console.log(`→ 対象ファイル数: ${files.length}`);

  let ok = 0;
  let ng = 0;

  for (const relPath of files) {
    try {
      const buf = await fetchContent(relPath);
      const destPath = path.join(PUBLIC_ROOT, relPath);
      await ensureDir(path.dirname(destPath));
      await fs.writeFile(destPath, buf);
      ok++;
      if (ok <= 10) {
        console.log(`  [OK] ${relPath}`);
      }
    } catch (e) {
      ng++;
      console.error(`  [NG] ${relPath}:`, e.message || e);
    }
  }

  console.log(`=== done. OK: ${ok}, NG: ${ng} ===`);
}

main().catch((e) => {
  console.error("Fatal error in pull-from-data:", e);
  process.exit(1);
});
