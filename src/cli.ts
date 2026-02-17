#!/usr/bin/env node
import depcheck from "depcheck";
import { Command } from "commander";
import chalk from "chalk";
import axios from "axios";
import fs from "fs";
import path from "path";

const program = new Command();

program
  .name("depmole")
  .description("Scan, verify, and report your npm dependencies")
  .option("--verify", "Verify dependencies against npm registry")
  .parse(process.argv);

const options = program.opts();

const projectRoot = process.cwd();
const packageJsonPath = path.join(projectRoot, "package.json");
const nodeModulesPath = path.join(projectRoot, "node_modules");

// depcheck options
const checkOptions = {
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
    );

    const declaredDeps = Object.keys(packageJson.dependencies || {});
    const declaredDevDeps = Object.keys(packageJson.devDependencies || {});
    const declaredPeerDeps = Object.keys(packageJson.peerDependencies || {});

    const allDeclaredDeps = [
      ...declaredDeps,
      ...declaredDevDeps,
      ...declaredPeerDeps,
    ];


    const result = await depcheck(projectRoot, checkOptions);

    const unusedDeps = result.dependencies || [];
    const unusedDevDeps = result.devDependencies || [];
    const missingDeps = Object.keys(result.missing || {});


    const dependencyReport = allDeclaredDeps.map((dep) => {
      const isUnused =
        unusedDeps.includes(dep) || unusedDevDeps.includes(dep);

      const installedPath = path.join(nodeModulesPath, dep);

      return {
        name: dep,
        declared: true,
        used: !isUnused,
        installed: fs.existsSync(installedPath),
      };
    });


    const missingReport = missingDeps.map((dep) => ({
      name: dep,
      declared: false,
      used: true,
      installed: false,
    }));


    console.log(chalk.blue(" Dependency Check Report:\n"));

   
    const healthy = dependencyReport.filter(
      (d) => d.used && d.installed
    );

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
        chalk.red(
          "\n Missing dependencies (imported but not in package.json):"
        )
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

      const verifyList = [
        ...dependencyReport.map((d) => d.name),
        ...missingReport.map((d) => d.name),
      ];

      for (const dep of verifyList) {
        try {
          const res = await axios.get(
            `https://registry.npmjs.org/${encodeURIComponent(dep)}`
          );
          const latest = res.data["dist-tags"]?.latest;

          console.log(
            chalk.green(
              `✅ ${dep} exists on npm. Latest version: ${latest || "unknown"}`
            )
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
