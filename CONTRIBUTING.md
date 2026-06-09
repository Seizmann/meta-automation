# Contributing to meta-auto-byrexio

First off, thank you for considering contributing to meta-auto-byrexio! It is people like you who make this project better for everyone.

Please read through these guidelines to understand how you can help improve the project.

---

## 🗺️ Codebase Overview

This repository is organized as a monorepo:
* **`backend/`**: Rust & Axum server.
* **`frontend/`**: Vite & React client.

---

## 🛠️ How to Contribute

### 1. Reporting Bugs & Suggesting Features
- Search existing Issues before creating a new one to verify it hasn't already been reported or solved.
- Use a clear and descriptive title for the issue.
- Provide a step-by-step reproduction guide, along with expected and actual behavior.

### 2. Submitting Pull Requests (PRs)
- Fork the repository and create a branch from `main`.
- If you've added code that should be tested, add unit/integration tests.
- Ensure the code complies with our coding styles.
- Submit a PR description detailing **what** you changed and **why**.

---

## 📏 Coding Standards & Style Guides

### Backend (Rust)
- Ensure your code compiles warning-free:
  ```bash
  cargo check
  cargo clippy
  ```
- Format your code using rustfmt:
  ```bash
  cargo fmt
  ```
- Keep dependencies updated and check for OpenSSL compatibility. Always use `rustls-tls` in `reqwest` configuration.

### Frontend (React / Vite)
- Format your code cleanly.
- Ensure the production bundle compiles successfully without ESLint warnings:
  ```bash
  npm run build
  ```
- Do not commit any `.env` or `.env.local` files to Git.

---

## 📜 Code of Conduct
By participating in this project, you agree to abide by standard open-source behaviors:
- Be respectful and inclusive of other contributors.
- Focus on collaborative, constructive feedback.
- Be supportive of new contributors.
