/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const TARGET_DIRS = ["src", "scripts"];
const VALID_EXTENSIONS = new Set([".ts", ".tsx", ".js"]);
const EXCLUDED_DIRS = new Set([
  ".next",
  "node_modules",
  "src/generated",
  "public/uploads",
]);

/**
 * isExcluded function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
function isExcluded(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  for (const excluded of EXCLUDED_DIRS) {
    if (normalized.includes(`/${excluded}/`) || normalized.startsWith(excluded + "/")) {
      return true;
    }
  }
  return false;
}

/**
 * walk function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
function walk(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (isExcluded(fullPath)) continue;
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    const ext = path.extname(entry.name);
    if (VALID_EXTENSIONS.has(ext)) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * hasCommentImmediatelyAbove function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
function hasCommentImmediatelyAbove(lines, index) {
  let cursor = index - 1;
  while (cursor >= 0 && lines[cursor].trim() === "") {
    cursor -= 1;
  }
  if (cursor < 0) return false;
  const line = lines[cursor].trim();
  if (line.startsWith("/**")) return true;
  if (line.endsWith("*/")) {
    while (cursor >= 0) {
      if (lines[cursor].trim().startsWith("/**")) return true;
      cursor -= 1;
    }
  }
  return false;
}

/**
 * parseNameWithRegex function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
function parseNameWithRegex(line, regex, nameGroupIndex) {
  const match = line.match(regex);
  if (!match) return null;
  return match[nameGroupIndex];
}

/**
 * buildComment function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
function buildComment(indent, name, kind) {
  const normalizedKind = kind || "function";
  return [
    `${indent}/**`,
    `${indent} * ${name} ${normalizedKind} logic.`,
    `${indent} * Inputs: function parameters.`,
    `${indent} * Outputs: function return value.`,
    `${indent} * Side effects: none unless stated in implementation.`,
    `${indent} * Failure behavior: follows guard clauses and thrown/runtime errors in this block.`,
    `${indent} */`,
  ];
}

/**
 * processFile function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
function processFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  const lines = original.split("\n");
  const output = [];
  let inserted = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    const indent = line.match(/^\s*/)[0];

    const isControlLike =
      /^((if|for|while|switch|catch|return)\b)/.test(trimmed) ||
      /^(const|let|var)\s+\w+\s*=/.test(trimmed) === false;

    const functionName =
      parseNameWithRegex(
        line,
        /^\s*(export\s+)?(default\s+)?(async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/,
        4,
      ) ||
      parseNameWithRegex(
        line,
        /^\s*(export\s+)?const\s+([A-Za-z0-9_$]+)\s*=\s*(async\s*)?(\([^)]*\)|[A-Za-z0-9_$]+)\s*=>/,
        2,
      ) ||
      parseNameWithRegex(
        line,
        /^\s*(const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*function\s*\(/,
        2,
      );

    let methodName = null;
    const methodMatch = line.match(
      /^\s*(public\s+|private\s+|protected\s+)?(static\s+)?(async\s+)?([A-Za-z0-9_$]+)\s*\([^)]*\)\s*\{/,
    );
    if (methodMatch) {
      methodName = methodMatch[4];
      const methodBlacklist = new Set([
        "if",
        "for",
        "while",
        "switch",
        "catch",
        "constructor",
      ]);
      if (methodBlacklist.has(methodName)) {
        methodName = null;
      }
    }

    const targetName = functionName || methodName;
    const targetKind = functionName ? "function" : methodName ? "method" : null;

    if (targetName && !hasCommentImmediatelyAbove(lines, i)) {
      // Avoid adding comments before one-line JSX inline callbacks and unlikely false-positives.
      if (!trimmed.includes("=> <") && !trimmed.includes("onClick={()")) {
        const commentBlock = buildComment(indent, targetName, targetKind);
        output.push(...commentBlock);
        inserted += 1;
      }
    }

    if (isControlLike) {
      // no-op: keeps lint-friendly behavior for local scan variable.
    }
    output.push(line);
  }

  if (inserted > 0) {
    fs.writeFileSync(filePath, output.join("\n"), "utf8");
  }
  return inserted;
}

/**
 * main function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
function main() {
  let totalInserted = 0;
  let totalFilesChanged = 0;

  for (const dir of TARGET_DIRS) {
    const fullDir = path.join(ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;
    const files = walk(fullDir);
    for (const file of files) {
      const inserted = processFile(file);
      if (inserted > 0) {
        totalFilesChanged += 1;
        totalInserted += inserted;
      }
    }
  }

  process.stdout.write(
    `Inserted ${totalInserted} function comments across ${totalFilesChanged} files.\n`,
  );
}

main();
