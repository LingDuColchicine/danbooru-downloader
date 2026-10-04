package com.lingducolchicine.danboorudownloader

import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import java.io.IOException
import java.net.InetAddress
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import okhttp3.Call
import okhttp3.Callback
import okhttp3.Dns
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

private const val POSTS_PER_PAGE = 20
private const val DANBOORU_HOST = "danbooru.donmai.us"
private val danbooruFallbackIps = listOf("104.26.10.39", "172.67.70.99", "104.26.11.39")

private fun postsClient(dns: Dns? = null): OkHttpClient = OkHttpClient.Builder()
    .connectTimeout(8, TimeUnit.SECONDS)
    .readTimeout(18, TimeUnit.SECONDS)
    .callTimeout(22, TimeUnit.SECONDS)
    .apply { if (dns != null) dns(dns) }
    .build()

private val directPostsClient = postsClient()
private val fallbackPostsClients by lazy {
    danbooruFallbackIps.map { ip ->
        val address = InetAddress.getByName(ip)
        postsClient(object : Dns {
            override fun lookup(hostname: String): List<InetAddress> =
                if (hostname == DANBOORU_HOST) listOf(address) else Dns.SYSTEM.lookup(hostname)
        })
    }
}

internal data class LatestPost(
    val id: Long,
    val imageUrl: String,
    val aspectRatio: Float,
    val detail: PostDetail,
)

internal data class LatestPage(val number: Int, val posts: List<LatestPost>)

internal data class PostDetail(
    val id: Long,
    val fileUrl: String?,
    val largeFileUrl: String?,
    val previewUrl: String?,
    val source: String,
    val width: Int,
    val height: Int,
    val fileExt: String,
    val fileSize: Long,
    val artistTags: List<String>,
    val characterTags: List<String>,
    val copyrightTags: List<String>,
    val generalTags: List<String>,
    val metaTags: List<String>,
)

internal class LatestPostsFeed(private val scope: CoroutineScope, initialQuery: String = "") {
    val pages = mutableStateListOf<LatestPage>()
    var query by mutableStateOf(initialQuery)
        private set
    var nextPage by mutableIntStateOf(1)
        private set
    var isLoading by mutableStateOf(false)
        private set
    var hasMore by mutableStateOf(true)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    private var generation = 0
    private var loadJob: Job? = null

    fun search(tags: String) {
        generation++
        loadJob?.cancel()
        query = tags.trim()
        pages.clear()
        nextPage = 1
        hasMore = true
        error = null
        isLoading = false
        loadNextPage()
    }

    fun loadNextPage() {
        if (isLoading || !hasMore) return
        val requestGeneration = generation
        val pageNumber = nextPage
        val requestedTags = query
        isLoading = true
        error = null
        loadJob = scope.launch {
            try {
                val result = withContext(Dispatchers.IO) { fetchPostsPage(pageNumber, requestedTags) }
                if (requestGeneration != generation) return@launch
                if (result.totalCount > 0) pages.add(LatestPage(pageNumber, result.posts))
                hasMore = result.totalCount == POSTS_PER_PAGE
                nextPage = pageNumber + 1
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (requestGeneration == generation) error = e.message ?: "Network error"
            } finally {
                if (requestGeneration == generation) {
                    isLoading = false
                    loadJob = null
                }
            }
        }
    }
}

private data class PageResponse(val totalCount: Int, val posts: List<LatestPost>)

private suspend fun fetchPostsPage(page: Int, tags: String): PageResponse {
    val address = Uri.parse("https://danbooru.donmai.us/posts.json").buildUpon()
        .appendQueryParameter("limit", POSTS_PER_PAGE.toString())
        .appendQueryParameter("page", page.toString())
        .apply { if (tags.isNotEmpty()) appendQueryParameter("tags", tags) }
        .build()
    return parsePostsPage(fetchDanbooruJson(danbooruRequest(address.toString())))
}

internal suspend fun fetchPostDetail(id: Long): PostDetail {
    val body = fetchDanbooruJson(danbooruRequest("https://danbooru.donmai.us/posts/$id.json"))
    return parsePostDetail(id, body)
}

internal fun parsePostDetail(id: Long, body: String): PostDetail {
    val post = try {
        JSONObject(body)
    } catch (e: JSONException) {
        throw IOException("Invalid Danbooru response", e)
    }
    if (post.optLong("id") != id) throw IOException("Unexpected post ID")
    return post.toPostDetail(id)
}

