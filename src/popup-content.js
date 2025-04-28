// popup-content.js handles the popup window that will be displayed for the following scenarios
// 1. Phone model carbon emissions
// 2. Freight carbon emissions
// 3. Cloud computing carbon emissions

import { isDomainValid } from "./content";
import { detectPhoneModel } from "./autodetect/phone/phone-utils";
import { getPhoneCarbonData } from "./autodetect/phone/phone-utils";
import { getRecommendedModels } from "./autodetect/phone/phone-utils";
import { getFedexDataChange, observeFedexShippingOptions,
  recordAllInputChange, recordPackageTypeChange, recordFromToAddressChange } from "./autodetect/freight/freight-tracker";
import { getFreightHTMLContent } from "./autodetect/freight/freight-ui";
import { getFreightData } from "./autodetect/freight/freight-utils";
import { handleCO2eEquivalencyChange, hideElement, showElement } from "./utils/ui-utils";
import { getPhoneEmissionsSkeleton, displayPhoneSpecEmissions, displaySideBySideComparison } from "./autodetect/phone/phone-ui";

const LCA_SERVER_URL = "https://lca-server-api.fly.dev";

const lca_48 = chrome.runtime.getURL("../assets/img/lca-48.png");
const sync_icon = chrome.runtime.getURL("../assets/img/sync-icon.png");
const question_icon = chrome.runtime.getURL("../assets/img/question-icon.png");

// masterContainer is the main container that contains the popup content.
export let masterContainer = null;
// floatingMenu is the container that contains the floating menu.
export let floatingMenu = null;
export let shadowRoot = null;

let currentPhoneData;
let currentRecommendedPhones;

let regionText = "Waiting for input....";
let cloudSizeText = "Waiting for input....";
let isYesNoButtonClicked = false;
let durationText = 0;

const popupDomains = [
  "fedex.com",
  "azure.com",
  "amazon.com",
  "bestbuy.com",
  "apple.com",
  "store.google.com",
  "samsung.com",
  "oppo.com",
  "huawei.com",
  "lenovo.com",
];
if (isDomainValid(popupDomains)) {
  if (!window.popupInjected) {
    window.popupInjected = true; // Set global flag
    initialize();
  }
}

// Initializes the popup content.
function initialize() {
  return new Promise((resolve) => {
    setupPopupShadowDOM();
    (async () => {
      const storedStates = await chrome.storage.sync.get("autodetect");
      const isAutoDetectEnabled = storedStates.autodetect || false;
      await loadCSS(chrome.runtime.getURL("../assets/popup-content.css"));
      if (isAutoDetectEnabled) {
        trackFreight();
        await trackPhone();
        trackCloud();
      }
      resolve();
    })();
  });
}

// Invokes popup-content.js's initialization.
export function getMasterContainer() {
  if (!window.popupInjected) {
    window.popupInjected = true;
    return initialize().then(() => {
      return masterContainer;
    });
  } else {
    return Promise.resolve(masterContainer);
  }
}

// Sets up the shadow DOM for the popup content.
export function setupPopupShadowDOM() {
  masterContainer = document.createElement("div");
  masterContainer.setAttribute("role", "main");
  masterContainer.setAttribute("tabindex", "0");
  masterContainer.classList.add("lca-viz-master-lca");
  masterContainer.classList.add("lcz-br-8");
  masterContainer.classList.add("lca-viz-hidden");
  document.body.append(masterContainer);
  const placeholder = document.createElement("div");
  placeholder.setAttribute("id", "placeholder");
  document.body.append(placeholder);
  shadowRoot = placeholder.attachShadow({ mode: "open" });
  shadowRoot.appendChild(masterContainer);
}

// Tracks the phone model and inject the popup content.
async function trackPhone() {
  const pageTitle = document.title;
  const phoneModel = detectPhoneModel(pageTitle);
  // This is the list of domains that we will check for phone model detection.
  const allowedDomains = [
    "amazon.com",
    "bestbuy.com",
    "apple.com",
    "store.google.com",
    "samsung.com",
    "oppo.com",
    "huawei.com",
    "lenovo.com",
  ];
  if (phoneModel && isDomainValid(allowedDomains)) {
    try {
      currentPhoneData = await getPhoneCarbonData(phoneModel);
      currentRecommendedPhones = await getRecommendedModels(currentPhoneData.device);
      await injectPopupContent("phone");
    } catch (error) {
      console.error(error);
    }
  }
}

// Checks if the calculate button is ready to be used
function checkCalculateButtonReady() {
  if (
    checkInputTextValid() &&
    isYesNoButtonClicked &&
    checkIsNumberInputFilled()
  ) {
    shadowRoot
      .querySelector(".lca-viz-calculate-container")
      .classList.remove("disabled");
  } else {
    shadowRoot
      .querySelector(".lca-viz-calculate-container")
      .classList.add("disabled");
  }
}

// Checks if the input text is valid
function checkInputTextValid() {
  return (
    regionText !== "" &&
    cloudSizeText !== "" &&
    regionText !== "Waiting for input...." &&
    cloudSizeText !== "Waiting for input...."
  );
}

