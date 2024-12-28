// ContentUriConverter.kt
package com.anonymous.VacuumDrop

import android.net.Uri
import android.provider.DocumentsContract
import android.provider.MediaStore
import com.facebook.react.bridge.*
import java.io.File
import java.io.FileOutputStream

class ContentUriConverter(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    override fun getName() = "ContentUriConverter"
    
    @ReactMethod
    fun getFilePathFromUri(uriString: String, promise: Promise) {
        try {
            val uri = Uri.parse(uriString)
            val result = getPath(uri)
            
            if (result != null) {
                promise.resolve("file://$result")
            } else {
                // 如果无法直接获取路径，则复制文件到应用目录
                val fileName = getFileName(uri)
                val destFile = File(reactContext.filesDir, fileName)
                copyFile(uri, destFile)
                promise.resolve("file://${destFile.absolutePath}")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    private fun getFileName(uri: Uri): String {
        if (uri.scheme == "content") {
            reactContext.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val index = cursor.getColumnIndex(MediaStore.MediaColumns.DISPLAY_NAME)
                    if (index != -1) {
                        return cursor.getString(index)
                    }
                }
            }
        }
        return uri.lastPathSegment ?: "unknown_file"
    }
    
    private fun copyFile(uri: Uri, destFile: File) {
        reactContext.contentResolver.openInputStream(uri)?.use { input ->
            FileOutputStream(destFile).use { output ->
                input.copyTo(output)
            }
        } ?: throw Exception("Cannot open input stream")
    }
    
    private fun getPath(uri: Uri): String? {
        // 处理 document provider
        if (DocumentsContract.isDocumentUri(reactContext, uri)) {
            val docId = DocumentsContract.getDocumentId(uri)
            
            when {
                // ExternalStorageProvider
                isExternalStorageDocument(uri) -> {
                    val split = docId.split(":")
                    if (split.size >= 2 && "primary".equals(split[0], ignoreCase = true)) {
                        return "${reactContext.getExternalFilesDir(null)}/${split[1]}"
                    }
                }
                
                // MediaProvider
                isMediaDocument(uri) -> {
                    val split = docId.split(":")
                    if (split.size >= 2) {
                        val contentUri = when (split[0]) {
                            "image" -> MediaStore.Images.Media.EXTERNAL_CONTENT_URI
                            "video" -> MediaStore.Video.Media.EXTERNAL_CONTENT_URI
                            "audio" -> MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
                            else -> null
                        }
                        
                        contentUri?.let {
                            val selection = "_id=?"
                            val selectionArgs = arrayOf(split[1])
                            return getDataColumn(it, selection, selectionArgs)
                        }
                    }
                }
            }
        }
        return null
    }
    
    private fun getDataColumn(uri: Uri, selection: String?, selectionArgs: Array<String>?): String? {
        val column = MediaStore.MediaColumns.DATA
        val projection = arrayOf(column)
        
        reactContext.contentResolver.query(uri, projection, selection, selectionArgs, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val columnIndex = cursor.getColumnIndexOrThrow(column)
                return cursor.getString(columnIndex)
            }
        }
        return null
    }
    
    private fun isExternalStorageDocument(uri: Uri) =
        "com.android.externalstorage.documents" == uri.authority
    
    private fun isMediaDocument(uri: Uri) =
        "com.android.providers.media.documents" == uri.authority
}