private fun JSONObject.toPostDetail(id: Long): PostDetail = PostDetail(
        id = id,
        fileUrl = httpsUrl("file_url"),
        largeFileUrl = httpsUrl("large_file_url"),
        previewUrl = httpsUrl("preview_file_url"),
        source = optString("source"),
        width = optInt("image_width"),
        height = optInt("image_height"),
        fileExt = optString("file_ext"),
        fileSize = optLong("file_size"),
        artistTags = tags("tag_string_artist"),
        characterTags = tags("tag_string_character"),
        copyrightTags = tags("tag_string_copyright"),
        generalTags = tags("tag_string_general"),
        metaTags = tags("tag_string_meta"),
    )

private fun JSONObject.httpsUrl(key: String): String? = optString(key).takeIf { it.startsWith("https://") }

private fun JSONObject.tags(key: String): List<String> = optString(key).split(Regex("\\s+"))
    .filter { it.isNotBlank() }

private fun danbooruRequest(url: String): Request = Request.Builder()
    .url(url)
    .header("Accept", "application/json")
    .header("User-Agent", "DanbooruDownloader/0.1.0 (Android; github.com/LingDuColchicine/danbooru-downloader)")
    .build()

private suspend fun fetchDanbooruJson(request: Request): String {
    var lastNetworkError: IOException? = null
    for (client in sequence {
        yield(directPostsClient)
        yieldAll(fallbackPostsClients)
    }) {
        currentCoroutineContext().ensureActive()
        try {
            return requestJson(client, request)
        } catch (e: DanbooruHttpException) {
            throw e
        } catch (e: IOException) {
            lastNetworkError = e
        }
    }
    throw IOException("Connection failed after trying alternate addresses: ${lastNetworkError?.message}", lastNetworkError)
}

private class DanbooruHttpException(message: String) : IOException(message)

private data class PostsResponse(val status: Int, val body: String)

private suspend fun awaitPostsResponse(client: OkHttpClient, request: Request): PostsResponse =
    suspendCancellableCoroutine { continuation ->
        val call = client.newCall(request)
        continuation.invokeOnCancellation { call.cancel() }
        call.enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                if (continuation.isActive) continuation.resumeWithException(e)
            }

            override fun onResponse(call: Call, response: Response) {
                val result = try {
                    response.use { PostsResponse(it.code, it.body?.string().orEmpty()) }
                } catch (error: Exception) {
                    if (continuation.isActive) continuation.resumeWithException(error)
                    return
                }
                if (continuation.isActive) continuation.resume(result)
            }
        })
    }

private suspend fun requestJson(client: OkHttpClient, request: Request): String {
    repeat(2) { attempt ->
        currentCoroutineContext().ensureActive()
        val (status, body) = awaitPostsResponse(client, request)
        if (status == 200) return body

        val serverMessage = runCatching { JSONObject(body).optString("message") }.getOrNull()
            ?.takeIf { it.isNotBlank() }
        if (attempt == 0 && status in 500..599) {
            delay(500)
        } else {
            throw DanbooruHttpException(serverMessage?.let { "HTTP $status: $it" } ?: "HTTP $status")
        }
    }
    error("Unreachable")
}

private fun parsePostsPage(body: String): PageResponse {
    val json = try {
        JSONArray(body)
    } catch (e: JSONException) {
        throw IOException("Invalid Danbooru response", e)
    }
    val posts = buildList {
        for (index in 0 until json.length()) {
            val post = json.optJSONObject(index) ?: continue
            val id = post.optLong("id")
            val imageUrl = post.thumbnailUrl() ?: continue
            if (id <= 0L) continue
            val width = post.optInt("image_width")
            val height = post.optInt("image_height")
            val aspectRatio = if (width > 0 && height > 0) width.toFloat() / height else 1f
            add(LatestPost(id, imageUrl, aspectRatio, post.toPostDetail(id)))
        }
    }
    return PageResponse(json.length(), posts)
}

private fun JSONObject.thumbnailUrl(): String? {
    val variants = optJSONObject("media_asset")?.optJSONArray("variants")
    if (variants != null) {
        for (index in 0 until variants.length()) {
            val variant = variants.optJSONObject(index) ?: continue
            if (variant.optString("type") == "360x360") {
                val url = variant.optString("url")
                if (url.startsWith("https://")) return url
            }
        }
    }
    return optString("preview_file_url").takeIf { it.startsWith("https://") }
}
