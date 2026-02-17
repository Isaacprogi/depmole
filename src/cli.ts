#!/usr/bin/env node
import depcheck from "depcheck";
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
  all?: boolean;
  dev?: boolean;
  peer?: boolean;
  prod?: boolean;
  healthy?: boolean;
  notinstalled?: boolean;
  unused?: boolean;
  missing?: boolean;
  flat?: boolean;
}

let toolVersion = "1.0.0";
try {
  const pkgPath = path.join(__dirname, "..", "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    toolVersion = pkg.version || toolVersion;
  }
} catch {}

const program = new Command();

program
  .name("depmole")
  .description("Scan, verify, and report your npm dependencies")
  .version(toolVersion, "--version", "Show depmole version")
  .option("--verify", "Verify dependencies on npm registry")
  .option("--all", "Include all dependencies (default)")
  .option("--dev", "Only devDependencies")
  .option("--peer", "Only peerDependencies")
  .option("--prod", "Only regular dependencies")
  .option("--healthy", "Show only healthy dependencies")
  .option("--notinstalled", "Show only declared but missing in node_modules")
  .option("--unused", "Show only declared but not used in code")
  .option("--missing", "Show only missing dependencies (imported but not in package.json)")
  .option("--flat", "Show dependencies flat by type (dependencies, devDependencies, peerDependencies)")
  .parse(process.argv);

const options: DepMoleOptions = program.opts();

if (options.flat) {
  const forbiddenWithFlat = ["healthy", "notinstalled", "unused", "missing"];
  const usedForbidden = forbiddenWithFlat.filter(opt => options[opt as keyof DepMoleOptions]);
  if (usedForbidden.length > 0) {
    console.error(
      chalk.red(
        `❌ The options ${usedForbidden.join(", ")} cannot be used with --flat. Only --verify, --all, --dev, --peer, or --prod are allowed with --flat.`
      )
    );
    process.exit(1);
  }
}

const projectRoot = process.cwd();
const packageJsonPath = path.join(projectRoot, "package.json");
const nodeModulesPath = path.join(projectRoot, "node_modules");

const checkOptions: depcheck.Options = {
  ignoreBinPackage: false,
  skipMissing: false,
  ignoreDirs: ["node_modules"],
};

