# niblit-ui Tauri Build Guide

This UI can run either in the browser with Vite or as a desktop app with Tauri.
The Tauri wrapper uses the React/Vite frontend in this repo and the Rust app
shell in `src-tauri/`.

## Prerequisites

Install these before building:

- `Node.js` 18+ with `npm`
- `Rust` via `rustup`
- Tauri platform prerequisites for your OS

Windows notes:

- Install the Microsoft Visual Studio C++ build tools if Rust prompts for them.
- WebView2 is typically already present on modern Windows systems.

## Install Dependencies

From the `niblit-ui` directory:

```bash
npm install
```

## Run In Browser

This starts the Vite development server only:

```bash
npm run dev
```

## Run As Tauri Desktop App

This starts the Vite dev server and opens the desktop shell:

```bash
npm run tauri:dev
```

By default, Tauri uses:

- `npm run dev` as `beforeDevCommand`
- `http://localhost:5173` as the frontend dev URL

These values are configured in `src-tauri/tauri.conf.json`.

## Build The Frontend Only

To create the production web bundle:

```bash
npm run build
```

This outputs the static frontend into `dist/`.

## Build The Desktop App

To build a packaged Tauri desktop app:

```bash
npm run tauri:build
```

Tauri will:

1. run `npm run build`
2. use `dist/` as the frontend bundle
3. compile the Rust shell in `src-tauri/`
4. emit platform installers/binaries

## Output Locations

Build artifacts are typically written under:

- `src-tauri/target/`
- `src-tauri/target/release/`
- `src-tauri/target/release/bundle/`

The exact installer format depends on your OS and installed toolchain.

## Environment Variables

The UI reads these frontend variables:

- `VITE_NIBLIT_API_URL` for the Niblit runtime API
- `VITE_NIBLIT_CLOUD_URL` for the cloud inference API

For local development, create `.env.local` if needed:

```env
VITE_NIBLIT_API_URL=http://127.0.0.1:8080
VITE_NIBLIT_CLOUD_URL=http://127.0.0.1:8000
```

If you launch from the main Niblit app, those values can also be injected by the
Python launcher.

## Icons

The current repo includes placeholder icons in `src-tauri/icons/`.
For a production-ready build, generate real app icons, for example:

```bash
npx tauri icon path/to/icon.png
```

That will generate the `.ico`, `.icns`, and PNG assets expected by Tauri.

## Troubleshooting

If `npm run tauri:dev` fails:

- confirm `npm install` completed successfully
- confirm `rustc --version` works
- confirm `cargo --version` works
- confirm the Tauri prerequisites for your OS are installed

If `npm run tauri:build` fails:

- run `npm run build` first to verify the frontend builds cleanly
- check that `src-tauri/tauri.conf.json` points to `../dist`
- regenerate icons if bundling complains about missing icon formats

## Useful Commands

```bash
npm install
npm run dev
npm run build
npm run tauri:dev
npm run tauri:build
```
