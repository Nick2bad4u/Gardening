import { syncPlantIcons } from "./sync-plant-icons.mjs";
import { syncUiIcons } from "./sync-ui-icons.mjs";

// Export public artwork without reading or rewriting the deployed logger source.
const isCheckOnly = process.argv.includes("--check");
await syncPlantIcons({ checkOnly: isCheckOnly });
await syncUiIcons({ checkOnly: isCheckOnly });
