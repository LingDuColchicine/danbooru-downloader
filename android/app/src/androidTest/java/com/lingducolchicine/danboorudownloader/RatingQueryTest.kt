package com.lingducolchicine.danboorudownloader

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class RatingQueryTest {
    @Test
    fun combinesSelectedRatingsWithTags() {
        assertEquals("rating:g", ratedQuery("", 1))
        assertEquals("cat rating:g,s", ratedQuery("cat", 3))
        assertEquals("cat rating:q,e", ratedQuery(" cat ", 12))
        assertEquals("cat", ratedQuery("cat", 15))
        assertEquals("rating:g", ratedQuery("", 0))
    }
}
