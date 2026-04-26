const fs = require("fs");
const path = require("path");
const {
  AndroidConfig,
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  withMainApplication,
} = require("@expo/config-plugins");

const ACCESSIBILITY_XML = `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
  android:accessibilityEventTypes="typeWindowContentChanged|typeWindowStateChanged"
  android:accessibilityFeedbackType="feedbackGeneric"
  android:notificationTimeout="80"
  android:accessibilityFlags="flagReportViewIds|flagRetrieveInteractiveWindows|flagIncludeNotImportantViews"
  android:canRetrieveWindowContent="true"
  android:canPerformGestures="false"
  android:description="@string/app_name" />
`;

function ensurePermission(manifest, permission) {
  const main = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
  manifest.manifest["uses-permission"] = manifest.manifest["uses-permission"] || [];
  const exists = manifest.manifest["uses-permission"].some(
    (item) => item.$["android:name"] === permission,
  );
  if (!exists) {
    manifest.manifest["uses-permission"].push({ $: { "android:name": permission } });
  }
  return main;
}

function ensureService(mainApplication, serviceName, attrs = {}, intentAction = null, metaData = null) {
  mainApplication.service = mainApplication.service || [];
  const existing = mainApplication.service.find(
    (item) => item.$["android:name"] === serviceName,
  );

  if (existing) {
    existing.$ = { ...existing.$, ...attrs, "android:name": serviceName };
    if (intentAction) {
      existing["intent-filter"] = existing["intent-filter"] || [{ action: [{ $: { "android:name": intentAction } }] }];
    }
    if (metaData) {
      existing["meta-data"] = existing["meta-data"] || [];
      const hasMeta = existing["meta-data"].some(
        (item) => item.$["android:name"] === metaData["android:name"],
      );
      if (!hasMeta) {
        existing["meta-data"].push({ $: metaData });
      }
    }
    return;
  }

  const service = { $: { "android:name": serviceName, ...attrs } };
  if (intentAction) {
    service["intent-filter"] = [{ action: [{ $: { "android:name": intentAction } }] }];
  }
  if (metaData) {
    service["meta-data"] = [{ $: metaData }];
  }
  mainApplication.service.push(service);
}

function ensureMlKitDependency(contents) {
  const dependencyLine = '    implementation("com.google.mlkit:text-recognition:16.0.1")';
  if (contents.includes(dependencyLine)) {
    return contents;
  }
  return contents.replace(
    '    implementation("com.facebook.react:react-android")',
    '    implementation("com.facebook.react:react-android")\n' + dependencyLine,
  );
}

function ensureMainApplicationPackage(contents) {
  const importLine = "import com.lucastrevvos.kmone.overlay.OfferOverlayPackage";
  let next = contents;

  if (!next.includes(importLine)) {
    next = next.replace(
      "import com.facebook.react.defaults.DefaultReactNativeHost\n",
      "import com.facebook.react.defaults.DefaultReactNativeHost\n\n" + importLine + "\n",
    );
  }

  if (!next.includes("add(OfferOverlayPackage())")) {
    next = next.replace(
      "PackageList(this).packages.apply {\n",
      "PackageList(this).packages.apply {\n              add(OfferOverlayPackage())\n",
    );
  }

  return next;
}

module.exports = function withKmOneAndroidNative(config) {
  config = withAndroidManifest(config, (config) => {
    ensurePermission(config.modResults, "android.permission.SYSTEM_ALERT_WINDOW");
    ensurePermission(config.modResults, "android.permission.FOREGROUND_SERVICE");
    ensurePermission(config.modResults, "android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION");

    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

    ensureService(
      mainApplication,
      ".overlay.OfferAccessibilityService",
      {
        "android:permission": "android.permission.BIND_ACCESSIBILITY_SERVICE",
        "android:exported": "false",
      },
      "android.accessibilityservice.AccessibilityService",
      {
        "android:name": "android.accessibilityservice",
        "android:resource": "@xml/offer_accessibility_service",
      },
    );

    ensureService(
      mainApplication,
      ".overlay.OfferCaptureService",
      {
        "android:exported": "false",
        "android:foregroundServiceType": "mediaProjection",
      },
    );

    return config;
  });

  config = withAppBuildGradle(config, (config) => {
    config.modResults.contents = ensureMlKitDependency(config.modResults.contents);
    return config;
  });

  config = withMainApplication(config, (config) => {
    config.modResults.contents = ensureMainApplicationPackage(config.modResults.contents);
    return config;
  });

  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const xmlDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "xml",
      );
      const xmlPath = path.join(xmlDir, "offer_accessibility_service.xml");
      await fs.promises.mkdir(xmlDir, { recursive: true });
      await fs.promises.writeFile(xmlPath, ACCESSIBILITY_XML, "utf8");
      return config;
    },
  ]);

  return config;
};
