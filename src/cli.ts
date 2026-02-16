#!/usr/bin/env node
import depcheck from "depcheck";
import { Command } from "commander";
import chalk from "chalk";
import axios from "axios";
import fs from "fs";
import path from "path";

const program = new Command();

program
  .name("dep-mole")
  .description("Scan, verify, and report your npm dependencies")
  .option("--verify", "Verify dependencies against npm registry")
  .parse(process.argv);

const options = program.opts();

// depcheck options
const checkOptions = {
  ignoreBinPackage: false,
  skipMissing: false,
  ignoreDirs: ["node_modules"],
};

(async () => {
  try {
    const result = await depcheck(process.cwd(), checkOptions);

    console.log(chalk.blue("\n📦 Dependency Check Report:\n"));

    // Unused dependencies
    const unusedDeps = result.dependencies || [];
    if (unusedDeps.length > 0) {
      console.log(chalk.yellow("🟡 Unused dependencies:"));
      unusedDeps.forEach((dep) => console.log("  -", dep));
    } else {
      console.log(chalk.green("✅ No unused dependencies found."));
    }

    // Missing dependencies
    const missingDeps = Object.keys(result.missing);
    if (missingDeps.length > 0) {
      console.log(chalk.red("\n🔴 Missing dependencies (imported but not in package.json):"));
      missingDeps.forEach((dep) => console.log("  -", dep));
    } else {
      console.log(chalk.green("\n✅ No missing dependencies found."));
    }

    // ---- NEW: Check which dependencies exist in node_modules ----
    const allDeps = [
      ...unusedDeps,
      ...missingDeps,
      ...(result.devDependencies || []),
    ];

    const nodeModulesPath = path.join(process.cwd(), "node_modules");

    const allDepsStatus = allDeps.map((dep) => ({
      name: dep,
      inNodeModules: fs.existsSync(path.join(nodeModulesPath, dep)),
    }));

    const installedInNodeModules = allDepsStatus.filter(d => d.inNodeModules);
    const notInNodeModules = allDepsStatus.filter(d => !d.inNodeModules);

    if (installedInNodeModules.length > 0) {
      console.log(chalk.blue("\n📂 Dependencies present in node_modules:"));
      installedInNodeModules.forEach(d => console.log("  -", d.name));
    }

    if (notInNodeModules.length > 0) {
      console.log(chalk.magenta("\n⚠️ Dependencies missing in node_modules:"));
      notInNodeModules.forEach(d => console.log("  -", d.name));
    }

    // Verification on npm
    if (options.verify) {
      console.log(chalk.blue("\n🔍 Verifying dependencies on npm...\n"));

      for (const dep of allDeps) {
        try {
          const res = await axios.get(`https://registry.npmjs.org/${dep}`);
          const latest = res.data["dist-tags"].latest;
          console.log(chalk.green(`✅ ${dep} exists on npm. Latest version: ${latest}`));
        } catch {
          console.log(chalk.red(`❌ ${dep} not found on npm!`));
        }
      }
    }
  } catch (err) {
    console.error(chalk.red("Error running dep-mole:"), err);
  }
})();
