package com.lingducolchicine.danboorudownloader

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class PostDetailParserTest {
    @Test
    fun originalFileAndAllTagCategoriesAreReadFromPostResponse() {
        val detail = parsePostDetail(
            42,
            """{
                "id":42,
                "file_url":"https://cdn.example/42.png",
                "large_file_url":"https://cdn.example/42-sample.png",
                "preview_file_url":"https://cdn.example/42-preview.jpg",
                "source":"https://example.org/art/42",
                "image_width":2400,
                "image_height":1600,
                "file_ext":"png",
                "file_size":5242880,
                "tag_string_artist":"artist_one artist_two",
                "tag_string_character":"character_one",
                "tag_string_copyright":"series_one",
                "tag_string_general":"blue_eyes solo",
                "tag_string_meta":"highres"
            }""".trimIndent(),
        )

        assertEquals("https://cdn.example/42.png", detail.fileUrl)
        assertEquals("https://cdn.example/42-sample.png", detail.largeFileUrl)
        assertEquals("https://example.org/art/42", detail.source)
        assertEquals(2400, detail.width)
        assertEquals(1600, detail.height)
        assertEquals("png", detail.fileExt)
        assertEquals(5242880L, detail.fileSize)
        assertEquals(listOf("artist_one", "artist_two"), detail.artistTags)
        assertEquals(listOf("character_one"), detail.characterTags)
        assertEquals(listOf("series_one"), detail.copyrightTags)
        assertEquals(listOf("blue_eyes", "solo"), detail.generalTags)
        assertEquals(listOf("highres"), detail.metaTags)
    }

    @Test
    fun missingOriginalFileDoesNotBecomeDownloadable() {
        val detail = parsePostDetail(42, """{"id":42,"file_url":null,"large_file_url":"https://cdn.example/sample.jpg"}""")
        assertNull(detail.fileUrl)
        assertEquals("https://cdn.example/sample.jpg", detail.largeFileUrl)
    }
}
