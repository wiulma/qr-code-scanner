# QR Scanner PWA demo

A small PWA that shows the camera stream in a square and reads QR codes, using only React, browser APIs and plain CSS.

## Running the demo on a phone with ngrok

Browsers only allow camera access on secure pages: `https://` or `localhost`. To try the scanner on a phone, use [ngrok](https://ngrok.com) to expose the local dev server through a public HTTPS URL with a valid certificate.

### Requirements

- [pnpm](https://pnpm.io). The project only accepts pnpm, and `npm install` is blocked.
- A free ngrok account.

### One-time setup

1. Install the dependencies:

   ```bash
   pnpm install
   ```

2. Install ngrok (macOS, with Homebrew; for other systems, see [ngrok downloads](https://ngrok.com/download)):

   ```bash
   brew install ngrok
   ```

3. Sign up at [ngrok.com](https://ngrok.com), copy your authtoken from the dashboard, and save it:

   ```bash
   ngrok config add-authtoken <YOUR_TOKEN>
   ```

You don't need to change any project configuration. [vite.config.ts](vite.config.ts) already sets:

- `server.host: true`, so the dev server accepts connections from outside `localhost`.
- `server.allowedHosts` including `.ngrok-free.app` and `.ngrok-free.dev` (ngrok's free domains). Without it, Vite blocks requests coming through the tunnel.

### Start the demo

Open two terminals.

```bash
# terminal 1: start the Vite dev server (port 5173)
pnpm dev
```

```bash
# terminal 2: open an HTTPS tunnel to the dev server
ngrok http 5173
```

ngrok prints the public address:

```
Forwarding  https://ab12-cd34.ngrok-free.app -> http://localhost:5173
```

Open the `https://…` URL ngrok printed on your phone (it ends in `.ngrok-free.app` or `.ngrok-free.dev`), then:

1. On the free plan, ngrok first shows a "You are about to visit…" warning page. Tap **Visit Site**.
2. Allow camera access when the browser asks.
3. Point the camera at a QR code.

Code changes reload on the phone automatically. The ngrok URL changes every time you restart ngrok on the free plan.

### Troubleshooting

| Problem | Fix |
| --- | --- |
| `Blocked request. This host is not allowed.` | Check that the URL's domain is in `server.allowedHosts` in `vite.config.ts`, then restart `pnpm dev`. |
| `ERR_NGROK_8012` / connection refused | `pnpm dev` isn't running, or ngrok points to the wrong port. Use the port Vite prints. |
| The camera permission prompt never appears | Make sure the URL starts with `https://`. |
| `BarcodeDetector is not defined` | The browser doesn't support the native [`BarcodeDetector`](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector) API (for example Firefox or Safari on iOS). Test with Chrome on Android. |

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
