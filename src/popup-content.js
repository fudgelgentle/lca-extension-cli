/* eslint-disable no-unused-vars */
// popup-content.js handles the popup window that will be displayed for the following scenarios
// 1. Phone model carbon emissions
// 2. Freight carbon emissions
// 3. Cloud computing carbon emissions

// testPopup();
// function testPopup() {
//   const newElement = document.createElement('h1');
//   newElement.innerHTML = `Testing if popup-content works...`;
//   document.body.insertBefore(newElement, document.body.firstChild);
// }
const FREIGHT_URL = 'https://lca-server-api.fly.dev';

const lca_48 = chrome.runtime.getURL('../assets/img/lca-48.png');
const plus_square_icon = chrome.runtime.getURL('../assets/img/plus-square-icon.png');
const fire_black_icon = chrome.runtime.getURL('../assets/img/fire-black-icon.png');
const fire_grey_icon = chrome.runtime.getURL('../assets/img/fire-grey-icon.png');
const red_trash_icon = chrome.runtime.getURL('../assets/img/red-trash-icon.png');
const most_green_icon = chrome.runtime.getURL('../assets/img/most-green-icon.png');
const equivalent_icon = chrome.runtime.getURL('../assets/img/equivalent-icon.png');



// Setting up the master container and attaching the css
const masterContainer = document.createElement('div');
masterContainer.classList.add('master-lca');
masterContainer.classList.add('br-8');
masterContainer.classList.add('hidden');
document.body.append(masterContainer);

const placeholder = document.createElement('div');
placeholder.setAttribute('id', 'placeholder');
document.body.append(placeholder);

const shadowRoot = placeholder.attachShadow({ mode: "open" });
shadowRoot.appendChild(masterContainer);

// Initialize the process
initialize();

async function initialize() {
  await loadCSS(chrome.runtime.getURL('../assets/popup-content.css'));
  trackFreight();
  // injectPopupContent("phone");
}

// Function to fetch and inject CSS into the shadow DOM
async function loadCSS(url) {
  const response = await fetch(url);
  const cssText = await response.text();
  const style = document.createElement('style');
  style.textContent = cssText;
  shadowRoot.appendChild(style);
}

// 3 popup cases: phone, freight, cloud
function injectPopupContent(popupCase, freightData) {
  const lcaBanner = getLCABanner();
  masterContainer.insertAdjacentHTML('beforeend', lcaBanner);
  const lcaFloatingMenu = getLCAFloatingMenu();
  masterContainer.insertAdjacentHTML('beforebegin', lcaFloatingMenu);

  toggleButtonState();

  if (popupCase === "phone") {
    const phoneSkeleton = getPhoneEmissionsSkeleton();
    masterContainer.insertAdjacentHTML('beforeend', phoneSkeleton);
    // Stop input propogation of the search-phone input. Some websites have their own input behavior. We need to disable them.
    stopInputPropogation(shadowRoot.getElementById('search-phone'));
    // Delay the execution of showPhoneEmissions to ensure DOM elements are available
    setTimeout(() => {
      masterContainer.classList.remove('hidden');
      showPhoneEmissions();
    }, 0);
  } else if (popupCase === "freight") {
    const freightContent = getFreightContent(freightData);
    masterContainer.insertAdjacentHTML('beforeend', freightContent);
    setTimeout(() => {
      masterContainer.classList.remove('hidden');
      showFreightEmissions();
    }, 0);
  }
}

