package com.lingducolchicine.danboorudownloader

import android.app.DownloadManager
import android.content.Intent
import android.net.Uri
import android.provider.DocumentsContract
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.StringRes
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.time.LocalDate
import java.util.UUID
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
internal fun SettingsPage(
    theme: String,
    onThemeChange: (String) -> Unit,
    accounts: List<DanbooruAccount>,
    activeAccountId: String,
    onAddAccount: (DanbooruAccount) -> Unit,
    onSelectAccount: (String) -> Unit,
    onRemoveAccount: (String) -> Unit,
    blacklistRules: List<BlacklistRule>,
    onAddBlacklistRule: (BlacklistRule) -> Unit,
    onRemoveBlacklistRule: (String) -> Unit,
    downloadLocation: Uri?,
    onDownloadLocationChange: (Uri?) -> Unit,
    downloadRecords: List<DownloadRecord>,
    onClearDownloadHistory: () -> Unit,
    onImportDownloadHistory: (List<Long>) -> Int,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var username by rememberSaveable { mutableStateOf("") }
    var apiKey by remember { mutableStateOf("") }
    var accountBusy by remember { mutableStateOf(false) }
    var accountMessage by remember { mutableStateOf("") }
    var removeAccountId by remember { mutableStateOf<String?>(null) }
    var blacklistInput by rememberSaveable { mutableStateOf("") }
    val blacklistDraft = remember { mutableStateListOf<SelectedTag>() }
    var suggestions by remember { mutableStateOf<List<TagSuggestion>>(emptyList()) }
    var blacklistMessage by remember { mutableStateOf("") }
    var locationMessage by remember { mutableStateOf("") }
    var historyMessage by remember { mutableStateOf("") }
    var confirmClearHistory by remember { mutableStateOf(false) }

    val chooseFolder = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri ->
        if (uri != null) {
            try {
                context.contentResolver.takePersistableUriPermission(
                    uri, Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION,
                )
                onDownloadLocationChange(uri)
                locationMessage = context.getString(R.string.download_location_updated)
            } catch (error: Exception) {
                locationMessage = error.message ?: context.getString(R.string.download_location_failed)
            }
        }
    }
    val exportHistory = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        if (uri != null) scope.launch {
            historyMessage = try {
                withContext(Dispatchers.IO) {
                    (context.contentResolver.openOutputStream(uri, "w") ?: error("Cannot open file")).use { output ->
                        output.write(exportDownloadHistory(downloadRecords).toByteArray(Charsets.UTF_8))
                    }
                }
                context.getString(R.string.download_history_exported)
            } catch (error: Exception) {
                context.getString(R.string.download_history_error, error.message ?: "Export failed")
            }
        }
    }
    val importHistory = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) scope.launch {
            historyMessage = try {
                val ids = withContext(Dispatchers.IO) {
                    val buffer = ByteArrayOutputStream()
                    (context.contentResolver.openInputStream(uri) ?: error("Cannot open file")).use { input ->
                        val chunk = ByteArray(8192)
                        while (true) {
                            val count = input.read(chunk)
                            if (count < 0) break
                            if (buffer.size() + count > 4_000_000) throw IOException("File is too large")
                            buffer.write(chunk, 0, count)
                        }
                    }
                    importDownloadHistory(buffer.toString(Charsets.UTF_8.name()))
                }
                if (ids.isEmpty()) throw IOException("No Danbooru post IDs found")
                context.getString(R.string.download_history_imported, onImportDownloadHistory(ids))
            } catch (error: Exception) {
                context.getString(R.string.download_history_error, error.message ?: "Import failed")
            }
        }
    }

    val lastTag = blacklistInput.trim().substringAfterLast(' ').substringAfterLast(',')
    LaunchedEffect(lastTag) {
        suggestions = emptyList()
        if (lastTag.length < 2) return@LaunchedEffect
        delay(250)
        suggestions = try { fetchTagSuggestions(lastTag).take(5) }
        catch (error: CancellationException) { throw error }
        catch (_: Exception) { emptyList() }
    }

    SectionTitle(R.string.settings_appearance)
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(stringResource(R.string.settings_theme), style = MaterialTheme.typography.titleMedium)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("system" to R.string.theme_system, "light" to R.string.theme_light, "dark" to R.string.theme_dark)
                    .forEach { (value, label) ->
                        FilterChip(selected = theme == value, onClick = { onThemeChange(value) },
                            label = { Text(stringResource(label)) })
                    }
            }
            HorizontalDivider()
            SettingRow(R.string.settings_language, R.string.language_english)
        }
    }

    SectionTitle(R.string.settings_account_login)
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(value = username, onValueChange = { username = it },
                label = { Text(stringResource(R.string.settings_username)) }, singleLine = true,
                modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = apiKey, onValueChange = { apiKey = it },
                label = { Text(stringResource(R.string.settings_api_key)) }, singleLine = true,
                visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
            Button(enabled = !accountBusy && username.isNotBlank() && apiKey.isNotBlank(), onClick = {
                accountBusy = true
                accountMessage = context.getString(R.string.account_verifying)
                scope.launch {
                    accountMessage = try {
                        val account = verifyDanbooruAccount(username.trim(), apiKey.trim())
                        if (accounts.any { it.username.equals(account.username, ignoreCase = true) }) {
                            context.getString(R.string.account_already_added)
                        } else {
                            onAddAccount(account)
                            username = ""
                            apiKey = ""
                            context.getString(R.string.account_added)
                        }
                    } catch (error: CancellationException) { throw error }
                    catch (error: Exception) { context.getString(R.string.account_error, error.message ?: "Verification failed") }
                    finally { accountBusy = false }
                }
            }) { Text(stringResource(R.string.account_add)) }
            Text(stringResource(R.string.account_help), style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (accountMessage.isNotBlank()) Text(accountMessage, style = MaterialTheme.typography.bodySmall)
            HorizontalDivider()
            AccountRow(stringResource(R.string.account_no_account), activeAccountId.isEmpty(),
                onSelect = { onSelectAccount("") })
            accounts.forEach { account ->
                AccountRow(account.username, activeAccountId == account.id,
                    onSelect = { onSelectAccount(account.id) }, onRemove = { removeAccountId = account.id })
            }
        }
    }

    SectionTitle(R.string.settings_blacklist)
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(value = blacklistInput, onValueChange = { blacklistInput = it },
                label = { Text(stringResource(R.string.blacklist_hint)) },
                supportingText = { Text(stringResource(R.string.blacklist_help)) },
                modifier = Modifier.fillMaxWidth())
            if (blacklistDraft.isNotEmpty()) {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    blacklistDraft.forEach { tag ->
                        FilterChip(selected = true, onClick = { blacklistDraft.remove(tag) },
                            label = { Text(tag.label) },
                            trailingIcon = { Icon(painterResource(R.drawable.ic_x), contentDescription = null) })
                    }
                }
            }
            suggestions.forEach { suggestion ->
                ListItem(headlineContent = { Text(suggestion.label) }, modifier = Modifier.clickable {
                    val prefix = blacklistInput.trim().dropLast(lastTag.length)
                    parseBlacklistTags(prefix).forEach { tag ->
                        if (blacklistDraft.none { it.value == tag.value }) blacklistDraft.add(tag)
                    }
                    if (blacklistDraft.none { it.value == suggestion.value }) {
                        blacklistDraft.add(SelectedTag(suggestion.label, suggestion.value, suggestion.category))
                    }
                    blacklistInput = ""
                    suggestions = emptyList()
                })
            }
            Button(onClick = {
                val tags = (blacklistDraft + parseBlacklistTags(blacklistInput)).distinctBy { it.value }
                val signature = tags.map { it.value }.sorted()
                blacklistMessage = when {
                    tags.isEmpty() -> context.getString(R.string.blacklist_empty_rule)
                    blacklistRules.any { rule -> rule.tags.map { it.value }.sorted() == signature } ->
                        context.getString(R.string.blacklist_duplicate)
                    else -> {
                        onAddBlacklistRule(BlacklistRule(UUID.randomUUID().toString(), tags))
                        blacklistDraft.clear()
                        blacklistInput = ""
                        context.getString(R.string.blacklist_added)
                    }
                }
            }) { Text(stringResource(R.string.blacklist_add)) }
            if (blacklistMessage.isNotBlank()) Text(blacklistMessage, style = MaterialTheme.typography.bodySmall)
            if (blacklistRules.isEmpty()) Text(stringResource(R.string.blacklist_empty),
                color = MaterialTheme.colorScheme.onSurfaceVariant)
            blacklistRules.forEach { rule ->
                HorizontalDivider()
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    FlowRow(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        rule.tags.forEach { tag -> BlacklistTag(tag) }
                    }
                    IconButton(onClick = { onRemoveBlacklistRule(rule.id) }) {
                        Icon(painterResource(R.drawable.ic_x),
                            contentDescription = stringResource(R.string.blacklist_remove, rule.tags.joinToString(" + ") { it.label }))
                    }
                }
            }
        }
    }

    SectionTitle(R.string.settings_download_location)
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(if (downloadLocation == null) stringResource(R.string.download_location_default)
                else runCatching { Uri.decode(DocumentsContract.getTreeDocumentId(downloadLocation)) }
                    .getOrDefault(downloadLocation.toString()),
                maxLines = 2, overflow = TextOverflow.Ellipsis)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { chooseFolder.launch(downloadLocation) }) {
                    Text(stringResource(R.string.download_location_choose))
                }
                if (downloadLocation != null) TextButton(onClick = {
                    onDownloadLocationChange(null)
                    locationMessage = context.getString(R.string.download_location_updated)
                }) { Text(stringResource(R.string.download_location_reset)) }
            }
            Text(stringResource(R.string.download_location_help), style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (locationMessage.isNotBlank()) Text(locationMessage, style = MaterialTheme.typography.bodySmall)
        }
    }

    SectionTitle(R.string.downloads_history)
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            val count = downloadRecords.count { it.status == DownloadManager.STATUS_SUCCESSFUL }
            Text(stringResource(R.string.download_history_count, count))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(enabled = count > 0, onClick = {
                    exportHistory.launch("danbooru-download-history-${LocalDate.now()}.json")
                }) { Text(stringResource(R.string.download_history_export)) }
                Button(onClick = { importHistory.launch(arrayOf("application/json", "text/plain", "*/*")) }) {
                    Text(stringResource(R.string.download_history_import))
                }
            }
            TextButton(enabled = count > 0, onClick = { confirmClearHistory = true }) {
                Text(stringResource(R.string.download_history_clear), color = MaterialTheme.colorScheme.error)
            }
            if (historyMessage.isNotBlank()) Text(historyMessage, style = MaterialTheme.typography.bodySmall)
        }
    }

    SectionTitle(R.string.settings_about)
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            SettingRow(R.string.settings_source, R.string.source_danbooru)
            HorizontalDivider()
            SettingRow(R.string.settings_version, R.string.version_value)
        }
    }

    removeAccountId?.let { id ->
        val account = accounts.firstOrNull { it.id == id }
        AlertDialog(onDismissRequest = { removeAccountId = null },
            title = { Text(stringResource(R.string.account_remove_title)) },
            text = { Text(stringResource(R.string.account_remove_confirm, account?.username ?: "")) },
            confirmButton = { TextButton(onClick = {
                onRemoveAccount(id)
                removeAccountId = null
            }) { Text(stringResource(R.string.account_remove)) } },
            dismissButton = { TextButton(onClick = { removeAccountId = null }) {
                Text(stringResource(R.string.cancel_selection))
            } })
    }
    if (confirmClearHistory) AlertDialog(onDismissRequest = { confirmClearHistory = false },
        title = { Text(stringResource(R.string.download_history_clear)) },
        text = { Text(stringResource(R.string.download_history_clear_confirm)) },
        confirmButton = { TextButton(onClick = {
            onClearDownloadHistory()
            confirmClearHistory = false
            historyMessage = context.getString(R.string.download_history_cleared)
        }) { Text(stringResource(R.string.download_history_clear)) } },
        dismissButton = { TextButton(onClick = { confirmClearHistory = false }) {
            Text(stringResource(R.string.cancel_selection))
        } })
}

@Composable
private fun SectionTitle(@StringRes label: Int) {
    Text(stringResource(label), style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.primary)
}

@Composable
private fun SettingRow(@StringRes label: Int, @StringRes value: Int) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(stringResource(label), style = MaterialTheme.typography.bodyLarge)
        Text(stringResource(value), style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun AccountRow(label: String, selected: Boolean, onSelect: () -> Unit, onRemove: (() -> Unit)? = null) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onSelect), verticalAlignment = Alignment.CenterVertically) {
        RadioButton(selected = selected, onClick = onSelect)
        Spacer(Modifier.width(8.dp))
        Text(label, Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
        if (onRemove != null) IconButton(onClick = onRemove) {
            Icon(painterResource(R.drawable.ic_x), contentDescription = stringResource(R.string.account_remove))
        }
    }
}

@Composable
private fun BlacklistTag(tag: SelectedTag) {
    val dark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val (container, content) = tagChipColors(tag.category, dark)
    Text(tag.label, modifier = Modifier.background(container, RoundedCornerShape(12.dp))
        .padding(horizontal = 10.dp, vertical = 6.dp), color = content,
        style = MaterialTheme.typography.labelMedium)
}
