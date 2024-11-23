

/**
 * Returns the HTML code for ratio section given a list of ratios
 * @param {Array} ratioList The list of raw materials that have ratio with each other
 * @param {String} textSource The original text containing the information about ratios
 * @param {Number} index The identifier of this ratio section
 */
export function createRatioSection(ratioList, textSource, index) {

  // normalizing the ratio list before passing on the data
  const firstElement = ratioList[0].ratio_value;
  const nRatioList = ratioList.map((item) => {
    return {
      ...item,
      ratio_value: parseFloat((item.ratio_value / firstElement).toFixed(2)),
    };
  });

  const ratioSection = `
    <div id="lca-viz-r-section-${index}" class="lca-viz-ratio-container br-4 pd-16">
            <div class="lca-viz-toggle flex-center cg-8">
              <span class="fz-12">Toggle Ratio</span>
              <div class="lca-viz-toggle-container">
                <input type="checkbox" class="lca-viz-toggle-checkbox" id="lca-viz-toggle-switch-${index}">
                <label for="lca-viz-toggle-switch-${index}" class="lca-viz-toggle-label"></label>
              </div>
            </div>
            <div class="lca-viz-ratio-detail-text hidden">
              <div class="flex-center lca-viz-space-between">
                <div class="lca-viz-converted-ratio lca-viz-space-between br-4 fz-16 pd-8 flex-center cg-8 bg-eef2f0">
                  <span>Converted ratio: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                  <div class="lca-viz-ratio-values flex-center cg-8">
                    ${nRatioList.map((element) =>
                      `<span class="lca-viz-ratio-text br-4 bg-d2ead7">${element.ratio_value}</span>
                      ${element.index < nRatioList.length - 1 ? `<span>:</span>` : ``}`
                    ).join('')}
                  </div>
                </div>
                <div class="lca-viz-empty-space"></div>
              </div>
              <p class="lca-viz-text-source fz-12"><b>Text source:</b> <i>“${textSource}”</i></p>
            </div>
            <!-- & param for toggle ratio off -->
            <div class="lca-viz-param-toggle-off">
              <br>
              ${nRatioList.map((element) =>
                getParam(element.name, element.index, 'g', 1, undefined, undefined, undefined)
              ).join('')}
            </div>

            <!-- & param for toggle ratio on -->
            <div class="lca-viz-param-toggle-on lca-viz-space-between hidden flex-center bg-eef2f0 pd-16 br-8 cg-8 mt-12">
            ${nRatioList.map((element, i) =>
              `<div class="lca-viz-ratio-control fz-16 bg-d2ead7 br-8 pd-16">
                <div class="control-section">${element.name}</div>
                <div class="flex-center cg-4 mt-8 lca-viz-justify-center">
                  <!-- ? up-down-btn -->
                  <div class="lca-viz-special-text-container-2">
                    <div class="lca-viz-special-text-2 lca-viz-active-st">
                      <div class="lca-viz-up-down-btn-container">
                        <div class="lca-viz-active lca-viz-up-down-btn lca-viz-down">
                          <svg width="100%" height="100%" viewBox="0 0 9 7" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5.09107 5.74914C4.70327 6.20989 3.99382 6.20989 3.60602 5.74914L0.689251 2.28363C0.157962 1.65239 0.606707 0.688168 1.43177 0.688168L7.26532 0.688168C8.09039 0.688168 8.53913 1.65239 8.00784 2.28363L5.09107 5.74914Z" fill="currentColor"/>
                          </svg>
                        </div>
                        <input class="lca-viz-parameter-text input-ratio" id="input-ratio-no-${element.index}" data-ratio-value="${element.ratio_value}" type="number" value="${element.ratio_value}">
                        <div class="lca-viz-active lca-viz-up-down-btn lca-viz-up">
                          <svg width="100%" height="100%" viewBox="0 0 9 7" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3.60595 1.24256C3.99375 0.781809 4.7032 0.781808 5.091 1.24256L8.00777 4.70806C8.53906 5.3393 8.09032 6.30353 7.26525 6.30353L1.4317 6.30353C0.606637 6.30353 0.157892 5.33931 0.689181 4.70807L3.60595 1.24256Z" fill="currentColor"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- ? ^^^^^^^ -->
                  <span>g</span>
                </div>
              </div>${i < nRatioList.length - 1 ? `<span>:</span>` : ``}`
            ).join('')}
            </div>
          </div>
  `;
  return ratioSection;
}

