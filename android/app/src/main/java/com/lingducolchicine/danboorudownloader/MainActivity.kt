package com.lingducolchicine.danboorudownloader

import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.updateTransition
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.input.TextFieldState
import androidx.compose.foundation.text.input.TextFieldLineLimits
import androidx.compose.foundation.text.input.rememberTextFieldState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val preferences = getSharedPreferences("appearance", MODE_PRIVATE)
        setContent {
            var theme by rememberSaveable {
                mutableStateOf(preferences.getString("theme", "system") ?: "system")
            }
            val darkTheme = when (theme) {
                "light" -> false
                "dark" -> true
                else -> isSystemInDarkTheme()
            }
            SideEffect {
                enableEdgeToEdge(
                    statusBarStyle = SystemBarStyle.auto(
                        android.graphics.Color.TRANSPARENT,
                        android.graphics.Color.TRANSPARENT,
                    ) { darkTheme },
                    navigationBarStyle = SystemBarStyle.auto(
                        android.graphics.Color.TRANSPARENT,
                        android.graphics.Color.TRANSPARENT,
                    ) { darkTheme },
                )
            }
            DanbooruTheme(darkTheme = darkTheme) {
                DownloaderApp(theme = theme, onThemeChange = {
                    theme = it
                    preferences.edit().putString("theme", it).apply()
                })
            }
        }
    }
}

private enum class Page(@get:StringRes val label: Int, @get:DrawableRes val icon: Int) {
    Search(R.string.nav_search, R.drawable.ic_search),
    Favorites(R.string.nav_favorites, R.drawable.ic_heart),
    Download(R.string.nav_download, R.drawable.ic_image_down),
    Settings(R.string.nav_settings, R.drawable.ic_settings),
}

@Composable
private fun DanbooruTheme(darkTheme: Boolean, content: @Composable () -> Unit) {
    val context = LocalContext.current
    val colors = when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && darkTheme -> dynamicDarkColorScheme(context)
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> dynamicLightColorScheme(context)
        darkTheme -> darkColorScheme()
        else -> lightColorScheme()
    }
    MaterialTheme(colorScheme = colors, content = content)
}

