import { ConfigPlugin, withDangerousMod } from "@expo/config-plugins"
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const withAndroidLifecycleGuard: ConfigPlugin = (config) =>
  withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const mainActivityPath = join(
        modConfig.modRequest.platformProjectRoot,
        "app/src/main/java/com/usthing/apptechtest27/MainActivity.kt",
      )
      const source = readFileSync(mainActivityPath, "utf8")
      if (source.includes("private var reactActivityCreated")) return modConfig

      const guarded = source
        .replace(
          "class MainActivity : ReactActivity() {",
          `class MainActivity : ReactActivity() {
  private var reactActivityCreated = false`,
        )
        .replace(
          "    super.onCreate(null)\n",
          "    super.onCreate(null)\n    reactActivityCreated = true\n",
        )
        .replace(
          "\n  /**\n   * Returns the name of the main component",
          `
  override fun onUserLeaveHint() {
    if (reactActivityCreated) {
      super.onUserLeaveHint()
    }
  }

  override fun onDestroy() {
    reactActivityCreated = false
    super.onDestroy()
  }

  /**
   * Returns the name of the main component`,
        )

      writeFileSync(mainActivityPath, guarded)
      return modConfig
    },
  ])

export default withAndroidLifecycleGuard
