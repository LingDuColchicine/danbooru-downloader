package com.lingducolchicine.danboorudownloader

import android.Manifest
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animate
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.staggeredgrid.LazyStaggeredGridState
import androidx.compose.foundation.lazy.staggeredgrid.LazyVerticalStaggeredGrid
import androidx.compose.foundation.lazy.staggeredgrid.StaggeredGridCells
import androidx.compose.foundation.lazy.staggeredgrid.StaggeredGridItemSpan
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.input.TextFieldState
import androidx.compose.foundation.text.input.rememberTextFieldState
import androidx.compose.foundation.text.input.setTextAndPlaceCursorAtEnd
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExpandedFullScreenSearchBar
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.FabPosition
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.InputChip
import androidx.compose.material3.InputChipDefaults
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SearchBar
import androidx.compose.material3.SearchBarDefaults
import androidx.compose.material3.SearchBarValue
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.rememberSearchBarState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalResources
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import java.text.NumberFormat
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

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

private enum class Rating(val code: String, @get:StringRes val label: Int, val bit: Int) {
    General("g", R.string.rating_general, 1),
    Sensitive("s", R.string.rating_sensitive, 2),
    Questionable("q", R.string.rating_questionable, 4),
    Explicit("e", R.string.rating_explicit, 8),
}

private const val ALL_RATINGS_MASK = 15
private const val RATING_MASK_KEY = "rating_mask"

internal fun ratedQuery(tags: String, ratingMask: Int): String {
    val selected = Rating.entries.filter { ratingMask and it.bit != 0 }.ifEmpty { listOf(Rating.General) }
    val ratingTerm = if (selected.size == Rating.entries.size) ""
    else "rating:${selected.joinToString(",") { it.code }}"
    return listOf(tags.trim(), ratingTerm).filter { it.isNotEmpty() }.joinToString(" ")
}

internal data class SelectedTag(val label: String, val value: String, val category: Int)

private class PostGridControls {
    var activePostKey by mutableStateOf<String?>(null)
    var selectionMode by mutableStateOf(false)
    val selectedPostIds = mutableStateListOf<Long>()

    fun startSelection() {
        selectionMode = true
        activePostKey = null
    }

    fun startSelection(id: Long) {
        startSelection()
        toggleSelection(id)
    }

    fun toggleSelection(id: Long) {
        if (id in selectedPostIds) selectedPostIds.remove(id) else selectedPostIds.add(id)
    }

    fun endSelection() {
        selectionMode = false
        selectedPostIds.clear()
    }
}

