
// popup-content.js handles the popup window that will be displayed for the following scenarios
// 1. Phone model carbon emissions
// 2. Freight carbon emissions
// 3. Cloud computing carbon emissions

import { isDomainValid } from "./content";
import { detectPhoneModel } from "./phone-utils";
import { getPhoneCarbonData } from "./phone-utils";
import { getRecommendedModels } from "./phone-utils";

const LCA_SERVER_URL = "https://lca-server-api.fly.dev";

const lca_48 = chrome.runtime.getURL("../assets/img/lca-48.png");
const plus_square_icon = chrome.runtime.getURL("../assets/img/plus-square-icon.png");
const red_trash_icon = chrome.runtime.getURL("../assets/img/red-trash-icon.png");
const most_green_icon = chrome.runtime.getURL("../assets/img/most-green-icon.png");
const equivalent_icon = chrome.runtime.getURL("../assets/img/equivalent-icon.png");
const airplane_icon = chrome.runtime.getURL("../assets/img/airplane-icon.png");
const truck_icon = chrome.runtime.getURL("../assets/img/truck-icon.png");
const sync_icon = chrome.runtime.getURL("../assets/img/sync-icon.png");
const question_icon = chrome.runtime.getURL("../assets/img/question-icon.png");

// Setting up the master container and attaching the css
const masterContainer = document.createElement("div");
masterContainer.setAttribute("role", "main");
masterContainer.setAttribute("tabindex", "0");
masterContainer.classList.add("master-lca");
masterContainer.classList.add("br-8");
masterContainer.classList.add("hidden");
document.body.append(masterContainer);

const placeholder = document.createElement("div");
placeholder.setAttribute("id", "placeholder");
document.body.append(placeholder);

const shadowRoot = placeholder.attachShadow({ mode: "open" });
shadowRoot.appendChild(masterContainer);

let currentPhoneData;
let currentRecommendedPhones;

let regionText = "Waiting for input....";
let cloudSizeText = "Waiting for input....";
let isYesNoButtonClicked = false;
let durationText = 0;

init();