function stopInputPropogation(input) {
  input.addEventListener('keydown', (event) => {
    event.stopPropagation();
  });
  input.addEventListener('keyup', (event) => {
      event.stopPropagation();
  });
  input.addEventListener('keypress', (event) => {
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
  const closeContainer = shadowRoot.querySelector('.close-container');
  const openContainer = shadowRoot.querySelector('.floating-lca-menu');
  closeContainer.addEventListener("click", () => {
    hideElement(masterContainer, 'b');
    showElement(openContainer, 'b');
  });
  openContainer.addEventListener("click", () => {
    hideElement(openContainer, 'b');
    showElement(masterContainer, 'b');
  })
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

/**
 *
 * @returns {HTMLElement} Returns the skeleton code for phone emissions.
 */
function getPhoneEmissionsSkeleton() {
  const phoneEmissionsSkeleton = `
    <div class="phone-master-container">
      <section class="phone-container br-8 pd-16 hidden-a">
        <div class="loading-box flex-center br-8 pd-16">
          <div class="loader">
            <div class="circle"></div>
            <div class="circle"></div>
            <div class="circle"></div>
          </div>
        </div>
        <section class="phone-spec-container fz-20 hidden-a"></section>
      </section>


      <section class="compare-phone br-8 hidden-a">
        <div class="compare-container br-8 pd-4">
          <div class="flex-center compare-btn">
            <img src="${plus_square_icon}" class="icon-20">
            <p class="fz-16 margin-8">Compare</p>
          </div>
        </div>
        <div class="select-phone-container br-8 pd-16 slide-content">
          <div class="flex-center close-phone-btn">
            <svg class="icon-20" width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <p class="margin-0 fz-20">Select phone model</p>
          <p class="phone-spec-title fz-12">Comparing with: <b>iPhone 15 Pro</b></p>
          <div class="search-container br-8 pd-16 fz-16">
            <input type="text" id="search-phone" class="grey-text fz-16" placeholder="Search..." title="Type to search for phone models">
            <div class="phone-model-container">
            </div>
          </div>
        </div>
      </section>

      <section class="side-by-side-section hidden-a">
        <div class="side-by-side-container flex-center">
          <div class="side-by-side-spec-container grid-1fr-1fr cg-12"></div>
        </div>
      </section>
    </div>
  `;
  return phoneEmissionsSkeleton;
}

async function showPhoneEmissions() {
  shadowRoot.querySelector(".phone-container").classList.remove('hidden-a');
  await hidePhoneLoadingIcon();
  const phoneSpecContainer = shadowRoot.querySelector(".phone-spec-container");
  const comparePhone = shadowRoot.querySelector('.compare-phone');
  showElement(phoneSpecContainer, "a");
  comparePhone.classList.remove('hidden-a');
  displayPhoneSpecEmissions();
  handlePhoneCompare();
  handlePhoneSearch();
}

async function showFreightEmissions() {
  shadowRoot.querySelector(".freight-container").classList.remove('hidden-a');

  await hideFreightLoadingIcon();
  const freightContent = shadowRoot.querySelector(".freight-content");
  showElement(freightContent, "a");
}


/**
 * Takes in a weight value in kg and determines if the weight needs
// unit conversion (to grams or tons) to make it more readable.
 * @param {number} kg
 */
function getReadableUnit(kg) {
  if (kg < 1.0) {
    const grams = parseFloat((kg * 100).toFixed(2));
    return { weight: grams, unit: 'g'}
  } else if (kg >= 1000) {
    const tons = parseFloat((kg / 1000).toFixed(2));
    return { weight: tons, unit: 'tons'}
  } else {
    const kilograms = parseFloat(kg.toFixed(2));
    return { weight: kilograms, unit: 'kg'}
  }
}

async function updateFreightContent(freightData) {

  const floatingMenu = shadowRoot.querySelector('.floating-lca-menu');
  //& New addition.... need to test if it works
  if (floatingMenu.classList.contains('visible-b')) {
    hideElement(floatingMenu, "b");
    showElement(masterContainer, "b");
  }

  let loadingBox = shadowRoot.querySelector(".loading-box-2");
  loadingBox.classList.remove('hidden-a');
  loadingBox.classList.add('visible-a');

  // Hiding freight container
  let freightContent = shadowRoot.querySelector(".freight-content");
  freightContent.classList.add('hidden');

  console.log('UPDATING FREIGHT CONTENT');
  const from = freightData.from;
  const to = freightData.to;
  // co2eValue unit is kg
  const co2eValue = freightData.co2eValue;

  let trashValue = (co2eValue / 1.15);
  const weightObject = getReadableUnit(trashValue);
  trashValue = weightObject.weight;
  const trashUnit = weightObject.unit;

  const freightCO2eValue = shadowRoot.querySelector('.fz-20.freight-co2e-value b');
  const trashElement = shadowRoot.querySelector('.trash-value');
  const fromElement = shadowRoot.getElementById('f-from');
  const toElement = shadowRoot.getElementById('t-to');

  freightCO2eValue.textContent = co2eValue + " kg CO2e";
  trashElement.textContent = 'or ' + trashValue + ' ' + trashUnit + ' of trash burned';
  fromElement.textContent = ' ' + from;
  toElement.textContent = ' ' + to;


  await hideFreightLoadingIcon();
  freightContent.classList.remove('hidden');
}


function getFreightContent(freightData) {
  const from = freightData.from;
  const to = freightData.to;
  // co2eValue unit is kg
  const co2eValue = freightData.co2eValue;

  let trashValue = (co2eValue / 1.15);
  const weightObject = getReadableUnit(trashValue);
  trashValue = weightObject.weight;
  const trashUnit = weightObject.unit;

  const freightEmissions = `
    <div class="freight-container br-8 pd-16 hidden-a">
      <div class="loading-box-2 flex-center br-8 pd-16">
        <div class="loader">
          <div class="circle"></div>
          <div class="circle"></div>
          <div class="circle"></div>
        </div>
      </div>
      <div class="freight-content hidden-a">
        <p class="fz-16 freight-title-text"><b>Your package&apos;s estimated carbon emissions:</b></p>
        <div class="freight-emissions flex-column-center br-8 rg-12 pd-16">
          <span class="fz-20 freight-co2e-value"><b>${co2eValue} kg CO2e</b></span>
          <div class="flex-center cg-4">
            <span class="trash-value">or ${trashValue} ${trashUnit} of trash burned</span>
            <img src="${fire_black_icon}" class="icon-16" alt="Trash">
          </div>
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
  const currentDomain = window.location.hostname;
  if (currentDomain.includes(allowedDomains[0])) {
    observeFedexDOM();
  }
}

// Function to observe the DOM and add the event listener when the button in Fedex is created
function observeFedexDOM() {
  const observer = new MutationObserver((mutationsList, observer) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        const fedexButton = document.getElementById("e2ePackageDetailsSubmitButtonRates");
        console.log(fedexButton);
        if (fedexButton) {
          fedexButton.addEventListener("click", handleFedexButtonClick);
          observer.disconnect(); // Stop observing once the button is found and event listener is added
          recordAllInputChange();
          recordPackageTypeChange();
          recordFromToAddressChange();
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
        mutation.type === 'attributes' &&
        mutation.attributeName === 'class'
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
    const isFromValid = fromAddressElement.classList.contains('ng-valid');
    const isToValid = toAddressElement.classList.contains('ng-valid');
    if (isFromValid && isToValid) {
      console.log('both input are valid');
      // Calling the record methods again because after a change of location, the inputs
      // were removed and added again (making the old event listeners invalid)
      recordAllInputChange();
      recordPackageTypeChange();

      handleFedexChange();
    } else {
      console.log("At least one input is invalid");
    }
  };

  onClassChange(fromAddressElement, checkBothValid);
  onClassChange(toAddressElement, checkBothValid);

  // Initial check in case the classes are already set
  checkBothValid();
}

// ! recordPackageTypeChange
function recordPackageTypeChange() {
  const packageType = document.getElementById('package-details__package-type');
  packageType.addEventListener("change", () => {
    console.log('packaging type is changed to: ' + packageType.value);

    const packageWeightElement = document.getElementById("package-details__weight-0");
    const packageCountElement = document.getElementById("package-details__quantity-0");

    packageWeightElement.addEventListener("input", handleFedexChange);
    packageCountElement.addEventListener("input", handleFedexChange);
  });
}

function handleFedexChange() {
  // console.log(`Changed value in ${event.target.tagName}:`, event.target.value);
  const fedexButton = document.getElementById("e2ePackageDetailsSubmitButtonRates");
  if (fedexButton) {
    fedexButton.addEventListener("click", handleFedexButtonClick);
  }
}

function recordAllInputChange() {
  // Select all input, select, and textarea elements
  const inputs = document.querySelectorAll('input, select, textarea');

  // Add event listeners to all selected elements
  inputs.forEach(input => {
    if (input.id != 'package-details__package-type' && input.id != 'fromGoogleAddress' && input.id != 'toGoogleAddress') {
      input.addEventListener('change', handleFedexChange);
      input.addEventListener('input', handleFedexChange);
    }
  });
}

async function handleFedexButtonClick() {
  const fedexButton = document.getElementById("e2ePackageDetailsSubmitButtonRates");
  fedexButton.removeEventListener("click", handleFedexButtonClick);
  console.log('fedexButton is clicked');

  const fromAddressElement = document.getElementById("fromGoogleAddress");
  const fromAddress = fromAddressElement ? fromAddressElement.value : null;

  const toAddressElement = document.getElementById("toGoogleAddress");
  const toAddress = toAddressElement ? toAddressElement.value : null;

  const packageCountElement = document.getElementById("package-details__quantity-0");
  const packageCount = packageCountElement ? parseInt(packageCountElement.value) : null;

  const packageWeightElement = document.getElementById("package-details__weight-0");
  let packageWeight = packageWeightElement ? parseInt(packageWeightElement.value) : null;

  const unitElement = document.querySelector('select[data-e2e-id="selectMeasurement"]');
  const unit = unitElement ? unitElement.value : null;

  console.log('packageWeight original: ' + packageWeight);

  // If the unit is imperial, convert the package weight to kg.
  if (unit.includes('IMPERIAL')) {
    packageWeight = toKg(packageWeight);
  }

  console.log('fromAddress: ' + fromAddress);
  console.log('toAddress: ' + toAddress);
  console.log('packageCount: ' + packageCount);
  console.log('unit: ' + unit);
  console.log('packageWeight in kg: ' + packageWeight);

  if (fromAddress && toAddress && packageCount && packageWeight) {
    const totalWeight = packageWeight * packageCount;
    const freightEmissionsData = await getFreightEmissions(fromAddress, toAddress, totalWeight);
    const co2eValue = parseFloat(freightEmissionsData.co2e.toFixed(2));

    const freightData = {
      "from": fromAddress,
      "to": toAddress,
      "co2eValue": co2eValue,
    }

    if (shadowRoot.querySelector('.freight-container') !== null) {
      console.log('FREIGHT CONTAINER EXISTS, updating freight');
      await updateFreightContent(freightData);
    } else {
      console.log('FREIGHT CONTAINER DOESNT EXIST, injecting freight');
      injectPopupContent("freight", freightData);
    }

  } else {
    console.error('Invalid input.. Information is not complete');
  }

  // ~Send the addresses to the background.js script
  // chrome.runtime.sendMessage({
  //   action: "sendAddresses",
  //   data: { from: fromAddress, to: toAddress }
  // });
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
function handlePhoneCompare() {
  const compareBtn = shadowRoot.querySelector(".compare-btn");
  const comparePhone = shadowRoot.querySelector(".compare-phone");
  const compareContainer = shadowRoot.querySelector(".compare-container");
  const slideContent = shadowRoot.querySelector(".slide-content");

  compareBtn.addEventListener("click", async () => {
    await populatePhoneModel();
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

// Display a side-by-side carbon emissions comparison of two phones
function displaySideBySideComparison(phoneId) {
  const phoneModelList = importPhoneModel();

  const currentPhone = getSampleData();
  const comparedPhone = phoneModelList.find((phone) => phone.id === phoneId);

  const wrapper = shadowRoot.querySelector(".side-by-side-section");
  const phoneContainer =shadowRoot.querySelector(".phone-container");

  let specContainer = shadowRoot.querySelector('.side-by-side-spec-container');
  specContainer.innerHTML = "";
  specContainer.innerHTML += `
    <p class="margin-0 side-phone-text fz-16"><b>${currentPhone.device}</b></p>
    <p class="margin-0 side-phone-text fz-16"><b>${comparedPhone.device}</b></p>
    <img src="${red_trash_icon}" class="icon-16 trash-btn" alt="remove device">
  `;

  let arrayResult = alignStorageArrays(currentPhone.carbonFootprint, comparedPhone.carbonFootprint);
  let currentArray = arrayResult[0];
  let comparedArray = arrayResult[1];

  for (let i = 0; i < currentArray.length; i++) {
    specContainer.innerHTML += `
      <div class="details-container fz-16">
        <div class="flex-center most-green cg-4">
          <p><b>${currentArray[i].storage}</b>&nbsp;</p>
          ${
            i === 0
              ? `<img src="${most_green_icon}" class="icon-16" alt="Most eco-friendly option">`
              : ""
          }
        </div>
        <div class="flex-center co2e-data-container pd-8 br-8 cg-4 lexend-reg">
          <p class="margin-0">${currentArray[i].co2e}</p>
        </div>
      </div>
      <div class="details-container fz-16">
        <div class="flex-center most-green cg-4">
          <p><b>${comparedArray[i].storage}</b>&nbsp;</p>
          ${
            i === 0
              ? `<img src="${most_green_icon}" class="icon-16" alt="Most eco-friendly option">`
              : ""
          }
        </div>
        <div class="flex-center co2e-data-container pd-8 br-8 cg-4 lexend-reg">
          <p class="margin-0">${comparedArray[i].co2e}</p>
        </div>
      </div>
    `;

    // const sidePhoneText = document.querySelector('.side-phone-text');
    // scrollToElement(sidePhoneText);
  }

  const trashBtn = specContainer.querySelector(".trash-btn");
  trashBtn.addEventListener("click", () => {
    hideElement(wrapper, "a");
    showElement(phoneContainer, "a");
  });

  const lcaBanner = shadowRoot.querySelector(".lca-banner");
  lcaBanner.insertAdjacentElement("afterend", wrapper);

  if (phoneContainer.classList.contains('hidden-a')) {
    hideElement(wrapper, "a");
    showElement(wrapper, "a");
  } else {
    hideElement(phoneContainer, "a");
    showElement(wrapper, "a");
  }
}

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
  const uniqueStorageValues = new Set([...arr1.map(item => item.storage), ...arr2.map(item => item.storage)]);

  // Sort the unique storage values
  const sortedStorageValues = Array.from(uniqueStorageValues).sort((a, b) => toGB(a) - toGB(b));

  // Initialize new aligned arrays with placeholders
  const newArr1 = [];
  const newArr2 = [];

  // Align storage values and fill placeholders
  sortedStorageValues.forEach(value => {
    const obj1 = arr1.find(item => item.storage === value);
    const obj2 = arr2.find(item => item.storage === value);

    newArr1.push(obj1 ? obj1 : { storage: value, co2e: '--' });
    newArr2.push(obj2 ? obj2 : { storage: value, co2e: '--' });
  });

  for (let i = 0; i < newArr1.length; i++) {
    if (newArr1[i].co2e == '--') {
      newArr1[i].storage = '--';
    }
    if (newArr2[i].co2e == "--") {
      newArr2[i].storage = "--";
    }
  }
  return [newArr1, newArr2];
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
  const phoneModel = importPhoneModel();
  const phoneModelContainer = shadowRoot.querySelector(".phone-model-container");
  phoneModelContainer.innerHTML = "";
  phoneModel.forEach((phone, index) => {
    const phoneElement = document.createElement("p");
    phoneElement.className = `phone-model-text br-4${
      index === phoneModel.length - 1 ? " last" : ""
    }`;
    phoneElement.id = phone.id;
    phoneElement.textContent = phone.device;
    phoneModelContainer.appendChild(phoneElement);
  });
}

// Displays the carbon emission of the phone being analyzed in the web page.
function displayPhoneSpecEmissions() {
  const data = getSampleData();

  const container = shadowRoot.querySelector(".phone-spec-container");
  const footprints = data.carbonFootprint;
  const deviceName = data.device;

  container.innerHTML += `
    <p class="phone-spec-title eco-bold" id="currentPhone"><b>${deviceName} Carbon Emissions</b></p>
  `;

  let mostGreenOption = footprints[0];
  footprints.forEach((option) => {
    const co2eValue = parseFloat(option.co2e.split(" ")[0]);
    const mostGreenCo2eValue = parseFloat(mostGreenOption.co2e.split(" ")[0]);
    if (co2eValue < mostGreenCo2eValue) {
      mostGreenOption = option;
    }
  });

  footprints.forEach((option, index) => {
    const co2eValue = parseFloat(option.co2e.split(" ")[0]);
    const mostGreenCo2eValue = parseFloat(mostGreenOption.co2e.split(" ")[0]);
    const percentageIncrease =
      ((co2eValue - mostGreenCo2eValue) / mostGreenCo2eValue) * 100;

    const isMostGreen = option.storage === mostGreenOption.storage;
    container.innerHTML += `
      <div class="details-container fz-16" id=${index + '-c'}>
        <div class="flex-center ${isMostGreen ? "most-green" : ""} cg-4">
          <p class="eco-bold"><b>${option.storage} </b>&nbsp;</p>
          ${
            isMostGreen
              ? `<img src="${most_green_icon}" class="icon-16" alt="Most eco-friendly option">`
              : `<span class="red-text fz-12">(+${percentageIncrease.toFixed(
                  0
                )}% emissions)</span>`
          }
        </div>
        <div class="flex-center co2e-data-container pd-8 br-8 cg-4 lexend-reg">
          <p class="margin-0">${option.co2e}</p>
          <img src="${equivalent_icon}" class="icon-16" alt="Equivalent to">
          <div class="flex-center cg-4">
            <p class="margin-0 grey-text fz-16">${(co2eValue / 1.15).toFixed(
              2
            )} kg of trash burned</p>
            <img src="${fire_grey_icon}" class="icon-16" alt="Trash">
          </div>
        </div>
      </div>
      `;
  });

  // const phoneSpecTitle = document.querySelector(".phone-spec-title");
  // scrollToElement(phoneSpecTitle);
}

// Use this function to display a loading animation while waiting for the API calls
async function hidePhoneLoadingIcon() {
  console.log('got inside hideLoadingIcon');
  let loadingBox = shadowRoot.querySelector(".loading-box");
  if (loadingBox) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Adding hidden-a class to loadingBox');
        loadingBox.classList.add('hidden-a');
        console.log('hidden-a class added:', loadingBox.classList);
        console.log('loading-box: ', loadingBox);
        resolve();
      }, 1500);
    });
  } else {
    console.error('loadingBox not found');
    return Promise.resolve();
  }
}

function hideFreightLoadingIcon() {
  console.log('got inside hideLoadingIcon');
  let loadingBox = shadowRoot.querySelector(".loading-box-2");
  if (loadingBox) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Adding hidden-a class to loadingBox');
        loadingBox.classList.add('hidden-a');
        console.log('hidden-a class added:', loadingBox.classList);
        console.log('loading-box: ', loadingBox);
        resolve();
      }, 1500);
    });
  } else {
    console.error('loadingBox not found');
    return Promise.resolve();
  }
}

/**
 * Shows an element. Only works with flex and block elements
 * @param {element} element The element to be shown
 * @param {*} version The animation style. If no version is given, use the default style
 */
function showElement(element, version) {
  if (version === 'a') {
    if (element.classList.contains('flex-center')) {
      element.style.display = "flex";
    } else {
      element.style.display = "block";
    }
    requestAnimationFrame(() => {
      element.classList.remove("hidden-a");
      element.classList.add("visible-a");
    });
  } else if (version === 'b') {
    if (element.classList.contains('flex-center')) {
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

/**
 * Hides an element. Only works with block elements
 * @param {element} element The element to be shown
 * @param {*} version The animation style. If no version is given, use the default style
 */
function hideElement(element, version) {
  if (version === 'a') {
    element.classList.remove("visible-a");
    element.classList.add("hidden-a");
    element.addEventListener('transitionend', function handleTransitionEnd() {
      if (element.classList.contains("hidden-a")) {
        element.style.display = "none";
      }
      element.removeEventListener("transitionend", handleTransitionEnd);
    });
  } else if (version === 'b') {
    element.classList.remove("visible-b");
    element.classList.add("hidden-b");
    element.addEventListener('transitionend', function handleTransitionEnd() {
      if (element.classList.contains("hidden-b")) {
        element.style.display = "none";
      }
      element.removeEventListener("transitionend", handleTransitionEnd);
    });
  }
}

function scrollToElement(element) {
  const y = element.getBoundingClientRect().top + window.scrollY;
  if (isEdge() || isSafari) {
    element.scrollIntoView();
  } else {
    window.scroll({
      top: y,
      behavior: "smooth",
    });
  }
}

function isEdge() {
  return /Edg/.test(navigator.userAgent);
}

function isSafari() {
  return /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
}

/**
   * Returns a JSON Object that contains the phone model and their respective carbon emissions
   * @returns {JSON} JSON Object
   */
function importPhoneModel() {
  const phoneModel = [
    {
      id: 1,
      device: "Samsung Galaxy S24 Ultra",
      carbonFootprint: [
        {
          storage: "256 GB",
          co2e: "26 kg CO2e",
        },
        {
          storage: "512 GB",
          co2e: "50 kg CO2e",
        },
        {
          storage: "1 TB",
          co2e: "98 kg CO2e",
        },
      ],
    },
    {
      id: 2,
      device: "Samsung Galaxy Z Flip 5",
      carbonFootprint: [
        {
          storage: "256 GB",
          co2e: "22 kg CO2e",
        },
        {
          storage: "512 GB",
          co2e: "44 kg CO2e",
        },
      ],
    },
    {
      id: 3,
      device: "OnePlus 12R",
      carbonFootprint: [
        {
          storage: "128 GB",
          co2e: "18 kg CO2e",
        },
        {
          storage: "256 GB",
          co2e: "36 kg CO2e",
        },
      ],
    },
    {
      id: 4,
      device: "Google Pixel 8 Pro",
      carbonFootprint: [
        {
          storage: "128 GB",
          co2e: "20 kg CO2e",
        },
        {
          storage: "256 GB",
          co2e: "40 kg CO2e",
        },
        {
          storage: "512 GB",
          co2e: "80 kg CO2e",
        },
      ],
    },
  ];
  return phoneModel;
}

/**
   * Returns a sample data containing the phone's model, storage, and carbon footprint.
   * @returns {JSON} a JSON Object
   */
function getSampleData() {
  return {
    device: "iPhone 15 Pro",
    carbonFootprint: [
      {
        storage: "128 GB",
        co2e: "12 kg CO2e",
      },
      {
        storage: "256 GB",
        co2e: "24 kg CO2e",
      },
      {
        storage: "512 GB",
        co2e: "48 kg CO2e",
      },
      {
        storage: "1 TB",
        co2e: "96 kg CO2e",
      },
    ],
  };
}

/**
 *
 * @param {String} fromLocation
 * @param {String} toLocation
 * @param {Number} cargoWeight the weight of the cargo in kg
 */
async function getFreightEmissions(fromLocation, toLocation, cargoWeight) {
  console.log('calling testClimatiqAPI...');
  const data = {
    route: [
      {
        location: {
          query: fromLocation,
          // query: "Seattle, Washington, 98154, United States"
        }
      },
      {
        transport_mode: "road"
      },
      {
        transport_mode: "sea"
      },
      {
        transport_mode: "road"
      },
      {
        location: {
          query: toLocation
          // query: "Suginami City, Tokyo, 168-0063, Japan"
        }
      }
    ],
    cargo: {
      weight: cargoWeight,
      // weight: 10,
      weight_unit: "kg"
    }
  };

  try {
    const response = await fetch(FREIGHT_URL + "/api/freight", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const responseData = await response.json();
    console.log('API Response: ', responseData);
    return responseData;
  } catch (error) {
    console.error('Error:', error);
  }
}

