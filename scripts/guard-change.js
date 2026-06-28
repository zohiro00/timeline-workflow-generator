import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const protectedBranches = ["main", "master"];
export const forbiddenLockfiles = ["package-lock.json", "npm-shrinkwrap.json", "yarn.lock"];

export function validateChangeGate({ branch, existingFiles }) {
  const errors = [];

  if (protectedBranches.includes(branch)) {
    errors.push(`Protected branch "${branch}" is not allowed for direct changes or pushes.`);
  }

  for (const file of existingFiles) {
    if (forbiddenLockfiles.includes(file)) {
      errors.push(`Forbidden lockfile detected: ${file}. This project uses pnpm only.`);
    }
  }

  return errors;
}

export function getCurrentBranch(cwd = process.cwd()) {
  return execFileSync("git", ["branch", "--show-current"], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function listExistingForbiddenLockfiles(cwd = process.cwd()) {
  return forbiddenLockfiles.filter((file) => existsSync(join(cwd, file)));
}

export function runChangeGate(cwd = process.cwd()) {
  return validateChangeGate({
    branch: getCurrentBranch(cwd),
    existingFiles: listExistingForbiddenLockfiles(cwd),
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = runChangeGate();

  if (errors.length > 0) {
    console.error("Change gate failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Change gate passed.");
}
