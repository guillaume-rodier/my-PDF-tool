# PaperPilot

PaperPilot is a personal PDF toolbox built with Vue 3, TypeScript, Vite and Vuetify. The goal is to provide a lightweight, local-first browser workflow for common PDF operations without introducing unnecessary complexity or user accounts.

This project follows a modular structure so new utilities can be added progressively while keeping the code base maintainable and easy to extend.

## ✨ Features

- Home page presenting the PDF tools available
- Reusable PDF upload and drag-and-drop components
- Local PDF merging in the browser with pdf-lib
- Document editor to combine PDF pages and JPG/JPEG/PNG/WebP images
- Page rotation, image placement, proportional resizing, image rotation and page reordering
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
- PDF.js

## 🔒 Local processing

Sensitive PDF files remain in the browser. The merge tool and document editor process files locally rather than sending documents to a remote server.

The document editor copies imported PDF pages into the result without rasterizing their content, so their text remains selectable and searchable. Added images are embedded as separate image objects over the copied page. Pages created from image files remain image-based. Files are processed locally; very large source PDFs and images can still require substantial browser memory.

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
