package com.lingducolchicine.danboorudownloader

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.provider.DocumentsContract
import android.webkit.MimeTypeMap
import java.time.Instant
import org.json.JSONArray
import org.json.JSONObject

internal data class DownloadRecord(
    val downloadId: Long,
    val postId: Long,
    val imageUrl: String,
    val status: Int = DownloadManager.STATUS_PENDING,
    val downloadedBytes: Long = 0,
    val totalBytes: Long = -1,
    val destinationTreeUri: String? = null,
    val fileExt: String = "",
    val relocated: Boolean = false,
    val locationError: Boolean = false,
)

internal class DownloadStore(context: Context) {
    private val preferences = context.applicationContext.getSharedPreferences("download_history", Context.MODE_PRIVATE)

    fun load(): List<DownloadRecord> {
        val saved = try {
            JSONArray(preferences.getString("records", "[]") ?: "[]")
        } catch (_: RuntimeException) {
            return emptyList()
        }
        return buildList {
            for (index in 0 until saved.length()) {
                val item = saved.optJSONObject(index) ?: continue
                val downloadId = item.optLong("downloadId")
                val postId = item.optLong("postId")
                if (downloadId == 0L || postId <= 0) continue
                add(DownloadRecord(
                    downloadId = downloadId,
                    postId = postId,
                    imageUrl = item.optString("imageUrl"),
                    status = item.optInt("status", DownloadManager.STATUS_PENDING),
                    downloadedBytes = item.optLong("downloadedBytes"),
                    totalBytes = item.optLong("totalBytes", -1),
                    destinationTreeUri = item.optString("destinationTreeUri").takeIf { it.isNotBlank() },
                    fileExt = item.optString("fileExt"),
                    relocated = item.optBoolean("relocated"),
                    locationError = item.optBoolean("locationError"),
                ))
            }
        }.distinctBy { it.downloadId }
    }

    fun save(records: List<DownloadRecord>) {
        val saved = JSONArray()
        records.forEach { record ->
            saved.put(JSONObject()
                .put("downloadId", record.downloadId)
                .put("postId", record.postId)
                .put("imageUrl", record.imageUrl)
                .put("status", record.status)
                .put("downloadedBytes", record.downloadedBytes)
                .put("totalBytes", record.totalBytes)
                .put("destinationTreeUri", record.destinationTreeUri)
                .put("fileExt", record.fileExt)
                .put("relocated", record.relocated)
                .put("locationError", record.locationError))
        }
        preferences.edit().putString("records", saved.toString()).apply()
    }
}

internal fun exportDownloadHistory(records: List<DownloadRecord>): String {
    val items = JSONArray()
    records.asReversed().filter { it.status == DownloadManager.STATUS_SUCCESSFUL }.forEach { record ->
        items.put(JSONObject().put("id", record.postId.toString()).put("source", "danbooru"))
    }
    return JSONObject().put("version", 1).put("exported_at", Instant.now().toString())
        .put("records", items).toString(2)
}

internal fun importDownloadHistory(text: String): List<Long> {
    val trimmed = text.trim()
    val items = if (trimmed.startsWith("[")) JSONArray(trimmed)
        else JSONObject(trimmed).getJSONArray("records")
    return buildList {
        for (index in 0 until items.length()) {
            val item = items.opt(index)
            val id = when (item) {
                is JSONObject -> {
                    if (item.optString("source", "danbooru") != "danbooru") continue
                    item.optString("id").toLongOrNull()
                }
                is String -> item.toLongOrNull()
                is Number -> item.toLong()
                else -> null
            }
            if (id != null && id > 0) add(id)
        }
    }.distinct()
}

internal fun relocateDownload(context: Context, record: DownloadRecord): DownloadRecord {
    val tree = record.destinationTreeUri?.let(Uri::parse) ?: return record
    val manager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
    val resolver = context.contentResolver
    var created: Uri? = null
    return try {
        val parent = DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree))
        val extension = record.fileExt.lowercase().takeIf { it.matches(Regex("[a-z0-9]{1,8}")) } ?: "jpg"
        val mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension) ?: "application/octet-stream"
        val name = "DanbooruDownloader-${record.postId}-${record.downloadId}.$extension"
        val outputUri = DocumentsContract.createDocument(resolver, parent, mime, name)
            ?: error("Unable to create file in selected folder")
        created = outputUri
        ParcelFileDescriptor.AutoCloseInputStream(manager.openDownloadedFile(record.downloadId)).use { input ->
            (resolver.openOutputStream(outputUri, "w") ?: error("Unable to write to selected folder")).use { output ->
                input.copyTo(output)
            }
        }
        record.copy(relocated = true)
    } catch (_: Exception) {
        created?.let { runCatching { DocumentsContract.deleteDocument(resolver, it) } }
        record.copy(locationError = true)
    }
}

internal fun readDownloadRecord(context: Context, record: DownloadRecord): DownloadRecord? {
    val manager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
    manager.query(DownloadManager.Query().setFilterById(record.downloadId)).use { cursor ->
        if (!cursor.moveToFirst()) return null
        return record.copy(
            status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS)),
            downloadedBytes = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)),
            totalBytes = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)),
        )
    }
}
