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
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.input.TextFieldState
import androidx.compose.foundation.text.input.rememberTextFieldState
import androidx.compose.foundation.text.input.setTextAndPlaceCursorAtEnd
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.ExpandedFullScreenSearchBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SearchBar
import androidx.compose.material3.SearchBarDefaults
import androidx.compose.material3.SearchBarValue
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.rememberSearchBarState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

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
    val searchTags = rememberTextFieldState()
    val page = Page.valueOf(selectedPage)
    val focusManager = LocalFocusManager.current

    BackHandler(enabled = page != Page.Search) {
        focusManager.clearFocus()
        selectedPage = Page.Search.name
    }

    MainScaffold(
        page = page,
        tags = searchTags,
        theme = theme,
        onThemeChange = onThemeChange,
        onSelectPage = { selectedPage = it.name },
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MainScaffold(
    page: Page,
    tags: TextFieldState,
    theme: String,
    onThemeChange: (String) -> Unit,
    onSelectPage: (Page) -> Unit,
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
                    Page.Search -> SearchPage(tags)
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SearchPage(tags: TextFieldState) {
    val searchBarState = rememberSearchBarState()
    val scope = rememberCoroutineScope()
    val inputField = @Composable {
        SearchBarDefaults.InputField(
            textFieldState = tags,
            searchBarState = searchBarState,
            onSearch = { scope.launch { searchBarState.animateToCollapsed() } },
            placeholder = { Text(stringResource(R.string.search_tags)) },
            leadingIcon = {
                if (searchBarState.currentValue == SearchBarValue.Expanded) {
                    IconButton(onClick = { scope.launch { searchBarState.animateToCollapsed() } }) {
                        Icon(
                            painterResource(R.drawable.ic_chevron_right),
                            contentDescription = stringResource(R.string.close_search),
                            modifier = Modifier.rotate(180f),
                        )
                    }
                } else {
                    Icon(painterResource(R.drawable.ic_search), contentDescription = null)
                }
            },
            trailingIcon = {
                if (tags.text.isNotEmpty()) {
                    IconButton(onClick = { tags.setTextAndPlaceCursorAtEnd("") }) {
                        Icon(painterResource(R.drawable.ic_x), stringResource(R.string.clear_search))
                    }
                }
            },
        )
    }

    SearchBar(state = searchBarState, inputField = inputField, modifier = Modifier.fillMaxWidth())
    ExpandedFullScreenSearchBar(state = searchBarState, inputField = inputField) {
        val query = tags.text.toString().trim()
        val examples = listOf("landscape", "scenery", "clouds", "night", "cat", "1girl")
            .filter { query.isEmpty() || it.contains(query, ignoreCase = true) }
        Column(modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState())) {
            Text(
                stringResource(R.string.example_tags),
                modifier = Modifier.padding(start = 24.dp, top = 24.dp, bottom = 8.dp),
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            examples.forEach { tag ->
                ListItem(
                    headlineContent = { Text(tag) },
                    leadingContent = {
                        Icon(painterResource(R.drawable.ic_search), contentDescription = null)
                    },
                    modifier = Modifier.clickable {
                        tags.setTextAndPlaceCursorAtEnd(tag)
                        scope.launch { searchBarState.animateToCollapsed() }
                    },
                )
            }
            if (examples.isEmpty()) {
                Text(
                    stringResource(R.string.no_matching_examples),
                    modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Text(
                stringResource(R.string.search_preview_note),
                modifier = Modifier.padding(24.dp),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
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
