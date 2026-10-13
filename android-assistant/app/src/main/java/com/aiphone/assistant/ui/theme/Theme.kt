package com.aiphone.assistant.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val Ink = Color(0xFF101417)
val InkRaised = Color(0xFF1B2328)
val Paper = Color(0xFFF3F0E7)
val Moss = Color(0xFFD6F26A)
val MossDeep = Color(0xFF243028)
val Sea = Color(0xFF8EE3D2)
val Muted = Color(0xFF9AA4A8)

private val Colors = darkColorScheme(
    primary = Moss,
    onPrimary = Ink,
    secondary = Sea,
    onSecondary = Ink,
    background = Ink,
    onBackground = Paper,
    surface = InkRaised,
    onSurface = Paper,
    surfaceVariant = Color(0xFF243038),
    onSurfaceVariant = Muted,
    error = Color(0xFFFF8B7B),
)

private val Type = Typography(
    headlineMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 28.sp, letterSpacing = (-0.5).sp),
    titleMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 18.sp),
    bodyLarge = TextStyle(fontSize = 16.sp, lineHeight = 22.sp),
    bodyMedium = TextStyle(fontSize = 15.sp, lineHeight = 21.sp),
    labelLarge = TextStyle(fontWeight = FontWeight.Medium, fontSize = 14.sp),
    labelSmall = TextStyle(fontSize = 11.sp, letterSpacing = 0.3.sp),
)

@Composable
fun NorthstarTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = Colors, typography = Type, content = content)
}