// Checks if the number input is filled
function checkIsNumberInputFilled() {
  const numberInputContainer = shadowRoot.querySelector(
    ".lca-viz-number-input-container"
  );
  const numberInput = shadowRoot.getElementById("lca-viz-number-input");
  if (numberInput.value && numberInput.value > 0) {
    return true;
  } else if (numberInputContainer.classList.contains("lca-viz-hidden")) {
    return true;
  }
  return false;
}

// Starts the cloud popup function
async function startCloudPopup() {
  if (regionText !== "" && cloudSizeText !== "") {
    await handleCloudPopup();
    let regionSpan = shadowRoot.getElementById("lca-viz-cloud-region-value");
    let instanceSpan = shadowRoot.getElementById(
      "lca-viz-cloud-instance-value"
    );
    if (regionSpan && instanceSpan) {
      regionSpan.textContent = regionText;
      instanceSpan.textContent = cloudSizeText;
      checkCalculateButtonReady();
    }
  }
}

// Checks if the cloud URL is valid
function checkCloudUrl(callback) {
  const currentHash = window.location.hash;
  if (
    currentHash === "#create/Microsoft.VirtualMachine-ARM" ||
    currentHash === "#create/Microsoft.VirtualMachine"
  ) {
    callback();
  }
}

// Tracks the cloud URL (Microsoft Azureand injects the popup content.
function trackCloud() {
  // Check the URL on initial load and on hash changes
  const allowedDomains = ["azure.com"];
  if (isDomainValid(allowedDomains)) {
    checkCloudUrl(startObservingElements);

    window.navigation.addEventListener("navigate", () => {
      if (
        window.location.href ===
        "https://portal.azure.com/#browse/Microsoft.Compute%2FVirtualMachines"
      ) {
        startObservingElements();
      }
    });
  }
}

// Starts observing the elements for the cloud popup. If the region or size input is found, it will start the cloud popup.
async function startObservingElements() {
  observeElementTextAndClassContent("Region", ["azc-form-label"], (element) => {
    setTimeout(() => {
      const regionInput =
        element?.parentElement?.parentElement?.childNodes?.[1]?.childNodes?.[0]
          ?.childNodes?.[1].childNodes?.[1];
      if (regionInput) {
        regionText = regionInput.textContent.trim();
        observeTextChange(regionInput, async (text) => {
          const size = getElementByTextContent(".azc-form-label", "Size")
            ?.parentElement?.parentElement?.childNodes?.[1]?.childNodes?.[0]
            ?.childNodes?.[1].childNodes?.[1];
          if (size) {
            cloudSizeText = size.textContent.trim();
          }
          regionText = text;
          await startCloudPopup();
        });
      }
    }, 1000);
  });

  // Observes the size input and starts the cloud popup if the size input is found.
  observeElementTextAndClassContent("Size", ["azc-form-label"], (element) => {
    setTimeout(() => {
      const cloudSizeInput =
        element?.parentElement?.parentElement?.childNodes?.[1]?.childNodes?.[0]
          ?.childNodes?.[1].childNodes?.[1];
      if (cloudSizeInput) {
        cloudSizeText = cloudSizeInput.textContent.trim();
        observeTextChange(cloudSizeInput, async (text) => {
          const region = getElementByTextContent(".azc-form-label", "Region")
            ?.parentElement?.parentElement?.childNodes?.[1]?.childNodes?.[0]
            ?.childNodes?.[1].childNodes?.[1];
          if (region) {
            cloudSizeText = region.textContent.trim();
          }
          cloudSizeText = formatInstanceNames(text);
          await startCloudPopup();
        });
      }
    }, 1000);
  });
}

// Gets the element by the text content
function getElementByTextContent(nodeList, matchingText) {
  const nList = document.querySelectorAll(nodeList);
  nList.forEach((element) => {
    if (element.textContent === matchingText) {
      return element;
    }
  });
}

// Injects the cloud popup UI and handles the calculate button and yes/no button behavior
async function handleCloudPopup() {
  if (!shadowRoot.querySelector(".lca-viz-cloud-master-container")) {
    await injectPopupContent("cloud");
    handleCalculateButton();
    handleYesNoButton();
  }
}

// Handles the calculate button behavior for the cloud popup
function handleCalculateButton() {
  const calculateBtn = shadowRoot.querySelector(".lca-viz-calculate-btn");
  const btnText = shadowRoot.querySelector(".lca-viz-calculate-btn-txt");
  let loadingInterval;

  calculateBtn.addEventListener("click", async () => {
    // Start loading animation
    let loadingState = 0;
    loadingInterval = setInterval(() => {
      loadingState = (loadingState + 1) % 4;
      btnText.textContent = "Calculating" + ".".repeat(loadingState);
    }, 500);

    try {
      const cloudData = await getCloudData();
      const data = {
        emissions: cloudData.total_co2e,
        region: regionText,
        instance: cloudSizeText,
        duration: durationText,
      };
      const emissionsResultHTML = getCloudEmissionsResult(data, "cloud");
      displayCloudEmissions(emissionsResultHTML, true);
    } finally {
      // Stop loading animation and reset button text
      clearInterval(loadingInterval);
      btnText.textContent = "Calculate";
    }
  });
}

