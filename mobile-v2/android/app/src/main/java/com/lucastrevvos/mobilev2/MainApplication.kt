package com.lucastrevvos.mobilev2

import android.app.Application
import android.content.res.Configuration
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.PackageList
import com.facebook.soloader.SoLoader
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

class MainApplication : Application(), ReactApplication {

  // Expo + RN 0.81+: usar a PROPRIEDADE reactNativeHost
  override val reactNativeHost: ReactNativeHost by lazy {
    ReactNativeHostWrapper(
      this,
      object : ReactNativeHost(this) {
        override fun getUseDeveloperSupport() = BuildConfig.DEBUG
        override fun getPackages(): List<ReactPackage> = PackageList(this).packages
        override fun getJSMainModuleName() = "index"
      }
    )
  }

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, /* native exopackage */ false)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
