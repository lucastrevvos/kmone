// plugins/fix-mainapplication.js
const { withDangerousMod, AndroidConfig } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function fixMainApplication(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const pkg = AndroidConfig.Package.getPackage(cfg);
      const appDir = path.join(
        projectRoot,
        "android",
        "app",
        "src",
        "main",
        "java",
        ...pkg.split(".")
      );
      const file = path.join(appDir, "MainApplication.kt");
      if (!fs.existsSync(file)) return cfg;

      let src = fs.readFileSync(file, "utf8");

      // Substitui imports antigos por APIs atuais (RN 0.79)
      src = src
        .replace(
          /import\s+com\.facebook\.react\.defaults\.ReactNativeApplicationEntryPoint[^\n]*\n?/g,
          "import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load\n"
        )
        .replace(
          /import\s+com\.facebook\.react\.ReactNativeHost[^\n]*\n?/g,
          "import com.facebook.react.defaults.ReactNativeHost\n"
        );

      // Troca chamada antiga por load()
      src = src.replace(/\bloadReactNative\s*\(\s*\)/g, "load()");

      // Em alguns templates antigos, pode vir outra variação:
      src = src.replace(
        /\bDefaultNewArchitectureEntryPoint\.loadReactNative\s*\(\s*\)/g,
        "load()"
      );

      fs.writeFileSync(file, src);
      return cfg;
    },
  ]);
};
