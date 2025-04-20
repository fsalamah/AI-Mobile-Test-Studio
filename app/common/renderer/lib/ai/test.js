import { CONFIG } from "./config.js";
import { FileUtils } from "./fileUtils.js";
import { PageService } from "./pageService.js";

console.log(await Object.keys(PageService.getPageStateById("appium_pages_2025-04-16 - Copy.json","id_m9jrpp8n_a40pn","id_m9jrsnqm_opxom")))
console.log(await (PageService.getPageStateById("appium_pages_2025-04-16 - Copy.json","id_m9jrpp8n_a40pn","id_m9jrsnqm_opxom")))

PageService.getPageOsStateDetails(CONFIG.DATA_PATH,"id_m9l81dph_wmm7f","id_m9l81kj0_sm7hv","ios").then((data) => {
const stateDetails = data;
console.log("State Details:", stateDetails);    
FileUtils.writeOutputToFile(stateDetails, "test_state_details");

}).catch((error) => {
  console.error("Error:", error);
})