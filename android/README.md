# Danbooru Downloader for Android

A native Kotlin / Jetpack Compose application using Material 3. This first preview includes four screens: Search, Favorites, Download, and Settings. The bottom navigation uses the official `NavigationBar` and `NavigationBarItem` components, with all four English labels always visible.

## Open and run

1. In Android Studio, choose **Open** and select this `android` directory, not the desktop repository root.
2. Use JDK 17 or 21 for Gradle. Install Android SDK Platform 37 and let Gradle sync finish.
3. Select the `app` run configuration and your phone or emulator, then click **Run**.

Android 8.0 (API 26) or newer is supported. Android 12 and newer use Material You dynamic colors. System, Light, and Dark themes can be selected in Settings; the choice persists between launches.

Command-line build:

```powershell
.\gradlew.bat assembleDebug
```

The APK is written to `app/build/outputs/apk/debug/app-debug.apk`.

## Preview scope

- Switching pages, editing/clearing tags, and changing appearance work.
- Selected page and search text survive activity recreation.
- Search uses Material 3 1.4.0 `SearchBar` and `ExpandedFullScreenSearchBar` with the library's default expand/collapse animation. The expanded view shows filterable example tags below the input. Tap one to fill the query and collapse the view; the close button, Back, or keyboard Search action also collapses it.
- Favorites and downloads show empty states.
- API search, account login, favorites storage, and actual downloads are not connected yet.
- Text lives in `app/src/main/res/values/strings.xml` for later Chinese localization.
- This application has no Electron, Node server, HTML, or WebView.

The expanded search view is Material 3's full-screen dialog. Example tags are local preview data; they do not query Danbooru. Material 3 is provided by the Compose BOM. The Android build uses AGP 9.1.1, Gradle 9.3.1, and built-in Kotlin.

## Desktop icons

Original SVGs are copied unchanged from the desktop repository's `icons/` directory into `app/src/main/assets/icons/`. The four navigation icons are `search.svg`, `heart.svg`, `image-down.svg`, and `settings.svg`, matching the desktop navigation. `x.svg` clears search text, and `chevron-right.svg` is rotated to leave the search page.

Android does not render SVG files directly with `painterResource`. Equivalent native `VectorDrawable` resources are generated from these SVG paths so the app needs no runtime SVG library. Regenerate after updating the copied SVGs:

```powershell
.\scripts\sync-icons.ps1
```

Verify that the committed vectors still match their SVG assets with `.\scripts\sync-icons.ps1 -Check`.

The launcher artwork is also copied from the existing desktop icon.

## Navigation check

With a phone or emulator connected:

```powershell
.\gradlew.bat connectedDebugAndroidTest
```

The instrumentation test checks search expansion, example selection, closing, clearing, and the keyboard Search action, switches all four tabs, and checks that page selection and search input survive activity recreation.
