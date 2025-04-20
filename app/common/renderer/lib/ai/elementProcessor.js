import {CONFIG} from "./config.js";

export class ElementProcessor {
  static removeDuplicateDevNames(elements) {
    const seen = new Set();
    return elements.filter((el) => {
      if (seen.has(el.devName)) return false;
      seen.add(el.devName);
      return true;
    });
  }

  static async parseAndLogResults(choices, label = "") {
    const results = [];
    for (let i = 0; i < choices.length; i++) {
      const parsed = JSON.parse(choices[i].message.content);
      if (CONFIG.DEBUG) {
        console.log(`${label} Choice ${i}:`);
        console.log("  pageElements:", parsed.length);
        console.log(`  [${new Date().toISOString()}]`);
      }
      results.push(parsed);
    }
    return results;
  }
}
