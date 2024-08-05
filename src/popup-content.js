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
  injectPopupContent();
  const phoneContainer = shadowRoot.querySelector('.phone-container');
  console.log(phoneContainer); // This will log the element if it exists
}

// Function to fetch and inject CSS into the shadow DOM
async function loadCSS(url) {
  const response = await fetch(url);
  const cssText = await response.text();
  const style = document.createElement('style');
  style.textContent = cssText;
  shadowRoot.appendChild(style);
}

function injectPopupContent() {
  const lcaBanner = getLCABanner();
  masterContainer.insertAdjacentHTML('beforeend', lcaBanner);

  // 3 popup cases: phone, freight, cloud
  let popupCase = "phone";
  if (popupCase === "phone") {
    const phoneSkeleton = getPhoneEmissionsSkeleton();
    masterContainer.insertAdjacentHTML('beforeend', phoneSkeleton);
    // Stop input propogation of the search-phone input. Some websites have their own input behavior. We need to disable them.
    stopInputPropogation(shadowRoot.getElementById('search-phone'));
    // Delay the execution of showPhoneEmissions to ensure DOM elements are available
    setTimeout(() => {
      console.log('got in phone case');
      showPhoneEmissions();
    }, 0);
  } else if (popupCase === "freight") {
    const freightSkeleton = getFreightEmissionsSkeleton();
    masterContainer.insertAdjacentHTML('beforeend', freightSkeleton);
    setTimeout(() => {
      console.log('got in freight case');
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

function getFloatingLCAMenu() {
  const floatingMenu = `
    <div class="floating-lca-menu pd-16 br-8">
      <img src="${lca_48}" alt="LCA Image" class="icon-32">
    </div>
  `;
  return floatingMenu;
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
  await hideLoadingIcon();
  const phoneSpecContainer = shadowRoot.querySelector(".phone-spec-container");
  const comparePhone = shadowRoot.querySelector('.compare-phone');
  showElement(phoneSpecContainer);
  comparePhone.classList.remove('hidden-a');
  displayPhoneSpecEmissions();
  handlePhoneCompare();
  handlePhoneSearch();
}

async function showFreightEmissions() {
  shadowRoot.querySelector(".freight-container").classList.remove('hidden-a');
  await hideLoadingIcon2();
  const freightContent = shadowRoot.querySelector(".freight-content");
  showElement(freightContent);
}

function getFreightEmissionsSkeleton() {
  const freightEmissionsSkeleton = `
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
          <span class="fz-20"><b>652 kg CO2e</b></span>
          <div class="flex-center cg-4">
            <span class="">or 10.6 kg of trash burned</span>
            <img src="${fire_black_icon}" class="icon-16" alt="Trash">
          </div>
        </div>
        <div class="shipping-container">
          <p class="fz-12"><b>Shipping Details</b></p>
          <div class="shipping-info fz-12">
            <p class="from-to-text"><b>From:</b> Seattle, Washington, 98154, United States</p>
            <p class="from-to-text"><b>To:</b> Suginami City, Tokyo, 168-0063, Japan</p>
          </div>
        </div>
      </div>
    </div>
  `;
  return freightEmissionsSkeleton;
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
    hideElement(wrapper);
    showElement(phoneContainer);
  });

  const lcaBanner = shadowRoot.querySelector(".lca-banner");
  lcaBanner.insertAdjacentElement("afterend", wrapper);

  if (phoneContainer.classList.contains('hidden-a')) {
    hideElement(wrapper);
    showElement(wrapper);
  } else {
    hideElement(phoneContainer);
    showElement(wrapper);
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
            <p class="margin-0 grey-text fz-16">${(co2eValue * 0.88).toFixed(
              1
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
async function hideLoadingIcon() {
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

function hideLoadingIcon2() {
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

function showElement(element) {
  element.style.display = "block";
  requestAnimationFrame(() => {
    element.classList.remove("hidden-a");
    element.classList.add("visible-a");
  });
}

function hideElement(element) {
  element.classList.remove("visible-a");
  element.classList.add("hidden-a");
  element.addEventListener('transitionend', function handleTransitionEnd() {
    if (element.classList.contains("hidden-a")) {
      element.style.display = "none";
    }
    element.removeEventListener("transitionend", handleTransitionEnd);
  });
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

//  ***UNUSED COE: Sending data to popup.js ***************************

// sendFreightDataToPopup();
// // Sends freight information to popup.js to be analyzed
// function sendFreightDataToPopup() {
//   let allowedDomains = ["fedex.com", "ups.com"];
//   const currentDomain = window.location.hostname;
//   // Case: Fedex
//   if (currentDomain.includes(allowedDomains[0])) {
//     observeFedexDOM();
//   } else if (currentDomain.includes(allowedDomains[1])) {
//     console.log('filler');
//   }
// }
// function handleFedexButtonClick() {
//   console.log('called handleFedexButtonClick');
//   const fromAddressElement = document.getElementById("fromGoogleAddress");
//   const fromAddress = fromAddressElement ? fromAddressElement.value : '';
//   const toAddressElement = document.getElementById("toGoogleAddress");
//   const toAddress = toAddressElement ? toAddressElement.value : '';
//   console.log('fromAddress: ' + fromAddress);
//   console.log('toAddress: ' + toAddress);
//   // ~Send the addresses to the background.js script
//   chrome.runtime.sendMessage({
//     action: "sendAddresses",
//     data: { from: fromAddress, to: toAddress }
//   });
// }
// // Function to observe the DOM and add the event listener when the button in Fedex is created
// function observeFedexDOM() {
//   const observer = new MutationObserver((mutationsList, observer) => {
//     for (const mutation of mutationsList) {
//       if (mutation.type === 'childList') {
//         const fedexButton = document.getElementById("e2ePackageDetailsSubmitButtonRates");
//         if (fedexButton) {
//           fedexButton.addEventListener("click", handleFedexButtonClick);
//           observer.disconnect(); // Stop observing once the button is found and event listener is added
//           break;
//         }
//       }
//     }
//   });
//   observer.observe(document.body, { childList: true, subtree: true });
// }
