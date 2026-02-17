# depmole 🐾

> **Dig deep. Detect dependency issues.**

depmole is a developer-friendly CLI tool that scans, analyzes, filters, and verifies your npm dependencies — ensuring your `package.json`, imports, and `node_modules` stay perfectly aligned.

---

![Depmole Screenshot](https://raw.githubusercontent.com/isaacprogi/depmole/main/public/depmole.png)

---

# ✨ Features

* Detect **unused dependencies** (declared but not used)
* Detect **missing dependencies** (imported but not declared)
* Detect **declared but not installed** packages
* Filter by dependency type (`dependencies`, `devDependencies`, `peerDependencies`)
* Flat grouping mode by dependency type
* Scoped verification against the npm registry
* Reads directly from `package.json` (source of truth)
* Powered by intelligent static analysis via **depcheck**

---

# 📦 Installation

```bash
npm install -g depmole
```

Or use with npx:

```bash
npx depmole
```

---

# 🚀 Usage

Run inside your project root:

```bash
depmole
```

---

# ⚙️ Options

| Flag             | Description                                                |
| ---------------- | ---------------------------------------------------------- |
| `--verify`       | Verify dependencies against the npm registry               |
| `--all`          | Include all dependencies (default behavior)                |
| `--dev`          | Only analyze `devDependencies`                             |
| `--peer`         | Only analyze `peerDependencies`                            |
| `--prod`         | Only analyze regular `dependencies`                        |
| `--healthy`      | Show only healthy dependencies (used + installed)          |
| `--unused`       | Show only unused dependencies                              |
| `--notinstalled` | Show declared but missing in `node_modules`                |
| `--missing`      | Show only missing dependencies (imported but not declared) |
| `--flat`         | Group dependencies by type                                 |

---

# 🔎 Scoped Verification

Verification respects your selected scope.

Examples:

```bash
depmole --unused --verify
```

→ Verifies only unused dependencies.

```bash
depmole --healthy --verify
```

→ Verifies only healthy dependencies.

```bash
depmole --missing --verify
```

→ Verifies only missing dependencies.

```bash
depmole --dev --verify
```

→ Verifies only devDependencies.

---

# 📊 Flat Mode

Group dependencies by type:

```bash
depmole --flat
```

Output example:

```
dependencies:
  - react
  - express

devDependencies:
  - typescript
  - jest

peerDependencies:
  - react-dom
```

You can also verify within flat mode:

```bash
depmole --flat --verify
```

### ⚠️ Flat Mode Rules

`--flat` can only be used with:

* `--verify`
* `--all`
* `--dev`
* `--peer`
* `--prod`

It cannot be combined with:

* `--healthy`
* `--unused`
* `--notinstalled`
* `--missing`

This ensures consistent reporting logic.

---

# 📋 Example (Default Run)

```bash
depmole
```

Example output:

```
Healthy dependencies:
  - react
  - express

Unused dependencies:
  - lodash

Declared but missing in node_modules:
  - chalk

Missing dependencies (imported but not declared):
  - axios
```

---

# 🧠 How It Works

depmole follows a structured dependency model:

1️⃣ Reads declared dependencies from `package.json`
2️⃣ Checks installation status in `node_modules`
3️⃣ Analyzes real usage via **depcheck**
4️⃣ Applies scoped filters based on CLI flags
5️⃣ Optionally verifies against the npm registry
6️⃣ Generates a structured report

---

## Responsibility Model

| Source         | Responsibility         |
| -------------- | ---------------------- |
| `package.json` | Declared dependencies  |
| `node_modules` | Installed dependencies |
| depcheck       | Usage detection        |
| npm registry   | Existence validation   |

This ensures depmole builds a **full dependency state model**, not just a simple mismatch check.

---

# 🧭 Workflow Diagram

```
         ┌──────────────────┐
         │  Read package.json │
         └──────────┬─────────┘
                    │
                    ▼
         ┌──────────────────┐
         │  Check node_modules │
         └──────────┬─────────┘
                    │
                    ▼
         ┌──────────────────┐
         │ Analyze Imports   │
         │    (depcheck)     │
         └──────────┬─────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   Healthy       Unused     Not Installed
 Dependencies   Dependencies Dependencies
                    │
                    ▼
              Missing Imports
                    │
                    ▼
         ┌──────────────────┐
         │  Scoped Verify    │
         │  (npm registry)   │
         └──────────┬─────────┘
                    ▼
               Structured Report
```

---

# 🎯 Use Cases

* Clean up bloated `package.json` files
* Catch missing dependencies before deployment
* Ensure CI pipelines fail on inconsistencies
* Audit third-party packages quickly
* Improve project hygiene and maintainability

---

# 🐾 Why depmole?

Unlike simple dependency checkers, depmole:

* Treats `package.json` as the source of truth
* Separates declared, installed, and used states
* Supports scoped analysis
* Supports type-based filtering
* Enforces consistent flag combinations
* Can validate against the live npm registry

It’s not just a checker — it’s a dependency investigator.

---

## 📄 License

MIT License – see [LICENSE](LICENSE)
