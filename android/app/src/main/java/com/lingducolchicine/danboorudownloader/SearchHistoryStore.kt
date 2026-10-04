package com.lingducolchicine.danboorudownloader

import android.content.Context
import java.util.Locale
import org.json.JSONArray
import org.json.JSONObject

internal const val SEARCH_HISTORY_LIMIT = 20

internal data class SearchHistoryEntry(val tag: SelectedTag)

internal class SearchHistoryStore(context: Context) {
    private val preferences = context.applicationContext.getSharedPreferences("search_history", Context.MODE_PRIVATE)

    fun load(): List<SearchHistoryEntry> {
        val saved = try {
            JSONArray(preferences.getString("entries", "[]") ?: "[]")
        } catch (_: RuntimeException) {
            return emptyList()
        }

        val entries = buildList {
            for (index in 0 until saved.length()) {
                val item = saved.optJSONObject(index) ?: continue
                val storedTags = item.optJSONArray("tags") ?: continue
                // Older entries can contain several tags; their last tag is the newest.
                for (tagIndex in storedTags.length() - 1 downTo 0) {
                    val tag = storedTags.optJSONObject(tagIndex) ?: continue
                    val label = tag.opt("label") as? String ?: continue
                    val value = tag.opt("value") as? String ?: continue
                    if (label.isBlank() || value.isBlank()) continue
                    add(SearchHistoryEntry(SelectedTag(label, value, tag.optInt("category", 0))))
                }
            }
        }
        return entries.distinctBy { it.tag.value.lowercase(Locale.ROOT) }.take(SEARCH_HISTORY_LIMIT)
    }

    fun save(entries: List<SearchHistoryEntry>) {
        val stored = JSONArray()
        entries.asSequence()
            .filter { it.tag.value.isNotBlank() && it.tag.label.isNotBlank() }
            .distinctBy { it.tag.value.lowercase(Locale.ROOT) }
            .take(SEARCH_HISTORY_LIMIT)
            .forEach { entry ->
                val tag = entry.tag
                val storedTag = JSONObject()
                    .put("label", tag.label)
                    .put("value", tag.value)
                    .put("category", tag.category)
                stored.put(JSONObject().put("query", tag.value).put("tags", JSONArray().put(storedTag)))
            }
        preferences.edit().putString("entries", stored.toString()).apply()
    }
}
