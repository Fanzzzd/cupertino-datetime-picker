// Every name the docs import has to exist.
//
// Nothing compiles an `.mdx` code fence, and the export map has no idea the
// docs exist, so a renamed export leaves the docs telling readers to import
// something that is gone. Only the import lines are checked: they are the
// part a reader copies verbatim and the part a rename breaks.
//
// Two specifiers are known. The npm package, checked against the emitted
// declarations (what `npm i` gives a consumer), and the registry path
// `@/components/ui/cupertino/<file>`, checked against the source file the
// registry copies.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = join(repoRoot, "docs/content/docs");
const packageDir = join(repoRoot, "packages/cupertino-datetime-picker");

const NAME =
  /^(?:export\s+)?(?:declare\s+)?(?:function|const|let|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/;

/** Names a declaration or source file exports, following `export * from`. */
function exportedNames(file, seen = new Set()) {
  if (seen.has(file)) return new Set();
  seen.add(file);
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    throw new Error(
      `${file} is missing; build the package first (pnpm --filter cupertino-datetime-picker build)`,
    );
  }
  const names = new Set();
  for (const line of source.split("\n")) {
    const list = line.match(/^export\s+(?:type\s+)?\{([^}]*)\}/);
    if (list) {
      for (const part of list[1].split(",")) {
        const name = part
          .trim()
          .replace(/^type\s+/, "")
          .split(/\s+as\s+/)
          .pop();
        if (name) names.add(name);
      }
      continue;
    }
    const star = line.match(/^export\s+\*\s+from\s+["'](.+?)["']/);
    if (star) {
      const base = join(dirname(file), star[1]);
      const target = file.endsWith(".d.ts") ? `${base}.d.ts` : sourceFile(base);
      for (const name of exportedNames(target, seen)) names.add(name);
      continue;
    }
    const decl = line.startsWith("export ") && line.match(NAME);
    if (decl) names.add(decl[1]);
  }
  return names;
}

function sourceFile(base) {
  for (const ext of [".ts", ".tsx"]) {
    try {
      readFileSync(`${base}${ext}`);
      return `${base}${ext}`;
    } catch {
      /* try the next extension */
    }
  }
  return `${base}.ts`;
}

const surfaces = new Map();
function surface(specifier) {
  if (surfaces.has(specifier)) return surfaces.get(specifier);
  let names;
  if (specifier === "cupertino-datetime-picker") {
    names = exportedNames(join(packageDir, "dist/index.d.ts"));
  } else {
    const file = specifier.match(/^@\/components\/ui\/cupertino\/([\w-]+)$/);
    if (!file) return null;
    names = exportedNames(sourceFile(join(packageDir, "src", file[1])));
  }
  surfaces.set(specifier, names);
  return names;
}

const problems = [];
for (const entry of readdirSync(docsDir)) {
  if (!entry.endsWith(".mdx")) continue;
  const text = readFileSync(join(docsDir, entry), "utf8");
  for (const match of text.matchAll(
    /^import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+["']([^"']+)["']/gm,
  )) {
    const names = surface(match[2]);
    if (!names) continue;
    for (const part of match[1].split(",")) {
      const name = part
        .trim()
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)[0];
      if (name && !names.has(name))
        problems.push(`${entry}: \`${name}\` is not exported from ${match[2]}`);
    }
  }
}

if (problems.length > 0) {
  console.error(
    "check-docs-imports: the docs import names that do not exist:\n  " + problems.join("\n  "),
  );
  process.exit(1);
}
console.log(`check-docs-imports: ${surfaces.size} import surfaces checked, all names exist`);
