
// Utilities function for modifying the UI of different features

/**
 * Handles the changing of different reference units for phone emissions flow.
 * (i.e. changing between "~ kg of trash burned", "~ of miles driven", and "~ of trees cut down" every 3 seconds)
 * @param {Element} selector e.g. the document object, the shadow root, ...
 * @param {Boolean} isRawMaterial
 */
export function handleCO2eEquivalencyChange(selector, isRawMaterial = false) {
  if (isRawMaterial) {
    selector = document;
  }
  const unitSelect = selector.getElementById("lca-viz-unit-select");
  const unitDivsContainer = selector.querySelectorAll(
    ".lca-viz-unit-container"
  );
  // Initialize: show the first unit-div by default
  let currentIndex = 0;
  if (unitSelect && unitDivsContainer) {
    console.log("CALLING handleCO2EquivalencyChange");
    unitDivsContainer.forEach((container) => {
      container.children[currentIndex].classList.add("lca-viz-show");
    });

    unitSelect.addEventListener("change", (e) => {
      const selectedIndex = parseInt(e.target.value);
      console.log("selectedIndex = " + selectedIndex);
      showSelectedUnit(selectedIndex);
    });
  } else {
    console.log("handleCO2EquivalencyChange CANNOT be called");
  }

  // Function to change the displayed unit-div based on dropdown selection
  function showSelectedUnit(index) {
    unitDivsContainer.forEach((container) => {
      console.log("currentIndex = " + currentIndex);
      console.log("newIndex = " + index);
      const oldUnitDiv = container.children[currentIndex];
      const newUnitDiv = container.children[index];
      console.log("unitDivs = ");
      console.dir(oldUnitDiv);
      // Hide the current unit-div
      oldUnitDiv.classList.remove("lca-viz-show");
      oldUnitDiv.classList.add("lca-viz-hide");

      // After fade-out, remove the hide class and show the selected unit
      setTimeout(() => {
        oldUnitDiv.classList.remove("lca-viz-hide");
        newUnitDiv.classList.add("lca-viz-show");
        currentIndex = index;
      }, 300);
    });
  }
}