/**
 *
 * @param {HTMLElement} emissionsResultHTML The HTML content of the carbon emissions
 * @param {Boolean} isCloud Boolean indicating if this scenario is "cloud". If not, it will be for "energy"
 */
export function displayCloudEmissions(emissionsResultHTML, isCloud) {
  if (isCloud)
    shadowRoot
      .querySelector(".lca-viz-cloud-master-container")
      .classList.add("lcz-hidden-a");
  masterContainer.insertAdjacentHTML("beforeend", emissionsResultHTML);
  handleCO2eEquivalencyChange(shadowRoot);
  requestAnimationFrame(async () => {
    shadowRoot
      .querySelector(".lca-viz-cloud-emissions-container")
      .classList.remove("lcz-hidden-a");
    // masterContainer.focus();
    if (!isCloud) await hideCloudLoadingIcon();
    const cloudContent = shadowRoot.querySelector(
      ".lca-viz-cloud-results-info-container"
    );
    showElement(cloudContent, "a");
  });
}

/**
 * Fills in the carbon information for the cloud and energy popup UI.
 * @param {String} scenario Either "cloud" or "energy"
 * @returns The HTML content of the carbon emissions
 */
export function getCloudEmissionsResult(data, scenario) {
  let emissions;
  let deviceProcess, power, energyDuration, durationUnit, location;
  let region, instance, duration;
  let milesDriven;
  let treesOffset;
  if (scenario === "cloud") {
    emissions = data.emissions;
    region = data.region;
    instance = data.instance;
    duration = data.duration;
  } else if (scenario === "energy") {
    emissions = data.emissions;
    deviceProcess = data.device_process;
    power = data.power;
    energyDuration = data.duration;
    durationUnit = data.duration_unit;
    if (durationUnit === "s") durationUnit = "second(s)";
    if (durationUnit === "min") durationUnit = "minute(s)";
    if (durationUnit === "h") durationUnit = "hour(s)";
    location = data.location;
    power = formatToSignificantFigures(power);
    // milesDriven = formatToSignificantFigures(emissions * 2.5);
    // treesOffset = formatToSignificantFigures(emissions * 0.048);
  }
  milesDriven = formatToSignificantFigures(emissions * 2.5);
  treesOffset = formatToSignificantFigures(emissions * 0.048);
  const isLocationNull = !location || location === "";

  let { beefValue, beefUnit } = getBeefInfo(emissions);

  const readableEmissions = getReadableCO2e(emissions);
  const readableCO2e = readableEmissions.co2e_value;
  const readableUnit = readableEmissions.unit;

  const emissionsResultHTML = `
    <div class="lca-viz-cloud-emissions-container lcz-hidden-a">
      <section class="lca-viz-cloud-container lcz-br-8">
        <div class="lca-viz-cloud-results-info-container pd-16 lcz-mt-12 lcz-hidden-a">
          <div class="flex-stretch lca-viz-title-and-question lcz-mt-8">
            <p class="fz-16 lcz-mt-0 lcz-mb-0"><b>Estimated Carbon Footprint of Use</b></p>
            <div class="btn lca-viz-btn-primary lca-viz-tooltip"><img src="${question_icon}" alt="Hover me to get additional information" class="lcz-icon-20" id="lca-viz-q-icon">
              <div class="left">
                ${
                  scenario === "cloud"
                    ? `<h3 class="fz-12 lca-lexend">How we estimate cloud computing emissions</h3>`
                    : `<h3 class="fz-12 lca-lexend">How we estimate the emissions of use</h3>`
                }

                ${
                  scenario === "cloud"
                    ? `<p class="fz-12 lca-lexend">The total carbon footprint of cloud instance usage consists of both operational and embodied emissions. Operational emissions are calculated by multiplying your instance usage by the provider's energy conversion factors and Power Usage Effectiveness (PUE), then applying regional power grid emissions factors. We combine this with embodied emissions, which account for the manufacturing impact of datacenter servers allocated to your compute usage.  This estimation uses Microsoft Sustainability Calculator, Cloud Carbon Footprint, and Climatiq.`
                    : `<p class="fz-12 lca-lexend">The carbon footprint of use is determined based on the device or process's power consumption, usage duration, and the geographical location of use. If no location is specified, the default assumption is the United States.`
                }
                <i></i>
              </div>
            </div>
          </div>


          <div class="flex-center cg-8 fz-16 lcz-mb-12">
            <p>CO2e Equivalency: </p>
            <select id="lca-viz-unit-select" class="lcz-br-4 pd-4">
              <option value="0">Miles driven 🚗</option>
              <option value="1">Trees offset 🌳</option>
              <option value="2">Beef Consumed 🥩</option>
            </select>
          </div>

          ${
            emissions
              ? `<div class="freight-emissions flex-column-center lcz-br-8 rg-12 pd-16">
              <span class="fz-20 co2e-value"><b><span id="lcz-root-emissions">${readableCO2e} ${readableUnit}</span> <span class="fz-12">${
                  scenario === "cloud" ? "(per month)" : ""
                }</span></b></span>

              <div class="lca-viz-unit-container cloud flex-center cg-4">
                <div class="lca-viz-unit-div">
                  <div class="flex-center lca-viz-justify-center cg-8">
                    <p class="lcz-margin-0 lcz-grey-text fz-16 lca-viz-text-align-center">or <span id="lcz-miles">${milesDriven}</span> miles driven by a car &nbsp;🚗</p>
                  </div>
                </div>

                <div class="lca-viz-unit-div">
                  <div class="flex-center lca-viz-justify-center cg-8">
                    <p class="lcz-margin-0 lcz-grey-text fz-16 lca-viz-text-align-center">or <span id="lcz-trees">${treesOffset}</span> trees annually &nbsp;🌳</p>
                  </div>
                </div>

                <div class="lca-viz-unit-div">
                  <div class="flex-center lca-viz-justify-center cg-8">
                    <p class="lcz-margin-0 lcz-grey-text fz-16 lca-viz-text-align-center">or <span id="lcz-beef">${beefValue} ${beefUnit}</span> of beef consumed &nbsp;🥩</p>
                  </div>
                </div>
              </div>
            </div>`
              : `<div class="freight-emissions flex-column-center lcz-br-8 rg-12 pd-16">
              <span class="fz-20 co2e-value"><b>Data unavailable</b></span>
              <div class="flex-center cg-4">
                <span class="trash-value fz-16">Region or instance is not supported.</span>
              </div>
            </div>`
          }

          ${
            scenario === "cloud"
              ? `
              <p class="fz-16 lcz-mb-2"><b>Region:</b> <br>
                <div class="flex-center cg-8">
                  <span id="lca-viz-cloud-region-value" class="fz-12">${region}</span>
                </div>
              </p>
              <p class="fz-16 lcz-mb-2"><b>Server Instance Type:</b> <br>
                <div class="flex-center cg-8">
                  <span id="lca-viz-cloud-instance-value" class="fz-12">${instance}</span>
                </div>
              </p>
              <p class="fz-16 lcz-mb-2"><b>Usage Rate:</b> <br>
                <span class="fz-12">${duration} hours per day</span>
              </p>
            `
              : `
              <p class="fz-16 lcz-mb-2"><b>Device / Process:</b> <br>
                <div class="flex-center cg-8">
                  <span id="" class="fz-12">${deviceProcess}</span>
                </div>
              </p>
              <p class="fz-16 lcz-mb-2"><b>Usage Duration:</b> <br>
                <div class="flex-center cg-8">
                  <span class="fz-12"><span id="lca-viz-e-time-val">${energyDuration}</span> ${durationUnit}</span>
                </div>
              </p>
              ${
                !isLocationNull
                  ? `<p class="fz-16 lcz-mb-2"><b>Location:</b> <br>
                  <span class="fz-12">${location}</span>
                </p>`
                  : ``
              }
              <p class="fz-16 lcz-mb-2"><b>Power:</b> <br>
                <span class="fz-12">${power} W</span>
              </p>
            `
          }
        </div>
        ${
          scenario === "energy"
            ? `<div class="lcz-loading-box-3 flex-center lcz-br-8 pd-16 lcz-mt-12">
            <div class="lcz-loader">
              <div class="lca-viz-circle"></div>
              <div class="lca-viz-circle"></div>
              <div class="lca-viz-circle"></div>
            </div>
          </div>`
            : ``
        }
      </section>
    </div>
  `;
  return emissionsResultHTML;
}

/**
 * Takes in an emissions value and return the appropriate amount of beef consumed.
 * @param {Number} emissions The carbon emissions
 * @returns The equivalent amount of beef consumed in the appropriate unit.
 */
export function getBeefInfo(emissions) {
  let beefValue;
  // let weightObject;
  let beefUnit = "kg";

  let kgBeef;
  kgBeef = emissions * 0.033;
  beefValue = kgBeef;
  if (kgBeef < 0.001) {
    // Convert to milligrams if less than 0.001 kg (1 gram)
    beefValue = kgBeef * 1000000; // 1 kg = 1,000,000 mg
    beefUnit = "mg";
  } else {
    // Convert to grams
    beefValue = kgBeef * 1000; // 1 kg = 1000 g
    beefUnit = "g";
  }
  // console.log('beefValue before formatting: ' + beefValue);
  beefValue = formatToSignificantFigures(beefValue);
  // console.log('beefValue = ' + beefValue + ', beefUnit = ' + beefUnit);
  return { beefValue, beefUnit };
}

// Fetches the cloud emissions data from the server.
async function getCloudData() {
  const region = formatRegionNames(regionText);
  const instance = cloudSizeText.toLowerCase();
  // multiply by 30 because we want the monthly usage (30 days)
  const duration = parseInt(durationText) * 30;
  const data = {
    region: region,
    instance: instance,
    duration: duration,
    duration_unit: "h",
  };
  if (region && instance && duration) {
    const response = await fetch(LCA_SERVER_URL + "/api/cloud", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    let responseData;
    if (!response.ok) {
      responseData = "";
    } else {
      responseData = await response.json();
    }
    return responseData;
  }
}

// Handles the yes/no button behavior for the cloud popup
function handleYesNoButton() {
  let yesButton = shadowRoot.querySelector(".lca-viz-yes-button");
  let noButton = shadowRoot.querySelector(".lca-viz-no-button");
  yesButton.addEventListener("click", () => {
    noButton.classList.remove("selected");
    yesButton.classList.add("selected");
    isYesNoButtonClicked = true;
    shadowRoot
      .querySelector(".lca-viz-number-input-container")
      .classList.add("lca-viz-hidden");
    durationText = 24;
    checkCalculateButtonReady();
  });
  noButton.addEventListener("click", () => {
    yesButton.classList.remove("selected");
    noButton.classList.add("selected");
    isYesNoButtonClicked = true;
    shadowRoot
      .querySelector(".lca-viz-number-input-container")
      .classList.remove("lca-viz-hidden");
    checkCalculateButtonReady();

    const numberInput = shadowRoot.getElementById("lca-viz-number-input");
    numberInput.addEventListener("input", () => {
      durationText = numberInput.value;
      checkCalculateButtonReady();
    });
  });
}

// Fetches and injects CSS into the shadow DOM
async function loadCSS(url) {
  const response = await fetch(url);
  const cssText = await response.text();
  const style = document.createElement("style");
  style.textContent = cssText;
  shadowRoot.appendChild(style);
}

// Sets up the LCA banner and floating menu
export function setupLCABannerAndFloatingMenu() {
  const lcaBanner = getLCABanner();
  masterContainer.insertAdjacentHTML("beforeend", lcaBanner);
  const lcaFloatingMenu = getLCAFloatingMenu();
  masterContainer.insertAdjacentHTML("beforebegin", lcaFloatingMenu);
  floatingMenu = shadowRoot.getElementById("lca-viz-floating-menu");
  toggleButtonState();
}

// Injects the popup content based on the popup case: phone, freight, cloud
export async function injectPopupContent(
  popupCase,
  freightData = null,
  mContainer = null,
  sRoot = null
) {
  const lcaBanner = getLCABanner();

  if (!masterContainer) masterContainer = mContainer;
  if (!shadowRoot) shadowRoot = sRoot;

  masterContainer.insertAdjacentHTML("beforeend", lcaBanner);
  const lcaFloatingMenu = getLCAFloatingMenu();
  masterContainer.insertAdjacentHTML("beforebegin", lcaFloatingMenu);
  floatingMenu = shadowRoot.getElementById("lca-viz-floating-menu");
  toggleButtonState();

  if (popupCase === "phone") {
    const phoneSkeletonHTML = getPhoneEmissionsSkeleton();
    masterContainer.insertAdjacentHTML("beforeend", phoneSkeletonHTML);
    // Delay the execution of showPhoneEmissions to ensure DOM elements are available
    setTimeout(async () => {
      masterContainer.classList.remove("lca-viz-hidden");
      await showPhoneEmissions();
    }, 0);
  } else if (popupCase === "freight") {
    const freightContent = getFreightHTMLContent(freightData.formatted);
    masterContainer.insertAdjacentHTML("beforeend", freightContent);
    setTimeout(() => {
      handleCO2eEquivalencyChange(shadowRoot);
      masterContainer.classList.remove("lca-viz-hidden");
      showFreightHTMLContent();
    }, 0);
    await loadGoogleMaps(freightData.originalAir, freightData.originalGround);
  } else if (popupCase === "cloud") {
    const cloudSkeletonHTML = getCloudEmissionsSkeleton();
    masterContainer.insertAdjacentHTML("beforeend", cloudSkeletonHTML);
    setTimeout(() => {
      masterContainer.classList.remove("lca-viz-hidden");
      showCloudEmissions();
    }, 0);
  }
}

// Returns the HTML code for the floating menu
function getLCAFloatingMenu() {
  const floatingMenu = `
    <div class="flex-center lca-viz-floating-lca-menu pd-12 lcz-br-8 lcz-hidden-b" id="lca-viz-floating-menu">
      <img src="${lca_48}" alt="LCA Image" class="floating-lca-img lcz-icon-24">
    </div>
  `;
  return floatingMenu;
}

// Handles the behavior of opening and closing the lca-extension window.
function toggleButtonState() {
  console.log("toggle button state");
  const closeContainer = shadowRoot.querySelector(".lca-viz-close-container");
  const openContainer = shadowRoot.getElementById("lca-viz-floating-menu");
  closeContainer.addEventListener("click", () => {
    hideElement(masterContainer, "b");
    showElement(openContainer, "b");
  });
  openContainer.addEventListener("click", () => {
    hideElement(openContainer, "b");
    showElement(masterContainer, "b");
  });
}

// Hides the popup
export function hidePopup() {
  floatingMenu.remove();
}

// Shows the master container
export function showMasterContainer() {
  if (masterContainer) {
    // masterContainer should only be using hidden-b, but I'm safeguarding this in case.
    masterContainer.classList.remove("lca-viz-hidden");
    masterContainer.classList.remove("lcz-hidden-a");

    masterContainer.classList.remove("lcz-hidden-b");
    // showElement(masterContainer, "b");
    masterContainer.addEventListener("transitionend", { once: true });
  }
}

// Hides and clears the master container
export function hideAndClearMasterContainer() {
  if (masterContainer) {
    masterContainer.classList.add("lcz-hidden-b");
    masterContainer.addEventListener("transitionend", clearMasterContainer, {
      once: true,
    });
  }
}

// Clears the content inside the master container
export function clearMasterContainer() {
  if (masterContainer) masterContainer.replaceChildren();
}

/**
 * @returns {HTMLElement} the HTML code for LCA Banner
 */
function getLCABanner() {
  const lcaBanner = `
    <section class="lca-banner flex-stretch">
      <div class="flex-center title-container lcz-br-8 pd-12">
        <img src="${lca_48}" alt="LCA Image" class="lcz-icon-20">
        <p class="title-text fz-20 eco-bold lca-viz-text-align-center"><b>Living Sustainability</b></p>
      </div>
      <div class="flex-center lca-viz-close-container lcz-br-8 pd-16">
        <svg class="lcz-icon-20" width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </section>
  `;
  return lcaBanner;
}

// Returns the HTML code for the cloud emissions skeleton
function getCloudEmissionsSkeleton() {
  const cloudEmissionsSkeleton = `
    <div class="lca-viz-cloud-master-container lcz-hidden-a">
      <section class="lca-viz-cloud-container lcz-br-8">
        <div class="lcz-loading-box-3 flex-center lcz-br-8 pd-16 lcz-mt-12">
          <div class="lcz-loader">
            <div class="lca-viz-circle"></div>
            <div class="lca-viz-circle"></div>
            <div class="lca-viz-circle"></div>
          </div>
        </div>
        <div class="lca-viz-cloud-info-container pd-16 lcz-mt-12 lcz-hidden-a">
          <p class="fz-20 lcz-margin-0"><b>Cloud Instance Carbon Emissions</b></p>
          <p class="fz-16 lcz-mb-2"><b>Region:</b> <br>
            <div class="flex-center cg-8">
              <span id="lca-viz-cloud-region-value" class="fz-12">${regionText}</span>
              <img src="${sync_icon}" alt="Sync icon" class="lcz-icon-16">
            </div>
          </p>
          <p class="fz-16 lcz-mb-2"><b>Server Instance Type:</b> <br>
            <div class="flex-center cg-8">
              <span id="lca-viz-cloud-instance-value" class="fz-12">${cloudSizeText}</span>
              <img src="${sync_icon}" alt="Sync icon" class="lcz-icon-16">
            </div>
          </p>
          <p class="fz-16 lcz-mb-8"><b>Usage Duration:</b> <br>
            <span id="lca-viz-cloud-usage-value" class="fz-12">Will your server instance be operating 24/7?</span>
            <span class="lca-viz-asterisk">*</span>
          </p>
          <div class="lca-viz-yes-no-container fz-12 lcz-br-8">
            <div class="lca-viz-yes-button">Yes</div>
            <div class="lca-viz-no-button">No</div>
          </div>
          <div class="lca-viz-number-input-container lca-viz-hidden">
            <label for="quantity"><p class="fz-12">How long will your server instance be operating per day? <span class="lca-viz-asterisk">*</span></p></label>
            <input type="number" id="lca-viz-number-input" class="fz-12 lcz-br-8" name="quantity" min="1" max="24"> &nbsp;<span class="fz-12">hours a day</span>
          </div>
          <br>
          <div class="lca-viz-calculate-container disabled lcz-br-8 pd-4">
            <div class="flex-center lca-viz-calculate-btn">
              <p class="fz-16 lcz-margin-8 lca-viz-calculate-btn-txt">Calculate</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
  return cloudEmissionsSkeleton;
}


