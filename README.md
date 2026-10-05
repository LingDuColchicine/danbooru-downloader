# Danbooru Downloader

An Electron desktop downloader for browsing, saving, and managing images from Danbooru.Created with the help of GPT.

The application uses the [official Danbooru API](https://danbooru.donmai.us/wiki_pages/help:api) for post searches, tag autocomplete, image metadata, and optional account authentication.

## Features

- Browse recent uploads or search by one or more tags.
- Tag autocomplete, rating filters, infinite scrolling, and image detail panels.
- Download original images to a configurable local directory.
- View active download progress and import/export download history as JSON for the Android app.
- Local favorites, multi-select downloads, blacklist rules, and import/export of favorites.
- Optional Danbooru account login with a username and API key.
- Light, dark, and system themes; English and Chinese interfaces.

Account credentials and local records are stored on the local device. Do not commit API keys or other private credentials to the repository.

## Project Layout

- `electron/`: desktop main process and preload bridge
- `web/`: application UI and local API proxy
- `icons/`: UI and source icons
- `dist/`: packaged macOS and Windows test artifacts
- `android/`: native Kotlin / Jetpack Compose Android application

## Android Preview

Open the `android/` directory in Android Studio and run the `app` configuration on Android 8.0 or newer. The preview provides Search, Favorites, Download, and Settings pages with Material 3 bottom navigation and the desktop SVG icon designs. API search and downloads are not connected yet. See [Android setup and testing](android/README.md).

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
