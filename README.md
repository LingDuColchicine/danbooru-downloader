# Danbooru Downloader

Desktop image downloader built with Electron and the Danbooru API.

## Project Layout

- `electron/`: desktop main process and preload bridge
- `web/`: application UI and local API proxy
- `icons/`: UI and source icons
- `dist/`: packaged macOS and Windows test artifacts

## Run

The installed workspace dependencies are already available locally.

```sh
npm run electron:dev
```

To run only the local UI server:

```sh
npm run web
```

The UI server listens on `http://127.0.0.1:5174/` by default. Electron automatically selects another available local port if that one is occupied.

## Packaging

```sh
npm run pack
npm run dist
```

Packaged test artifacts are kept under `dist/`.
