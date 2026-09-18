import { syncPlantIcons } from "./sync-plant-icons.mjs";
import { syncUiIcons } from "./sync-ui-icons.mjs";

// Explicit operator command; never called by the website build.
const isCheckOnly = process.argv.includes("--check");
await syncPlantIcons({ checkOnly: isCheckOnly, syncLogger: true });
await syncUiIcons({ checkOnly: isCheckOnly, syncLogger: true });
