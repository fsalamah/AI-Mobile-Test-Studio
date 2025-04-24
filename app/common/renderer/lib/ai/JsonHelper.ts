import { Page } from "./types.js";

export const getPageStateNameById = (page, stateId) => {
    // Check if the page object is valid and contains 'states'
    if (!page || !Array.isArray(page.states)) {
        return null; // or throw an error
    }
    
    // Loop through each state in the page
    for (const state of page.states) {
        // Check if the state ID matches the provided ID
        if (state.id === stateId) {
            return state.title; // Return the corresponding state title
        }
    }
    return null; // Return null if not found
};

export const getPageStateLookup = (page) => {
    const stateLookup = {};

    // Check if the page object is valid and contains 'states'
    if (!page || !Array.isArray(page.states)) {
        return stateLookup; // Return empty object if invalid
    }

    // Loop through each state in the page
    for (const state of page.states) {
        // Add state ID and title to the lookup object
        stateLookup[state.id] = state.title;
    }
    return stateLookup; // Return the state lookup object
};

export const getStateById = (page, stateId) => {
    // Check if the page object is valid and contains 'states'
    if (!page || !Array.isArray(page.states)) {
        return null; // or throw an error
    }
    
    // Loop through each state in the page
    for (const state of page.states) {
        // Check if the state ID matches the provided ID
        if (state.id === stateId) {
            return state; // Return the corresponding state object
        }
    }
    return null; // Return null if not found
};



export function getBase64Image(
    page: Page,
    os?: "android" | "ios",
    stateId?: string
  ): string | undefined {
    for (const state of page.states) {
      if (stateId && state.id === stateId) {
        if (os && state.versions[os]?.screenShot) {
          return state.versions[os].screenShot;
        }
      } else if (!stateId && os && state.versions[os]?.screenShot) {
        return state.versions[os].screenShot;
      }
    }

    // If no specific stateId or os is provided, return the first available image
    for (const state of page.states) {
      const availableOs = state.versions.ios ? "ios" : state.versions.android ? "android" : undefined;
      if (availableOs && state.versions[availableOs]?.screenShot) {
        return state.versions[availableOs].screenShot;
      }
    }

    return undefined; // No image found
  }
  export function getPageSource(
    page: Page,
    os?: "android" | "ios",
    stateId?: string
  ): string | undefined {
    for (const state of page.states) {
      if (stateId && state.id === stateId) {
        if (os && state.versions[os]?.pageSource) {
          return state.versions[os].pageSource;
        }
      } else if (!stateId && os && state.versions[os]?.pageSource) {
        return state.versions[os].pageSource;
      }
    }

    // If no specific stateId or os is provided, return the first available image
    for (const state of page.states) {
      const availableOs = state.versions.ios ? "ios" : state.versions.android ? "android" : undefined;
      if (availableOs && state.versions[availableOs]?.pageSource) {
        return state.versions[availableOs].pageSource;
      }
    }

    return undefined; // No image found
  }
/**
 * Gets a lookup object mapping stateIds to state names, including platform-specific versions
 * @param {Object} page - The page object
 * @returns {Object} - A mapping of composite stateIds to state names
 */
export function getPageStateLookupPerOs(page) {
  try {
    const result = [];
    
    if (!page || !page.states) {
      console.warn("Missing page or page.states in getPageStateLookup");
      return result;
    }
    
    // Iterate through all states in the page
    Object.entries(page.states).forEach(([stateId, state]) => {
      // If the state has platform-specific versions
      if (state.versions) {
        // Create an entry for each platform version
        Object.keys(state.versions).forEach(platform => {
          const stateName = state.title || `State ${stateId}`;
          result.push({
            stateId: state.id,
            name: state.title,
            platform: platform
          });
        });
      } else {
        // If no platform-specific versions, use null or default platform
        const stateName = state.title || `State ${stateId}`;
        result.push({
          stateId:  state.id,
          name: state.title,
          platform: null // or you could use 'default' or another appropriate value
        });
      }
    });
    
    return result;
  } catch (error) {
    console.error("Error in getPageStateLookup:", error);
    return [];
  }
}