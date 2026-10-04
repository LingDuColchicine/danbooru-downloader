package com.lingducolchicine.danboorudownloader

import android.content.Context
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.rules.TestName

@RunWith(AndroidJUnit4::class)
class FavoriteStoreTest {
    @get:Rule val testName = TestName()

    @Test
    fun favoritesSurviveStoreRecreationInSavedOrder() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val preferenceName = "favorite_store_test_${testName.methodName}"
        val preferences = context.getSharedPreferences(preferenceName, Context.MODE_PRIVATE)
        preferences.edit().clear().commit()
        try {
            val first = FavoritePost(7, "https://example.com/7.jpg", 0.75f, "https://example.com/full-7.jpg", "jpg")
            val second = FavoritePost(8, "https://example.com/8.jpg", 1.5f, null)
            FavoriteStore(context, preferenceName).save(listOf(first, second))
            assertEquals(listOf(first, second), FavoriteStore(context, preferenceName).load())
        } finally {
            preferences.edit().clear().commit()
        }
    }
}
