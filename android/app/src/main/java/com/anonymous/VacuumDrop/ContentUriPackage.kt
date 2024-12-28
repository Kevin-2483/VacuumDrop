// ContentUriPackage.kt
package com.anonymous.VacuumDrop

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ContentUriPackage : ReactPackage {
    override fun createViewManagers(reactContext: ReactApplicationContext) = emptyList<ViewManager<*,*>>()
    
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(ContentUriConverter(reactContext))
}