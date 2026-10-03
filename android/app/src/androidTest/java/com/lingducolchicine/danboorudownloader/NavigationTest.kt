package com.lingducolchicine.danboorudownloader

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.hasAnyAncestor
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isDialog
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performImeAction
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NavigationTest {
    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    @Test
    fun tabsSwitchAndSearchSurvivesActivityRecreation() {
        collapsedSearchInput().performClick()
        expandedSearchInput().assertIsFocused()
        compose.onNodeWithText("Example tags").assertIsDisplayed()
        compose.onNode(hasText("landscape") and hasClickAction() and hasAnyAncestor(isDialog()))
            .performClick()
        collapsedSearchInput().assertTextContains("landscape")

        tab("Favorites").performClick()
        tab("Favorites").assertIsSelected()
        compose.onNodeWithText("No favorites yet").assertIsDisplayed()

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
        collapsedSearchInput().assertTextContains("landscape")
        collapsedSearchInput().performClick()
        expandedSearchInput().assertTextContains("landscape")
        expandedIcon("Clear search").performClick()
        expandedIcon("Clear search").assertDoesNotExist()
        expandedSearchInput().performImeAction()
        collapsedSearchInput().assertIsDisplayed()
        collapsedSearchInput().performClick()
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
}
