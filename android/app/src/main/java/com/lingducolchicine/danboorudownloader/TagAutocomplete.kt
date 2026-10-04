package com.lingducolchicine.danboorudownloader

import android.net.Uri
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONException

internal data class TagSuggestion(
    val label: String,
    val value: String,
    val category: Int,
    val postCount: Int,
)

internal suspend fun fetchTagSuggestions(query: String): List<TagSuggestion> = withContext(Dispatchers.IO) {
    val address = Uri.parse("https://danbooru.donmai.us/autocomplete.json").buildUpon()
        .appendQueryParameter("search[query]", query)
        .appendQueryParameter("search[type]", "tag_query")
        .appendQueryParameter("limit", "12")
        .build()
    val connection = URL(address.toString()).openConnection() as HttpURLConnection
    connection.connectTimeout = 10_000
    connection.readTimeout = 20_000
    connection.setRequestProperty("Accept", "application/json")
    connection.setRequestProperty(
        "User-Agent",
        "DanbooruDownloader/0.1.0 (Android; github.com/LingDuColchicine/danbooru-downloader)",
    )

    try {
        if (connection.responseCode != HttpURLConnection.HTTP_OK) {
            throw IOException("HTTP ${connection.responseCode}")
        }
        val body = connection.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
        val items = try {
            JSONArray(body)
        } catch (e: JSONException) {
            throw IOException("Invalid Danbooru response", e)
        }
        buildList {
            for (index in 0 until items.length()) {
                val item = items.optJSONObject(index) ?: continue
                val label = item.optString("label").ifBlank {
                    item.optString("value").ifBlank { item.optString("name") }
                }
                val value = item.optString("value").ifBlank {
                    item.optString("name").ifBlank { label }
                }
                if (label.isBlank() || value.isBlank()) continue
                add(TagSuggestion(label, value, item.optInt("category", 0), item.optInt("post_count", 0)))
            }
        }
    } finally {
        connection.disconnect()
    }
}
