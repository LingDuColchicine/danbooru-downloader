package com.lingducolchicine.danboorudownloader

import android.Manifest
import android.app.DownloadManager
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.webkit.MimeTypeMap
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.StringRes
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalResources
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.SubcomposeAsyncImage
import java.util.Locale
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun PostDetailScreen(
    postId: Long,
    initialDetail: PostDetail?,
    onBack: () -> Unit,
    onTagClick: (SelectedTag) -> Unit,
    modifier: Modifier = Modifier,
) {
    var detail by remember(postId) { mutableStateOf(initialDetail) }
    var error by remember(postId) { mutableStateOf<String?>(null) }
    var retry by remember(postId) { mutableIntStateOf(0) }
    val context = LocalContext.current
    val resources = LocalResources.current

    LaunchedEffect(postId, retry) {
        if (detail != null && retry == 0) return@LaunchedEffect
        error = null
        try {
            detail = withContext(Dispatchers.IO) { fetchPostDetail(postId) }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            error = e.message ?: "Network error"
        }
    }

    val startDownload: (PostDetail) -> Unit = { post ->
        try {
            enqueueOriginalDownload(context, post)
            Toast.makeText(context, R.string.download_started, Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Toast.makeText(
                context,
                resources.getString(R.string.download_failed, e.message ?: "Unknown error"),
                Toast.LENGTH_LONG,
            ).show()
        }
    }
    val storagePermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) detail?.let(startDownload)
        else Toast.makeText(context, R.string.download_permission_denied, Toast.LENGTH_SHORT).show()
    }

    BackHandler(onBack = onBack)
    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.post_detail_title, postId), fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            painterResource(R.drawable.ic_chevron_right),
                            contentDescription = stringResource(R.string.back_to_results),
                            modifier = Modifier.rotate(180f),
                        )
                    }
                },
            )
        },
    ) { innerPadding ->
        Box(Modifier.fillMaxSize().padding(innerPadding), contentAlignment = Alignment.TopCenter) {
            when {
                error != null -> Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(stringResource(R.string.post_detail_error, error!!))
                    TextButton(onClick = { retry++ }) { Text(stringResource(R.string.retry)) }
                }
                detail == null -> CircularProgressIndicator(Modifier.align(Alignment.Center))
                else -> PostDetailContent(
                    post = detail!!,
                    onDownload = { post ->
                        if (
                            Build.VERSION.SDK_INT < Build.VERSION_CODES.Q &&
                            context.checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED
                        ) {
                            storagePermission.launch(Manifest.permission.WRITE_EXTERNAL_STORAGE)
                        } else startDownload(post)
                    },
                    onTagClick = onTagClick,
                )
            }
        }
    }
}