private val selectedTagsSaver = Saver<SnapshotStateList<SelectedTag>, ArrayList<String>>(
    save = { tags ->
        ArrayList(tags.flatMap { listOf(it.label, it.value, it.category.toString()) })
    },
    restore = { saved ->
        mutableStateListOf<SelectedTag>().apply {
            saved.chunked(3).filter { it.size == 3 }.forEach { (label, value, category) ->
                add(SelectedTag(label, value, category.toIntOrNull() ?: 0))
            }
        }
    },
)

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
    val selectedTags = rememberSaveable(saver = selectedTagsSaver) { mutableStateListOf<SelectedTag>() }
    var submittedQuery by rememberSaveable { mutableStateOf("") }
    val context = LocalContext.current
    val ratingPreferences = remember(context) { context.getSharedPreferences("search", Context.MODE_PRIVATE) }
    var ratingMask by rememberSaveable {
        mutableIntStateOf(
            ratingPreferences.getInt(RATING_MASK_KEY, Rating.General.bit)
                .takeIf { it in 1..ALL_RATINGS_MASK } ?: Rating.General.bit
        )
    }
    val resources = LocalResources.current
    val historyStore = remember(context) { SearchHistoryStore(context) }
    val searchHistory = remember(historyStore) {
        mutableStateListOf<SearchHistoryEntry>().apply { addAll(historyStore.load()) }
    }
    val favoriteStore = remember(context) { FavoriteStore(context) }
    val favorites = remember(favoriteStore) {
        mutableStateListOf<FavoritePost>().apply { addAll(favoriteStore.load()) }
    }
    val gridControls = remember { PostGridControls() }
    val feedScope = rememberCoroutineScope()
    val latestPosts = remember(feedScope) { LatestPostsFeed(feedScope, ratedQuery(submittedQuery, ratingMask)) }
    var feedGridState by remember { mutableStateOf(LazyStaggeredGridState()) }
    var selectedPostId by rememberSaveable { mutableStateOf<Long?>(null) }
    var displayedPostId by remember { mutableStateOf(selectedPostId) }
    var detailVisibility by remember { mutableFloatStateOf(if (selectedPostId == null) 0f else 1f) }
    val page = Page.valueOf(selectedPage)
    val focusManager = LocalFocusManager.current
    var pendingDownloads by remember { mutableStateOf<List<FavoritePost>>(emptyList()) }
    var downloadInProgress by remember { mutableStateOf(false) }
    val queueSelectedDownloads: (List<FavoritePost>) -> Unit = { posts ->
        val available = posts.filter { it.fileUrl != null }
        if (available.isEmpty()) {
            downloadInProgress = false
            Toast.makeText(context, R.string.original_unavailable, Toast.LENGTH_SHORT).show()
        } else feedScope.launch {
            val queued = withContext(Dispatchers.IO) {
                available.count { post ->
                    runCatching {
                        enqueueOriginalDownload(context, post.id, requireNotNull(post.fileUrl), post.fileExt)
                    }.isSuccess
                }
            }
            downloadInProgress = false
            Toast.makeText(
                context,
                if (queued == 0) resources.getString(R.string.download_failed_generic)
                else resources.getString(R.string.download_selected_result, queued, posts.size),
                Toast.LENGTH_LONG,
            ).show()
            if (queued == posts.size && gridControls.selectedPostIds.toSet() == posts.map { it.id }.toSet()) {
                gridControls.endSelection()
            }
        }
    }
    val storagePermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        val posts = pendingDownloads
        pendingDownloads = emptyList()
        if (granted) queueSelectedDownloads(posts)
        else {
            downloadInProgress = false
            Toast.makeText(context, R.string.download_permission_denied, Toast.LENGTH_SHORT).show()
        }
    }

    BackHandler(enabled = displayedPostId == null && page != Page.Search) {
        focusManager.clearFocus()
        selectedPage = Page.Search.name
    }
    BackHandler(enabled = displayedPostId == null && gridControls.selectionMode) {
        gridControls.endSelection()
    }

    LaunchedEffect(selectedPostId) {
        if (selectedPostId != null) {
            displayedPostId = selectedPostId
            animate(detailVisibility, 1f, animationSpec = tween(200)) { value, _ ->
                detailVisibility = value
            }
        } else if (displayedPostId != null) {
            animate(detailVisibility, 0f, animationSpec = tween(200)) { value, _ ->
                detailVisibility = value
            }
            displayedPostId = null
        }
    }

    val updateResults: (String) -> Unit = { query ->
        if (query != submittedQuery) {
            gridControls.endSelection()
            gridControls.activePostKey = null
            submittedQuery = query
            latestPosts.search(ratedQuery(query, ratingMask))
            feedGridState = LazyStaggeredGridState()
        }
    }
    LaunchedEffect(selectedTags, ratingMask) {
        snapshotFlow { selectedTags.joinToString(" ") { it.value } }
            .collect { updateResults(it) }
    }
    val submitSearch: (String) -> Unit = { query ->
        updateResults(query)
        if (query.isNotBlank()) {
            val searchedTags = selectedTags.asReversed().map(::SearchHistoryEntry)
            searchHistory.removeAll { existing ->
                searchedTags.any { it.tag.value.equals(existing.tag.value, ignoreCase = true) }
            }
            searchHistory.addAll(0, searchedTags)
            while (searchHistory.size > SEARCH_HISTORY_LIMIT) searchHistory.removeAt(searchHistory.lastIndex)
            historyStore.save(searchHistory)
        }
    }

    BackHandler(
        enabled = displayedPostId == null && page == Page.Search &&
            !gridControls.selectionMode && (selectedTags.isNotEmpty() || submittedQuery.isNotEmpty()),
    ) {
        focusManager.clearFocus()
        searchTags.setTextAndPlaceCursorAtEnd("")
        selectedTags.clear()
        updateResults("")
    }

    Box(Modifier.fillMaxSize()) {
        MainScaffold(
            page = page,
            tags = searchTags,
            selectedTags = selectedTags,
            searchHistory = searchHistory,
            latestPosts = latestPosts,
            feedGridState = feedGridState,
            submittedQuery = submittedQuery,
            ratingMask = ratingMask,
            favorites = favorites,
            gridControls = gridControls,
            downloadInProgress = downloadInProgress,
            theme = theme,
            onThemeChange = onThemeChange,
            onSelectPage = {
                gridControls.endSelection()
                selectedPage = it.name
            },
            onSubmitSearch = submitSearch,
            onRefreshGrid = { feedGridState = LazyStaggeredGridState() },
            onRatingChange = { selectedMask ->
                if (selectedMask != 0 && selectedMask != ratingMask) {
                    ratingMask = selectedMask
                    ratingPreferences.edit().putInt(RATING_MASK_KEY, selectedMask).apply()
                    gridControls.endSelection()
                    gridControls.activePostKey = null
                    latestPosts.search(ratedQuery(submittedQuery, selectedMask))
                    feedGridState = LazyStaggeredGridState()
                }
            },
            onOpenPost = { selectedPostId = it },
            onDownloadSelected = { posts ->
                if (!downloadInProgress && posts.isNotEmpty()) {
                    downloadInProgress = true
                    if (
                        Build.VERSION.SDK_INT < Build.VERSION_CODES.Q &&
                        context.checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED
                    ) {
                        pendingDownloads = posts
                        storagePermission.launch(Manifest.permission.WRITE_EXTERNAL_STORAGE)
                    } else queueSelectedDownloads(posts)
                }
            },
            onToggleFavorite = { post ->
                val existing = favorites.indexOfFirst { it.id == post.id }
                if (existing >= 0) favorites.removeAt(existing) else favorites.add(0, post)
                favoriteStore.save(favorites)
            },
            onSharePost = { post ->
                post.fileUrl?.let { url ->
                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    clipboard.setPrimaryClip(ClipData.newPlainText("Danbooru original image", url))
                    Toast.makeText(context, R.string.original_link_copied, Toast.LENGTH_SHORT).show()
                }
            },
            onDeleteHistory = { entry ->
                searchHistory.removeAll { it.tag.value.equals(entry.tag.value, ignoreCase = true) }
                historyStore.save(searchHistory)
            },
            modifier = if (displayedPostId != null) Modifier.clearAndSetSemantics {} else Modifier,
        )
        if (displayedPostId != null) {
            // Draw the black scrim inside the fading layer so the results stay visible on exit.
            Box(
                Modifier.fillMaxSize()
                    .graphicsLayer { alpha = detailVisibility * 0.12f }
                    .background(Color.Black)
                    .clickable(indication = null, interactionSource = remember { MutableInteractionSource() }) {},
            )
            val initialDetail = latestPosts.pages.asSequence()
                .flatMap { it.posts.asSequence() }
                .firstOrNull { it.id == displayedPostId }?.detail
            PostDetailScreen(
                postId = displayedPostId!!,
                initialDetail = initialDetail,
                onBack = { selectedPostId = null },
                onTagClick = { tag ->
                    addSelectedTag(selectedTags, tag)
                    searchTags.setTextAndPlaceCursorAtEnd("")
                    selectedPostId = null
                    selectedPage = Page.Search.name
                    submitSearch(selectedTags.joinToString(" ") { it.value })
                },
                modifier = Modifier.fillMaxSize().graphicsLayer {
                    scaleX = 0.9f + detailVisibility * 0.1f
                    scaleY = 0.9f + detailVisibility * 0.1f
                    alpha = (detailVisibility * 4f).coerceAtMost(1f)
                    shape = RoundedCornerShape(28.dp * (1f - detailVisibility))
                    clip = true
                },
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MainScaffold(
    page: Page,
    tags: TextFieldState,
    selectedTags: SnapshotStateList<SelectedTag>,
    searchHistory: List<SearchHistoryEntry>,
    latestPosts: LatestPostsFeed,
    feedGridState: LazyStaggeredGridState,
    submittedQuery: String,
    ratingMask: Int,
    favorites: List<FavoritePost>,
    gridControls: PostGridControls,
    downloadInProgress: Boolean,
    theme: String,
    onThemeChange: (String) -> Unit,
    onSelectPage: (Page) -> Unit,
    onSubmitSearch: (String) -> Unit,
    onRefreshGrid: () -> Unit,
    onRatingChange: (Int) -> Unit,
    onOpenPost: (Long) -> Unit,
    onDownloadSelected: (List<FavoritePost>) -> Unit,
    onToggleFavorite: (FavoritePost) -> Unit,
    onSharePost: (FavoritePost) -> Unit,
    onDeleteHistory: (SearchHistoryEntry) -> Unit,
    modifier: Modifier = Modifier,
) {
    var feedFabExpanded by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(page, gridControls.selectionMode) {
        if (page != Page.Search || gridControls.selectionMode) feedFabExpanded = false
    }
    LaunchedEffect(page, feedGridState) {
        if (page == Page.Search) {
            snapshotFlow { feedGridState.isScrollInProgress }
                .filter { it }
                .collect { feedFabExpanded = false }
        }
    }
    BackHandler(enabled = page == Page.Search && feedFabExpanded) {
        feedFabExpanded = false
    }
    val selectedPosts = if (gridControls.selectionMode) when (page) {
        Page.Search -> latestPosts.pages.asSequence().flatMap { it.posts.asSequence() }
            .filter { it.id in gridControls.selectedPostIds }.map { it.asFavoritePost() }.distinctBy { it.id }.toList()
        Page.Favorites -> favorites.filter { it.id in gridControls.selectedPostIds }
        else -> emptyList()
    } else emptyList()
    Scaffold(
        modifier = modifier.fillMaxSize(),
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
        floatingActionButton = {
            Box(contentAlignment = Alignment.BottomEnd) {
                AnimatedVisibility(
                    visible = gridControls.selectionMode && (page == Page.Search || page == Page.Favorites),
                    enter = fadeIn(tween(180)) + slideInVertically(tween(180)) { it / 2 },
                    exit = fadeOut(tween(120)) + slideOutVertically(tween(120)) { it / 2 },
                ) {
                    SelectionSplitButtons(
                        onCancel = gridControls::endSelection,
                        onDownload = { onDownloadSelected(selectedPosts) },
                        downloadEnabled = !downloadInProgress && selectedPosts.any { it.fileUrl != null },
                    )
                }
                AnimatedVisibility(
                    visible = page == Page.Search && !gridControls.selectionMode,
                    enter = fadeIn(tween(180)),
                    exit = fadeOut(tween(120)),
                ) {
                    FeedActionsFab(
                        expanded = feedFabExpanded,
                        onToggle = { feedFabExpanded = !feedFabExpanded },
                        onMultiSelect = {
                            feedFabExpanded = false
                            gridControls.startSelection()
                        },
                        onRefresh = {
                            feedFabExpanded = false
                            gridControls.activePostKey = null
                            latestPosts.search(latestPosts.query)
                            onRefreshGrid()
                        },
                        onBackToTop = {
                            feedFabExpanded = false
                            if (latestPosts.pages.isNotEmpty()) {
                                scope.launch { feedGridState.animateScrollToItem(0) }
                            }
                        },
                    )
                }
            }
        },
        floatingActionButtonPosition = FabPosition.End,
    ) { innerPadding ->
        Box(
            modifier = Modifier.fillMaxSize()
                .padding(innerPadding)
                .consumeWindowInsets(innerPadding),
            contentAlignment = Alignment.TopCenter,
        ) {
            if (page == Page.Search) {
                SearchPage(
                    tags = tags,
                    selectedTags = selectedTags,
                    searchHistory = searchHistory,
                    feed = latestPosts,
                    gridState = feedGridState,
                    submittedQuery = submittedQuery,
                    ratingMask = ratingMask,
                    favorites = favorites,
                    gridControls = gridControls,
                    onSubmitSearch = onSubmitSearch,
                    onRatingChange = {
                        feedFabExpanded = false
                        onRatingChange(it)
                    },
                    onOpenPost = onOpenPost,
                    onToggleFavorite = onToggleFavorite,
                    onSharePost = onSharePost,
                    onDeleteHistory = onDeleteHistory,
                    modifier = Modifier.widthIn(max = 600.dp).fillMaxSize(),
                )
            } else if (page == Page.Favorites) {
                FavoritesPage(
                    favorites = favorites,
                    gridControls = gridControls,
                    onOpenPost = onOpenPost,
                    onToggleFavorite = onToggleFavorite,
                    onSharePost = onSharePost,
                    modifier = Modifier.widthIn(max = 600.dp).fillMaxSize(),
                )
            } else {
                Column(
                    modifier = Modifier.widthIn(max = 600.dp).fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 24.dp, vertical = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(24.dp),
                ) {
                    when (page) {
                        Page.Search -> Unit
                        Page.Favorites -> Unit
                        Page.Download -> DownloadPage()
                        Page.Settings -> SettingsPage(theme, onThemeChange)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SearchPage(
    tags: TextFieldState,
    selectedTags: SnapshotStateList<SelectedTag>,
    searchHistory: List<SearchHistoryEntry>,
    feed: LatestPostsFeed,
    gridState: LazyStaggeredGridState,
    submittedQuery: String,
    ratingMask: Int,
    favorites: List<FavoritePost>,
    gridControls: PostGridControls,
    onSubmitSearch: (String) -> Unit,
    onRatingChange: (Int) -> Unit,
    onOpenPost: (Long) -> Unit,
    onToggleFavorite: (FavoritePost) -> Unit,
    onSharePost: (FavoritePost) -> Unit,
    onDeleteHistory: (SearchHistoryEntry) -> Unit,
    modifier: Modifier = Modifier,
) {
    val searchBarState = rememberSearchBarState()
    val scope = rememberCoroutineScope()
    val submitSearch: () -> Unit = {
        addManualTags(selectedTags, tags.text.toString())
        tags.setTextAndPlaceCursorAtEnd("")
        onSubmitSearch(selectedTags.joinToString(" ") { it.value })
        scope.launch { searchBarState.animateToCollapsed() }
    }
    LaunchedEffect(tags, selectedTags) {
        snapshotFlow { Triple(tags.text.toString(), tags.selection, tags.composition) }
            .collect { (text, selection, composition) ->
                if (
                    composition == null && selection.collapsed && selection.end == text.length &&
                    text.lastOrNull()?.let { it == ',' || it.isWhitespace() } == true
                ) {
                    addManualTags(selectedTags, text)
                    tags.setTextAndPlaceCursorAtEnd("")
                }
            }
    }
    Column(modifier) {
        BoxWithConstraints(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
            val tagStripMaxWidth = if (maxWidth >= 320.dp) 132.dp else 112.dp
            val inputField = @Composable {
                SearchBarDefaults.InputField(
                    textFieldState = tags,
                    searchBarState = searchBarState,
                    modifier = Modifier.fillMaxWidth(),
                    onSearch = { submitSearch() },
                    placeholder = {
                        Text(
                            stringResource(if (selectedTags.isEmpty()) R.string.search_tags else R.string.add_tag),
                            maxLines = 1,
                            softWrap = false,
                        )
                    },
                    prefix = if (selectedTags.isEmpty()) null else {
                        {
                            SelectedTagsStrip(selectedTags, tagStripMaxWidth)
                        }
                    },
                    leadingIcon = if (searchBarState.currentValue == SearchBarValue.Expanded) {
                        {
                            IconButton(onClick = { scope.launch { searchBarState.animateToCollapsed() } }) {
                                Icon(
                                    painterResource(R.drawable.ic_chevron_right),
                                    contentDescription = stringResource(R.string.close_search),
                                    modifier = Modifier.rotate(180f),
                                )
                            }
                        }
                    } else {
                        {
                            Icon(painterResource(R.drawable.ic_search), contentDescription = null)
                        }
                    },
                    trailingIcon = if (searchBarState.currentValue == SearchBarValue.Expanded) {
                        {
                            IconButton(onClick = submitSearch) {
                                Icon(painterResource(R.drawable.ic_search), stringResource(R.string.search_posts))
                            }
                        }
                    } else null,
                )
            }
            SearchBar(state = searchBarState, inputField = inputField, modifier = Modifier.fillMaxWidth())
            ExpandedFullScreenSearchBar(state = searchBarState, inputField = inputField) {
                if (tags.text.isBlank() && searchHistory.isNotEmpty()) {
                    SearchHistoryList(
                        entries = searchHistory,
                        onSelect = { entry ->
                            tags.setTextAndPlaceCursorAtEnd("")
                            selectedTags.clear()
                            selectedTags.add(entry.tag)
                            submitSearch()
                        },
                        onDelete = onDeleteHistory,
                    )
                } else {
                    SearchTagSuggestions(tags, selectedTags)
                }
            }
        }
        LatestPostsGrid(
            feed, gridState, submittedQuery, ratingMask, favorites, gridControls,
            onRatingChange, onOpenPost, onToggleFavorite, onSharePost,
            Modifier.weight(1f).testTag("feed-tags:$submittedQuery"),
        )
    }
}

@Composable
private fun SearchHistoryList(
    entries: List<SearchHistoryEntry>,
    onSelect: (SearchHistoryEntry) -> Unit,
    onDelete: (SearchHistoryEntry) -> Unit,
) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        Text(
            stringResource(R.string.search_history),
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        entries.forEach { entry ->
            val rowDescription = stringResource(R.string.search_history_entry, entry.tag.value)
            ListItem(
                headlineContent = {
                    Text(
                        entry.tag.label,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                },
                trailingContent = {
                    IconButton(onClick = { onDelete(entry) }) {
                        Icon(
                            painterResource(R.drawable.ic_x),
                            contentDescription = stringResource(R.string.remove_search_history, entry.tag.value),
                        )
                    }
                },
                modifier = Modifier.fillMaxWidth().clickable { onSelect(entry) }
                    .semantics { contentDescription = rowDescription },
            )
        }
    }
}

@Composable
private fun SearchTagSuggestions(tags: TextFieldState, selectedTags: SnapshotStateList<SelectedTag>) {
    val draft = tags.text.toString()
    val activeTag = draftTag(draft, tags.selection.end)
    val query = activeTag.query
    var result by remember { mutableStateOf<TagSuggestionResult?>(null) }
    var retry by remember { mutableIntStateOf(0) }

    LaunchedEffect(query, retry) {
        result = null
        if (query.length < 2) return@LaunchedEffect
        delay(250)
        result = try {
            TagSuggestionResult(query, fetchTagSuggestions(query))
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            TagSuggestionResult(query, error = e.message ?: "Network error")
        }
    }

    val currentResult = result?.takeIf { it.query == query }
    Column(modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState())) {
        when {
            query.length < 2 -> Unit
            currentResult == null -> Box(
                modifier = Modifier.fillMaxWidth().padding(24.dp),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(Modifier.size(24.dp))
            }
            currentResult.error != null -> {
                Text(
                    stringResource(R.string.autocomplete_error, currentResult.error),
                    modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp),
                    color = MaterialTheme.colorScheme.error,
                )
                TextButton(onClick = { retry++ }, modifier = Modifier.padding(start = 12.dp)) {
                    Text(stringResource(R.string.retry))
                }
            }
            currentResult.items.isEmpty() -> SuggestionMessage(R.string.no_matching_tags)
            else -> currentResult.items.forEach { suggestion ->
                ListItem(
                    headlineContent = { Text(suggestion.label) },
                    supportingContent = {
                        Text(
                            stringResource(
                                R.string.tag_suggestion_details,
                                stringResource(suggestion.categoryLabel()),
                                NumberFormat.getIntegerInstance().format(suggestion.postCount),
                            ),
                        )
                    },
                    leadingContent = {
                        Icon(painterResource(R.drawable.ic_search), contentDescription = null)
                    },
                    modifier = Modifier.clickable {
                        addManualTags(selectedTags, draft.substring(0, activeTag.start))
                        addSelectedTag(
                            selectedTags,
                            SelectedTag(
                                activeTag.prefix + suggestion.label,
                                activeTag.prefix + suggestion.value,
                                suggestion.category,
                            ),
                        )
                        tags.setTextAndPlaceCursorAtEnd(
                            draft.substring(activeTag.end).trimStart { it == ',' || it.isWhitespace() },
                        )
                    },
                )
            }
        }
    }
}

private data class TagSuggestionResult(
    val query: String,
    val items: List<TagSuggestion> = emptyList(),
    val error: String? = null,
)

private val tagSeparators = Regex("[,\\s]+")

private data class DraftTag(val start: Int, val end: Int, val prefix: String, val query: String)

private fun draftTag(text: String, cursor: Int): DraftTag {
    val position = cursor.coerceIn(0, text.length)
    var start = position
    while (start > 0 && text[start - 1] != ',' && !text[start - 1].isWhitespace()) start--
    var end = position
    while (end < text.length && text[end] != ',' && !text[end].isWhitespace()) end++
    val beforeCursor = text.substring(start, position)
    val prefix = beforeCursor.takeWhile { it == '-' || it == '~' || it == '(' }
    return DraftTag(start, end, prefix, beforeCursor.drop(prefix.length))
}

private fun addManualTags(selectedTags: SnapshotStateList<SelectedTag>, text: String) {
    text.split(tagSeparators).filter { it.isNotBlank() }.forEach { value ->
        addSelectedTag(selectedTags, SelectedTag(value, value, 0))
    }
}

private fun addSelectedTag(selectedTags: SnapshotStateList<SelectedTag>, tag: SelectedTag) {
    if (selectedTags.none { it.value.equals(tag.value, ignoreCase = true) }) {
        selectedTags.add(tag)
    }
}

@Composable
private fun SelectedTagsStrip(selectedTags: SnapshotStateList<SelectedTag>, maxWidth: Dp) {
    val scroll = rememberScrollState()
    LaunchedEffect(selectedTags.size) {
        snapshotFlow { scroll.maxValue }
            .filter { it != Int.MAX_VALUE }
            .collect { scroll.scrollTo(it) }
    }
    Row(
        modifier = Modifier.widthIn(max = maxWidth).horizontalScroll(scroll),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        selectedTags.toList().forEach { tag ->
            SelectedTagChip(tag) { selectedTags.remove(tag) }
        }
        Spacer(Modifier.width(4.dp))
    }
}

@Composable
private fun SelectedTagChip(tag: SelectedTag, onRemove: () -> Unit) {
    val dark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val (container, content) = tagChipColors(tag.category, dark)
    val removeLabel = stringResource(R.string.remove_tag, tag.label)
    InputChip(
        selected = true,
        onClick = onRemove,
        label = { Text(tag.label, maxLines = 1, overflow = TextOverflow.Ellipsis) },
        trailingIcon = {
            Icon(
                painterResource(R.drawable.ic_x),
                contentDescription = null,
                modifier = Modifier.size(16.dp),
            )
        },
        modifier = Modifier.widthIn(max = 160.dp).semantics { contentDescription = removeLabel },
        colors = InputChipDefaults.inputChipColors(
            selectedContainerColor = container,
            selectedLabelColor = content,
            selectedTrailingIconColor = content,
        ),
        border = null,
    )
}

internal fun tagChipColors(category: Int, dark: Boolean): Pair<Color, Color> = when (category) {
    1 -> if (dark) Color(0x33B289FF) to Color(0xFFC6A7FF)
         else Color(0xFFF1ECFF) to Color(0xFF8A63D2)
    3 -> if (dark) Color(0x33FFC15B) to Color(0xFFFFD077)
         else Color(0xFFFFF3D8) to Color(0xFFB97712)
    4 -> if (dark) Color(0x33FF6AA8) to Color(0xFFFF6AA8)
         else Color(0xFFFFE9F2) to Color(0xFFD94986)
    5 -> if (dark) Color(0x2E5FE08F) to Color(0xFF5FE08F)
         else Color(0xFFE8F9EE) to Color(0xFF2B9B57)
    else -> if (dark) Color(0x2E68A6FF) to Color(0xFF79B8FF)
            else Color(0xFFEEF5FF) to Color(0xFF3278C6)
}

@StringRes
private fun TagSuggestion.categoryLabel(): Int = when (category) {
    1 -> R.string.tag_category_artist
    3 -> R.string.tag_category_copyright
    4 -> R.string.tag_category_character
    5 -> R.string.tag_category_meta
    else -> R.string.tag_category_general
}

@Composable
private fun SuggestionMessage(@StringRes message: Int) {
    Text(
        stringResource(message),
        modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp),
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

@Composable
private fun RatingFilter(ratingMask: Int, onRatingChange: (Int) -> Unit) {
    var dialogOpen by remember { mutableStateOf(false) }
    val count = Rating.entries.count { ratingMask and it.bit != 0 }
    val summary = when (count) {
        0 -> stringResource(R.string.rating_general)
        Rating.entries.size -> stringResource(R.string.rating_all)
        1 -> stringResource(Rating.entries.first { ratingMask and it.bit != 0 }.label)
        else -> stringResource(R.string.rating_count, count)
    }
    val selectedDescription = stringResource(R.string.rating_selected, summary)
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(stringResource(R.string.rating), style = MaterialTheme.typography.labelLarge)
        FilterChip(
            selected = ratingMask != 0 && ratingMask != ALL_RATINGS_MASK,
            onClick = { dialogOpen = true },
            label = { Text(summary) },
            modifier = Modifier.semantics { contentDescription = selectedDescription },
        )
    }
    if (dialogOpen) {
        var draftMask by remember(ratingMask) { mutableIntStateOf(ratingMask) }
        AlertDialog(
            onDismissRequest = { dialogOpen = false },
            title = { Text(stringResource(R.string.rating)) },
            text = {
                Column {
                    Text(
                        stringResource(R.string.rating_dialog_hint),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Rating.entries.forEach { option ->
                        val checked = draftMask and option.bit != 0
                        Row(
                            modifier = Modifier.fillMaxWidth()
                                .toggleable(value = checked, role = Role.Checkbox) { selected ->
                                    draftMask = if (selected) draftMask or option.bit else draftMask and option.bit.inv()
                                }
                                .padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Checkbox(checked = checked, onCheckedChange = null)
                            Spacer(Modifier.width(8.dp))
                            Text(stringResource(option.label))
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(enabled = draftMask != 0, onClick = {
                    dialogOpen = false
                    onRatingChange(draftMask)
                }) { Text(stringResource(R.string.rating_apply)) }
            },
            dismissButton = {
                TextButton(onClick = { dialogOpen = false }) {
                    Text(stringResource(R.string.cancel_selection))
                }
            },
        )
    }
}

@Composable
private fun LatestPostsGrid(
    feed: LatestPostsFeed,
    gridState: LazyStaggeredGridState,
    submittedQuery: String,
    ratingMask: Int,
    favorites: List<FavoritePost>,
    controls: PostGridControls,
    onRatingChange: (Int) -> Unit,
    onOpenPost: (Long) -> Unit,
    onToggleFavorite: (FavoritePost) -> Unit,
    onSharePost: (FavoritePost) -> Unit,
    modifier: Modifier = Modifier,
) {
    val error = feed.error
    LazyVerticalStaggeredGrid(
        columns = StaggeredGridCells.Fixed(2),
        modifier = modifier.activatePostOnDrag(gridState, controls),
        state = gridState,
        contentPadding = PaddingValues(start = 16.dp, top = 8.dp, end = 16.dp, bottom = 96.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalItemSpacing = 8.dp,
    ) {
        item(key = "rating-filter", span = StaggeredGridItemSpan.FullLine) {
            RatingFilter(ratingMask, onRatingChange)
        }
        feed.pages.forEach { page ->
            item(key = "page-${page.number}", span = StaggeredGridItemSpan.FullLine) {
                PageHeader(page.number)
            }
            page.posts.forEachIndexed { index, post ->
                val itemKey = "post-${page.number}-$index-${post.id}"
                item(key = itemKey) {
                    PostGridCard(
                        post = post.asFavoritePost(),
                        itemKey = itemKey,
                        favorite = favorites.any { it.id == post.id },
                        controls = controls,
                        onOpenPost = onOpenPost,
                        onToggleFavorite = onToggleFavorite,
                        onSharePost = onSharePost,
                    )
                }
            }
        }
        if (error != null) {
            item(key = "load-error", span = StaggeredGridItemSpan.FullLine) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(stringResource(R.string.latest_load_error, error))
                    TextButton(onClick = { feed.loadNextPage() }) {
                        Text(stringResource(R.string.retry))
                    }
                }
            }
        } else if (feed.pages.isEmpty() && feed.hasMore) {
            item(key = "initial-loading", span = StaggeredGridItemSpan.FullLine) {
                LaunchedEffect(feed) { feed.loadNextPage() }
                Box(Modifier.fillMaxWidth().height(220.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
        } else if (feed.hasMore) {
            item(key = "loading-${feed.nextPage}", span = StaggeredGridItemSpan.FullLine) {
                LaunchedEffect(feed.nextPage) { feed.loadNextPage() }
                Box(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(Modifier.size(24.dp))
                }
            }
        } else if (feed.pages.isEmpty()) {
            item(key = "empty", span = StaggeredGridItemSpan.FullLine) {
                Text(
                    stringResource(if (submittedQuery.isEmpty()) R.string.latest_empty else R.string.search_empty),
                    modifier = Modifier.fillMaxWidth().padding(24.dp),
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun FavoritesPage(
    favorites: List<FavoritePost>,
    gridControls: PostGridControls,
    onOpenPost: (Long) -> Unit,
    onToggleFavorite: (FavoritePost) -> Unit,
    onSharePost: (FavoritePost) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (favorites.isEmpty()) {
        Column(modifier) {
            EmptyState(R.drawable.ic_heart, R.string.favorites_empty_title, R.string.favorites_empty_body)
        }
        return
    }
    val gridState = remember { LazyStaggeredGridState() }
    Column(modifier) {
        LazyVerticalStaggeredGrid(
            columns = StaggeredGridCells.Fixed(2),
            state = gridState,
            modifier = Modifier.weight(1f).activatePostOnDrag(gridState, gridControls),
            contentPadding = PaddingValues(start = 16.dp, top = 8.dp, end = 16.dp, bottom = if (gridControls.selectionMode) 96.dp else 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalItemSpacing = 8.dp,
        ) {
            favorites.forEach { post ->
                val itemKey = "favorite-${post.id}"
                item(key = itemKey) {
                    PostGridCard(
                        post = post,
                        itemKey = itemKey,
                        favorite = true,
                        controls = gridControls,
                        onOpenPost = onOpenPost,
                        onToggleFavorite = onToggleFavorite,
                        onSharePost = onSharePost,
                    )
                }
            }
        }
    }
}

private fun Modifier.activatePostOnDrag(
    gridState: LazyStaggeredGridState,
    controls: PostGridControls,
): Modifier = pointerInput(gridState, controls) {
    awaitEachGesture {
        val down = awaitFirstDown(requireUnconsumed = false, pass = PointerEventPass.Initial)
        var dragging = false
        while (true) {
            val event = awaitPointerEvent(PointerEventPass.Initial)
            val pointer = event.changes.firstOrNull { it.id == down.id } ?: break
            if (!pointer.pressed) break
            if (!dragging && (pointer.position - down.position).getDistance() > viewConfiguration.touchSlop) {
                dragging = true
            }
            if (dragging) {
                val point = pointer.position
                val itemKey = gridState.layoutInfo.visibleItemsInfo.firstOrNull { item ->
                    point.x >= item.offset.x && point.x < item.offset.x + item.size.width &&
                        point.y >= item.offset.y && point.y < item.offset.y + item.size.height
                }?.key as? String
                if (itemKey?.startsWith("post-") == true || itemKey?.startsWith("favorite-") == true) {
                    controls.activePostKey = itemKey
                }
            }
        }
    }
}

@Composable
private fun FeedActionsFab(
    expanded: Boolean,
    onToggle: () -> Unit,
    onMultiSelect: () -> Unit,
    onRefresh: () -> Unit,
    onBackToTop: () -> Unit,
) {
    val rotation by animateFloatAsState(
        targetValue = if (expanded) 45f else 0f,
        animationSpec = tween(180),
        label = "Feed actions icon",
    )
    Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        AnimatedVisibility(
            visible = expanded,
            enter = fadeIn(tween(180)) + slideInVertically(tween(180)) { it / 3 },
            exit = fadeOut(tween(120)) + slideOutVertically(tween(120)) { it / 3 },
        ) {
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(
                    Triple(R.string.multi_select, R.drawable.ic_copy_plus, onMultiSelect),
                    Triple(R.string.refresh_posts, R.drawable.ic_rotate_ccw, onRefresh),
                    Triple(R.string.back_to_top, R.drawable.ic_arrow_up_to_line, onBackToTop),
                ).forEach { (label, icon, action) ->
                    ExtendedFloatingActionButton(
                        text = { Text(stringResource(label), maxLines = 1) },
                        icon = { Icon(painterResource(icon), contentDescription = null) },
                        onClick = action,
                        shape = CircleShape,
                        containerColor = MaterialTheme.colorScheme.secondaryContainer,
                        contentColor = MaterialTheme.colorScheme.onSecondaryContainer,
                    )
                }
            }
        }
        FloatingActionButton(onClick = onToggle, shape = CircleShape) {
            Icon(
                painterResource(R.drawable.ic_plus),
                contentDescription = stringResource(if (expanded) R.string.close_feed_actions else R.string.open_feed_actions),
                modifier = Modifier.rotate(rotation),
            )
        }
    }
}

@Composable
private fun SelectionSplitButtons(
    onCancel: () -> Unit,
    onDownload: () -> Unit,
    downloadEnabled: Boolean,
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        FilledTonalButton(
            onClick = onCancel,
            modifier = Modifier.height(48.dp),
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 4.dp, bottomEnd = 4.dp, bottomStart = 24.dp),
        ) { Text(stringResource(R.string.cancel_selection)) }
        Button(
            onClick = onDownload,
            enabled = downloadEnabled,
            modifier = Modifier.height(48.dp),
            shape = RoundedCornerShape(topStart = 4.dp, topEnd = 24.dp, bottomEnd = 24.dp, bottomStart = 4.dp),
        ) {
            Icon(painterResource(R.drawable.ic_image_down), contentDescription = null, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text(stringResource(R.string.nav_download))
        }
    }
}

@Composable
private fun PostGridCard(
    post: FavoritePost,
    itemKey: String,
    favorite: Boolean,
    controls: PostGridControls,
    onOpenPost: (Long) -> Unit,
    onToggleFavorite: (FavoritePost) -> Unit,
    onSharePost: (FavoritePost) -> Unit,
) {
    val selected = post.id in controls.selectedPostIds
    val showActions = controls.activePostKey == itemKey
    Card(
        onClick = {
            controls.activePostKey = itemKey
            if (controls.selectionMode) controls.toggleSelection(post.id) else onOpenPost(post.id)
        },
        modifier = Modifier.fillMaxWidth(),
    ) {
        Box(
            modifier = Modifier.fillMaxWidth()
                .aspectRatio(post.aspectRatio)
                .background(MaterialTheme.colorScheme.surfaceContainerHigh),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                painterResource(R.drawable.ic_image_down),
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(24.dp),
            )
            AsyncImage(
                model = post.imageUrl,
                contentDescription = stringResource(R.string.post_image_description, post.id),
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )
            AnimatedPostAction(
                visible = showActions,
                modifier = Modifier.align(Alignment.TopStart).padding(4.dp),
            ) {
                FilledTonalIconButton(
                    onClick = { onToggleFavorite(post) },
                    enabled = showActions,
                    modifier = Modifier.size(40.dp),
                ) {
                    Icon(
                        painterResource(if (favorite) R.drawable.ic_heart_filled else R.drawable.ic_heart),
                        contentDescription = stringResource(
                            if (favorite) R.string.remove_favorite else R.string.add_favorite,
                        ),
                        tint = if (favorite) Color(0xFFE43368) else MaterialTheme.colorScheme.onSecondaryContainer,
                    )
                }
            }
            AnimatedPostAction(
                visible = showActions,
                modifier = Modifier.align(Alignment.TopEnd).padding(4.dp),
            ) {
                FilledTonalIconButton(
                    onClick = { onSharePost(post) },
                    enabled = showActions && post.fileUrl != null,
                    modifier = Modifier.size(40.dp),
                ) {
                    Icon(
                        painterResource(R.drawable.ic_square_arrow_out_up_right),
                        contentDescription = stringResource(
                            if (post.fileUrl == null) R.string.original_unavailable else R.string.copy_original_link,
                        ),
                    )
                }
            }
            AnimatedPostAction(
                visible = showActions || controls.selectionMode,
                modifier = Modifier.align(Alignment.BottomStart).padding(4.dp),
            ) {
                FilledTonalIconButton(
                    onClick = {
                        if (controls.selectionMode) controls.toggleSelection(post.id)
                        else controls.startSelection(post.id)
                    },
                    enabled = showActions || controls.selectionMode,
                    modifier = Modifier.size(40.dp),
                ) {
                    Icon(
                        painterResource(if (selected) R.drawable.ic_square_check else R.drawable.ic_square),
                        contentDescription = stringResource(
                            if (selected) R.string.deselect_post else R.string.select_post,
                            post.id,
                        ),
                    )
                }
            }
        }
    }
}

@Composable
private fun AnimatedPostAction(
    visible: Boolean,
    modifier: Modifier,
    content: @Composable () -> Unit,
) {
    AnimatedVisibility(
        visible = visible,
        modifier = modifier,
        enter = fadeIn(tween(180)) + scaleIn(initialScale = 0.85f, animationSpec = tween(180)),
        exit = fadeOut(tween(120)) + scaleOut(targetScale = 0.85f, animationSpec = tween(120)),
    ) { content() }
}

@Composable
private fun PageHeader(page: Int) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            stringResource(R.string.page_number, page),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.width(12.dp))
        HorizontalDivider(modifier = Modifier.weight(1f))
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
