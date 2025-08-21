# Radio Player React

A modern, visually impressive web radio player built with React, Vite, and Tailwind CSS. Features advanced UI/UX, a vibrant EQ/visualization, and robust filtering for discovering and playing internet radio stations.

## Features

- **Modern UI/UX**: Glassmorphism, dark/light theme toggle, responsive layout, and beautiful controls.
- **Advanced Filtering**: Multi-select and single-select dropdowns for country, tags, and codec, with in-memory search and AND/OR logic for tags.
- **Favorites**: Mark stations as favorites and quickly access them in a carousel.
- **Powerful Player**: 12-band vertical EQ, animated visualization, custom EQ presets, and a toggle for visualization as a full-page background.
- **CORS Proxy**: Option to stream via a built-in proxy to bypass CORS issues.
- **Performance**: In-memory caching for all API calls and search results.
- **iOS Safari Compatibility**: Automatic fallback visualization for iOS Safari's Web Audio API limitations.

## Browser Compatibility

### Audio Visualization

The audio visualization feature works across all modern browsers, with special handling for iOS Safari:

- **Desktop browsers (Chrome, Firefox, Safari, Edge)**: Full visualization with real audio frequency data
- **Mobile browsers (Android Chrome, iOS Safari)**: 
  - Android Chrome: Full visualization support
  - iOS Safari: Due to Safari's CORS restrictions with the Web Audio API on cross-origin audio streams, the app automatically provides a fallback visualization that simulates the audio visualization experience
- **User Experience**: iOS users still get a beautiful animated visualization, with a subtle indicator that it's a simulated version due to browser limitations

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

## Deployment (Vercel)

This project is ready to deploy to Vercel as a static site with Node serverless API routes.

Quick deploy (Vercel dashboard):

1. Push your repository to GitHub.
2. In the Vercel dashboard click "New Project" and import the repository.
3. Set the Build Command to `npm run build` and the Output Directory to `dist` if not detected automatically.
4. Deploy — Vercel will also deploy `api/*.js` as serverless Node functions.

One-off CLI deploy:

```powershell
# Install the Vercel CLI if you need it
npm i -g vercel
vercel login
vercel --prod
```

CI / GitHub Actions deploy (automated):

- Create the repository secret `VERCEL_TOKEN` in GitHub (and optionally `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`).
- A workflow is included at `.github/workflows/vercel-deploy.yml` which runs `npm ci`, `npm run build`, and then deploys with `vercel --prod` using the token.

Notes:

- The Vite production build outputs to `dist/` (this is what Vercel will serve).
- Your `api/` handlers follow the `(req, res)` Node signature and will be deployed as serverless functions.
- Serverless functions have execution time limits; long-lived SSE connections may be constrained. If you need long-running connections consider a different hosting approach for that endpoint.
