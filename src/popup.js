(function () {
  window.addEventListener("load", init);

  function init() {
    displayPhoneSpecEmissions();
    handlePhoneCompare();
    handlePhoneSearch();

    const closeExtension = document.querySelector(".close-container");
    closeExtension.addEventListener("click", () => {
      window.close();
    });
  }

  // Handles searching for a phone model from the database
  function handlePhoneSearch() {
    const searchInput = document.getElementById("search-phone");
    searchInput.addEventListener("keyup", search);
  }

  // Searches the phone model from the database
  function search() {
    let input = document.getElementById("search-phone");
    let filter = input.value.toUpperCase();
    let container = document.querySelector(".phone-model-container");
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
    const compareBtn = document.querySelector(".compare-btn");
    const comparePhone = document.querySelector(".compare-phone");
    const compareContainer = document.querySelector(".compare-container");
    const slideContent = document.querySelector(".slide-content");

    compareBtn.addEventListener("click", async () => {
      await populatePhoneModel();
      comparePhone.classList.add("down");
      compareContainer.classList.add("hide");
      slideContent.classList.add("slide-down");
      handleSideBySideSelection();
    });

    const closeBtn = document.querySelector(".close-phone-btn");
    closeBtn.addEventListener("click", () => {
      comparePhone.classList.remove("down");
      compareContainer.classList.remove("hide");
      slideContent.classList.remove("slide-down");
    });
  }

  // Handles the selection of a phone model in the list
  function handleSideBySideSelection() {
    const phoneNodeList = document.querySelector(".phone-model-container").children;
    Array.from(phoneNodeList).forEach((phone) => {
      phone.addEventListener("click", (event) => {
        const phoneId = parseInt(event.target.id);

        const comparePhone = document.querySelector(".compare-phone");
        const compareContainer = document.querySelector(".compare-container");
        const slideContent = document.querySelector(".slide-content");
        comparePhone.classList.remove("down");
        compareContainer.classList.remove("hide");
        slideContent.classList.remove("slide-down");

        displaySideBySideComparison(phoneId);
      });
    });
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

  // Display a side-by-side carbon emissions comparison of two phones
  function displaySideBySideComparison(phoneId) {
    const phoneModelList = importPhoneModel();

    const currentPhone = getSampleData();
    const comparedPhone = phoneModelList.find((phone) => phone.id === phoneId);

    const wrapper = document.querySelector(".side-by-side-section");
    const phoneSpecContainer = document.querySelector(".phone-spec-container");

    let specContainer = document.querySelector('.side-by-side-spec-container');
    specContainer.innerHTML = "";
    specContainer.innerHTML += `
      <p class="margin-0 side-phone-text fz-16"><b>${currentPhone.device}</b></p>
      <p class="margin-0 side-phone-text fz-16"><b>${comparedPhone.device}</b></p>
      <img src="../assets/img/red-trash-icon.png" class="icon-16 trash-btn" alt="remove device">
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
                ? '<img src="../assets/img/most-green-icon.png" class="icon-16" alt="Most eco-friendly option">'
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
                ? '<img src="../assets/img/most-green-icon.png" class="icon-16" alt="Most eco-friendly option">'
                : ""
            }
          </div>
          <div class="flex-center co2e-data-container pd-8 br-8 cg-4 lexend-reg">
            <p class="margin-0">${comparedArray[i].co2e}</p>
          </div>
        </div>
      `;
    }

    const trashBtn = specContainer.querySelector(".trash-btn");
    console.log("trashBtn: ", trashBtn);
    trashBtn.addEventListener("click", () => {
      hideElement(wrapper);
      showElement(phoneSpecContainer);
    });

    const lcaBanner = document.querySelector(".lca-banner");
    lcaBanner.insertAdjacentElement("afterend", wrapper);

    hideElement(phoneSpecContainer);
    showElement(wrapper);

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
    const phoneModelContainer = document.querySelector(".phone-model-container");
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

  // Displays the carbon emission of the phone being analyzed in the web page.
  function displayPhoneSpecEmissions() {
    const data = getSampleData();

    const container = document.querySelector(".phone-spec-container");
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
                ? '<img src="../assets/img/most-green-icon.png" class="icon-16" alt="Most eco-friendly option">'
                : `<span class="red-text fz-12">(+${percentageIncrease.toFixed(
                    0
                  )}% emissions)</span>`
            }
          </div>
          <div class="flex-center co2e-data-container pd-8 br-8 cg-4 lexend-reg">
            <p class="margin-0">${option.co2e}</p>
            <img src="../assets/img/equivalent-icon.png" class="icon-16" alt="Equivalent to">
            <div class="flex-center cg-4">
              <p class="margin-0 grey-text">${(co2eValue * 0.88).toFixed(
                1
              )} kg of trash burned</p>
              <img src="../assets/img/fire-grey-icon.png" class="icon-16" alt="Trash">
            </div>
          </div>
        </div>
        `;
    });
  }

  function showElement(element) {
    element.classList.remove("hidden");
    element.classList.add("visible");
  }

  function hideElement(element) {
    element.classList.add("hidden");
    element.classList.remove("visible");
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
})();

