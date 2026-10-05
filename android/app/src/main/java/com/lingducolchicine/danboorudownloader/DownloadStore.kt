package com.lingducolchicine.danboorudownloader

import android.app.DownloadManager
import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

internal data class DownloadRecord(
    val downloadId: Long,
    val postId: Long,
    val imageUrl: String,
    val status: Int = DownloadManager.STATUS_PENDING,
    val downloadedBytes: Long = 0,
    val totalBytes: Long = -1,
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
                if (downloadId <= 0 || postId <= 0) continue
                add(DownloadRecord(
                    downloadId = downloadId,
                    postId = postId,
                    imageUrl = item.optString("imageUrl"),
                    status = item.optInt("status", DownloadManager.STATUS_PENDING),
                    downloadedBytes = item.optLong("downloadedBytes"),
                    totalBytes = item.optLong("totalBytes", -1),
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
                .put("totalBytes", record.totalBytes))
        }
        preferences.edit().putString("records", saved.toString()).apply()
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
