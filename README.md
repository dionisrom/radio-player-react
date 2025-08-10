# Radio Player React

A modern, visually impressive web radio player built with React, Vite, and Tailwind CSS. Features advanced UI/UX, a vibrant EQ/visualization, and robust filtering for discovering and playing internet radio stations.

## Features

- **Modern UI/UX**: Glassmorphism, dark/light theme toggle, responsive layout, and beautiful controls.
- **Advanced Filtering**: Multi-select and single-select dropdowns for country, tags, and codec, with in-memory search and AND/OR logic for tags.
- **Favorites**: Mark stations as favorites and quickly access them in a carousel.
- **Powerful Player**: 12-band vertical EQ, animated visualization, custom EQ presets, and a toggle for visualization as a full-page background.
- **CORS Proxy**: Option to stream via a built-in proxy to bypass CORS issues.
- **Performance**: In-memory caching for all API calls and search results.

## Getting Started

### Prerequisites
- Node.js (v18 or newer recommended)
- npm

### Installation

```sh
npm install
```

### Development

```sh
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```sh
npm run build
```

### Preview Production Build

```sh
npm run preview
```

## Project Structure

- `src/` - Main source code
  - `components/` - React components (Player, StationList, EQ, etc.)
  - `utils/` - API and helper utilities
  - `index.css` - Tailwind and global styles
- `api/proxy.js` - Local CORS proxy for radio streams
- `vite.config.js` - Vite configuration
- `tailwind.config.cjs` - Tailwind configuration

## API
- Uses [Radio Browser API](https://www.radio-browser.info/) for station, tag, country, and codec data.
- All API calls are cached in-memory for performance.

## CORS Proxy
- Streams can be played directly or via `/api/proxy?url=...` to bypass CORS issues.
- The proxy works both locally and in production (e.g., Vercel, Netlify).

## Customization
- Easily add more EQ presets in `src/utils/presets.js`.
- Adjust UI and themes via Tailwind classes in the components.

## License
MIT

---

Made with ❤️ by [dionisrom](https://github.com/dionisrom)
