(function () {
	window.addEventListener("load", init);

	function init() {
    displayPhoneSpecEmissions();
	}

  function displayPhoneSpecEmissions() {
    const data = getSampleData();

    const container = document.querySelector('.phone-spec-container');
    const footprints = data.carbonFootprint;
    const deviceName = data.device;

    container.innerHTML += `
      <p class="phone-spec-title eco-bold"><b>${deviceName} Carbon Emissions</b></p>
    `;

    let mostGreenOption = footprints[0];
    footprints.forEach(option => {
      const co2eValue = parseFloat(option.co2e.split(' ')[0]);
      const mostGreenCo2eValue = parseFloat(mostGreenOption.co2e.split(' ')[0]);
      if (co2eValue < mostGreenCo2eValue) {
        mostGreenOption = option;
      }
    });

    footprints.forEach(option => {
      const co2eValue = parseFloat(option.co2e.split(' ')[0]);
			const mostGreenCo2eValue = parseFloat(mostGreenOption.co2e.split(' ')[0]);
			const percentageIncrease = ((co2eValue - mostGreenCo2eValue) / mostGreenCo2eValue) * 100;

      const isMostGreen = option.storage === mostGreenOption.storage;
      container.innerHTML += `
        <div class="details-container fz-16">
          <div class="flex-center ${
            isMostGreen ? "most-green" : ""} cg-4">
            <p class="eco-bold"><b>${option.storage} </b>&nbsp;</p>
            ${
              isMostGreen
                ? '<img src="../assets/img/most-green-icon.png" class="icon-16" alt="Most eco-friendly option">'
                : `<span class="red-text fz-12">(+${percentageIncrease.toFixed(0)}% emissions)</span>`
            }
          </div>
          <div class="flex-center co2e-data-container pd-8 br-8 cg-4 lexend-reg">
            <p class="margin-0">${option.co2e}</p>
            <img src="../assets/img/equivalent-icon.png" class="icon-16" alt="Equivalent to">
            <div class="flex-center cg-4">
              <p class="margin-0 grey-text">${(co2eValue * 0.88).toFixed(1)} kg of trash burned</p>
              <img src="../assets/img/fire-grey-icon.png" class="icon-16" alt="Trash">
            </div>
          </div>
        </div>
        `;
    });
  }

  /**
   * Returns a sample data containing the phone's model, storage, and carbon footprint.
   * @returns {JSON} a JSON Object
   */
  function getSampleData() {
    return {
      "device": "iPhone 15 Pro",
      "carbonFootprint": [
        {
          "storage": "128GB",
          "co2e": "12 kg CO2e"
        },
        {
          "storage": "256GB",
          "co2e": "24 kg CO2e"
        },
        {
          "storage": "512GB",
          "co2e": "48 kg CO2e"
        },
        {
          "storage": "1 TB",
          "co2e": "96 kg CO2e"
        }
      ]
    };
  }

})();