(async () => {
  try {
    console.log(chalk.blue("\nRunning dep-mole...\n"));

    if (!fs.existsSync(packageJsonPath)) {
      console.log(chalk.red("❌ No package.json found in this directory."));
      process.exit(1);
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const declaredDeps = Object.keys(packageJson.dependencies || {});
    const declaredDevDeps = Object.keys(packageJson.devDependencies || {});
    const declaredPeerDeps = Object.keys(packageJson.peerDependencies || {});
    const allDeclaredDeps = [...declaredDeps, ...declaredDevDeps, ...declaredPeerDeps];

    const result: any = await depcheck(projectRoot, checkOptions);
    const unusedDeps: string[] = result.dependencies || [];
    const unusedDevDeps: string[] = result.devDependencies || [];
    const missingDeps: string[] = Object.keys(result.missing || {});

    const dependencyReport: DependencyReport[] = allDeclaredDeps.map(dep => ({
      name: dep,
      declared: true,
      used: !(unusedDeps.includes(dep) || unusedDevDeps.includes(dep)),
      installed: fs.existsSync(path.join(nodeModulesPath, dep)),
    }));

    const missingReport: DependencyReport[] = missingDeps.map(dep => ({
      name: dep,
      declared: false,
      used: true,
      installed: false,
    }));


    let filteredDeps = dependencyReport;
    if (options.dev) filteredDeps = filteredDeps.filter(d => declaredDevDeps.includes(d.name));
    else if (options.peer) filteredDeps = filteredDeps.filter(d => declaredPeerDeps.includes(d.name));
    else if (options.prod) filteredDeps = filteredDeps.filter(d => declaredDeps.includes(d.name));


    if (options.flat) {
      console.log(chalk.blue("Dependencies grouped by type:"));
      const groups = {
        dependencies: filteredDeps.filter(d => declaredDeps.includes(d.name)),
        devDependencies: filteredDeps.filter(d => declaredDevDeps.includes(d.name)),
        peerDependencies: filteredDeps.filter(d => declaredPeerDeps.includes(d.name)),
      };

      for (const [type, deps] of Object.entries(groups)) {
        if (!deps.length) continue;
        console.log(chalk.blue(`\n${type}:`));
        deps.forEach(d => console.log("  -", d.name));

        if (options.verify) {
          console.log(chalk.blue(`\nVerifying ${type} on npm...`));
          for (const d of deps) {
            try {
              const res = await axios.get(`https://registry.npmjs.org/${encodeURIComponent(d.name)}`);
              const latest: string | undefined = res.data["dist-tags"]?.latest;
              console.log(chalk.green(`✅ ${d.name} exists on npm. Latest: ${latest || "unknown"}`));
            } catch {
              console.log(chalk.red(`❌ ${d.name} not found on npm!`));
            }
          }
        }
      }

      console.log(chalk.blue("\nDep-mole scan complete.\n"));
      process.exit(0);
    }

    let reportToShow: DependencyReport[] = filteredDeps;
    let showMissingReport = missingReport;

    if (options.healthy) reportToShow = filteredDeps.filter(d => d.used && d.installed);
    else if (options.notinstalled) reportToShow = filteredDeps.filter(d => !d.installed);
    else if (options.unused) reportToShow = filteredDeps.filter(d => !d.used);
    else if (options.missing) {
      reportToShow = [];
      showMissingReport = missingReport;
    }

    const shouldShowMissing =
      !options.flat &&
      !options.dev &&
      !options.peer &&
      !options.healthy &&
      !options.unused &&
      !options.notinstalled;

    if (reportToShow.length > 0) {
      if (options.healthy) {
        console.log(chalk.green("Healthy dependencies:"));
        reportToShow.forEach(d => console.log("  -", d.name));
      } else if (options.unused) {
        console.log(chalk.yellow("Unused dependencies:"));
        reportToShow.forEach(d => console.log("  -", d.name));
      } else if (options.notinstalled) {
        console.log(chalk.magenta("Declared but missing in node_modules:"));
        reportToShow.forEach(d => console.log("  -", d.name));
      } else if (!options.missing) {
        const healthy = filteredDeps.filter(d => d.used && d.installed);
        const unused = filteredDeps.filter(d => !d.used);
        const notinstalled = filteredDeps.filter(d => !d.installed);

        if (healthy.length) {
          console.log(chalk.green("Healthy dependencies:"));
          healthy.forEach(d => console.log("  -", d.name));
        }
        if (unused.length) {
          console.log(chalk.yellow("\nUnused dependencies:"));
          unused.forEach(d => console.log("  -", d.name));
        }
        if (notinstalled.length) {
          console.log(chalk.magenta("\nDeclared but missing in node_modules:"));
          notinstalled.forEach(d => console.log("  -", d.name));
        }
      }
    }

    if (shouldShowMissing && showMissingReport.length) {
      console.log(chalk.red("\nMissing dependencies (imported but not in package.json):"));
      showMissingReport.forEach(d => console.log("  -", d.name));
    }

    if (reportToShow.length === 0 && showMissingReport.length === 0) {
      console.log(chalk.green("All dependencies look good!"));
    }


    if (options.verify) {
      console.log(chalk.blue("\nVerifying dependencies on npm...\n"));

      let verifyList: string[] = [];

      if (options.missing) {
        verifyList = showMissingReport.map(d => d.name);
      } else if (options.healthy || options.unused || options.notinstalled) {
        verifyList = reportToShow.map(d => d.name);
      } else {
        verifyList = [
          ...reportToShow.map(d => d.name),
          ...(shouldShowMissing ? showMissingReport.map(d => d.name) : []),
        ];
      }

      for (const dep of verifyList) {
        try {
          const res = await axios.get(`https://registry.npmjs.org/${encodeURIComponent(dep)}`);
          const latest: string | undefined = res.data["dist-tags"]?.latest;
          console.log(chalk.green(`✅ ${dep} exists on npm. Latest: ${latest || "unknown"}`));
        } catch {
          console.log(chalk.red(`❌ ${dep} not found on npm!`));
        }
      }
    }

    console.log(chalk.blue("\nDep-mole scan complete.\n"));
  } catch (err) {
    console.error(chalk.red("Error running dep-mole:"), err);
    process.exit(1);
  }
})();
