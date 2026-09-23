/*
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import groovy.json.JsonSlurper

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// The shell ships with the repo's release-please version, which is what it reports as shellVersion.
val repoRoot = rootDir.resolve("../..")
val releaseVersion = (JsonSlurper().parse(repoRoot.resolve("package.json")) as Map<*, *>)["version"] as String
val releaseCode = releaseVersion.split(".").map { it.takeWhile(Char::isDigit).toInt() }
    .let { (major, minor, patch) -> major * 10_000 + minor * 100 + patch }
val apiBase = providers.gradleProperty("proyectaApiBase").get()
val playerAssets = layout.buildDirectory.dir("generated/playerAssets")

android {
    namespace = "com.proyecta.player"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.proyecta.player"
        minSdk = 21
        targetSdk = 35
        versionName = releaseVersion
        versionCode = releaseCode
    }

    signingConfigs {
        // ANDROID_ID is scoped to the signing key: this key must never change (docs/deploy/PENDING.md).
        create("release") {
            System.getenv("ANDROID_KEYSTORE_PATH")?.let { storeFile = file(it) }
            storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias = System.getenv("ANDROID_KEY_ALIAS")
            keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (System.getenv("ANDROID_KEYSTORE_PATH") != null) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    buildFeatures { buildConfig = true }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    sourceSets["main"].assets.srcDir(playerAssets)
}

kotlin { jvmToolchain(17) }

dependencies {
    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.webkit:webkit:1.14.0")
    testImplementation("junit:junit:4.13.2")
}

/** Builds the web player for this shell and copies it into the APK's assets under player/. */
val buildPlayer by tasks.registering(Exec::class) {
    workingDir = repoRoot
    commandLine("npm", "run", "build", "-w", "@proyecta/player")
    environment("VITE_API_BASE", apiBase)
    inputs.dir(repoRoot.resolve("packages/player/src"))
    inputs.property("apiBase", apiBase)
    outputs.dir(repoRoot.resolve("packages/player/dist"))
}

val copyPlayer by tasks.registering(Sync::class) {
    dependsOn(buildPlayer)
    from(repoRoot.resolve("packages/player/dist"))
    into(playerAssets.map { it.dir("player") })
}

tasks.named("preBuild") { dependsOn(copyPlayer) }
