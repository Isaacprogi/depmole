# depmole 🐾

> **Dig deep. Detect dependency issues.**

depmole is a developer-friendly CLI tool that scans, analyzes, and verifies your npm dependencies — ensuring your `package.json`, imports, and `node_modules` stay perfectly aligned.

---

##  Features

*  Detect **unused dependencies** (declared but not used)
*  Detect **missing dependencies** (imported but not declared)
*  Detect **declared but not installed** packages
*  Verify dependencies against the npm registry
*  Reads directly from `package.json` (source of truth)
*  Uses intelligent analysis powered by **depcheck**

---

##  Installation

```bash
npm install -g depmole
```

Or use with npx:

```bash
npx depmole
```

---

##  Usage

Run depmole inside your project root:

```bash
depmole
```

---

##  Options

| Flag       | Description                                                               |
| ---------- | ------------------------------------------------------------------------- |
| `--verify` | Verify all dependencies against the npm registry and show latest versions |

---

##  Example

```bash
depmole --verify
```

### Example Output

```
 Dependency Check Report:

 Healthy dependencies:
  - react
  - express

 Unused dependencies:
  - lodash

 Declared but missing in node_modules:
  - chalk

 Missing dependencies (imported but not declared):
  - axios

 Verifying dependencies on npm...
 lodash exists on npm. Latest version: 4.17.21
 some-unknown-package not found on npm!
```

---

#  How It Works

depmole follows a structured dependency model:

- 1️ Reads all declared dependencies from `package.json`
- 2️ Checks installation status in `node_modules`
- 3️ Analyzes actual usage using **depcheck**
- 4️ Optionally verifies existence against the npm registry
- 5️ Generates a structured report

Each system has a responsibility:

| Source         | Responsibility         |
| -------------- | ---------------------- |
| `package.json` | Declared dependencies  |
| `node_modules` | Installed dependencies |
| depcheck       | Usage detection        |
| npm registry   | Existence validation   |

This ensures depmole doesn’t just detect anomalies — it builds a full dependency state model.

---

#  Workflow Diagram

```
         ┌──────────────────  ┐
         │  Read package.json │
         └──────────┬─────────┘
                    │
                    ▼
         ┌──────────────────  ┐
         │  Check node_modules│
         └──────────┬─────────┘
                    │
                    ▼
         ┌──────────────────  ┐
         │  Analyze Imports   │
         │   (depcheck)       │
         └──────────┬─────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   Healthy       Unused     Missing
 Dependencies   Dependencies Dependencies
                                   │
                                   ▼
                          ┌──────────────────   ┐
                          │ Verify npm Registry │
                          └──────────┬───────── ┘
                                     ▼
                              ┌─────────────┐
                              │   Report    │
                              │   Results   │
                              └─────────────┘
```

---

# Use Cases

* Clean up bloated `package.json` files
* Catch missing dependencies before deployment
* Ensure CI pipelines fail on dependency inconsistencies
* Audit third-party packages quickly
* Improve project hygiene and maintainability

---

# Why depmole?

Unlike simple dependency checkers, depmole:

* Treats `package.json` as the source of truth
* Separates declared, installed, and used states
* Detects structural mismatches
* Can validate against the live npm registry

It’s not just a checker — it’s a dependency investigator.

---

##  License

MIT License – see [LICENSE](LICENSE)