/**
 * Returns the HTML code for a single parameter.
 * @param {String} rawMaterialName The name of the raw material
 * @param {Number} index Its index
 * @param {Number} unit The unit of the material
 * @param {Number} defaultVal (Optional) The first default quantity of the raw material
 * @param {Boolean} isProcesses (Optional - processes) Whether this is a "processes" case
 * @param {Number} unit2 (Optional - processes) The second unit of the material
 * @param {Number} defaultV2 (Optional - processes) The second default quantity of the material
 * @param {Number} calcVal (Optional - processes) The value that will be used for calculating energy
 * @param {Number} calcVal2 (Optional - processes) The second value that will be used for calculating energy
 * @returns
 */
export function getParam(rawMaterialName, index, unit, defaultVal = 1, isProcesses = false, unit2 = null, defaultVal2 = 0) {
  const paramDiv = `
      <div class="lca-viz-param-fill flex-center br-8 fz-16">
        <span>${rawMaterialName}</span>
        <div class="flex-center cg-4">
          <div class="lca-viz-special-text-container-2 ${isProcesses ? 'lca-viz-processes': ''}">
            <div class="lca-viz-special-text-2 lca-viz-active-st lca-viz-control-${index}-power">
              <div class="lca-viz-up-down-btn-container">
                <div class="lca-viz-active lca-viz-up-down-btn lca-viz-down">
                  <svg width="100%" height="100%" viewBox="0 0 9 7" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.09107 5.74914C4.70327 6.20989 3.99382 6.20989 3.60602 5.74914L0.689251 2.28363C0.157962 1.65239 0.606707 0.688168 1.43177 0.688168L7.26532 0.688168C8.09039 0.688168 8.53913 1.65239 8.00784 2.28363L5.09107 5.74914Z" fill="currentColor"/>
                  </svg>
                </div>
                <input class="lca-viz-parameter-text input-normal" id="lca-viz-input-${index}" data-type="power" data-value-unit="${unit}" type="number" value="${defaultVal}">
                <div class="lca-viz-active lca-viz-up-down-btn lca-viz-up">
                  <svg width="100%" height="100%" viewBox="0 0 9 7" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3.60595 1.24256C3.99375 0.781809 4.7032 0.781808 5.091 1.24256L8.00777 4.70806C8.53906 5.3393 8.09032 6.30353 7.26525 6.30353L1.4317 6.30353C0.606637 6.30353 0.157892 5.33931 0.689181 4.70807L3.60595 1.24256Z" fill="currentColor"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <span>${unit}</span>
          ${ isProcesses ?
          `<div class="lca-viz-special-text-container-2 ${isProcesses ? 'lca-viz-processes': ''}">
            <div class="lca-viz-special-text-2 lca-viz-active-st lca-viz-control-${index}-time">
              <div class="lca-viz-up-down-btn-container">
                <div class="lca-viz-active lca-viz-up-down-btn lca-viz-down">
                  <svg width="100%" height="100%" viewBox="0 0 9 7" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.09107 5.74914C4.70327 6.20989 3.99382 6.20989 3.60602 5.74914L0.689251 2.28363C0.157962 1.65239 0.606707 0.688168 1.43177 0.688168L7.26532 0.688168C8.09039 0.688168 8.53913 1.65239 8.00784 2.28363L5.09107 5.74914Z" fill="currentColor"/>
                  </svg>
                </div>
                <input class="lca-viz-parameter-text input-normal" id="lca-viz-input-${index}" data-type="time"  data-value-unit="${unit2}" type="number" value="${defaultVal2}">
                <div class="lca-viz-active lca-viz-up-down-btn lca-viz-up">
                  <svg width="100%" height="100%" viewBox="0 0 9 7" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3.60595 1.24256C3.99375 0.781809 4.7032 0.781808 5.091 1.24256L8.00777 4.70806C8.53906 5.3393 8.09032 6.30353 7.26525 6.30353L1.4317 6.30353C0.606637 6.30353 0.157892 5.33931 0.689181 4.70807L3.60595 1.24256Z" fill="currentColor"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <span>${unit2}</span>`
          : `` }
        </div>
      </div>
  `;
  return paramDiv;
}


export function getMockData() {
  // ! Case: Ratio + Independent + Processes
  const data = {
    "raw_materials": {
      "related_materials": [
        {
          "ratio": [
            {
              "name": "epoxy (EPON 828)",
              "ratio_value": 340,
              "unit": "g",
              "ratio_value_source": "present",
              "unit_source": "inferred",
              "carbon_emission_factor": "2 g CO₂-eq per g",
              "index": 0
            },
            {
              "name": "adipic acid",
              "ratio_value": 146.14,
              "unit": "g",
              "ratio_value_source": "present",
              "unit_source": "inferred",
              "carbon_emission_factor": "3.6 g CO₂-eq per g",
              "index": 1
            },
            {
              "name": "TBD",
              "ratio_value": 6.96,
              "unit": "g",
              "ratio_value_source": "inferred",
              "unit_source": "inferred",
              "carbon_emission_factor": "1 g CO₂-eq per g",
              "index": 2
            }
          ]
        }
      ],
      "independent_materials": [
        {
          "name": "copper",
          "amount": 1,
          "unit": "g",
          "amount_source": "present",
          "unit_source": "present",
          "carbon_emission_factor": "0.41 g CO₂-eq per g",
          "index": 3
        },
        {
          "name": "gold",
          "amount": 2,
          "unit": "g",
          "amount_source": "present",
          "unit_source": "present",
          "carbon_emission_factor": "0.5 g CO₂-eq per g",
          "index": 4
        }
      ]
    },
    "processes": [
      {
        "name": "nitrogen plasma treatment",
        "power": 45,
        "power_unit": "W",
        "time": 1200,
        "time_unit": "s",
        "power_source": "present",
        "time_source": "present",
        "energy": 0.01875,
        "energy_unit": "kWh",
        "energy_source": "calculated",
        "carbon_emission_factor": "400 g CO₂-eq per kWh",
        "index": 5
      }
    ]
  };
  return data;
}

/**
 *
 * @param {String} emissionsString Takes in the string in the following format: "<value> g CO2-eq per <material_unit>"
 * @returns
 */
export function extractEmissionsFactor(emissionsString) {
  const parts = emissionsString.split(' ');
  let co2e_value = parseFloat(parts[0]);
  let co2e_unit = parts[1];
  let material_unit = parts[4];

  // co2e_unit must be in 'g'. If not, convert it to 'g'.
  if (co2e_unit === 'kg') {
    co2e_value = co2e_value * 1000;
    co2e_unit = 'g';
  }

  const resultObj = {
    "co2e_value": co2e_value,
    "co2e_unit": co2e_unit,
    "material_unit": material_unit
  }
  return resultObj;
}

export function getBaseDomain(hostname) {
  const parts = hostname.split('.');
  if (parts.length > 2) {
    return parts.slice(-2).join('.');
  }
  return hostname;
}


/**
 * Recursively searches through a nested object/array structure to find an item with a specific index value.
 * @param {Object|Array} obj - The object or array to search through
 * @param {number} targetIndex - The index value to search for
 * @returns {Object|null} - Returns the matching object or null if not found
 */
export function findByIndex(obj, targetIndex) {
  // If this item has the target index, return it immediately
  if (obj && obj.index === targetIndex) return obj;

  // If it's an array, use find for immediate children first
  if (Array.isArray(obj)) {
      // Check direct children first
      const directMatch = obj.find(item => item.index === targetIndex);
      if (directMatch) return directMatch;

      // Then check nested children
      for (const item of obj) {
          const result = findByIndex(item, targetIndex);
          if (result) return result;
      }
  }
  // If it's an object, check its values
  else if (typeof obj === 'object' && obj !== null) {
      for (const value of Object.values(obj)) {
          const result = findByIndex(value, targetIndex);
          if (result) return result;
      }
  }

  return null;
}


export function convertToWatts(value, unit) {
  const unitConversions = {
    w: 1,        // Watt
    kw: 1e3,     // Kilowatt
    mw: 1e6,     // Megawatt
    gw: 1e9,     // Gigawatt
    mwatt: 1e-3, // Milliwatt
    uw: 1e-6,    // Microwatt
    nw: 1e-9     // Nanowatt
  };
  const normalizedUnit = unit.toLowerCase().replace(/watt$/i, 'w');
  const factor = unitConversions[normalizedUnit];
  if (factor === undefined) {
    throw new Error(`Unknown watt unit: ${unit}`);
  }
  return value * factor;
}

export function convertToSeconds(value, unit) {
  const unitConversions = {
    s: 1,         // Second
    sec: 1,       // Second (alternative)
    min: 60,      // Minute
    h: 3600,      // Hour
    hr: 3600,     // Hour (alternative)
    day: 86400,   // Day
    ms: 1e-3,     // Millisecond
    µs: 1e-6,     // Microsecond
    us: 1e-6,     // Microsecond (alternative)
    ns: 1e-9      // Nanosecond
  };
  const normalizedUnit = unit.toLowerCase().replace(/second$|sec$|hour$|hr$/i, (match) => {
    return match.startsWith('sec') ? 's' : match.startsWith('hr') ? 'h' : match[0];
  });
  const factor = unitConversions[normalizedUnit];
  if (factor === undefined) {
    throw new Error(`Unknown time unit: ${unit}`);
  }
  return value * factor;
}