function init() {
  // Initialize the process
  initialize();

  async function initialize() {
    await loadCSS(chrome.runtime.getURL("../assets/popup-content.css"));

    trackFreight();
    await trackPhone();
    trackCloud();
  }

  async function trackPhone() {
    // Example usage
    const pageTitle = document.title;
    const phoneModel = detectPhoneModel(pageTitle);
    const allowedDomains = ["amazon.com", "bestbuy.com", "apple.com", "store.google.com", "samsung.com", "oppo.com", "huawei.com", "lenovo.com"];
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
    console.log('checkCalculateButtonReady called');
    if (checkInputTextValid() && isYesNoButtonClicked && checkIsNumberInputFilled()) {
      shadowRoot.querySelector('.lca-viz-calculate-container').classList.remove('disabled');
    } else {
      shadowRoot.querySelector('.lca-viz-calculate-container').classList.add('disabled');
    }
  }

  function checkInputTextValid() {
    return regionText !== "" && cloudSizeText !== "" && regionText !== "Waiting for input...." && cloudSizeText !== "Waiting for input....";
  }

  function checkIsNumberInputFilled() {
    const numberInputContainer = shadowRoot.querySelector('.lca-viz-number-input-container');
    const numberInput = shadowRoot.getElementById('lca-viz-number-input');
    if (numberInput.value && numberInput.value > 0) {
      console.log('numberInput has a value: ', numberInput.value);
      return true;
    } else if (numberInputContainer.classList.contains('hidden')) {
      return true;
    }
    return false;
  }

  async function startCloudPopup() {
    if (regionText !== "" && cloudSizeText !== "") {
      await handleCloudPopup();
      let regionSpan = shadowRoot.getElementById('lca-viz-cloud-region-value');
      let instanceSpan = shadowRoot.getElementById('lca-viz-cloud-instance-value');
      if (regionSpan && instanceSpan) {
        regionSpan.textContent = regionText;
        instanceSpan.textContent = cloudSizeText;
        checkCalculateButtonReady();
      } else {
        console.log('region and instance span not found..');
      }
    }
  }


  function checkCloudUrl(callback) {
    const currentHash = window.location.hash;
    if (currentHash === '#create/Microsoft.VirtualMachine-ARM' ||
      currentHash === '#create/Microsoft.VirtualMachine'
    ) {
      console.log('on create virtual machine page');
      console.log('currentHash: ', currentHash);
      callback();
    } else {
      console.log('not on create virtual machine page');
      console.log('currentHash: ', currentHash);
    }
  }

  function trackCloud() {
    // Check the URL on initial load and on hash changes
    const allowedDomains = ["azure.com"];
    if (isDomainValid(allowedDomains)) {
      checkCloudUrl(startObservingElements);

      window.navigation.addEventListener("navigate", () => {
        if (window.location.href === 'https://portal.azure.com/#browse/Microsoft.Compute%2FVirtualMachines') {
          console.log('navigation change to virtual machine page detected');
          startObservingElements();
        } else {
          console.log('no navigation change to virtual machine detected');
        }
      });
    }
  }

  async function startObservingElements() {
    observeElementTextAndClassContent('Region', ["azc-form-label"], (element) => {
      setTimeout(() => {
        const regionInput = element?.parentElement?.parentElement?.childNodes?.[1]?.childNodes?.[0]?.childNodes?.[1].childNodes?.[1];
        if (regionInput) {
          regionText = regionInput.textContent.trim();
          observeTextChange(regionInput, async (text) => {
            const size = getElementByTextContent(".azc-form-label", "Size")?.parentElement?.parentElement?.childNodes?.[1]?.childNodes?.[0]?.childNodes?.[1].childNodes?.[1];
            if (size) {
              cloudSizeText = size.textContent.trim();
            }
            regionText = text;
            await startCloudPopup();
          });
        }
      }, 1000);
    });

    observeElementTextAndClassContent('Size', ["azc-form-label"], (element) => {
      setTimeout(() => {
        const cloudSizeInput = element?.parentElement?.parentElement?.childNodes?.[1]?.childNodes?.[0]?.childNodes?.[1].childNodes?.[1];
        if (cloudSizeInput) {
          cloudSizeText = cloudSizeInput.textContent.trim();
          observeTextChange(cloudSizeInput, async (text) => {
            const region = getElementByTextContent(".azc-form-label", "Region")?.parentElement?.parentElement?.childNodes?.[1]?.childNodes?.[0]?.childNodes?.[1].childNodes?.[1];
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

  function getElementByTextContent(nodeList, matchingText) {
    const nList = document.querySelectorAll(nodeList);
    nList.forEach((element) => {
      if (element.textContent === matchingText) {
        return element;
      }
    });
  }

  async function handleCloudPopup() {
    if (!shadowRoot.querySelector('.lca-viz-cloud-master-container')) {
      await injectPopupContent("cloud");
      handleCalculateButton();
      handleYesNoButton();
    }
  }

  function handleCalculateButton() {
    const calculateBtn = shadowRoot.querySelector('.lca-viz-calculate-btn');
    const btnText = shadowRoot.querySelector('.lca-viz-calculate-btn-txt');
    let loadingInterval;

    calculateBtn.addEventListener('click', async() => {
      // Start loading animation
      let loadingState = 0;
      loadingInterval = setInterval(() => {
        loadingState = (loadingState + 1) % 4;
        btnText.textContent = 'Calculating' + '.'.repeat(loadingState);
      }, 500);

      try {
        const cloudData = await getCloudData();
        const data = {
          emissions: cloudData.total_co2e,
          region: regionText,
          instance: cloudSizeText,
          duration: durationText
        }
        const emissionsResultHTML = getCloudEmissionsResult(data);
        shadowRoot.querySelector('.lca-viz-cloud-master-container').classList.add('hidden-a');
        masterContainer.insertAdjacentHTML("beforeend", emissionsResultHTML);
        handleCO2eEquivalencyChange();
        requestAnimationFrame(async() => {
          shadowRoot.querySelector('.lca-viz-cloud-emissions-container').classList.remove('hidden-a');
          const cloudContent = shadowRoot.querySelector(".lca-viz-cloud-results-info-container");
          showElement(cloudContent, "a");
        });
      } finally {
        // Stop loading animation and reset button text
        clearInterval(loadingInterval);
        btnText.textContent = 'Calculate';
      }
    });
  }

  function getCloudEmissionsResult(data) {
    let cloudEmissions = data.emissions;
    const region = data.region;
    const instance = data.instance;
    const duration = data.duration;

    let beefValue;
    let weightObject;
    let beefUnit;
    if (cloudEmissions) {
      beefValue = cloudEmissions * 0.033;
      weightObject = getReadableUnit(beefValue);
      beefValue = weightObject.weight;
      beefUnit = weightObject.unit;
    }

    const emissionsResultHTML = `
      <div class="lca-viz-cloud-emissions-container hidden-a">
        <section class="lca-viz-cloud-container br-8">
          <div class="lca-viz-cloud-results-info-container pd-16 mt-12 hidden-a">

            <div class="flex-stretch lca-viz-title-and-question mt-8">
              <p class="fz-16 mt-0 mb-0"><b>Your cloud instance's estimated carbon emissions:</b></p>
              <div class="btn btn-primary lca-viz-tooltip"><img src="${question_icon}" alt="Hover me to get additional information" class="icon-20" id="lca-viz-q-icon">
                <div class="left">
                  <h3 class="fz-12 lca-lexend">How are cloud instance emissions calculated?</h3>
                  <p class="fz-12 lca-lexend">We are using Climatiq's Cloud Computing Services, which provides emissions metrics for services like Amazon Web Services (AWS), Microsoft Azure, and Google Cloud Platform (GCP).
                  <i></i>
                </div>
              </div>
            </div>


            <div class="flex-center cg-8 fz-16 mb-12">
              <p>CO2e Equivalency: </p>
              <select id="lca-viz-unit-select" class="br-4 pd-4">
                <option value="0">Miles driven 🚗</option>
                <option value="1">Trees offset 🌳</option>
                <option value="2">Beef Consumed 🥩</option>
              </select>
            </div>

            ${cloudEmissions ?
              `<div class="freight-emissions flex-column-center br-8 rg-12 pd-16">
                <span class="fz-20 freight-co2e-value"><b>${cloudEmissions.toFixed(3)} kg CO2e <span class="fz-12">(per month)</span></b></span>

                <div class="lca-viz-unit-container cloud flex-center cg-4">
                  <div class="lca-viz-unit-div">
                    <div class="flex-center lca-viz-justify-center cg-8">
                      <p class="margin-0 grey-text fz-16 lca-viz-text-align-center">or ${(cloudEmissions * 2.5).toFixed(2)} miles driven by a car &nbsp;🚗</p>
                    </div>
                  </div>

                  <div class="lca-viz-unit-div">
                    <div class="flex-center lca-viz-justify-center cg-8">
                      <p class="margin-0 grey-text fz-16 lca-viz-text-align-center">or ${(cloudEmissions * 0.048).toFixed(3)} trees annually &nbsp;🌳</p>
                    </div>
                  </div>

                  <div class="lca-viz-unit-div">
                    <div class="flex-center lca-viz-justify-center cg-8">
                      <p class="margin-0 grey-text fz-16 lca-viz-text-align-center">or ${(beefValue)} ${beefUnit} of beef consumed &nbsp;🥩</p>
                    </div>
                  </div>
                </div>
              </div>`
              :
              `<div class="freight-emissions flex-column-center br-8 rg-12 pd-16">
                <span class="fz-20 freight-co2e-value"><b>Data unavailable</b></span>
                <div class="flex-center cg-4">
                  <span class="trash-value fz-16">Region or instance is not supported.</span>
                </div>
              </div>`
            }

            <p class="fz-16 mb-2"><b>Region:</b> <br>
              <div class="flex-center cg-8">
                <span id="lca-viz-cloud-region-value" class="fz-12">${region}</span>
              </div>
            </p>
            <p class="fz-16 mb-2"><b>Server Instance Type:</b> <br>
              <div class="flex-center cg-8">
                <span id="lca-viz-cloud-instance-value" class="fz-12">${instance}</span>
              </div>
            </p>
            <p class="fz-16 mb-2"><b>Usage Duration:</b> <br>
              <span class="fz-12">${duration} hours per day</span>
            </p>
          </div>
        </section>
      </div>
    `;
    return emissionsResultHTML;
  }

  async function getCloudData() {
    const region = formatRegionNames(regionText);
    const instance = cloudSizeText.toLowerCase();
    const duration = parseInt(durationText);
    const data = {
      "region": region,
      "instance": instance,
      "duration": parseInt(durationText),
      "duration_unit": "h"
    }
    if (region && instance && duration) {
      const response = await fetch(LCA_SERVER_URL + '/api/cloud', {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      let responseData;
      if (!response.ok) {
        responseData = '';
      } else {
        responseData = await response.json();
      }
      return responseData;
    }
  }

  function handleYesNoButton() {
    let yesButton = shadowRoot.querySelector('.lca-viz-yes-button');
    let noButton = shadowRoot.querySelector('.lca-viz-no-button');
    yesButton.addEventListener('click', () => {
      noButton.classList.remove('selected');
      yesButton.classList.add('selected');
      isYesNoButtonClicked = true;
      shadowRoot.querySelector('.lca-viz-number-input-container').classList.add('hidden');
      durationText = 24;
      checkCalculateButtonReady();
    });
    noButton.addEventListener('click', () => {
      yesButton.classList.remove('selected');
      noButton.classList.add('selected');
      isYesNoButtonClicked = true;
      shadowRoot.querySelector('.lca-viz-number-input-container').classList.remove('hidden');
      checkCalculateButtonReady();

      const numberInput = shadowRoot.getElementById('lca-viz-number-input');
      numberInput.addEventListener('input', () => {
        durationText = numberInput.value;
        checkCalculateButtonReady();
      })
    });
  }

  // Function to fetch and inject CSS into the shadow DOM
  async function loadCSS(url) {
    const response = await fetch(url);
    const cssText = await response.text();
    const style = document.createElement("style");
    style.textContent = cssText;
    shadowRoot.appendChild(style);
  }

  // 3 popup cases: phone, freight, cloud
  async function injectPopupContent(popupCase, freightData) {
    const lcaBanner = getLCABanner();
    masterContainer.insertAdjacentHTML("beforeend", lcaBanner);
    const lcaFloatingMenu = getLCAFloatingMenu();
    masterContainer.insertAdjacentHTML("beforebegin", lcaFloatingMenu);

    toggleButtonState();

    if (popupCase === "phone") {
      const phoneSkeletonHTML = getPhoneEmissionsSkeleton();
      masterContainer.insertAdjacentHTML("beforeend", phoneSkeletonHTML);
      // Stop input propogation of the search-phone input. Some websites have their own input behavior. We need to disable them.
      stopInputPropogation(shadowRoot.getElementById("search-phone"));
      // Delay the execution of showPhoneEmissions to ensure DOM elements are available
      setTimeout(() => {
        masterContainer.classList.remove("hidden");
        showPhoneEmissions();
      }, 0);
    } else if (popupCase === "freight") {
      const freightContent = injectFreightHTMLContent(freightData.formatted);
      masterContainer.insertAdjacentHTML("beforeend", freightContent);
      setTimeout(() => {
        handleCO2eEquivalencyChange();
        masterContainer.classList.remove("hidden");
        showFreightHTMLContent();
      }, 0);
      await loadGoogleMaps(freightData.originalAir, freightData.originalGround);
    } else if (popupCase === "cloud") {
      const cloudSkeletonHTML = getCloudEmissionsSkeleton();
      masterContainer.insertAdjacentHTML("beforeend", cloudSkeletonHTML);
      setTimeout(() => {
        masterContainer.classList.remove("hidden");
        showCloudEmissions();
      }, 0);
    }
  }

  function stopInputPropogation(input) {
    input.addEventListener("keydown", (event) => {
      event.stopPropagation();
    });
    input.addEventListener("keyup", (event) => {
      event.stopPropagation();
    });
    input.addEventListener("keypress", (event) => {
      event.stopPropagation();
    });
  }

  function getLCAFloatingMenu() {
    const floatingMenu = `
      <div class="flex-center floating-lca-menu pd-12 br-8 hidden-b">
        <img src="${lca_48}" alt="LCA Image" class="floating-lca-img icon-24">
      </div>
    `;
    return floatingMenu;
  }

  // Handles the behavior of opening and closing the lca-extension window.
  function toggleButtonState() {
    const closeContainer = shadowRoot.querySelector(".close-container");
    const openContainer = shadowRoot.querySelector(".floating-lca-menu");
    closeContainer.addEventListener("click", () => {
      hideElement(masterContainer, "b");
      showElement(openContainer, "b");
    });
    openContainer.addEventListener("click", () => {
      hideElement(openContainer, "b");
      showElement(masterContainer, "b");
    });
  }

  /**
   * @returns {HTMLElement} the HTML code for LCA Banner
   */
  function getLCABanner() {
    const lcaBanner = `
      <section class="lca-banner flex-stretch">
        <div class="flex-center title-container br-8 pd-12">
          <img src="${lca_48}" alt="LCA Image" class="icon-20">
          <p class="title-text fz-20 eco-bold"><b>LCA-Viz</b></p>
        </div>
        <div class="flex-center close-container br-8 pd-16">
          <svg class="icon-20" width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </section>
    `;
    return lcaBanner;
  }

  function getCloudEmissionsSkeleton() {
    const cloudEmissionsSkeleton = `
      <div class="lca-viz-cloud-master-container hidden-a">
        <section class="lca-viz-cloud-container br-8">
          <div class="loading-box-3 flex-center br-8 pd-16 mt-12">
            <div class="loader">
              <div class="lca-viz-circle"></div>
              <div class="lca-viz-circle"></div>
              <div class="lca-viz-circle"></div>
            </div>
          </div>
          <div class="lca-viz-cloud-info-container pd-16 mt-12 hidden-a">
            <p class="fz-20 margin-0"><b>Cloud Instance Carbon Emissions</b></p>
            <p class="fz-16 mb-2"><b>Region:</b> <br>
              <div class="flex-center cg-8">
                <span id="lca-viz-cloud-region-value" class="fz-12">${regionText}</span>
                <img src="${sync_icon}" alt="Sync icon" class="icon-16">
              </div>
            </p>
            <p class="fz-16 mb-2"><b>Server Instance Type:</b> <br>
              <div class="flex-center cg-8">
                <span id="lca-viz-cloud-instance-value" class="fz-12">${cloudSizeText}</span>
                <img src="${sync_icon}" alt="Sync icon" class="icon-16">
              </div>
            </p>
            <p class="fz-16 mb-8"><b>Usage Duration:</b> <br>
              <span id="lca-viz-cloud-usage-value" class="fz-12">Will your server instance be operating 24/7?</span>
              <span class="lca-viz-asterisk">*</span>
            </p>
            <div class="lca-viz-yes-no-container fz-12 br-8">
              <div class="lca-viz-yes-button">Yes</div>
              <div class="lca-viz-no-button">No</div>
            </div>
            <div class="lca-viz-number-input-container hidden">
              <label for="quantity"><p class="fz-12">How long will your server instance be operating per day? <span class="lca-viz-asterisk">*</span></p></label>
              <input type="number" id="lca-viz-number-input" class="fz-12 br-8" name="quantity" min="1" max="24"> &nbsp;<span class="fz-12">hours a day</span>
            </div>
            <br>
            <div class="lca-viz-calculate-container disabled br-8 pd-4">
              <div class="flex-center lca-viz-calculate-btn">
                <p class="fz-16 margin-8 lca-viz-calculate-btn-txt">Calculate</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;
    return cloudEmissionsSkeleton;
  }

  /**
   *
   * @returns {HTMLElement} Returns the skeleton code for phone emissions.
   */
  function getPhoneEmissionsSkeleton() {
    const phoneEmissionsSkeleton = `
      <div class="phone-master-container">
        <section class="phone-container br-8 pd-16 mt-12 hidden-a">
          <div class="loading-box flex-center br-8 pd-16 mt-12">
            <div class="loader">
              <div class="lca-viz-circle"></div>
              <div class="lca-viz-circle"></div>
              <div class="lca-viz-circle"></div>
            </div>
          </div>
          <section class="phone-spec-container fz-20 mt-12 hidden-a"></section>
        </section>

        <section class="compare-phone br-8 hidden-a">
          <div class="compare-container br-8 pd-4 lca-viz-hidden">
            <div class="flex-center compare-btn">
              <img src="${plus_square_icon}" class="icon-20">
              <p class="fz-16 margin-8">Compare</p>
            </div>
          </div>
          <div class="select-phone-container br-8 pd-16 slide-content lca-viz-hidden">
            <div class="flex-center close-phone-btn">
              <svg class="icon-20" width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <p class="margin-0 fz-20">Select phone model</p>
            <p class="phone-spec-title fz-12">Comparing with: <span id="lca-viz-compare-with"><b>iPhone 15 Pro</b></span></p>
            <div class="search-container br-8 pd-16 fz-16">
              <input type="text" id="search-phone" class="grey-text fz-16" placeholder="Search..." title="Type to search for phone models">
              <div class="phone-model-container">
              </div>
            </div>
          </div>
          <div class="mt-24 mb-16 lca-viz-competitor-section">
            <p class="margin-0 fz-20 mb-16 pdl-4"><b>Compare similar phones:</b></p>
            <div class="lca-viz-competitor-container rg-12">
          </div>

          </div>
        </section>

        <section class="side-by-side-section hidden-a mt-12">
          <div class="side-by-side-container flex-center">
            <div class="side-by-side-spec-container grid-1fr-1fr cg-12"></div>
          </div>
        </section>
      </div>
    `;
    return phoneEmissionsSkeleton;
  }

  async function showPhoneEmissions() {
    shadowRoot.querySelector(".phone-container").classList.remove("hidden-a");
    await hidePhoneLoadingIcon();
    const phoneSpecContainer = shadowRoot.querySelector(".phone-spec-container" );
    const comparePhone = shadowRoot.querySelector(".compare-phone");
    showElement(phoneSpecContainer, "a");
    comparePhone.classList.remove("hidden-a");
    masterContainer.focus();
    displayPhoneSpecEmissions();
    await handlePhoneCompare();
    handlePhoneSearch();
  }

  async function showFreightHTMLContent() {
    shadowRoot.querySelector(".freight-container").classList.remove("hidden-a");
    masterContainer.focus();
    await hideFreightLoadingIcon();
    const freightContent = shadowRoot.querySelector(".freight-content");
    showElement(freightContent, "a");
  }

  async function showCloudEmissions() {
    shadowRoot.querySelector(".lca-viz-cloud-master-container").classList.remove("hidden-a");
    masterContainer.focus();
    await hideCloudLoadingIcon();
    const cloudContent = shadowRoot.querySelector(".lca-viz-cloud-info-container");
    showElement(cloudContent, "a");
  }

  /**
   * Takes in a weight value in kg and determines if the weight needs
  // unit conversion (to grams or tons) to make it more readable.
  * @param {number} kg
  */
  function getReadableUnit(kg) {
    if (kg < 1.0) {
      const grams = parseFloat((kg * 100).toFixed(2));
      return { weight: grams, unit: "g" };
    } else if (kg >= 1000) {
      const tons = parseFloat((kg / 1000).toFixed(2));
      return { weight: tons, unit: "tons" };
    } else {
      const kilograms = parseFloat(kg.toFixed(2));
      return { weight: kilograms, unit: "kg" };
    }
  }

  async function updateFreightContent(freightData) {
    const freightContainer = shadowRoot.querySelector(".freight-container");
    const lcaBanner = shadowRoot.querySelector(".lca-banner");
    if (freightContainer) {
      lcaBanner.remove();
      freightContainer.remove();
      await injectPopupContent("freight", freightData);
    }
  }

  function injectFreightHTMLContent(freightData) {
    const from = freightData.from;
    const to = freightData.to;
    // co2eValue unit is kg

    // & New data
    const airData = freightData.air;
    const groundData = freightData.ground;

    let airHTML = ``;
    let groundHTML = ``;

    let airDiffHTML = ``;
    let groundDiffHTML = ``;
    if (airData && groundData) {
      const airEmission = airData.co2eValue;
      const groundEmission = groundData.co2eValue;
      const difference = airEmission - groundEmission;
      const airDiff = (parseInt((difference / groundEmission) * 100));
      // const groundDiff = (parseInt((difference / airEmission) * 100));
      if (airEmission > groundEmission) {
        airDiffHTML = `<p class="emissions-diff-plus fz-12 br-4 margin-0"><b>+${airDiff}% emissions</b></p>`;
        // groundDiffHTML = `<p class="emissions-diff-minus fz-12 br-4 margin-0"><b>-${groundDiff}% emissions</b></p>`;
      } else {
        airDiffHTML = `<p class="emissions-diff-minus fz-12 br-4 margin-0"><b>-${airDiff}% emissions</b></p>`;
        // groundDiffHTML = `<p class="emissions-diff-plus fz-12 br-4 margin-0"><b>+${groundDiff}% emissions</b></p>`;
      }
    }

    function formatShippingText(option) {
      return option
        .split(" ")
        .map((word) => {
          if (word.toLowerCase() === "fedex") {
            return "FedEx";
          }
          if (["3day", "2day", "1day"].includes(word.toLowerCase())) {
            return word.charAt(0) + "Day"; // Converts '3day' to '3Day', '2day' to '2Day', etc.
          }
          if (word.toLowerCase() === "am") {
            return "AM"; // Converts 'Am' to 'AM'
          }
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(); // Capitalize first letter
        })
        .join(" ");
    }

    let titleText = "Your package&apos;s estimated carbon emissions"

    if (airData) {
      const airCo2eValue = airData.co2eValue;
      let airTrashValue = (airCo2eValue / 1.15);
      const weightObject = getReadableUnit(airTrashValue);
      airTrashValue = weightObject.weight;
      // const trashUnit = weightObject.unit;
      const shippingOptionsText = airData.airMode.map(formatShippingText).join(", ");
      airHTML = `
        <div class="options-container">
          <p class="shipping-options fz-12 mb-4">
            <img src="${airplane_icon}" class="icon-14 align-middle" alt="airplane icon">
            <b>Ship by Air: </b>
          </p>
          ${airDiffHTML}
          <p class="fz-12 mt-4 mb-4">${shippingOptionsText}</p>
          <div class="freight-emissions flex-column-center br-8 rg-12 pd-16">
            <span class="fz-20 freight-co2e-value mt-4"><b>${airCo2eValue} kg CO2e</b></span>
            <div class="lca-viz-unit-container freight flex-center cg-4">
              <div class="lca-viz-unit-div">
                <div class="flex-center lca-viz-justify-center cg-8">
                  <p class="margin-0 grey-text fz-16 lca-viz-text-align-center">or ${Math.ceil(airCo2eValue * 2.5)} miles driven by a car &nbsp;🚗</p>
                </div>
              </div>

              <div class="lca-viz-unit-div">
                <div class="flex-center lca-viz-justify-center cg-8">
                  <p class="margin-0 grey-text fz-16 lca-viz-text-align-center">or ${(airCo2eValue * 0.048).toFixed(1)} trees annually &nbsp;🌳</p>
                </div>
              </div>

              <div class="lca-viz-unit-div">
                <div class="flex-center lca-viz-justify-center cg-8">
                  <p class="margin-0 grey-text fz-16 lca-viz-text-align-center">or ${(airCo2eValue *  0.033).toFixed(2)} kg of beef consumed &nbsp;🥩</p>
                </div>
              </div>
            </div>
          </div>
          <div class="lca-viz-google-maps-air flex-center mt-8"></div>
        </div>
      `;
    }
    if (groundData) {
      const groundCo2eValue = groundData.co2eValue;
      let groundTrashValue = (groundCo2eValue / 1.15);
      const weightObject = getReadableUnit(groundTrashValue);
      groundTrashValue = weightObject.weight;
      // const trashUnit = weightObject.unit;
      console.log('ground shipping options = ' + groundData.groundMode);
      const shippingOptionsText = groundData.groundMode.map(formatShippingText).join(", ");
      groundHTML = `
        <div class="options-container">
          <p class="shipping-options fz-12 mb-4">
            <img src="${truck_icon}" class="icon-14 align-middle" alt="truck icon">
            <b>Ship by Ground: </b>
          </p>
          ${groundDiffHTML}
          <p class="fz-12 mt-4 mb-4">${shippingOptionsText}</p>
          <div class="freight-emissions flex-column-center br-8 rg-12 pd-16">
            <span class="fz-20 freight-co2e-value mt-4"><b>${groundCo2eValue} kg CO2e</b></span>
            <div class="lca-viz-unit-container freight flex-center cg-4">
              <div class="lca-viz-unit-div">
                <div class="flex-center lca-viz-justify-center cg-8">
                  <p class="margin-0 grey-text fz-16 lca-viz-text-align-center">or ${Math.ceil(groundCo2eValue * 2.5)} miles driven by a car &nbsp;🚗</p>
                </div>
              </div>

              <div class="lca-viz-unit-div">
                <div class="flex-center lca-viz-justify-center cg-8">
                  <p class="margin-0 grey-text fz-16 lca-viz-text-align-center">or ${(groundCo2eValue * 0.048).toFixed(1)} trees annually &nbsp;🌳</p>
                </div>
              </div>

              <div class="lca-viz-unit-div">
                <div class="flex-center lca-viz-justify-center cg-8">
                  <p class="margin-0 grey-text fz-16 lca-viz-text-align-center">or ${(groundCo2eValue *  0.033).toFixed(2)} kg of beef consumed &nbsp;🥩</p>
                </div>
              </div>
            </div>
          </div>
          <div class="lca-viz-google-maps-ground flex-center mt-8"></div>
        </div>
      `;
    }
    if (!airData && !groundData) {
      titleText = "We're unable to determine the carbon emissions for the specified locations.";
    }

    const freightEmissions = `
      <div class="freight-container br-8 pd-16 mt-12 hidden-a">
        <div class="loading-box-2 flex-center br-8 pd-16 mt-12">
          <div class="loader">
            <div class="lca-viz-circle"></div>
            <div class="lca-viz-circle"></div>
            <div class="lca-viz-circle"></div>
          </div>
        </div>
        <div class="freight-content hidden-a">

          <div class="flex-stretch lca-viz-title-and-question mt-8">
            <p class="fz-16 mt-0 mb-16"><b>${titleText}</b></p>
            <div class="btn btn-primary lca-viz-tooltip"><img src="${question_icon}" alt="Hover me to get additional information" class="icon-20" id="lca-viz-q-icon">
              <div class="left">
                <h3 class="fz-12 lca-lexend">How are package emissions calculated?</h3>
                <p class="fz-12 lca-lexend">We are using Climatiq's Intermodal Services, which collects data from various sources to calculate the package emissions, including GLEC v3 Framework, ISO 14083 standard, Emission Factor Database (EFDB), OpenStreetMap, and more.</p>
                <i></i>
              </div>
            </div>
          </div>

          <div class="flex-center cg-8 fz-16">
            <p>CO2e Equivalency: </p>
            <select id="lca-viz-unit-select" class="br-4 pd-4">
              <option value="0">Miles driven 🚗</option>
              <option value="1">Trees offset 🌳</option>
              <option value="2">Beef Consumed 🥩</option>
            </select>
          </div>
          <div>
            ${groundHTML}
            ${airHTML}
          </div>
          <div class="shipping-container">
            <p class="fz-12"><b>Shipping Details</b></p>
            <div class="shipping-info fz-12">
              <p class="from-to-text"><b>From:</b> <span id="f-from">${from}</span></p>
              <p class="from-to-text"><b>To:</b> <span id="t-to">${to}</span></p>
            </div>
          </div>
        </div>
      </div>
    `;
    return freightEmissions;
  }

  //  ************* Analyzing Freight Data *****************

  // Tracks the current web page the extension is on to see if they are 'eligible' for displaying freight emissions
  function trackFreight() {
    let allowedDomains = ["fedex.com"];
    if (isDomainValid(allowedDomains)) {
      console.log('current domain is allowed by fedex');
      // observeFedexBtn();
      observeFedexShippingOptions(() => {
        handleFedexDataToFreight();
        recordAllInputChange();
        recordPackageTypeChange();
        recordFromToAddressChange();
      });
    }
  }

  // Observes if an element contains certain .textContent and classList properties
  /**
   *
   * @param {String} matchingText The matching text. For example, "Size" or "Region"
   * @param {Array} matchingClassesArr The array containing the matching classes. For example, ["azc-form-label"];
   * @param {callback} callback
   */
  function observeElementTextAndClassContent(matchingText, matchingClassesArr, callback) {
    const observer = new MutationObserver((mutationsList, observer) => {
      mutationsList.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {  // Check if it's an element
              if (node.textContent.includes(matchingText) && matchingClassesArr.some((className) => node.classList.contains(className))) {
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

  function observeTextChange(element, callback) {
    const observer = new MutationObserver(() => {
      const textContent = element.textContent.trim();
      callback(textContent);
    });

    observer.observe(element, { childList: true, subtree: true });
  }

  // Observes when the different shipping option appears
  function observeFedexShippingOptions(callback) {
    const observer = new MutationObserver((mutationsList, observer) => {
      for (const mutation of mutationsList) {
        if (mutation.type === "childList") {
          const shippingOption = document.querySelector(".fdx-c-definitionlist__description--small");
          if (shippingOption) {
            observer.disconnect(); // Stop observing once the shipping option is found
            callback();
            break;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Detects if an element's class has been changed.
  function onClassChange(element, callback) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          callback(mutation.target);
        }
      });
    });
    observer.observe(element, { attributes: true });
    return observer.disconnect;
  }

  function recordFromToAddressChange() {
    const fromAddressElement = document.getElementById("fromGoogleAddress");
    const toAddressElement = document.getElementById("toGoogleAddress");
    // Listen to class changes on fromAddressElement and toAddressElement

    const checkBothValid = () => {
      const isFromValid = fromAddressElement.classList.contains("ng-valid");
      const isToValid = toAddressElement.classList.contains("ng-valid");
      if (isFromValid && isToValid) {
        recordAllInputChange();
        recordPackageTypeChange();
        handleFedexChange();
      }
    };

    onClassChange(fromAddressElement, checkBothValid);
    onClassChange(toAddressElement, checkBothValid);
  }

  function recordPackageTypeChange() {
    const packageType = document.getElementById(
      "package-details__package-type"
    );
    if (packageType) {
      packageType.addEventListener("change", () => {

        const packageWeightElement = document.getElementById(
          "package-details__weight-0"
        );
        const packageCountElement = document.getElementById(
          "package-details__quantity-0"
        );

        packageWeightElement.addEventListener("input", handleFedexChange);
        packageCountElement.addEventListener("input", handleFedexChange);
      });
    }
  }

  function observeAndStoreShippingOptions() {
    observeFedexShippingOptions(() => {
      console.log(
        "*****************OBSERVE FEDEX SHIPPING OPTIONS*****************"
      );
      handleFedexDataToFreight();
    });
  }

  function handleFedexChange() {
    // console.log(`Changed value in ${event.target.tagName}:`, event.target.value);
    const fedexButton = document.getElementById(
      "e2ePackageDetailsSubmitButtonRates"
    );
    if (fedexButton && !fedexButton.classList.contains("lca-viz-observing")) {
      // Uses addEvent instead of addEventListener in order to ensure that we cannot add multiple event listeners
      // addEvent will not add the same function twice.
      fedexButton.addEventListener("click", () => {
        observeAndStoreShippingOptions();
      });
      fedexButton.classList.add("lca-viz-observing");
    }
  }

  function recordAllInputChange() {
    // Select all input, select, and textarea elements
    const inputs = document.querySelectorAll("input, select, textarea");

    // Add event listeners to all selected elements
    inputs.forEach((input) => {
      if (
        input.id !== "package-details__package-type" &&
        input.id !== "fromGoogleAddress" &&
        input.id !== "toGoogleAddress"
      ) {
        input.addEventListener("change", handleFedexChange);
        input.addEventListener("input", handleFedexChange);
      }
    });
  }

  async function handleFedexDataToFreight() {
    let currShippingOptions = [];
    const availableOptions = document.querySelectorAll(
      ".fdx-c-definitionlist__description--small"
    );
    availableOptions.forEach((option) => {
      currShippingOptions.push(
        option.outerText.toLowerCase().replace(/®/g, "")
      );
    });

    const fromAddressElement = document.getElementById("fromGoogleAddress");
    const fromAddress = fromAddressElement ? fromAddressElement.value : null;

    const toAddressElement = document.getElementById("toGoogleAddress");
    const toAddress = toAddressElement ? toAddressElement.value : null;

    const packageCountElement = document.getElementById(
      "package-details__quantity-0"
    );
    const packageCount = packageCountElement
      ? parseInt(packageCountElement.value)
      : null;

    // const packageWeightElement = document.getElementById("package-details__weight-0");
    const packageWeightElement = document.querySelector('#package-details__weight-0 .fdx-c-form__input');
    let packageWeight = packageWeightElement ? parseInt(packageWeightElement.value) : null;

    const unitElement = document.querySelector(
      'select[data-e2e-id="selectMeasurement"]'
    );
    const unit = unitElement ? unitElement.value : null;

    // If the unit is imperial, convert the package weight to kg.
    if (unit.includes("IMPERIAL")) {
      packageWeight = toKg(packageWeight);
    }

    if (fromAddress && toAddress && packageCount && packageWeight) {
      const totalWeight = packageWeight * packageCount;

      const { groundMode, airMode } = await categorizeShippingOption(
        fromAddress,
        toAddress,
        currShippingOptions
      );

      let freightGroundData;
      let freightAirData;
      let aData;
      let gData;

      if (groundMode.length > 0) {
        const groundData = formatFreightData(fromAddress, toAddress, "ground", totalWeight);
        freightGroundData = await getFreightEmissions(groundData);
        if (freightGroundData) {
          gData = {
            co2eValue: parseFloat(freightGroundData.co2e.toFixed(2)),
            groundMode: groundMode,
          };
        } else {
          return;
        }

      }
      if (airMode.length > 0) {
        const airData = formatFreightData(fromAddress, toAddress, "air", totalWeight);
        freightAirData = await getFreightEmissions(airData);
        if (freightAirData) {
          aData = {
            co2eValue: parseFloat(freightAirData.co2e.toFixed(2)),
            airMode: airMode,
          };
        } else {
          return;
        }
      }

      const formattedFreightData = {
        from: fromAddress,
        to: toAddress,
        air: aData,
        ground: gData,
      };

      const freightData = {
        formatted: formattedFreightData,
        originalAir: freightAirData,
        originalGround: freightGroundData,
      };

      if (shadowRoot.querySelector(".freight-container") !== null) {
        console.log("updating freight content.....");
        await updateFreightContent(freightData);
      } else {
        console.log("injecting freight content.....");
        await injectPopupContent("freight", freightData);
      }
      currShippingOptions = [];
    } else {
      console.log('fromAddress: ', fromAddress);
      console.log('toAddress: ', toAddress);
      console.log('packageCount: ', packageCount);
      console.log('packageWeight: ', packageWeight);
      console.error("Invalid input.. Information is not complete");
    }
  }

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

  // totalWeight is in kg
  function formatFreightData(fromAddress, toAddress, mode, totalWeight) {
    let transportMode;
    if (mode === "air") {
      transportMode = [
        {
          transport_mode: "road",
        },
        {
          transport_mode: "air",
        },
        {
          transport_mode: "road",
        },
      ];
    }
    if (mode === "ground") {
      transportMode = [
        {
          transport_mode: "road",
        },
      ];
    }
    let rFrom = [
      {
        location: {
          query: fromAddress,
        },
      },
    ];
    let rTo = [
      {
        location: {
          query: toAddress,
        },
      },
    ];
    let cargo = [
      {
        weight: totalWeight,
        weight_unit: "kg",
      },
    ];

    // Combine the route components into one array
    let route = rFrom.concat(transportMode).concat(rTo);
    // Create the final data object
    const data = {
      route: route,
      cargo: cargo[0], // Access the first (and only) object in the cargo array
    };
    // console.log(JSON.stringify(data, null, 2));
    return data;
  }

  function toKg(lbs) {
    return lbs * 0.453;
  }

  // Handles searching for a phone model from the database
  function handlePhoneSearch() {
    const searchInput = shadowRoot.getElementById("search-phone");
    searchInput.addEventListener("keyup", search);
  }

  // Searches the phone model from the database
  function search() {
    let input = shadowRoot.getElementById("search-phone");
    let filter = input.value.toUpperCase();
    let container = shadowRoot.querySelector(".phone-model-container");
    const children = container.children;
    for (let i = 0; i < children.length; i++) {
      let textValue = children[i].textContent || children[i].innerText;
      if (textValue.toUpperCase().indexOf(filter) > -1) {
        children[i].style.display = "";
      } else {
        children[i].style.display = "none";
      }
    }
  }
  /**
   * Handles the interaction of the phone comparison, including the compare and close button
   */
  async function handlePhoneCompare() {
    const compareBtn = shadowRoot.querySelector(".compare-btn");
    const comparePhone = shadowRoot.querySelector(".compare-phone");
    const compareContainer = shadowRoot.querySelector(".compare-container");
    const slideContent = shadowRoot.querySelector(".slide-content");

    await populatePhoneModel();
    compareBtn.addEventListener("click", async () => {
      // await populatePhoneModel();
      comparePhone.classList.add("down");
      compareContainer.classList.add("hide");
      slideContent.classList.add("slide-down");
      handleSideBySideSelection();
    });

    const closeBtn = shadowRoot.querySelector(".close-phone-btn");
    closeBtn.addEventListener("click", () => {
      comparePhone.classList.remove("down");
      compareContainer.classList.remove("hide");
      slideContent.classList.remove("slide-down");
    });

    // For the new 2 recommended phone models
    const competitorNodeList = shadowRoot.querySelectorAll(".lca-viz-competitor-phone");
    const competitorSection = shadowRoot.querySelector('.lca-viz-competitor-section');
    competitorNodeList.forEach((phone) => {
      phone.addEventListener("click", () => {
        const phoneId = parseInt(phone.id);

        console.log('phone Id = ' + phoneId);
        competitorSection.classList.add('hidden-a');
        displaySideBySideComparison(phoneId);
      })
    });
  }

  // Handles the selection of a phone model in the list
  function handleSideBySideSelection() {
    const phoneNodeList = shadowRoot.querySelector(".phone-model-container").children;
    Array.from(phoneNodeList).forEach((phone) => {
      phone.addEventListener("click", (event) => {
        const phoneId = parseInt(event.target.id);

        const comparePhone = shadowRoot.querySelector(".compare-phone");
        const compareContainer = shadowRoot.querySelector(".compare-container");
        const slideContent = shadowRoot.querySelector(".slide-content");
        comparePhone.classList.remove("down");
        compareContainer.classList.remove("hide");
        slideContent.classList.remove("slide-down");

        displaySideBySideComparison(phoneId);
      });
    });
  }

  // Handles the changing of different reference units for phone emissions flow.
  // (i.e. changing between "~ kg of trash burned", "~ of miles driven", and "~ of trees cut down" every 3 seconds)
  function handleCO2eEquivalencyChange() {
    const unitSelect = shadowRoot.getElementById('lca-viz-unit-select');
    const unitDivsContainer = shadowRoot.querySelectorAll('.lca-viz-unit-container');
    // Initialize: show the first unit-div by default
    let currentIndex = 0;
    if (unitSelect && unitDivsContainer) {
      console.log('CALLING handleCO2EquivalencyChange');
      unitDivsContainer.forEach((container) => {
        container.children[currentIndex].classList.add('lca-viz-show');
      });

      unitSelect.addEventListener("change", (e) => {
        const selectedIndex = parseInt(e.target.value);
        console.log('selectedIndex = ' + selectedIndex);
        showSelectedUnit(selectedIndex);
      });
    } else {
      console.log('handleCO2EquivalencyChange CANNOT be called');
    }

    // Function to change the displayed unit-div based on dropdown selection
    function showSelectedUnit(index) {
      unitDivsContainer.forEach((container) => {
        console.log('currentIndex = ' + currentIndex);
        console.log('newIndex = ' + index);
        const oldUnitDiv = container.children[currentIndex];
        const newUnitDiv = container.children[index];
        console.log('unitDivs = ');
        console.dir(oldUnitDiv);
        // Hide the current unit-div
        oldUnitDiv.classList.remove('lca-viz-show');
        oldUnitDiv.classList.add('lca-viz-hide');

        // After fade-out, remove the hide class and show the selected unit
        setTimeout(() => {
          oldUnitDiv.classList.remove('lca-viz-hide');
          newUnitDiv.classList.add('lca-viz-show');
          currentIndex = index;
        }, 300);
      });
    }
  }

  /**
   * Takes in phone object and returns the html code for data source.
   * @param {Object} phoneObject The phone object
   * @returns the html code for data source.
   */
  function getDataSource(phoneObject) {
    if (phoneObject.method && phoneObject.method === "given") {
      const txtSourceHTML = `
        <div class="lca-viz-txt-source pdt-12">
          <a href="${phoneObject.source}" class="lca-link fz-16" target="_blank">Data source</a>
        </div>`;
        return txtSourceHTML;
    } else {
      return `<div></div>`;
    }
  }

  // Display a side-by-side carbon emissions comparison of two phones
  function displaySideBySideComparison(phoneId) {
    const currentPhone = currentPhoneData;
    const comparedPhone = currentRecommendedPhones.find(phone => phone.index === phoneId);

    const wrapper = shadowRoot.querySelector(".side-by-side-section");
    const phoneContainer = shadowRoot.querySelector(".phone-container");

    let specContainer = shadowRoot.querySelector(".side-by-side-spec-container");
    specContainer.innerHTML = "";
    specContainer.innerHTML += `
      <p class="margin-0 side-phone-text fz-16"><b>${currentPhone.device}</b></p>
      <p class="margin-0 side-phone-text fz-16"><b>${comparedPhone.device}</b></p>
      <img src="${red_trash_icon}" class="icon-16 trash-btn" alt="remove device">
    `;

    let arrayResult = alignStorageArrays(currentPhone.specs, comparedPhone.specs);
    let currentArray = arrayResult[0];
    let comparedArray = arrayResult[1];

    for (let i = 0; i < currentArray.length; i++) {
      const result = findGreener(currentArray[i].co2e, comparedArray[i].co2e);
      // Returns a boolean checking
      specContainer.innerHTML += `
        <div class="details-container fz-16">
          <div class="flex-center most-green cg-4">
            <p><b>${currentArray[i].storage}</b>&nbsp;</p>
            ${currentArray[i].mostEco
                ? `<img src="${most_green_icon}" class="icon-16 emissions-diff-minus br-4 margin-0 lca-viz-MEF" title="This is the most eco-friendly option" alt="Most eco-friendly option">`
                : ""
              }
          </div>
          <div class="flex-center co2e-data-container pd-8 br-8 cg-4 lexend-reg ${result === "one" ? "greener" : result === "two" ? "" : ""}">
            <p class="margin-0">${currentArray[i].co2e !== '--' ? currentArray[i].co2e + ' kg CO2e': '--'} </p>
          </div>
        </div>
        <div class="details-container fz-16">
          <div class="flex-center most-green cg-4">
            <p><b>${comparedArray[i].storage}</b>&nbsp;</p>
            ${comparedArray[i].mostEco
                ? `<img src="${most_green_icon}" class="icon-16 emissions-diff-minus br-4 margin-0 lca-viz-MEF" title="This is the most eco-friendly option" alt="Most eco-friendly option">`
                : ""
              }
          </div>
          <div class="flex-center co2e-data-container pd-8 br-8 cg-4 lexend-reg ${result === "one" ? "" : result === "two" ? "greener" : ""}">
            <p class="margin-0">${comparedArray[i].co2e !== '--' ? comparedArray[i].co2e + ' kg CO2e': '--'}</p>
          </div>
        </div>
      `;
    }

    const currentPhoneDataSource = getDataSource(currentPhone);
    const comparedPhoneDataSource = getDataSource(comparedPhone);
    specContainer.innerHTML += currentPhoneDataSource;
    specContainer.innerHTML += comparedPhoneDataSource;

    const competitorSection = shadowRoot.querySelector(".lca-viz-competitor-section");

    const trashBtn = specContainer.querySelector(".trash-btn");
    trashBtn.addEventListener("click", () => {
      hideElement(wrapper, "a");
      showElement(phoneContainer, "a");

      competitorSection.classList.remove('hidden-a');
    });

    const lcaBanner = shadowRoot.querySelector(".lca-banner");
    lcaBanner.insertAdjacentElement("afterend", wrapper);

    if (phoneContainer.classList.contains("hidden-a")) {
      hideElement(wrapper, "a");
      showElement(wrapper, "a");
    } else {
      hideElement(phoneContainer, "a");
      showElement(wrapper, "a");
    }
  }

  /**
   * @param {String} emissionsOne
   * @param {String} emissionsTwo
   * @returns returns null if co2e value is NaN, returns "one" if emissionsOne is less than emissionsTwo, returns "two" otherwise.
   */
  function findGreener(emissionsOne, emissionsTwo) {
    const eOne = parseInt(emissionsOne);
    const eTwo = parseInt(emissionsTwo);
    if (isNaN(eOne) || isNaN(eTwo)) {
      // This is a .greener class used to identify which phone is more eco-friendly
      return null;
    } else if (eOne < eTwo) {
      return "one";
    } else if (eOne > eTwo) {
      return "two";
    }
  }

  // case 1 --> get '--' : return null
  // case 2 --> eOne greener: return "one"
  // case 3 --> eTwo greener: return "two"
  // if null --> return ""
  // if "one" --> return "greener"

  /**
     * Function to create aligned storage arrays from arrays of objects
     * Example input:
     *  arr1 = [{ storage: '256GB', co2e: '12kg' }, { storage: '512GB', co2e: '24kg' }, { storage: '1 TB', co2e: '48kg' }];
     *  arr2 = [{ storage: '1 TB', co2e: '48kg' }];
     * @param {Array} arr1 An array object containing storage and co2e of a device
     * @param {Array} arr2 An array object containing storage and co2e of a device
     * @returns // Example Output:
                // [
                //   [ { storage: '--', co2e: '--' }, { storage: '256GB', co2e: '12kg' }, { storage: '512GB', co2e: '24kg' }, { storage: '1 TB', co2e: '48kg' }, { storage: '2 TB', co2e: '96kg' } ],
                //   [ { storage: '128GB', co2e: '6kg' }, { storage: '256GB', co2e: '12kg' }, { storage: '512GB', co2e: '24kg' }, { storage: '1 TB', co2e: '48kg' }, { storage: '--', co2e: '--' } ]
                // ]
    */
  function alignStorageArrays(arr1, arr2) {
    // Extract unique storage values from both arrays
    const uniqueStorageValues = new Set([
      ...arr1.map((item) => item.storage),
      ...arr2.map((item) => item.storage),
    ]);

    // Sort the unique storage values
    const sortedStorageValues = Array.from(uniqueStorageValues).sort(
      (a, b) => toGB(a) - toGB(b)
    );

    // Initialize new aligned arrays with placeholders
    const newArr1 = [];
    const newArr2 = [];

    // Align storage values and fill placeholders
    sortedStorageValues.forEach((value) => {
      const obj1 = arr1.find((item) => item.storage === value);
      const obj2 = arr2.find((item) => item.storage === value);

      newArr1.push(obj1 ? obj1 : { storage: value, co2e: "--" });
      newArr2.push(obj2 ? obj2 : { storage: value, co2e: "--" });
    });

    for (let i = 0; i < newArr1.length; i++) {
      if (newArr1[i].co2e == "--") {
        newArr1[i].storage = "--";
      }

      if (newArr2[i].co2e == "--") {
        newArr2[i].storage = "--";
      }
    }

    markMostEcoFriendlyIndex(arr1);
    markMostEcoFriendlyIndex(arr2);

    return [newArr1, newArr2];
  }

  // Takes in the storage array and flags the index that has the most eco-friendly option
  function markMostEcoFriendlyIndex(arr) {
    const mostEcoIndex = arr.findIndex(item => item.co2e !== '--');
    if (mostEcoIndex !== -1) {
      arr[mostEcoIndex].mostEco = true;
    }
  }

  /**
   * Takes in the storage value and returns a numerical value in gigabytes (e.g. "256 GB" --> 256)
   * @param {String} storage the storage of a phone model (e.g. "256 GB", "1 TB")
   */
  function toGB(storage) {
    const storageValue = parseFloat(storage);
    if (storage.includes("TB")) {
      return storageValue * 1024;
    } else if (storage.includes("GB")) {
      return storageValue;
    } else if (storage.includes("MB")) {
      return storageValue / 1024;
    }
    return storageValue;
  }

  /**
   * Populates the phone model that can be used for side-by-side emissions comparison
   */
  async function populatePhoneModel() {
    // const phoneModel = await getRecommendedModels(currentPhoneData.device);
    const phoneModel = currentRecommendedPhones;
    console.log('recommeded phone model = ');
    console.log(currentRecommendedPhones);

    const phoneModelContainer = shadowRoot.querySelector(".phone-model-container");
    phoneModelContainer.innerHTML = "";
    phoneModel.forEach((phone, index) => {
      const phoneElement = document.createElement("p");
      phoneElement.className = `phone-model-text br-4${index === phoneModel.length - 1 ? " last" : ""
        }`;
      phoneElement.textContent = phone.device;
      phoneModelContainer.appendChild(phoneElement);
    });

    const phoneCompetitorContainer = shadowRoot.querySelector(".lca-viz-competitor-container");
    phoneCompetitorContainer.innerHTML = "";
    phoneModel.forEach((phone) => {
      const phoneElement = `
        <div class="lca-viz-competitor-phone br-8" id="${phone.index}">
          <p class="fz-16">${phone.device}</p>
        </div>
      `;
      phoneCompetitorContainer.innerHTML += phoneElement;
    });
  }

  // Displays the carbon emission of the phone being analyzed in the web page.
  function displayPhoneSpecEmissions() {
    const data = currentPhoneData;
    console.log('phone data = ');
    console.log(data);

    const container = shadowRoot.querySelector(".phone-spec-container");
    const specs = data.specs;
    const deviceName = data.device;

    container.innerHTML += `
      <div class="flex-stretch lca-viz-title-and-question mt-8">
        <p class="phone-spec-title" id="currentPhone"><b>${deviceName} Estimated Carbon Emissions</b></p>
        <div class="btn btn-primary lca-viz-tooltip"><img src="${question_icon}" alt="Hover me to get additional information" class="icon-20" id="lca-viz-q-icon">
          <div class="left">
            <h3 class="fz-12 lca-lexend">How are phone emissions calculated?</h3>
            <p class="fz-12 lca-lexend">We use data from phone companies' product carbon footprint reports. If there is no data, a large language model (LLM) is used to estimate emissions based on publicly available data online.</p>
            <i></i>
          </div>
        </div>
      </div>
      <div class="flex-center cg-8 fz-16">
        <p>CO2e Equivalency: </p>
        <select id="lca-viz-unit-select" class="br-4 pd-4">
          <option value="0">Miles driven 🚗</option>
          <option value="1">Trees offset 🌳</option>
          <option value="2">Beef Consumed 🥩</option>
        </select>
      </div>
    `;

    const compareWith = shadowRoot.getElementById('lca-viz-compare-with');
    compareWith.innerHTML = deviceName;

    // let mostGreenOption = footprints[0];
    let mostGreenOption = specs[0];
    specs.forEach((spec, index) => {
      if (index !== 0) {
        const co2eValue = parseFloat(spec.co2e);
        const mostGreenCo2eValue = parseFloat(mostGreenOption.co2e);
        if (co2eValue < mostGreenCo2eValue) {
          mostGreenOption = spec;
        }
      }
    });

    specs.forEach((spec, index) => {
      const co2eValue = parseFloat(spec.co2e);
      const mostGreenCo2eValue = parseFloat(mostGreenOption.co2e);
      const percentageIncrease =
        ((co2eValue - mostGreenCo2eValue) / mostGreenCo2eValue) * 100;

      const isMostGreen = spec.storage === mostGreenOption.storage;
      container.innerHTML += `
        <div class="details-container fz-16" id=${index + "-c"}>
          <div class="flex-center ${isMostGreen ? "most-green" : ""} cg-4">
            <p><b>${spec.storage} </b>&nbsp;</p>
            ${isMostGreen
          ? `<img src="${most_green_icon}" class="icon-16 emissions-diff-minus br-4 margin-0 lca-viz-MEF" title="This is the most eco-friendly option" alt="Most eco-friendly option">`
          : `<span class="emissions-diff-plus fz-12 br-4 margin-0"><b>(+${percentageIncrease.toFixed(
            0
          )}% emissions)</b></span>`
        }
          </div>
          <div class="flex-center co2e-data-container pd-8 br-8 cg-4 lexend-reg">
            <p class="margin-0">${co2eValue} kg CO2e</p>
            <img src="${equivalent_icon}" class="icon-16" alt="Equivalent to">
            <div class="lca-viz-unit-container phone flex-center cg-4">

              <div class="lca-viz-unit-div">
                <div class="flex-center lca-viz-justify-center cg-8">
                  <p class="margin-0 grey-text fz-16 lca-viz-text-align-center">${Math.ceil(co2eValue * 2.5)} miles driven by a car &nbsp;🚗</p>
                </div>
              </div>

              <div class="lca-viz-unit-div">
                <div class="flex-center lca-viz-justify-center cg-8">
                  <p class="margin-0 grey-text fz-16 lca-viz-text-align-center">${(co2eValue * 0.048).toFixed(1)} trees annually &nbsp;🌳</p>
                </div>
              </div>

              <div class="lca-viz-unit-div">
                <div class="flex-center lca-viz-justify-center cg-8">
                  <p class="margin-0 grey-text fz-16 lca-viz-text-align-center">${(co2eValue *  0.033).toFixed(2)} kg of beef consumed &nbsp;🥩</p>
                </div>
              </div>

            </div>
          </div>
        </div>
        `;
    });

    const dataSource = getDataSource(currentPhoneData);
    container.innerHTML += dataSource;

    handleCO2eEquivalencyChange();
  }

// TODO: ***********************************************************
// TODO: Refactor the loading icon functions, reduce from 3 functions -> 1 function
  // Use this function to display a loading animation while waiting for the API calls
  async function hidePhoneLoadingIcon() {
    let loadingBox = shadowRoot.querySelector(".loading-box");
    if (loadingBox) {
      return new Promise((resolve) => {
        setTimeout(() => {
          loadingBox.classList.add("hidden-a");
          resolve();
        }, 1500);
      });
    } else {
      console.error("loadingBox not found");
      return Promise.resolve();
    }
  }

  function hideFreightLoadingIcon() {
    let loadingBox = shadowRoot.querySelector(".loading-box-2");
    if (loadingBox) {
      return new Promise((resolve) => {
        setTimeout(() => {
          loadingBox.classList.add("hidden-a");
          resolve();
        }, 1500);
      });
    } else {
      console.error("loadingBox not found");
      return Promise.resolve();
    }
  }

  function hideCloudLoadingIcon() {
    let loadingBox = shadowRoot.querySelector(".loading-box-3");
    if (loadingBox) {
      return new Promise((resolve) => {
        setTimeout(() => {
          loadingBox.classList.add("hidden-a");
          resolve();
        }, 1500);
      });
    } else {
      console.error("loadingBox not found");
      return Promise.resolve();
    }
  }
// TODO: ***********************************************************

  /**
   * Shows an element. Only works with flex and block elements
   * @param {element} element The element to be shown
   * @param {*} version The animation style. If no version is given, use the default style
   */
  function showElement(element, version) {
    if (version === "a") {
      if (element.classList.contains("flex-center")) {
        element.style.display = "flex";
      } else {
        element.style.display = "block";
      }
      requestAnimationFrame(() => {
        element.classList.remove("hidden-a");
        element.classList.add("visible-a");
      });
    } else if (version === "b") {
      if (element.classList.contains("flex-center")) {
        element.style.display = "flex";
      } else {
        element.style.display = "block";
      }
      requestAnimationFrame(() => {
        element.classList.remove("hidden-b");
        element.classList.add("visible-b");
      });
    }
  }

  function formatInstanceNames(input) {
    // Remove the "Standard" prefix
    let instanceName = input.replace(/^Standard_/, '');
    // Keep only the part before the first space (which is the instance name)
    instanceName = instanceName.split(' ')[0];
    // Replace any "-" with "_"
    instanceName = instanceName.replace(/-/g, '_');
    return instanceName;
}

  function formatRegionNames(input) {
    // Remove the part within parentheses (e.g., "(US)")
    let regionName = input.replace(/\(.*?\)\s*/, '');
    // Convert to lowercase
    regionName = regionName.toLowerCase();
    // Replace spaces with underscores
    regionName = regionName.replace(/\s+/g, '_');
    return regionName;
  }


  /**
   * Hides an element. Only works with block elements
   * @param {element} element The element to be shown
   * @param {*} version The animation style. If no version is given, use the default style
   */
  function hideElement(element, version) {
    if (version === "a") {
      element.classList.remove("visible-a");
      element.classList.add("hidden-a");
      element.addEventListener("transitionend", function handleTransitionEnd() {
        if (element.classList.contains("hidden-a")) {
          element.style.display = "none";
        }
        element.removeEventListener("transitionend", handleTransitionEnd);
      });
    } else if (version === "b") {
      element.classList.remove("visible-b");
      element.classList.add("hidden-b");
      element.addEventListener("transitionend", function handleTransitionEnd() {
        if (element.classList.contains("hidden-b")) {
          element.style.display = "none";
        }
        element.removeEventListener("transitionend", handleTransitionEnd);
      });
    }
  }

  /**
   * @param {String} shippingType The Fedex shipping type (e.g. "fedex ground", "fedex 1day freight")
   * @param {String} fromValue The starting location
   * @param {String} toValue The destination location
   * @returns The appropriate transportation mode, either "air" or "ground"
   */
  async function getFedexTransportMode(shippingType, fromValue, toValue) {
    const shipping_modes = {
      "fedex express saver": "ground",
      "fedex ground": "ground",
      "fedex home delivery": "ground",
      "fedex freight priority": "ground",
      "fedex freight economy": "ground",
      "fedex sameday freight": "air",
      "fedex regional economy": "ground",
      "fedex 1day freight": "air",
      "fedex 2day freight": "air",
      "fedex 3day freight": "air",
      "fedex international priority express": "air",
      "fedex international first": "air",
      "fedex international next flight": "air",
      "fedex international priority": "air",
      "fedex international economy": "air",
      "fedex international connect plus": "air",
      "fedex international priority freight": "air",
      "fedex international deferred freight": "air",
      "fedex international economy freight": "air",
      "fedex international ground": "air",
    };

    let mode = shipping_modes[shippingType];
    if (mode) {
      return mode;
    } else {
      // If it takes longer than this amount of hours by road, then assume the shipping type is air
      let hoursThreshold;

      if (
        shippingType === "fedex sameday" ||
        shippingType === "fedex priority overnight" ||
        shippingType === "fedex priority" ||
        shippingType === "fedex priority express" ||
        shippingType === "fedex standard overnight" ||
        shippingType === "fedex first overnight" ||
        shippingType === "fedex first overnight freight"
      ) {
        hoursThreshold = 6;
      } else if (shippingType === "fedex 2day am") {
        hoursThreshold = 12;
      } else if (shippingType === "fedex 2day") {
        hoursThreshold = 18;
      } else {
        return null;
      }
      try {
        const response = await fetch(LCA_SERVER_URL + "/api/travel-time", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromValue,
            to: toValue,
          }),
        });
        const responseData = await response.json();
        // travelTime is in seconds by default
        const travelTime = responseData.rows[0].elements[0].duration.value;
        if (travelTime / 3600 < hoursThreshold) {
          return "ground";
        }
        return "air";
      } catch (error) {
        console.error("Error in getFedexTransportMode:", error);
        return null;
      }
    }
  }

  /**
   * @param {String} fromAddress The origin address
   * @param {String} toAddress The destination address
   * @param {Array} shippingOptions The list of all given Fedex shipping options
   * @returns Two arrays, one containing the shipping options that have ground transport mode,
   *          another containing the shipping options that have air transport mode.
   */
  async function categorizeShippingOption(
    fromAddress,
    toAddress,
    shippingOptions
  ) {
    console.log(
      "got in categorize shipping option, shippingOptions: ",
      shippingOptions.length
    );
    let airMode = [];
    let groundMode = [];

    // Use Promise.all to wait for all async operations to complete
    const modes = await Promise.all(
      shippingOptions.map(async (option) => {
        const mode = await getFedexTransportMode(
          option,
          fromAddress,
          toAddress
        );
        // console.log('option: ', option, '\nmode: ', mode);
        return { option, mode };
      })
    );

    // Categorize the options based on the mode
    modes.forEach(({ option, mode }) => {
      if (mode === "air") {
        // console.log('pushed to air');
        airMode.push(option);
      }
      if (mode === "ground") {
        // console.log('pushed to ground');
        groundMode.push(option);
      }
    });

    showGreenestOption(groundMode);

    console.log("ground mode: ", groundMode);
    console.log("airmode: ", airMode);
    return { groundMode, airMode };
  }

  /** Injects a banner into the fedex webpage to highlight the most eco-friendly shipping options in the given array.
   * @param {Array} optionsArray Array containing a list of shipping options
   */
  function showGreenestOption(optionsArray) {
    const availableOptions = document.querySelectorAll(".fdx-c-definitionlist__description--small");
    availableOptions.forEach((option) => {
      const formattedOption = option.outerText.toLowerCase().replace(/®/g, '');
      console.log('formattedOptn = ' + formattedOption);
      if (optionsArray.includes(formattedOption)) {
        const parentNode =  option.parentNode.parentNode.parentNode.parentNode;
        const priceButton = parentNode.querySelector('.magr-c-rates__button');

        const newContainerHTML = ` <div class="lca-viz-greenest-shipping mb-16"> ${priceButton.outerHTML} <div class="flex-center br-4 pd-8 cg-8 green-shipping lca-viz-justify-center"> <img src="${lca_48}" alt="Most eco friendly" class="icon-16"> <span>Most eco-friendly</span> </div> </div> `;
        // Replace the original button with the new container
        priceButton.outerHTML = newContainerHTML;
      }
    });
  }

  /**
   *
   * @param {String} fromLocation
   * @param {String} toLocation
   * @param {Number} cargoWeight the weight of the cargo in kg
   */
  async function getFreightEmissions(data) {
    console.log("calling testClimatiqAPI...");
    try {
      const response = await fetch(LCA_SERVER_URL + "/api/freight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.log(`HTTP error! Status: ${response.status}`);
        return null;
      }

      const responseData = await response.json();
      console.log("API Response: ", responseData);
      return responseData;
    } catch (error) {
      console.error("Error:", error);
    }
  }
}
