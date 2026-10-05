package com.lingducolchicine.danboorudownloader

import android.content.Context
import android.net.Uri
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.io.IOException
import java.security.KeyStore
import java.util.Locale
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import org.json.JSONArray
import org.json.JSONObject
import okhttp3.Credentials
import okhttp3.Request

internal data class DanbooruAccount(
    val id: String,
    val username: String,
    val apiKey: String,
    val userId: Long,
)

internal data class AccountSettings(val accounts: List<DanbooruAccount>, val activeId: String)

internal suspend fun verifyDanbooruAccount(username: String, apiKey: String): DanbooruAccount {
    val request = Request.Builder()
        .url("https://danbooru.donmai.us/profile.json")
        .header("Accept", "application/json")
        .header("User-Agent", "DanbooruDownloader/0.1.0 (Android; github.com/LingDuColchicine/danbooru-downloader)")
        .header("Authorization", Credentials.basic(username, apiKey))
        .build()
    val profile = JSONObject(fetchDanbooruJson(request))
    val id = profile.optLong("id")
    if (id <= 0) throw IOException("Invalid account profile")
    return DanbooruAccount(UUID.randomUUID().toString(), profile.optString("name", username), apiKey, id)
}

internal class AccountStore(context: Context) {
    private val preferences = context.applicationContext.getSharedPreferences("danbooru_accounts", Context.MODE_PRIVATE)
    private val alias = "danbooru_accounts_key"

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(alias, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .build())
        }.generateKey()
    }

    fun load(): AccountSettings {
        return try {
            val encoded = preferences.getString("encrypted", null) ?: return AccountSettings(emptyList(), "")
            val bytes = Base64.decode(encoded, Base64.NO_WRAP)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes.copyOfRange(0, 12)))
            val saved = JSONObject(String(cipher.doFinal(bytes, 12, bytes.size - 12), Charsets.UTF_8))
            val accounts = saved.optJSONArray("accounts") ?: JSONArray()
            val result = buildList {
                for (index in 0 until accounts.length()) {
                    val item = accounts.optJSONObject(index) ?: continue
                    val id = item.optString("id")
                    val username = item.optString("username")
                    val apiKey = item.optString("apiKey")
                    if (id.isNotBlank() && username.isNotBlank() && apiKey.isNotBlank()) {
                        add(DanbooruAccount(id, username, apiKey, item.optLong("userId")))
                    }
                }
            }
            AccountSettings(result, saved.optString("activeId").takeIf { id -> result.any { it.id == id } } ?: "")
        } catch (_: Exception) {
            AccountSettings(emptyList(), "")
        }
    }

    fun save(settings: AccountSettings) {
        val accounts = JSONArray()
        settings.accounts.forEach { account ->
            accounts.put(JSONObject()
                .put("id", account.id)
                .put("username", account.username)
                .put("apiKey", account.apiKey)
                .put("userId", account.userId))
        }
        val plain = JSONObject().put("activeId", settings.activeId).put("accounts", accounts)
            .toString().toByteArray(Charsets.UTF_8)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val encoded = Base64.encodeToString(cipher.iv + cipher.doFinal(plain), Base64.NO_WRAP)
        preferences.edit().putString("encrypted", encoded).apply()
    }
}

internal data class BlacklistRule(val id: String, val tags: List<SelectedTag>) {
    fun blocks(post: PostDetail): Boolean {
        val postTags = (post.artistTags + post.characterTags + post.copyrightTags +
            post.generalTags + post.metaTags).toSet()
        return tags.isNotEmpty() && tags.all { it.value in postTags }
    }

    fun blocks(post: FavoritePost): Boolean = tags.isNotEmpty() && tags.all { it.value in post.tags }
}

internal class BlacklistStore(context: Context) {
    private val preferences = context.applicationContext.getSharedPreferences("blacklist", Context.MODE_PRIVATE)

    fun load(): List<BlacklistRule> = try {
        val saved = JSONArray(preferences.getString("rules", "[]") ?: "[]")
        buildList {
            for (index in 0 until saved.length()) {
                val item = saved.optJSONObject(index) ?: continue
                val tags = item.optJSONArray("tags") ?: continue
                val parsed = buildList {
                    for (tagIndex in 0 until tags.length()) {
                        val tag = tags.optJSONObject(tagIndex) ?: continue
                        val value = tag.optString("value")
                        if (value.isNotBlank()) add(SelectedTag(tag.optString("label", value), value, tag.optInt("category")))
                    }
                }.distinctBy { it.value }
                if (parsed.isNotEmpty()) add(BlacklistRule(item.optString("id"), parsed))
            }
        }
    } catch (_: Exception) {
        emptyList()
    }

    fun save(rules: List<BlacklistRule>) {
        val saved = JSONArray()
        rules.forEach { rule ->
            val tags = JSONArray()
            rule.tags.forEach { tag ->
                tags.put(JSONObject().put("label", tag.label).put("value", tag.value).put("category", tag.category))
            }
            saved.put(JSONObject().put("id", rule.id).put("tags", tags))
        }
        preferences.edit().putString("rules", saved.toString()).apply()
    }
}

internal fun parseBlacklistTags(input: String): List<SelectedTag> = input
    .split(Regex("[,\\s]+"))
    .map { it.trim().lowercase(Locale.ROOT) }
    .filter { it.isNotBlank() }
    .distinct()
    .map { SelectedTag(it, it, 0) }

internal class DownloadLocationStore(context: Context) {
    private val preferences = context.applicationContext.getSharedPreferences("download_location", Context.MODE_PRIVATE)

    fun load(): Uri? = preferences.getString("treeUri", null)?.let(Uri::parse)

    fun save(uri: Uri?) {
        preferences.edit().putString("treeUri", uri?.toString()).apply()
    }
}
