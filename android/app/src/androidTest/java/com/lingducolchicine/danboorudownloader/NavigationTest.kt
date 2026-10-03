package com.lingducolchicine.danboorudownloader

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
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
        searchEntry("Search tags").performClick()
        searchInput().assertIsFocused()
        searchInput().performTextInput("landscape")
        compose.onNodeWithContentDescription("Close search").performClick()
        searchEntry("landscape").assertIsDisplayed()

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
        searchEntry("landscape").performClick()
        searchInput().assertTextContains("landscape")
        compose.onNodeWithContentDescription("Clear search").performClick()
        compose.onNodeWithContentDescription("Clear search").assertDoesNotExist()
        searchInput().performImeAction()
        searchInput().assertIsDisplayed()
        compose.onNodeWithContentDescription("Close search").performClick()
        searchEntry("Search tags").assertIsDisplayed()
    }

    private fun tab(label: String) = compose.onNode(hasText(label) and hasClickAction())

    private fun searchEntry(label: String) = compose.onNode(hasText(label) and hasClickAction())

    private fun searchInput() = compose.onNode(hasSetTextAction())
}
