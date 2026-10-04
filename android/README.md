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

- Switching pages, editing the current tag, removing selected tags, and changing appearance work.
- Selected page and tags survive activity recreation.
- Search uses Material 3 1.4.0 `SearchBar` and `ExpandedFullScreenSearchBar` with the library's default expand/collapse animation. Selected tags appear as colored Material 3 chips with an X on each chip to remove it. Type a space or comma, or tap a suggestion to add a tag. Once the current tag has at least two characters, the expanded view requests up to 12 live suggestions directly from Danbooru's autocomplete API. The close button or Back collapses the view.
- Press keyboard Search or tap the magnifier at the right edge of the search bar to submit the selected tags. The current unfinished tag is added first. Submitting an empty tag list returns to the latest posts. Opening Search initially requests the latest posts (20 per page); submitted tags request matching posts from Danbooru. A two-column staggered grid uses the posts' original aspect ratios and Danbooru's proportional `360x360` image variant, falling back to `preview_file_url`. Scrolling loads more pages for the current query; each page starts with its number and a Material 3 divider. Failed requests show a retry button.
- Tap a result to open its full-screen detail page. It displays the original file URL (or the available large/preview variant), a Download original button, ID, source, dimensions, format, size, and color-coded tags grouped by category. Tap a tag to add it to the current search. Opening and closing the page use a 200 ms scale-and-fade transition. Back returns to the same result list position. Detail data comes from the post list response; after activity recreation, it is fetched by post ID if needed. The download button queues the original in the system Download Manager's public Downloads folder (Android 8/9 request storage permission).
- A swipe over a result reveals favorite, copy-link, and multi-select actions on the image under the finger. The controls remain on that image until another image becomes active. A normal tap still opens detail. Favorites persist locally and appear in the Favorites tab; copying uses the original file URL when available. Multi-select shows checkboxes on every image; tap cards to toggle them. A floating two-part Material 3 action group has Cancel on the left and Download on the right. Download queues selected originals in the system Download Manager; Back also exits selection mode.
- Each tag from a submitted search appears as its own history entry in the expanded search page when the input is empty. History is newest first, so the last tag in a multi-tag search appears above earlier tags. Tap one to search that tag again, or tap its X to remove it. Up to 20 unique tags persist between launches. Older searches containing multiple tags are split into individual entries. Typing hides history; after at least two characters, live tag suggestions appear.
- In-app download history shows an empty state.
- Account login and in-app download tracking are not connected yet. Favorites are device-local, not synced to a Danbooru account.
- Danbooru currently rejects some anonymous searches with more than two tags; the app displays its error message.
- Text lives in `app/src/main/res/values/strings.xml` for later Chinese localization.
- This application has no Electron, Node server, HTML, or WebView.

The expanded search view is Material 3's full-screen dialog. Autocomplete and the feed call Danbooru directly from Android, without the desktop Node server. Material 3 is provided by the Compose BOM. The Android build uses AGP 9.1.1, Gradle 9.3.1, and built-in Kotlin.

## Desktop icons

Original SVGs are copied unchanged from the desktop repository's `icons/` directory into `app/src/main/assets/icons/`. The four navigation icons are `search.svg`, `heart.svg`, `image-down.svg`, and `settings.svg`, matching the desktop navigation. The image actions use `heart-filled.svg`, `square-arrow-out-up-right.svg`, `square.svg`, and `square-check.svg`. The same `search.svg` is used for the search button, `x.svg` removes selected tags and history entries, and `chevron-right.svg` is rotated to leave the search page.

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

The instrumentation tests check search expansion, manual chip creation and removal, submission through both keyboard Search and the search icon, search history replay/deletion, and the visible submitted query. They also verify detail response parsing, including the original file URL and grouped tags. The navigation test switches all four tabs and checks that page selection, selected tags, and history survive activity recreation. These tests do not depend on live autocomplete or post results.