// Displays the UI for the phone emissions
async function showPhoneEmissions() {
  shadowRoot.querySelector(".phone-container").classList.remove("lcz-hidden-a");
  await hidePhoneLoadingIcon();
  const phoneSpecContainer = shadowRoot.querySelector(".phone-spec-container");
  const comparePhone = shadowRoot.querySelector(".compare-phone");
  showElement(phoneSpecContainer, "a");
  comparePhone.classList.remove("lcz-hidden-a");
  masterContainer.focus();
  displayPhoneSpecEmissions(currentPhoneData, shadowRoot);
  await handlePhoneCompare();
  // handlePhoneSearch();
}

// Displays the UI for the freight emissions
async function showFreightHTMLContent() {
  shadowRoot.querySelector(".freight-container").classList.remove("lcz-hidden-a");
  masterContainer.focus();
  await hideFreightLoadingIcon();
  const freightContent = shadowRoot.querySelector(".freight-content");
  showElement(freightContent, "a");
}

// Displays the UI for the cloud emissions
async function showCloudEmissions() {
  shadowRoot
    .querySelector(".lca-viz-cloud-master-container")
    .classList.remove("lcz-hidden-a");
  masterContainer.focus();
  await hideCloudLoadingIcon();
  const cloudContent = shadowRoot.querySelector(
    ".lca-viz-cloud-info-container"
  );
  showElement(cloudContent, "a");
}