@Composable
internal fun DownloaderApp(theme: String, onThemeChange: (String) -> Unit) {
    var selectedPage by rememberSaveable { mutableStateOf(Page.Search.name) }
    var searchOpen by rememberSaveable { mutableStateOf(false) }
    val searchTags = rememberTextFieldState()
    val page = Page.valueOf(selectedPage)
    val focusManager = LocalFocusManager.current
    val searchTransition = updateTransition(searchOpen, label = "Search page")

    BackHandler(enabled = searchOpen) {
        focusManager.clearFocus()
        searchOpen = false
    }
    BackHandler(enabled = !searchOpen && page != Page.Search) {
        focusManager.clearFocus()
        selectedPage = Page.Search.name
    }

    searchTransition.AnimatedContent(modifier = Modifier.fillMaxSize()) { open ->
        if (open) {
            SearchEditorPage(
                tags = searchTags,
                focusWhenReady = !searchTransition.isRunning,
                onClose = {
                    focusManager.clearFocus()
                    searchOpen = false
                },
            )
        } else {
            MainScaffold(
                page = page,
                tags = searchTags,
                theme = theme,
                onThemeChange = onThemeChange,
                onSelectPage = { selectedPage = it.name },
                onOpenSearch = { searchOpen = true },
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MainScaffold(
    page: Page,
    tags: TextFieldState,
    theme: String,
    onThemeChange: (String) -> Unit,
    onSelectPage: (Page) -> Unit,
    onOpenSearch: () -> Unit,
) {
    Scaffold(
        modifier = Modifier.fillMaxSize(),
        topBar = {
            TopAppBar(title = {
                Text(stringResource(page.label), fontWeight = FontWeight.Bold)
            })
        },
        bottomBar = {
            NavigationBar {
                Page.entries.forEach { destination ->
                    NavigationBarItem(
                        selected = page == destination,
                        onClick = { onSelectPage(destination) },
                        icon = {
                            Icon(
                                painter = painterResource(destination.icon),
                                contentDescription = null,
                                modifier = Modifier.size(24.dp),
                            )
                        },
                        label = { Text(stringResource(destination.label)) },
                        alwaysShowLabel = true,
                    )
                }
            }
        },
    ) { innerPadding ->
        Box(
            modifier = Modifier.fillMaxSize()
                .padding(innerPadding)
                .consumeWindowInsets(innerPadding),
            contentAlignment = Alignment.TopCenter,
        ) {
            Column(
                modifier = Modifier.widthIn(max = 600.dp).fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 24.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp),
            ) {
                when (page) {
                    Page.Search -> SearchPage(tags, onOpen = onOpenSearch)
                    Page.Favorites -> EmptyState(
                        icon = R.drawable.ic_heart,
                        title = R.string.favorites_empty_title,
                        body = R.string.favorites_empty_body,
                    )
                    Page.Download -> DownloadPage()
                    Page.Settings -> SettingsPage(theme, onThemeChange)
                }
            }
        }
    }
}

@Composable
private fun SearchPage(tags: TextFieldState, onOpen: () -> Unit) {
    Surface(
        onClick = onOpen,
        modifier = Modifier.fillMaxWidth().height(56.dp),
        shape = CircleShape,
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(painterResource(R.drawable.ic_search), contentDescription = null)
            Spacer(Modifier.width(16.dp))
            Text(
                tags.text.toString().ifEmpty { stringResource(R.string.search_tags) },
                color = if (tags.text.isEmpty()) MaterialTheme.colorScheme.onSurfaceVariant
                else MaterialTheme.colorScheme.onSurface,
            )
        }
    }
    Text(
        stringResource(R.string.search_preview_note),
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
    EmptyState(R.drawable.ic_search, R.string.search_empty_title, R.string.search_empty_body)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SearchEditorPage(tags: TextFieldState, focusWhenReady: Boolean, onClose: () -> Unit) {
    val focusRequester = remember { FocusRequester() }
    val focusManager = LocalFocusManager.current
    val keyboardController = LocalSoftwareKeyboardController.current
    LaunchedEffect(focusWhenReady) {
        if (focusWhenReady) focusRequester.requestFocus()
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        topBar = {
            TopAppBar(
                navigationIcon = {
                    IconButton(onClick = onClose) {
                        Icon(
                            painterResource(R.drawable.ic_chevron_right),
                            stringResource(R.string.close_search),
                            modifier = Modifier.rotate(180f),
                        )
                    }
                },
                title = {
                    TextField(
                        state = tags,
                        modifier = Modifier.fillMaxWidth().focusRequester(focusRequester),
                        placeholder = { Text(stringResource(R.string.search_tags)) },
                        leadingIcon = {
                            Icon(painterResource(R.drawable.ic_search), contentDescription = null)
                        },
                        trailingIcon = {
                            if (tags.text.isNotEmpty()) {
                                IconButton(onClick = { tags.edit { replace(0, length, "") } }) {
                                    Icon(painterResource(R.drawable.ic_x), stringResource(R.string.clear_search))
                                }
                            }
                        },
                        lineLimits = TextFieldLineLimits.SingleLine,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        onKeyboardAction = {
                            keyboardController?.hide()
                            focusManager.clearFocus()
                        },
                        shape = CircleShape,
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                            unfocusedContainerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent,
                        ),
                    )
                },
            )
        },
    ) { innerPadding ->
        Text(
            stringResource(R.string.search_preview_note),
            modifier = Modifier.padding(innerPadding).padding(24.dp),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun DownloadPage() {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(stringResource(R.string.downloads_active), style = MaterialTheme.typography.titleMedium)
            Text(
                stringResource(R.string.downloads_empty_active),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
    Text(stringResource(R.string.downloads_history), style = MaterialTheme.typography.titleMedium)
    EmptyState(R.drawable.ic_image_down, R.string.downloads_empty_title, R.string.downloads_empty_body)
}

@Composable
private fun SettingsPage(theme: String, onThemeChange: (String) -> Unit) {
    Text(
        stringResource(R.string.settings_appearance),
        style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.primary,
    )
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(stringResource(R.string.settings_theme), style = MaterialTheme.typography.titleMedium)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(
                    "system" to R.string.theme_system,
                    "light" to R.string.theme_light,
                    "dark" to R.string.theme_dark,
                ).forEach { (value, label) ->
                    FilterChip(
                        selected = theme == value,
                        onClick = { onThemeChange(value) },
                        label = { Text(stringResource(label)) },
                    )
                }
            }
            HorizontalDivider()
            SettingRow(R.string.settings_language, R.string.language_english)
        }
    }
    Text(
        stringResource(R.string.settings_about),
        style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.primary,
    )
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            SettingRow(R.string.settings_source, R.string.source_danbooru)
            HorizontalDivider()
            SettingRow(R.string.settings_version, R.string.version_value)
        }
    }
    Text(
        stringResource(R.string.settings_preview_note),
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

@Composable
private fun SettingRow(@StringRes label: Int, @StringRes value: Int) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(stringResource(label), style = MaterialTheme.typography.bodyLarge)
        Text(
            stringResource(value),
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun EmptyState(@DrawableRes icon: Int, @StringRes title: Int, @StringRes body: Int) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 40.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier.size(88.dp).background(MaterialTheme.colorScheme.secondaryContainer, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                painterResource(icon),
                contentDescription = null,
                modifier = Modifier.size(36.dp),
                tint = MaterialTheme.colorScheme.onSecondaryContainer,
            )
        }
        Spacer(Modifier.height(24.dp))
        Text(stringResource(title), style = MaterialTheme.typography.titleLarge, textAlign = TextAlign.Center)
        Spacer(Modifier.height(8.dp))
        Text(
            stringResource(body),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun AppPreview() {
    DanbooruTheme(darkTheme = false) {
        DownloaderApp(theme = "system", onThemeChange = {})
    }
}
