import { existsSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { protectedBranches } from "./guard-change.js";

const DEFAULT_BASE_BRANCH = "main";

export function parseCreatePrArgs(argv) {
  const args = argv[0] === "--" ? argv.slice(1) : argv;
  const options = {
    base: DEFAULT_BASE_BRANCH,
    body: null,
    bodyFile: null,
    draft: true,
    title: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = () => {
      index += 1;
      if (index >= args.length) throw new Error(`${arg} requires a value.`);
      return args[index];
    };

    if (arg === "--base") {
      options.base = next();
    } else if (arg === "--body") {
      options.body = next();
    } else if (arg === "--body-file") {
      options.bodyFile = next();
    } else if (arg === "--ready") {
      options.draft = false;
    } else if (arg === "--title") {
      options.title = next();
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (options.body && options.bodyFile) {
    throw new Error("Use either --body or --body-file, not both.");
  }

  return options;
}

export function formatPrTitle(commitSubject, explicitTitle = null) {
  if (explicitTitle) return explicitTitle;
  if (commitSubject.startsWith("[codex] ")) return commitSubject;
  return `[codex] ${commitSubject}`;
}

export function validatePrContext({ branch, bodyFile = null }) {
  const errors = [];

  if (!branch) errors.push("Could not determine the current git branch.");
  if (protectedBranches.includes(branch)) {
    errors.push(`Protected branch "${branch}" cannot be used as a PR head.`);
  }
  if (bodyFile && !existsSync(bodyFile)) {
    errors.push(`PR body file does not exist: ${bodyFile}`);
  }

  return errors;
}

export function buildGhPrCreateArgs({ base, body, bodyFile, branch, draft, title }) {
  const args = ["pr", "create", "--base", base, "--head", branch, "--title", title];

  if (draft) args.push("--draft");
  if (bodyFile) {
    args.push("--body-file", bodyFile);
  } else if (body) {
    args.push("--body", body);
  } else {
    args.push("--fill");
  }

  return args;
}

function execGit(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function runCommand(command, args, cwd = process.cwd()) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}.`);
  }
}

export function runCreatePr(argv = process.argv.slice(2), cwd = process.cwd()) {
  const options = parseCreatePrArgs(argv);
  const branch = execGit(["branch", "--show-current"], cwd);
  const commitSubject = execGit(["log", "-1", "--pretty=%s"], cwd);
  const title = formatPrTitle(commitSubject, options.title);
  const errors = validatePrContext({ branch, bodyFile: options.bodyFile });

  if (errors.length > 0) {
    console.error("PR creation preflight failed:");
    for (const error of errors) console.error(`- ${error}`);
    return 1;
  }

  console.log(`Creating PR from ${branch} to ${options.base} using gh.`);
  runCommand("gh", ["auth", "status"], cwd);
  runCommand("git", ["push", "-u", "origin", branch], cwd);
  runCommand(
    "gh",
    buildGhPrCreateArgs({
      ...options,
      branch,
      title,
    }),
    cwd,
  );

  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = runCreatePr();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