/**
 * Converts a CO2e value in kilograms to a more readable format using grams,
 * kilograms, or tons, as appropriate.
 * @param {number} kgCO2e - The CO2e value in kilograms.
 * @returns {{co2e_value: number, unit: string}} An object containing the
 * converted CO2e value and its corresponding unit (g CO2e, kg CO2e, or t CO2e).
 * e.g. getReadableCO2e(0.0011972) returns { co2e_value: 1.2, unit: 'g CO2e' }
 */
export function getReadableCO2e(kgCO2e) {
  if (kgCO2e < 1.0) {
    const grams = parseFloat((kgCO2e * 1000).toFixed(2));
    return { co2e_value: grams, unit: "g CO2e" };
  } else if (kgCO2e >= 1000) {
    const tons = parseFloat((kgCO2e / 1000).toFixed(2));
    return { co2e_value: tons, unit: "t CO2e" };
  } else {
    const kilograms = parseFloat(kgCO2e.toFixed(2));
    return { co2e_value: kilograms, unit: "kg CO2e" };
  }
}

/**
 * Formats a number to a specified number of significant figures, rounding
 * appropriately. It handles both very small and regular-sized numbers.
 *
 * @param {number} num - The number to format.
 * @param {number} [significantFigures=2] - The desired number of significant figures.
 * @returns {string} The formatted number as a string.
 */