@Composable
private fun PostDetailContent(
    post: PostDetail,
    onDownload: (PostDetail) -> Unit,
    onTagClick: (SelectedTag) -> Unit,
) {
    val uriHandler = LocalUriHandler.current
    Column(
        modifier = Modifier.widthIn(max = 600.dp).fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        val imageUrl = post.fileUrl ?: post.largeFileUrl ?: post.previewUrl
        if (imageUrl != null) {
            BoxWithConstraints(Modifier.fillMaxWidth()) {
                val ratio = if (post.width > 0 && post.height > 0) {
                    post.width.toFloat() / post.height
                } else 1f
                val imageHeight = (maxWidth / ratio).coerceIn(220.dp, 640.dp)
                Box(
                    modifier = Modifier.fillMaxWidth().height(imageHeight)
                        .clip(MaterialTheme.shapes.large)
                        .background(MaterialTheme.colorScheme.surfaceContainerHigh, MaterialTheme.shapes.large),
                    contentAlignment = Alignment.Center,
                ) {
                    SubcomposeAsyncImage(
                        model = imageUrl,
                        contentDescription = stringResource(R.string.post_image_description, post.id),
                        contentScale = ContentScale.Fit,
                        modifier = Modifier.fillMaxSize(),
                        loading = {
                            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator(Modifier.size(32.dp))
                            }
                        },
                        error = {
                            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Text(stringResource(R.string.post_image_unavailable))
                            }
                        },
                    )
                }
            }
        } else {
            Text(stringResource(R.string.post_image_unavailable))
        }

        Button(
            onClick = { onDownload(post) },
            enabled = post.fileUrl != null,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Icon(painterResource(R.drawable.ic_image_down), contentDescription = null)
            Text(stringResource(R.string.download_original), modifier = Modifier.padding(start = 8.dp))
        }
        if (post.fileUrl == null) {
            Text(
                stringResource(R.string.original_unavailable),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall,
            )
        }

        HorizontalDivider()
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            DetailInfoRow(stringResource(R.string.post_id), post.id.toString())
            val source = post.source.ifBlank { "—" }
            val sourceIsLink = source.startsWith("https://") || source.startsWith("http://")
            Row(Modifier.fillMaxWidth()) {
                Text(
                    stringResource(R.string.post_source),
                    modifier = Modifier.width(96.dp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.labelMedium,
                )
                Text(
                    source,
                    modifier = Modifier.weight(1f).then(
                        if (sourceIsLink) Modifier.clickable { runCatching { uriHandler.openUri(source) } } else Modifier,
                    ),
                    color = if (sourceIsLink) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
            DetailInfoRow(
                stringResource(R.string.post_dimensions),
                if (post.width > 0 && post.height > 0) "${post.width} × ${post.height}" else "—",
            )
            DetailInfoRow(stringResource(R.string.post_format), post.fileExt.uppercase(Locale.ROOT).ifBlank { "—" })
            DetailInfoRow(stringResource(R.string.post_size), formatFileSize(post.fileSize))
        }

        HorizontalDivider()
        DetailTagSection(R.string.tag_category_artist, post.artistTags, 1, onTagClick)
        DetailTagSection(R.string.tag_category_character, post.characterTags, 4, onTagClick)
        DetailTagSection(R.string.tag_category_copyright, post.copyrightTags, 3, onTagClick)
        DetailTagSection(R.string.tag_category_general, post.generalTags, 0, onTagClick)
        DetailTagSection(R.string.tag_category_meta, post.metaTags, 5, onTagClick)
    }
}

@Composable
private fun DetailInfoRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth()) {
        Text(
            label,
            modifier = Modifier.width(96.dp),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.labelMedium,
        )
        Text(value, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun DetailTagSection(
    @StringRes title: Int,
    tags: List<String>,
    category: Int,
    onTagClick: (SelectedTag) -> Unit,
) {
    if (tags.isEmpty()) return
    val dark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val (container, content) = tagChipColors(category, dark)
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(stringResource(title), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            tags.forEach { tag ->
                val description = stringResource(R.string.add_detail_tag_to_search, tag)
                AssistChip(
                    onClick = { onTagClick(SelectedTag(tag, tag, category)) },
                    label = { Text(tag, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                    modifier = Modifier.semantics { contentDescription = description },
                    colors = AssistChipDefaults.assistChipColors(containerColor = container, labelColor = content),
                    border = null,
                )
            }
        }
    }
}

private fun formatFileSize(bytes: Long): String = when {
    bytes <= 0L -> "—"
    bytes >= 1024 * 1024 -> String.format(Locale.US, "%.2f MB", bytes / 1024.0 / 1024.0)
    bytes >= 1024 -> String.format(Locale.US, "%.1f KB", bytes / 1024.0)
    else -> "$bytes B"
}

private fun enqueueOriginalDownload(context: Context, post: PostDetail) {
    val url = requireNotNull(post.fileUrl)
    val extension = post.fileExt.lowercase(Locale.ROOT).takeIf { it.matches(Regex("[a-z0-9]{1,8}")) } ?: "jpg"
    val filename = "DanbooruDownloader-${post.id}-${System.currentTimeMillis()}.$extension"
    val request = DownloadManager.Request(Uri.parse(url))
        .setTitle("Post #${post.id}")
        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
        .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename)
        .setMimeType(MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension) ?: "application/octet-stream")
    val manager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
    manager.enqueue(request)
}
