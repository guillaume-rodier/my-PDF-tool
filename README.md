# PaperPilot

PaperPilot is a personal PDF toolbox built with Vue 3, TypeScript, Vite and Vuetify. The goal is to provide a lightweight, local-first browser workflow for common PDF operations without introducing unnecessary complexity or user accounts.

This project follows a modular structure so new utilities can be added progressively while keeping the code base maintainable and easy to extend.

## ✨ Features

- Home page presenting the PDF tools available
- Reusable PDF upload and drag-and-drop components
- Local PDF merging in the browser with pdf-lib
- Clean Vuetify interface adapted to desktop and mobile
- Project structure prepared for future tools such as split, rotate, reorder and watermark
- Type-safe service layer separating UI logic from PDF processing

## 🧱 Stack

- Vue 3
- TypeScript
- Vite
- Vue Router
- Pinia
- Vuetify
- Vitest
- ESLint
- Prettier
- pdf-lib

## 🔒 Local processing

Sensitive PDF files remain in the browser as much as possible. The current merge tool performs processing locally in the client rather than sending documents to a remote server. This keeps the workflow simple and privacy-friendly while making it easier to add backend-based features later if needed.

## 🚀 Installation

```bash
npm install
```

## 🧪 Development

```bash
npm run dev
```

The app is served by Vite on the default port configured in the project.

## 🏗️ Production build

```bash
npm run build
```

## ✅ Tests

```bash
npm run test
```

## 📁 General project structure

```text
src/
  components/
    common/
    layout/
    pdf/
  data/
  pages/
    tools/
  plugins/
  router/
  services/
    pdf/
  styles/
  types/
```

## 📜 License

This project is licensed under the GNU GPL v3.0.

See the [LICENSE](LICENSE) file for the complete text.