export function formatToSignificantFigures(num, significantFigures = 2) {
  if (num === 0) {
    return "0"; // Handle zero separately
  }
  const magnitude = Math.floor(Math.log10(Math.abs(num)));
  const roundingFactor = Math.pow(10, magnitude - significantFigures + 1);
  const roundedNum = Math.round(num / roundingFactor) * roundingFactor;
  const decimalPlaces = Math.max(0, significantFigures - magnitude - 1);
  return roundedNum.toFixed(decimalPlaces);
}

// Updates the content of the freight UI
export async function updateFreightContent(freightData) {
  const freightContainer = shadowRoot.querySelector(".freight-container");
  const lcaBanner = shadowRoot.querySelector(".lca-banner");
  if (freightContainer) {
    lcaBanner.remove();
    freightContainer.remove();
    await injectPopupContent("freight", freightData);
  }
}

// Tracks the current web page the extension is on to see if they are 'eligible' for displaying freight emissions
function trackFreight() {
  let allowedDomains = ["fedex.com"];
  if (isDomainValid(allowedDomains)) {
    // observeFedexBtn();
    observeFedexShippingOptions(() => {
      handleFedexDataChange();
      recordAllInputChange();
      recordPackageTypeChange();
      recordFromToAddressChange();
    });
  }
}

