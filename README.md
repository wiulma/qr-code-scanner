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

| Problem                                      | Fix                                                                                                                                                                                                   |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Blocked request. This host is not allowed.` | Check that the URL's domain is in `server.allowedHosts` in `vite.config.ts`, then restart `pnpm dev`.                                                                                                 |
| `ERR_NGROK_8012` / connection refused        | `pnpm dev` isn't running, or ngrok points to the wrong port. Use the port Vite prints.                                                                                                                |
| The camera permission prompt never appears   | Make sure the URL starts with `https://`.                                                                                                                                                             |
| `BarcodeDetector is not defined`             | The browser doesn't support the native [`BarcodeDetector`](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector) API (for example Firefox or Safari on iOS). Test with Chrome on Android. |

## Debugging on the phone with DevTools

You can connect your computer's DevTools to the page running on the phone: console, network, elements, breakpoints, and the service worker and cache in the **Application** panel. Both setups need a USB cable.

### Android (Chrome)

Works from macOS, Windows or Linux with desktop Chrome.

1. On the phone, turn on developer mode: **Settings → About phone → Software information**, then tap **Build number** seven times. The exact menu path varies by manufacturer.
2. In **Settings → Developer options**, turn on **USB debugging**.
3. Connect the phone with a USB cable and accept the **Allow USB debugging?** prompt on the phone.
4. Open the app on the phone in Chrome (the ngrok URL, or `localhost` as described below).
5. On the computer, open `chrome://inspect/#devices` in Chrome. Keep **Discover USB devices** checked.
6. Your phone appears with its open tabs. Click **inspect** under the tab with the app.

A DevTools window opens with a live mirror of the phone screen. You can click and type in the mirror, too.

**Skip ngrok with port forwarding.** Chrome can forward a port on the phone to your computer through the USB cable. Since `localhost` counts as a secure page, the camera works without ngrok:

1. In `chrome://inspect/#devices`, click **Port forwarding…**.
2. Add port `5173` → `localhost:5173`, check **Enable port forwarding**, and click **Done**.
3. With `pnpm dev` running, open `http://localhost:5173` in Chrome on the phone.

**Installed PWA.** When the app is installed on the home screen, it still appears in `chrome://inspect` while it is open, and you inspect it the same way.

### iPhone (Safari)

Needs a Mac with Safari. Apple doesn't offer Web Inspector on Windows or Linux.

1. On the iPhone, open **Settings → Apps → Safari → Advanced** (on iOS 17 and earlier: **Settings → Safari → Advanced**) and turn on **Web Inspector**.
2. On the Mac, open Safari, go to **Safari → Settings → Advanced**, and check **Show features for web developers** (on older versions: **Show Develop menu in menu bar**).
3. Connect the iPhone to the Mac with a USB cable. If asked, tap **Trust** on the iPhone.
4. Open the ngrok URL on the iPhone in Safari.
5. On the Mac, open the **Develop** menu in Safari, choose your iPhone, then the page with the app.

Web Inspector opens and shows the console, network, elements and storage of the page on the iPhone.

Notes:

- To connect without a cable after the first time, choose your iPhone in the **Develop** menu and select **Connect via Network**. The iPhone and the Mac must be on the same Wi-Fi network.
- An app installed on the home screen also appears in the **Develop** menu while it is open.
- Every browser on iOS uses Safari's engine (WebKit). Chrome on iOS can be inspected the same way, from the Mac's Safari **Develop** menu. Chrome's `chrome://inspect` doesn't work with iPhones.
- Safari has no port forwarding, so on iPhone you still need the ngrok URL.

---
