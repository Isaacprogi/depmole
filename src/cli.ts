#!/usr/bin/env ts-node
import depcheck, { DepcheckResults } from "depcheck";
import { Command } from "commander";
import chalk from "chalk";
import axios from "axios";
import fs from "fs";
import path from "path";

interface DependencyReport {
  name: string;
  declared: boolean;
  used: boolean;
  installed: boolean;
}

interface DepMoleOptions {
  verify?: boolean;
}

const program = new Command();

program
  .name("depmole")
  .description("Scan, verify, and report your npm dependencies")
  .option("--verify", "Verify dependencies against npm registry")
  .parse(process.argv);

const options: DepMoleOptions = program.opts();

const projectRoot = process.cwd();
const packageJsonPath = path.join(projectRoot, "package.json");
const nodeModulesPath = path.join(projectRoot, "node_modules");

// depcheck options
const checkOptions: depcheck.Options = {
  ignoreBinPackage: false,
  skipMissing: false,
  ignoreDirs: ["node_modules"],
};

(async () => {
  try {
    console.log(chalk.blue("\n Running dep-mole...\n"));

    if (!fs.existsSync(packageJsonPath)) {
      console.log(chalk.red("❌ No package.json found in this directory."));
      process.exit(1);
    }

    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, "utf-8")
    ) as Record<string, any>;

    const declaredDeps: string[] = Object.keys(packageJson.dependencies || {});
    const declaredDevDeps: string[] = Object.keys(packageJson.devDependencies || {});
    const declaredPeerDeps: string[] = Object.keys(packageJson.peerDependencies || {});

    const allDeclaredDeps: string[] = [
      ...declaredDeps,
      ...declaredDevDeps,
      ...declaredPeerDeps,
    ];

    const result: DepcheckResults = await depcheck(projectRoot, checkOptions);

    const unusedDeps: string[] = result.dependencies || [];
    const unusedDevDeps: string[] = result.devDependencies || [];
    const missingDeps: string[] = Object.keys(result.missing || {});

    const dependencyReport: DependencyReport[] = allDeclaredDeps.map((dep) => {
      const isUnused = unusedDeps.includes(dep) || unusedDevDeps.includes(dep);
      const installedPath = path.join(nodeModulesPath, dep);

      return {
        name: dep,
        declared: true,
        used: !isUnused,
        installed: fs.existsSync(installedPath),
      };
    });

    const missingReport: DependencyReport[] = missingDeps.map((dep) => ({
      name: dep,
      declared: false,
      used: true,
      installed: false,
    }));

    console.log(chalk.blue(" Dependency Check Report:\n"));

    const healthy = dependencyReport.filter((d) => d.used && d.installed);
    if (healthy.length > 0) {
      console.log(chalk.green(" Healthy dependencies:"));
      healthy.forEach((d) => console.log("  -", d.name));
    }

    const unused = dependencyReport.filter((d) => !d.used);
    if (unused.length > 0) {
      console.log(chalk.yellow("\n Unused dependencies:"));
      unused.forEach((d) => console.log("  -", d.name));
    }

    const notInstalled = dependencyReport.filter((d) => !d.installed);
    if (notInstalled.length > 0) {
      console.log(chalk.magenta("\n Declared but missing in node_modules:"));
      notInstalled.forEach((d) => console.log("  -", d.name));
    }

    if (missingReport.length > 0) {
      console.log(
        chalk.red("\n Missing dependencies (imported but not in package.json):")
      );
      missingReport.forEach((d) => console.log("  -", d.name));
    }

    if (
      healthy.length === 0 &&
      unused.length === 0 &&
      notInstalled.length === 0 &&
      missingReport.length === 0
    ) {
      console.log(chalk.green(" All dependencies look good!"));
    }

    if (options.verify) {
      console.log(chalk.blue("\n Verifying dependencies on npm...\n"));

      const verifyList: string[] = [
        ...dependencyReport.map((d) => d.name),
        ...missingReport.map((d) => d.name),
      ];

      for (const dep of verifyList) {
        try {
          const res = await axios.get(`https://registry.npmjs.org/${encodeURIComponent(dep)}`);
          const latest: string | undefined = res.data["dist-tags"]?.latest;

          console.log(
            chalk.green(`✅ ${dep} exists on npm. Latest version: ${latest || "unknown"}`)
          );
        } catch {
          console.log(chalk.red(`❌ ${dep} not found on npm!`));
        }
      }
    }

    console.log(chalk.blue("\n dep-mole scan complete.\n"));
  } catch (err) {
    console.error(chalk.red("Error running dep-mole:"), err);
    process.exit(1);
  }
})();