/**
 * Observes if an element contains certain .textContent and classList properties
 * @param {String} matchingText The matching text. For example, "Size" or "Region"
 * @param {Array} matchingClassesArr The array containing the matching classes. For example, ["azc-form-label"];
 * @param {callback} callback
 */
function observeElementTextAndClassContent(
  matchingText,
  matchingClassesArr,
  callback
) {
  const observer = new MutationObserver((mutationsList, observer) => {
    mutationsList.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if it's an element
            if (
              node.textContent.includes(matchingText) &&
              matchingClassesArr.some((className) =>
                node.classList.contains(className)
              )
            ) {
              callback(node);
              observer.disconnect(); // Stop observing once a match is found
            }
          }
        });
      }
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// Observes the text change of the element
function observeTextChange(element, callback) {
  const observer = new MutationObserver(() => {
    const textContent = element.textContent.trim();
    callback(textContent);
  });
  observer.observe(element, { childList: true, subtree: true });
}

// Observes the change of the shipping options
export function observeAndStoreShippingOptions() {
  observeFedexShippingOptions(() => {
    console.log(
      "*****************OBSERVE FEDEX SHIPPING OPTIONS*****************"
    );
    handleFedexDataChange();
  });
}

// Handles the change of the shipping options
async function handleFedexDataChange() {
  let {fromAddress, toAddress, packageCount, packageWeight, currShippingOptions} = getFedexDataChange();
  const totalWeight = packageWeight * packageCount;
  const freightData = await getFreightData(
    fromAddress,
    toAddress,
    totalWeight,
    currShippingOptions
  );
  console.log("freightData: ", freightData);
  if (shadowRoot.querySelector(".freight-container") !== null) {
    console.log("updating freight content popup.....");
    await updateFreightContent(freightData);
  } else {
    console.log("injecting freight content popup.....");
    await injectPopupContent("freight", freightData);
  }
  currShippingOptions = [];
}


