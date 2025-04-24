import { CONFIG } from "./config.js";
import { FileUtils } from "./fileUtils.js";
import { PageService } from "./pageService.js";
import * as p from './pipeline.js'
import * as j from './JsonHelper.js'
import {VisualElement} from './types.js'
import {RootProjectObject} from './types.js'
// console.log(await Object.keys(PageService.getPageStateById("appium_pages_2025-04-16 - Copy.json","id_m9jrpp8n_a40pn","id_m9jrsnqm_opxom")))
// console.log(await (PageService.getPageStateById("appium_pages_2025-04-16 - Copy.json","id_m9jrpp8n_a40pn","id_m9jrsnqm_opxom")))

// PageService.getPageOsStateDetails(CONFIG.DATA_PATH,"id_m9l81dph_wmm7f","id_m9l81kj0_sm7hv","ios").then((data) => {
// const stateDetails = data;
// console.log("State Details:", stateDetails);    
// FileUtils.writeOutputToFile(stateDetails, "test_state_details");

// }).catch((error) => {
//   console.error("Error:", error);
// })




/**
 * @type {import('./types.js').RootProjectObject} 
 */
// const x = JSON.parse('{"key": "value"}'); // Example of valid JSON
// (x as RootProjectObject).pages[0].