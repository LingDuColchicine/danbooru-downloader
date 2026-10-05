package com.lingducolchicine.danboorudownloader

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

internal data class FavoritePost(
    val id: Long,
    val imageUrl: String,
    val aspectRatio: Float,
    val fileUrl: String?,
    val fileExt: String = "",
    val tags: List<String> = emptyList(),
)

internal fun LatestPost.asFavoritePost() = FavoritePost(
    id, imageUrl, aspectRatio, detail.fileUrl, detail.fileExt,
    detail.artistTags + detail.characterTags + detail.copyrightTags + detail.generalTags + detail.metaTags,
)

internal class FavoriteStore(context: Context, preferenceName: String = "favorite_posts") {
    private val preferences = context.applicationContext.getSharedPreferences(preferenceName, Context.MODE_PRIVATE)

    fun load(): List<FavoritePost> {
        val saved = try {
            JSONArray(preferences.getString("posts", "[]") ?: "[]")
        } catch (_: RuntimeException) {
            return emptyList()
        }
        return buildList {
            for (index in 0 until saved.length()) {
                val item = saved.optJSONObject(index) ?: continue
                val id = item.optLong("id")
                val imageUrl = item.optString("imageUrl")
                val aspectRatio = item.optDouble("aspectRatio").toFloat()
                if (id <= 0 || !imageUrl.startsWith("https://") || !aspectRatio.isFinite() || aspectRatio <= 0f) continue
                add(FavoritePost(
                    id,
                    imageUrl,
                    aspectRatio,
                    item.optString("fileUrl").takeIf { it.startsWith("https://") },
                    item.optString("fileExt"),
                    buildList {
                        val tags = item.optJSONArray("tags")
                        if (tags != null) for (tagIndex in 0 until tags.length()) {
                            tags.optString(tagIndex).takeIf { it.isNotBlank() }?.let { add(it) }
                        }
                    },
                ))
            }
        }.distinctBy { it.id }
    }

    fun save(posts: List<FavoritePost>) {
        val saved = JSONArray()
        posts.forEach { post ->
            saved.put(JSONObject()
                .put("id", post.id)
                .put("imageUrl", post.imageUrl)
                .put("aspectRatio", post.aspectRatio.toDouble())
                .put("fileUrl", post.fileUrl)
                .put("fileExt", post.fileExt)
                .put("tags", JSONArray(post.tags)))
        }
        preferences.edit().putString("posts", saved.toString()).apply()
    }
}
