package com.lingducolchicine.danboorudownloader

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.hasAnyAncestor
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isDialog
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performImeAction
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.state.ToggleableState
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NavigationTest {
    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    @Test
    fun ratingFilterPersistsAndCancelDiscardsDraft() {
        val preferences = compose.activity.getSharedPreferences("search", android.content.Context.MODE_PRIVATE)
        val wasSaved = preferences.contains("rating_mask")
        val previousMask = preferences.getInt("rating_mask", 1)
        try {
            val initialDescription = ratingChip().fetchSemanticsNode().config[SemanticsProperties.ContentDescription]
            ratingChip().performClick()
            ratingOption("General").performClick()
            compose.onNodeWithText("Cancel").performClick()
            assertEquals(initialDescription, ratingChip().fetchSemanticsNode().config[SemanticsProperties.ContentDescription])

            ratingChip().performClick()
            listOf("General", "Sensitive", "Questionable", "Explicit").forEach { label ->
                if (ratingOption(label).fetchSemanticsNode().config[SemanticsProperties.ToggleableState] != ToggleableState.On) {
                    ratingOption(label).performClick()
                }
            }
            compose.onNodeWithText("Apply").performClick()
            compose.onNode(hasContentDescription("Rating: All ratings")).assertIsDisplayed()
            assertEquals(15, preferences.getInt("rating_mask", -1))
            compose.activityRule.scenario.recreate()
            compose.onNode(hasContentDescription("Rating: All ratings")).assertIsDisplayed()
            compose.onNodeWithText("Showing the latest posts.").assertDoesNotExist()
        } finally {
            val editor = preferences.edit()
            if (wasSaved) editor.putInt("rating_mask", previousMask) else editor.remove("rating_mask")
            editor.commit()
        }
    }

    @Test
    fun feedFabActionsAreOrderedAndSelectionCanBeCancelled() {
        compose.onNode(hasContentDescription("Open feed actions")).performClick()
        compose.onNodeWithText("Multi-select").assertIsDisplayed()
        compose.onNodeWithText("Refresh").assertIsDisplayed()
        compose.onNodeWithText("Back to top").assertIsDisplayed()
        assertTrue(menuTop("Multi-select") < menuTop("Refresh"))
        assertTrue(menuTop("Refresh") < menuTop("Back to top"))

        compose.onNodeWithText("Refresh").performClick()
        compose.onNodeWithText("Multi-select").assertDoesNotExist()
        compose.onNode(hasContentDescription("Open feed actions")).performClick()
        compose.onNodeWithText("Back to top").performClick()
        compose.onNode(hasContentDescription("Open feed actions")).performClick()
        compose.onNodeWithText("Multi-select").performClick()
        compose.onNodeWithText("Cancel").assertIsDisplayed().performClick()
        compose.onNode(hasContentDescription("Open feed actions")).assertIsDisplayed()
    }

    @Test
    fun changingSelectedTagsRefreshesResultsWithoutSubmitting() {
        compose.onNodeWithTag("feed-tags:").assertExists()
        collapsedSearchInput().performClick()
        expandedSearchInput().performTextInput("first_tag,second_tag,")
        expandedChip("first_tag").assertIsDisplayed()
        expandedChip("second_tag").assertIsDisplayed()
        expandedIcon("Close search").performClick()
        compose.onNodeWithTag("feed-tags:first_tag second_tag").assertExists()

        collapsedChip("first_tag").performClick()
        compose.onNodeWithTag("feed-tags:second_tag").assertExists()
        collapsedChip("second_tag").performClick()
        compose.onNodeWithTag("feed-tags:").assertExists()
    }

    @Test
    fun tabsSwitchAndSearchSurvivesActivityRecreation() {
        compose.onNodeWithText("Showing the latest posts.").assertDoesNotExist()
        compose.onNode(hasContentDescription("Search posts") and !hasAnyAncestor(isDialog()))
            .assertDoesNotExist()
        collapsedSearchInput().performClick()
        expandedSearchInput().assertIsFocused()
        expandedIcon("Search posts").assertIsDisplayed()
        compose.onNodeWithText("Suggested tags").assertDoesNotExist()
        compose.onNodeWithText("Type at least 2 characters for tag suggestions.").assertDoesNotExist()
        expandedSearchInput().performTextInput("a ")
        expandedChip("a").assertIsDisplayed()
        expandedChip("a").performClick()
        expandedChip("a").assertDoesNotExist()
        expandedSearchInput().performTextInput("b,")
        expandedChip("b").assertIsDisplayed()
        expandedSearchInput().performTextInput("c")
        expandedSearchInput().performImeAction()
        collapsedChip("b").assertExists()
        collapsedChip("c").assertExists()
        compose.onNodeWithText("Results for: b c").assertDoesNotExist()
        historyEntry("b").assertDoesNotExist()
        historyEntry("c").assertDoesNotExist()

        collapsedSearchInput().performClick()
        historyEntry("b").assertExists()
        historyEntry("c").assertExists()
        historyEntry("b c").assertDoesNotExist()
        assertTrue(historyTop("c") < historyTop("b"))
        expandedSearchInput().performTextInput("d")
        historyEntry("b").assertDoesNotExist()
        historyEntry("c").assertDoesNotExist()
        expandedIcon("Search posts").performClick()
        collapsedChip("d").assertIsDisplayed()
        compose.onNodeWithText("Results for: b c d").assertDoesNotExist()
        historyEntry("d").assertDoesNotExist()

        collapsedSearchInput().performClick()
        historyEntry("b").assertExists()
        historyEntry("c").assertExists()
        historyEntry("d").assertExists()
        historyEntry("b c d").assertDoesNotExist()
        assertTrue(historyTop("d") < historyTop("c"))
        assertTrue(historyTop("c") < historyTop("b"))
        historyDelete("c").performClick()
        historyEntry("c").assertDoesNotExist()
        historyEntry("b").assertExists()
        historyEntry("d").performClick()
        collapsedChip("d").assertExists()
        collapsedChip("b").assertDoesNotExist()
        collapsedChip("c").assertDoesNotExist()
        compose.onNodeWithText("Results for: d").assertDoesNotExist()
        historyEntry("d").assertDoesNotExist()

        collapsedSearchInput().performClick()
        historyEntry("b").assertExists()
        historyEntry("c").assertDoesNotExist()
        historyEntry("d").assertExists()
        expandedIcon("Close search").performClick()

        tab("Favorites").performClick()
        tab("Favorites").assertIsSelected()

        tab("Download").performClick()
        tab("Download").assertIsSelected()
        compose.onNodeWithText("Download history").assertIsDisplayed()

        tab("Settings").performClick()
        tab("Settings").assertIsSelected()
        compose.onNodeWithText("Language").assertIsDisplayed()
        compose.onNodeWithText("English").assertIsDisplayed()
        compose.onNodeWithText("Dark").performClick()

        compose.activityRule.scenario.recreate()
        tab("Settings").assertIsSelected()
        compose.onNodeWithText("Dark").assertIsSelected()
        tab("Search").performClick()
        collapsedChip("d").assertExists()
        collapsedChip("b").assertDoesNotExist()
        collapsedChip("c").assertDoesNotExist()
        historyEntry("d").assertDoesNotExist()
        historyEntry("b").assertDoesNotExist()
        collapsedSearchInput().performClick()
        historyEntry("b").assertExists()
        historyEntry("c").assertDoesNotExist()
        historyEntry("d").assertExists()
        expandedChip("d").assertExists()
        expandedChip("c").assertDoesNotExist()
        expandedIcon("Close search").performClick()
        collapsedSearchInput().assertIsDisplayed()
    }

    private fun tab(label: String) = compose.onNode(hasText(label) and hasClickAction())

    private fun collapsedSearchInput() =
        compose.onNode(hasSetTextAction() and !hasAnyAncestor(isDialog()))

    private fun expandedSearchInput() =
        compose.onNode(hasSetTextAction() and hasAnyAncestor(isDialog()))

    private fun expandedIcon(label: String) =
        compose.onNode(hasContentDescription(label) and hasAnyAncestor(isDialog()))

    private fun expandedChip(label: String) =
        compose.onNode(hasContentDescription("Remove $label") and hasAnyAncestor(isDialog()))

    private fun collapsedChip(label: String) =
        compose.onNode(hasContentDescription("Remove $label") and !hasAnyAncestor(isDialog()))

    private fun historyEntry(query: String) =
        compose.onNode(hasContentDescription("Search history: $query") and hasClickAction() and hasAnyAncestor(isDialog()))

    private fun historyDelete(query: String) =
        compose.onNode(hasContentDescription("Remove history: $query") and hasClickAction() and hasAnyAncestor(isDialog()))

    private fun historyTop(query: String) = historyEntry(query).fetchSemanticsNode().boundsInRoot.top

    private fun menuTop(label: String) = compose.onNodeWithText(label).fetchSemanticsNode().boundsInRoot.top

    private fun ratingOption(label: String) =
        compose.onNode(hasText(label) and hasAnyAncestor(isDialog()) and hasClickAction())

    private fun ratingChip() =
        compose.onNode(hasContentDescription("Rating:", substring = true) and hasClickAction() and !hasAnyAncestor(isDialog()))
}