// Loads the Google maps
async function loadGoogleMaps(freightAirData, freightGroundData) {
  if (freightAirData) {
    await sendGoogleMapsData(freightAirData, "air", () => {
      injectGoogleMaps("air");
    });
  }
  if (freightGroundData) {
    await sendGoogleMapsData(freightGroundData, "ground", () => {
      injectGoogleMaps("ground");
    });
  }
}

// Sends the Google maps data to the server
async function sendGoogleMapsData(data, mode, callback) {
  let POST_URL = "";
  if (mode === "air") {
    POST_URL = "/post-google-maps-air";
  }
  if (mode === "ground") {
    POST_URL = "/post-google-maps-ground";
  }
  const response = await fetch(LCA_SERVER_URL + POST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (response.ok) {
    console.log("Data sent successfully");
    callback();
  } else {
    console.error("Failed to send data");
  }
}

// Injects the Google maps into the maps container
function injectGoogleMaps(mode) {
  const iframe = document.createElement("iframe");
  let mapsContainer;
  if (mode === "air") {
    console.log("INJECTING AIR MAP");
    iframe.src = "https://lca-server-api.fly.dev/air-map.html"; // URL of the hosted iframe
    iframe.id = "lca-viz-air-map";
    mapsContainer = shadowRoot.querySelector(".lca-viz-google-maps-air");
  }
  if (mode === "ground") {
    iframe.src = "https://lca-server-api.fly.dev/ground-map.html"; // URL of the hosted iframe
    iframe.id = "lca-viz-ground-map";
    console.log("INJECTING GROUND MAP");
    mapsContainer = shadowRoot.querySelector(".lca-viz-google-maps-ground");
  }

  iframe.style.width = "350px";
  iframe.style.height = "170px";
  iframe.style.border = "none";
  iframe.style.overflow = "hidden";
  iframe.scrolling = "no";

  mapsContainer.appendChild(iframe);
}

// Handles the interaction of the phone comparison, including the compare and close button
async function handlePhoneCompare() {
  await populatePhoneModel();

  // For the new 2 recommended phone models
  const competitorNodeList = shadowRoot.querySelectorAll(".lca-viz-competitor-phone");
  const competitorSection = shadowRoot.querySelector(".lca-viz-competitor-section");

  competitorNodeList.forEach((phone) => {
    phone.addEventListener("click", () => {
      const phoneId = parseInt(phone.id);

      console.log("phone Id = " + phoneId);
      competitorSection.classList.add("lcz-hidden-a");
      console.log('currentPhoneData before passing on to phone-utils: ', currentPhoneData);
      displaySideBySideComparison(phoneId, currentPhoneData, currentRecommendedPhones, shadowRoot);
    });
  });
}

/**
 * Populates the phone model that can be used for side-by-side emissions comparison
 */
async function populatePhoneModel() {
  // const phoneModel = await getRecommendedModels(currentPhoneData.device);
  const phoneModel = currentRecommendedPhones;

  const phoneCompetitorContainer = shadowRoot.querySelector(
    ".lca-viz-competitor-container"
  );
  phoneCompetitorContainer.innerHTML = "";
  phoneModel.forEach((phone) => {
    const phoneElement = `
      <div class="lca-viz-competitor-phone lcz-br-8" id="${phone.index}">
        <p class="fz-16">${phone.device}</p>
      </div>
    `;
    phoneCompetitorContainer.innerHTML += phoneElement;
  });
}

// Use this function to display a loading animation while waiting for the API calls
export async function hideLoadingIcon(boxNumber = "") {
  const boxClass = boxNumber ? `lcz-loading-box-${boxNumber}` : "lcz-loading-box";
  let loadingBox = shadowRoot.querySelector(`.${boxClass}`);
  if (loadingBox) {
    return new Promise((resolve) => {
      setTimeout(() => {
        loadingBox.classList.add("lcz-hidden-a");
        resolve();
      }, 1500);
    });
  } else {
    console.error(`${boxClass} not found`);
    return Promise.resolve();
  }
}

// Export aliases for backward compatibility
export const hidePhoneLoadingIcon = () => hideLoadingIcon();
export const hideFreightLoadingIcon = () => hideLoadingIcon("2");
export const hideCloudLoadingIcon = () => hideLoadingIcon("3");

// Formats the instance names for the cloud emissions
function formatInstanceNames(input) {
  // Remove the "Standard" prefix
  let instanceName = input.replace(/^Standard_/, "");
  // Keep only the part before the first space (which is the instance name)
  instanceName = instanceName.split(" ")[0];
  // Replace any "-" with "_"
  instanceName = instanceName.replace(/-/g, "_");
  return instanceName;
}

function formatRegionNames(input) {
  // Remove the part within parentheses (e.g., "(US)")
  let regionName = input.replace(/\(.*?\)\s*/, "");
  // Convert to lowercase
  regionName = regionName.toLowerCase();
  // Replace spaces with underscores
  regionName = regionName.replace(/\s+/g, "_");
  return regionName;
}




