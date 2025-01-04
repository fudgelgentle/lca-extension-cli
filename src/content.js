/* eslint-disable no-unused-vars */
// content.js handles the following scenario:
// 1. Displaying carbon chart on raw materials

import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";
const lca_48 = chrome.runtime.getURL("../assets/img/lca-48.png");
const off_lca_btn = chrome.runtime.getURL("../assets/img/off-lca-btn.png");
const loading_icon_2 = chrome.runtime.getURL(
  "../assets/img/loading-icon-2.gif"
);
const close_icon_red = chrome.runtime.getURL(
  "../assets/img/close-icon-red.png"
);
const question_icon = chrome.runtime.getURL("../assets/img/question-icon.png");
export const expand_icon_wide = chrome.runtime.getURL(
  "../assets/img/expand-icon-wide.png"
);
const collapse_icon_wide = chrome.runtime.getURL(
  "../assets/img/collapse-icon-wide.png"
);
export const lca_32 = chrome.runtime.getURL("../assets/img/lca-32.png");

import { convertToWatts, getTotalEmissionsHTML, updateTotalEmissions } from "./material-utils";
import { convertToSeconds } from "./material-utils";
import { findByIndex } from "./material-utils";
import { createRatioSection } from "./material-utils";
import { getParam } from "./material-utils";
import { extractEmissionsFactor } from "./material-utils";
import { getQuestionLCA } from "./material-utils";
import {
  getFreightData,
  hideAndClearMasterContainer,
  hidePopup,
  setupLCABannerAndFloatingMenu,
  handleCO2eEquivalencyChange,
  shadowRoot,
  getReadableCO2e,
  formatToSignificantFigures,
  getBeefInfo
} from "./popup-content";
import { injectPopupContent } from "./popup-content";
import { updateFreightContent } from "./popup-content";
import { getMasterContainer } from "./popup-content";
import { getCloudEmissionsResult } from "./popup-content";
import { displayCloudEmissions } from "./popup-content";
import { showMasterContainer } from "./popup-content";

let chart;
let chartContainer;
let currentChartData;
let selectionTimeout;
let LCAActionBtnContainer;

let mouseX;
let mouseY;
// Get the scroll offsets
let scrollX;
let scrollY;

let chartPosX, chartScrollX, chartPosY, chartScrollY;

let highlightTimeout;

// Global variable to keep track of the previously highlighted node
let previousHighlightedNode = null;
// currentHighlightedNode is only used with raw material scenario to keep track of the edited sentences.
let currentHighlightedNode = null;

let isAssistantActive = false;
let isPopupActive = false;

// The current scenario, either "freight" or "energy"
let currScenario = null;

// The 5 global variables below are used to store data for the energy scenario (which is used to update the energy data).
let wattage = 0;
let energyEFactor = 0;
let emissionsPerKwh = 0;
let durationEVal;
let durationEUnit;

let globalSelectionData = {
  parentNode: null, // Will store a Node
  range: null, // Will store a Range
  selection: null, // Will store a Selection
};

let relatedMaterialHTML = ``;
let independentMaterialHTML = ``;
let processesHTML = ``;

const LCA_SERVER_URL = "https://lca-server-api.fly.dev";
const LCA_PY_SERVER_URL = "https://lca-py-server.fly.dev";

Chart.register(ChartDataLabels);

let isBrushEnabled = false;
let masterQContainer;
let floatingQMenu;
let shadowQRoot;

// Keeps track of the original value for the time and its unit for energy scenario.
let eTimeString;
let eTimeUnitString;

window.onload = async () => {
  console.log("loading resouces........");
  const createLinkElement = (rel, href, crossorigin) => {
    let link = document.createElement("link");
    link.rel = rel;
    link.href = href;
    if (crossorigin) {
      link.crossOrigin = crossorigin;
    }
    document.head.appendChild(link);
  };

  // TODO: Only load in the CSS if the url is valid
  // const allowedDomains = ["nature.com", "acm.org", "arxiv.org", "acs.org", "wiley.com", "fedex.com", "azure.com", "fly.dev"];
  // const allowedDomains2 = ["amazon.com", "bestbuy.com", "apple.com", "store.google.com", "samsung.com", "oppo.com", "huawei.com", "lenovo.com"];
  // if (isDomainValid(allowedDomains) || isDomainValid(allowedDomains2)) {
  const blackListedDomains = ["chatgpt.com", "youtube.com"];
  if (!isDomainValid(blackListedDomains)) {
    let fontRegular = new FontFace(
      "Lexend",
      `url(${chrome.runtime.getURL("assets/fonts/lexend-regular.woff")})`,
      {
        weight: "400",
      }
    );
    let fontBold = new FontFace(
      "Lexend",
      `url(${chrome.runtime.getURL("assets/fonts/lexend-bold.woff")})`,
      {
        weight: "700",
      }
    );
    document.fonts.add(fontRegular);
    document.fonts.add(fontBold);
    fontRegular.load();
    fontBold.load();

    createLinkElement(
      "stylesheet",
      chrome.runtime.getURL("assets/content-style.css")
    );
    createLinkElement(
      "stylesheet",
      chrome.runtime.getURL("assets/popup-content.css")
    );

    const blackList = [
      "azure.com",
      "fedex.com",
      "amazon.com",
      "bestbuy.com",
      "apple.com",
      "store.google.com",
      "samsung.com",
      "oppo.com",
      "huawei.com",
      "lenovo.com",
    ];
    if (!isDomainValid(blackList)) {
      console.log("domain NOT in blacklist");
      await init();
    } else {
      console.log("domain in blacklist");
    }
  }
};

async function init() {
  console.log("creating shadow root........");
  // * Shadow root creation process
  masterQContainer = document.createElement("div");
  masterQContainer.setAttribute("role", "main");
  masterQContainer.setAttribute("id", "lca-viz-question-container");
  masterQContainer.classList.add("lexend", "br-8", "fz-16");
  masterQContainer.setAttribute("tabindex", "0");
  // masterContainer.classList.add("hidden");
  document.body.append(masterQContainer);
  const placeholder = document.createElement("div");
  placeholder.setAttribute("id", "placeholder-2");
  document.body.append(placeholder);
  shadowQRoot = placeholder.attachShadow({ mode: "open" });
  shadowQRoot.appendChild(masterQContainer);

  await injectCSSToShadowDOM(
    chrome.runtime.getURL("../assets/content-style.css")
  );
  await injectCSSToShadowDOM(
    chrome.runtime.getURL("../assets/popup-content.css")
  );
  // ********************************

  // Function to fetch and inject CSS into the shadow DOM
  async function injectCSSToShadowDOM(url) {
    const response = await fetch(url);
    const cssText = await response.text();
    const style = document.createElement("style");
    style.textContent = cssText;
    shadowQRoot.appendChild(style);
  }

  const storedStates = await chrome.storage.sync.get("brush");
  isBrushEnabled = storedStates.brush || false;
  if (isBrushEnabled) {
    console.log("brush enabled. turning on trackRawMaterial()");
    // trackRawMaterial();
    trackAllScenario();
  } else {
    console.log("brush disabled.");
  }

  /**
   * Calculates the coordinates of an HTML element relative to the entire document.
   * @param {Element} element The target HTML element
   * @returns {Object} An object containing the `x` and `y` coordinates.
   */
  function getElementCoordinates(element) {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
    };
  }

  function handleDraggableMap() {
    const map = document.getElementById("lca-viz-map");
    map.addEventListener("mousedown", (e) => {
      console.log("detected mousedown");
      let shiftX = e.clientX - map.getBoundingClientRect().left;
      let shiftY = e.clientY - map.getBoundingClientRect().top;

      function moveAt(clientX, clientY) {
        map.style.left = clientX - shiftX + scrollX + "px";
        map.style.top = clientY - shiftY + scrollY + "px";
      }

      function onMouseMove(e) {
        moveAt(e.clientX, e.clientY);
      }

      function onMouseUp() {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);

      // Prevent the default drag and drop behavior
      map.ondragstart = () => {
        return false;
      };
    });
  }

  function activeUpDownBtn() {
    const upDownBtn = document.querySelectorAll(".lca-viz-up-down-btn");
    const parameterText = document.querySelectorAll(".lca-viz-special-text-2");

    upDownBtn.forEach((btn) => {
      if (btn.classList.contains("lca-viz-active")) {
        replaceClass(btn, "lca-viz-active", "lca-viz-inactive");
      } else {
        replaceClass(btn, "lca-viz-inactive", "lca-viz-active");
      }
    });
    parameterText.forEach((text) => {
      if (text.classList.contains("lca-viz-active-st")) {
        replaceClass(text, "lca-viz-active-st", "lca-viz-inactive-st");
      } else {
        replaceClass(text, "lca-viz-inactive-st", "lca-viz-active-st");
      }
    });
  }

  function handleUpDownBtnBehavior() {
    // ! case: ratio
    const toggleOnContainers = document.querySelectorAll(
      ".lca-viz-param-toggle-on"
    );
    if (toggleOnContainers) {
      toggleOnContainers.forEach((container) => {
        const ratioUpBtnList = container.querySelectorAll(".lca-viz-up");
        const ratioDownBtnList = container.querySelectorAll(".lca-viz-down");
        for (let j = 0; j < ratioUpBtnList.length; j++) {
          const index = parseInt(
            ratioUpBtnList[j].parentElement
              .querySelector(".lca-viz-parameter-text")
              .id.match(/\d+$/)[0]
          );
          ratioUpBtnList[j].addEventListener("click", () => {
            updateValueRatio(1, index);
          });
          ratioDownBtnList[j].addEventListener("click", () => {
            updateValueRatio(-1, index);
          });
        }
        const inputNodeList = container.querySelectorAll(".input-ratio");
        inputNodeList.forEach((input) => {
          input.addEventListener("input", () => {
            const newWeight = parseFloat(input.value);
            if (newWeight >= 1) {
              const index = parseInt(input.id.match(/\d+$/)[0]);
              updateValueRatio(0, index, newWeight);
            }
          });
        });
      });
    }

    // ! case: independent - togle off
    const toggleOffContainers = document.querySelectorAll(
      ".lca-viz-param-toggle-off"
    );
    if (toggleOffContainers) {
      toggleOffContainers.forEach((container) => {
        const ratioUpBtnList = container.querySelectorAll(".lca-viz-up");
        const ratioDownBtnList = container.querySelectorAll(".lca-viz-down");
        for (let j = 0; j < ratioUpBtnList.length; j++) {
          const index = parseInt(
            ratioUpBtnList[j].parentElement
              .querySelector(".lca-viz-parameter-text")
              .id.match(/\d+$/)[0]
          );
          ratioUpBtnList[j].addEventListener("click", () => {
            updateValue(1, index);
          });
          ratioDownBtnList[j].addEventListener("click", () => {
            updateValue(-1, index);
          });
        }
        const inputNodeList = container.querySelectorAll(".input-normal");
        inputNodeList.forEach((input) => {
          input.addEventListener("input", () => {
            const newWeight = parseFloat(input.value);
            if (newWeight >= 1) {
              const index = parseInt(input.id.match(/\d+$/)[0]);
              updateValue(0, index, newWeight);
            }
          });
        });
      });
    }

    // ! independent - normal
    const independentContainer = document.querySelector(
      ".lca-viz-independent-container"
    );
    if (independentContainer) {
      const ratioUpBtnList =
        independentContainer.querySelectorAll(".lca-viz-up");
      const ratioDownBtnList =
        independentContainer.querySelectorAll(".lca-viz-down");
      for (let j = 0; j < ratioUpBtnList.length; j++) {
        const index = parseInt(
          ratioUpBtnList[j].parentElement
            .querySelector(".lca-viz-parameter-text")
            .id.match(/\d+$/)[0]
        );
        ratioUpBtnList[j].addEventListener("click", () => {
          updateValue(1, index);
        });
        ratioDownBtnList[j].addEventListener("click", () => {
          updateValue(-1, index);
        });
      }
      const inputNodeList =
        independentContainer.querySelectorAll(".input-normal");
      inputNodeList.forEach((input) => {
        input.addEventListener("input", () => {
          const newWeight = parseFloat(input.value);
          if (newWeight >= 1) {
            const index = parseInt(input.id.match(/\d+$/)[0]);
            updateValue(0, index, newWeight);
          }
        });
      });
    }

    // !case: proccesses
    // TODO:
    // handleProcesses();
    // handleIntextProcesses();
  }

  function handleProcesses() {
    // Select all instances of lca-viz-param-fill parameters
    const flexCenterContainers = document.querySelectorAll(
      ".lca-viz-processes-container .lca-viz-param-fill"
    );

    flexCenterContainers.forEach((flexCenterContainer) => {
      const processesContainers =
        flexCenterContainer.querySelectorAll(".lca-viz-processes");

      if (processesContainers) {
        processesContainers.forEach((container) => {
          const ratioUpBtnList = container.querySelectorAll(".lca-viz-up");
          const ratioDownBtnList = container.querySelectorAll(".lca-viz-down");

          for (let i = 0; i < ratioUpBtnList.length; i++) {
            const inputNode = ratioUpBtnList[i].parentElement.querySelector(
              ".lca-viz-parameter-text"
            );
            const index = parseInt(inputNode.id.match(/\d+$/)[0]);
            const type = inputNode.dataset.type;

            ratioUpBtnList[i].addEventListener("click", () => {
              updateValueProcesses(1, index, inputNode);
              const selector =
                ".lca-viz-up-down-btn-master-" + index + "-" + type;
              const syncContainer = document.querySelector(selector);
              const targetInput = syncContainer.querySelector(
                `.lca-viz-parameter-text[data-type="${type}"]`
              );
              syncInputs(targetInput, inputNode);
            });

            ratioDownBtnList[i].addEventListener("click", () => {
              updateValueProcesses(-1, index, inputNode);
              const selector =
                ".lca-viz-up-down-btn-master-" + index + "-" + type;
              const syncContainer = document.querySelector(selector);
              const targetInput = syncContainer.querySelector(
                `.lca-viz-parameter-text[data-type="${type}"]`
              );

              syncInputs(targetInput, inputNode);
            });
          }

          const inputNodeList = container.querySelectorAll(".input-normal");
          inputNodeList.forEach((inputNode) => {
            inputNode.addEventListener("input", () => {
              const newWeight = parseFloat(inputNode.value);
              const type = inputNode.dataset.type;
              const index = parseInt(inputNode.id.match(/\d+$/)[0]);

              const selector =
                ".lca-viz-up-down-btn-master-" + index + "-" + type;
              const syncContainer = document.querySelector(selector);
              const targetInput = syncContainer.querySelector(
                `.lca-viz-parameter-text[data-type="${type}"]`
              );

              if (newWeight >= 1) {
                updateValueProcesses(0, index, inputNode, newWeight);
                syncInputs(targetInput, inputNode);
              }
            });
          });
        });
      }
    });
  }

  function handleIntextProcesses() {
    const highlightContainer = document.querySelector(
      ".lca-viz-highlight-container"
    );

    // up button
    const upBtnList = highlightContainer.querySelectorAll(".lca-viz-up");
    for (let i = 0; i < upBtnList.length; i++) {
      const inputNode = upBtnList[i].parentElement.parentElement.querySelector(
        ".lca-viz-parameter-text"
      );
      const index = parseInt(inputNode.id.match(/\d+$/)[0]);
      const type = inputNode.dataset.type;

      upBtnList[i].addEventListener("click", () => {
        updateValueProcesses(1, index, inputNode, undefined, true);
        const selector = ".lca-viz-control-" + index + "-" + type;
        const syncContainer = document.querySelector(selector);
        const targetInput = syncContainer.querySelector(
          `.lca-viz-parameter-text[data-type="${type}"]`
        );
        syncInputs(targetInput, inputNode);
      });
    }
    // down button
    const downBtnList = highlightContainer.querySelectorAll(".lca-viz-down");
    for (let i = 0; i < downBtnList.length; i++) {
      const inputNode = downBtnList[
        i
      ].parentElement.parentElement.querySelector(".lca-viz-parameter-text");
      const index = parseInt(inputNode.id.match(/\d+$/)[0]);
      const type = inputNode.dataset.type;

      downBtnList[i].addEventListener("click", () => {
        updateValueProcesses(-1, index, inputNode, undefined, true);
        const selector = ".lca-viz-control-" + index + "-" + type;
        const syncContainer = document.querySelector(selector);
        const targetInput = syncContainer.querySelector(
          `.lca-viz-parameter-text[data-type="${type}"]`
        );
        syncInputs(targetInput, inputNode);
      });
    }

    // input
    const inputNodeList = highlightContainer.querySelectorAll(".input-normal");
    inputNodeList.forEach((inputNode) => {
      inputNode.addEventListener("input", () => {
        const newWeight = parseFloat(inputNode.value);
        const type = inputNode.dataset.type;
        const index = parseInt(inputNode.id.match(/\d+$/)[0]);

        const selector = ".lca-viz-control-" + index + "-" + type;
        const syncContainer = document.querySelector(selector);
        const targetInput = syncContainer.querySelector(
          `.lca-viz-parameter-text[data-type="${type}"]`
        );

        if (newWeight >= 1) {
          updateValueProcesses(0, index, inputNode, newWeight, true);
          syncInputs(targetInput, inputNode);
        }
      });
    });
  }

  /**
   * Syncs the targetInput to sourceInput. i.e. if source input has been changed,
   * the changes will be reflected on targetInput as well.
   * @param {*} targetInput The input you want to sync to.
   * @param {*} sourceInput The original source input.
   */
  function syncInputs(targetInput, sourceInput) {
    const newValue = sourceInput.value;
    if (targetInput && targetInput !== sourceInput) {
      // Sync value
      targetInput.value = newValue;
    }
  }

  function updateValueProcesses(
    weightChange,
    index,
    thisInput,
    newWeight = null,
    isIntext = false
  ) {
    // Gets the other input node
    let inputList;
    let otherInput;
    if (isIntext) {
      // Selects all elements that have this format: 'lca-viz-up-down-btn-master-0-<something>'
      const highlightContainer = document.querySelector(
        ".lca-viz-highlight-container"
      );
      inputList = highlightContainer.querySelectorAll(
        ".lca-viz-up-down-btn-master-" + index
      );
      console.log("finding: lca-viz-up-down-btn-master-" + index);
      console.log("intext inputList = ");
      console.log(inputList);
      if (
        inputList.length > 1 &&
        inputList[0].querySelector("input") === thisInput
      ) {
        otherInput = inputList[1].querySelector("input");
      } else {
        otherInput = inputList[0].querySelector("input");
      }
    } else {
      const parentContainer = thisInput.closest(".lca-viz-param-fill");
      inputList = parentContainer.querySelectorAll(".lca-viz-parameter-text");
      console.log("inputList = ");
      console.log(inputList);
      if (inputList.length > 1 && inputList[0] === thisInput) {
        otherInput = inputList[1];
      } else {
        otherInput = inputList[0];
      }
    }

    console.log("thisInput = ");
    console.log(thisInput);
    console.log("otherInput = ");
    console.log(otherInput);

    let displayWeight = parseFloat(thisInput.value);
    if (newWeight !== null) {
      displayWeight = newWeight;
    } else {
      if (weightChange < 0 && displayWeight < 1) {
        return;
      }
      displayWeight += weightChange;
    }
    thisInput.value = displayWeight;

    let power;
    let time;
    if (thisInput.dataset.type === "power") {
      power = convertToWatts(thisInput.value, thisInput.dataset.valueUnit);
      time = convertToSeconds(otherInput.value, otherInput.dataset.valueUnit);
    } else if (thisInput.dataset.type === "time") {
      power = convertToWatts(otherInput.value, otherInput.dataset.valueUnit);
      time = convertToSeconds(thisInput.value, thisInput.dataset.valueUnit);
    }
    // This is the 'weight' in kWh that will be used to update chart data
    const weightKwh = (power * time) / (1000 * 3600);
    updateChartData(weightKwh, index);
  }

  function updateValueRatio(weightChange, index, newWeight = null) {
    console.log("index = " + index);
    const inputNode = document.getElementById("input-ratio-no-" + index);
    const closestToggleContainer = inputNode.closest(
      ".lca-viz-param-toggle-on"
    );
    const inputNodetoggleOff = document.getElementById(
      "lca-viz-input-" + index
    );
    let currentWeight = parseInt(inputNode.value);

    if (newWeight !== null) {
      currentWeight = newWeight;
    } else {
      if (weightChange < 0 && currentWeight <= 1) {
        return;
      }
      currentWeight += weightChange;
    }

    const ratioValue = inputNode.dataset.ratioValue;
    const scalingFactor = currentWeight / ratioValue;

    updateChartData(currentWeight, index);
    inputNode.value = currentWeight;
    // inputNodetoggleOff.value = currentWeight;

    // calculate the new weight of the related materials
    const otherInputs = closestToggleContainer.querySelectorAll(".input-ratio");
    otherInputs.forEach((otherInputNode) => {
      if (otherInputNode.id !== "input-ratio-no-" + index) {
        console.log("currentWeight = " + otherInputNode.value);
        const otherNewWeight = parseFloat(
          (otherInputNode.dataset.ratioValue * scalingFactor).toFixed(2)
        );
        console.log("newWeight = " + otherNewWeight);
        const otherIndex = parseInt(otherInputNode.id.match(/\d+$/)[0]);
        updateChartData(otherNewWeight, otherIndex);
        const otherInputNodeToggleOff = document.getElementById(
          "lca-viz-input-" + otherIndex
        );
        otherInputNode.value = otherNewWeight;
        // otherInputNodeToggleOff.value = otherNewWeight;
      }
    });
  }

  /**
   * This update value works for independent materials, and toggle-off materials
   */
  function updateValue(weightChange, index, newWeight = null) {
    console.log("weightChange = " + weightChange);
    console.log("index = " + index);
    const inputNode = document.getElementById("lca-viz-input-" + index);
    console.log("inputNode = ");
    console.log(inputNode);
    let currentWeight = parseInt(inputNode.value);
    if (newWeight !== null) {
      currentWeight = newWeight;
    } else {
      if (weightChange < 0 && currentWeight <= 1) {
        return;
      }
      currentWeight += weightChange;
    }
    updateChartData(currentWeight, index);
    inputNode.value = currentWeight;
  }

  /**
   *
   * @param {number} newWeight The new value that is being displayed in the UI
   * @param {number} currentWeight The current weight of the parameter
   * @param {number} index The index of the raw material
   */
  function updateChartData(newWeight, index) {
    if (index !== -1) {
      let emissionsFactor = 0;
      const obj = findByIndex(currentChartData, index);
      emissionsFactor = extractEmissionsFactor(
        obj.carbon_emission_factor
      ).co2e_value;
      // emissionsFactor calculates the CO2-eq per kg value of a specific material.
      console.log("emissions factor = " + emissionsFactor);
      console.log("old emissions value: ", chart.data.datasets[0].data[index]);

      let newEmissionsValue = parseFloat(
        (emissionsFactor * newWeight).toFixed(2)
      );
      console.log("new emissions value: ", newEmissionsValue);
      chart.data.datasets[0].data[index] = newEmissionsValue;
      chart.update();

      const totalEmissions = getTotalEmissions();
      updateTotalEmissions(totalEmissions);
    }
  }

  /**
   * Handles the "toggle ratio button" that involes toggling between normal parameter vs ratio mode.
   * ! Note: can ONLY call this method ONCE
   */
  function handleToggleSwitch() {
    const toggleSwitches = document.querySelectorAll(".lca-viz-toggle-checkbox");
    const lcaVizMap = document.getElementById("lca-viz-map");
    const originalWidth = lcaVizMap.scrollWidth;
    console.log("originalWidth = " + originalWidth);

    function show(element) {
      element.classList.remove("hidden");
    }
    function hide(element) {
      element.classList.add("hidden");
    }

    toggleSwitches.forEach((toggleSwitch, index) => {
      toggleSwitch.addEventListener("change", () => {
        console.log("detected toggle switch clicking");
        const uniqueId = document.getElementById("lca-viz-r-section-" + index);
        const textDetails = uniqueId.querySelector(".lca-viz-ratio-detail-text");
        const paramToggleOn = uniqueId.querySelector(".lca-viz-param-toggle-on");
        const paramToggleOff = uniqueId.querySelector(".lca-viz-param-toggle-off");
        // const originalWidth = lcaVizMap.scrollWidth;
        const ratioTextList = uniqueId.querySelectorAll(".control-section");
        ratioTextList.forEach((div) => {
          if (div.innerText.length > 16) {
            div.classList.add("fz-12");
          }
        });

        // if (toggleSwitch.checked) {
        //   const ratioContainer = toggleSwitch.closest(".lca-viz-ratio-container");
        //   const inputList = ratioContainer.querySelectorAll(".input-ratio");
        //   inputList.forEach((input) => {
        //     const newWeight = input.dataset.ratioValue;
        //     const index = parseInt(input.id.match(/\d+$/)[0]);
        //     updateValueRatio(0, index, newWeight);
        //   });
        //   lcaVizMap.style.width = `${originalWidth}px`;
        //   setTimeout(() => {
        //     show(textDetails);
        //     hide(paramToggleOff);
        //     show(paramToggleOn);
        //     const newWidth = paramToggleOn.scrollWidth + 100;
        //     lcaVizMap.style.width = `${newWidth}px`;
        //   }, 0);
        //   paramToggleOn.style.width = "auto";
        //   textDetails.style.height = "auto";
        // } else {
        //   const ratioContainer = toggleSwitch.closest(".lca-viz-ratio-container");
        //   const inputList = ratioContainer.querySelectorAll(".input-normal");
        //   inputList.forEach((input) => {
        //     const newWeight = 1;
        //     const index = parseInt(input.id.match(/\d+$/)[0]);
        //     updateValue(0, index, newWeight);
        //   });

        //   setTimeout(() => {
        //     hide(textDetails);
        //     hide(paramToggleOn);
        //     show(paramToggleOff);
        //     lcaVizMap.style.width = `${originalWidth}px`;
        //   }, 0);
        // }
        if (toggleSwitch.checked) {
          const ratioContainer = toggleSwitch.closest(".lca-viz-ratio-container");
          const inputList = ratioContainer.querySelectorAll(".input-normal");
          inputList.forEach((input) => {
            const newWeight = 1;
            const index = parseInt(input.id.match(/\d+$/)[0]);
            updateValue(0, index, newWeight);
          });
          lcaVizMap.style.width = `${originalWidth}px`;
          setTimeout(() => {
            hide(textDetails);
            hide(paramToggleOn);
            show(paramToggleOff);
            const newWidth = paramToggleOff.scrollWidth;
            lcaVizMap.style.width = `${newWidth}px`;
          }, 0);
          // paramToggleOn.style.width = "auto";
          // textDetails.style.height = "auto";
        } else {
          const ratioContainer = toggleSwitch.closest(".lca-viz-ratio-container");
          const inputList = ratioContainer.querySelectorAll(".input-ratio");
          inputList.forEach((input) => {
            const newWeight = input.dataset.ratioValue;
            const index = parseInt(input.id.match(/\d+$/)[0]);
            updateValueRatio(0, index, newWeight);
          });
          lcaVizMap.style.width = `${originalWidth}px`;
          setTimeout(() => {
            show(textDetails);
            hide(paramToggleOff);
            show(paramToggleOn);
            const newWidth = paramToggleOn.scrollWidth + 100;
            lcaVizMap.style.width = `${newWidth}px`;
          }, 0);
          // paramToggleOn.style.width = "auto";
          // textDetails.style.height = "auto";
        }
        paramToggleOn.style.width = "auto";
        textDetails.style.height = "auto";
      });
    });
  }
  /**
   * Removes the old class from the element and adds in the new class.
   * @param {HTMLElement} element the target html element
   * @param {String} oldClass the class to be removed
   * @param {String} newClass the class to be added
   */
  function replaceClass(element, oldClass, newClass) {
    element.classList.remove(oldClass);
    element.classList.add(newClass);
  }

  /**
   * Makes the highlighted text background color turn green, and displays carbon information based on scenarios
   * that is returned from the JSON (scenarios can either be: raw material, freight, or energy)
   * @param {Node} parentNode The parent node
   * @param {Range} range The range of the selected text
   * @param {Selection} selection The selected text
   */
  async function makeHighlightTextInteractive(parentNode, range, selection) {
    if (selection.toString() !== "" && selection.toString().length > 2) {
      // Visually reset the previous highlighted node if it exists
      // * For raw materials
      if (currentHighlightedNode) {
        // Store the current highlighted node as the previous highlighted node
        previousHighlightedNode = currentHighlightedNode;
        previousHighlightedNode.removeEventListener("click", redisplayChart);
        resetHighlight(currentHighlightedNode);
      }
      // * Removing the assistant / question UI
      if (isAssistantActive) {
        console.log("Removing the question UI and master container");
        removeQuestionUI();
        hideAndClearMasterContainer();
        // clearMasterContainer();
      }
      // * Removing the popup UI
      if (isPopupActive) {
        console.log("Removing the popup UI and master container");
        hidePopup();
        hideAndClearMasterContainer();
        // clearMasterContainer();
      }
      const materialData = await getValidSentence(selection.toString());
      console.log('materialData: ')
      console.log(materialData);
      // * Case: raw materials
      if (materialData.raw_materials) {
        handleRawMaterialHighlight(materialData, parentNode, range, selection);
        // * Case: freight
      } else if (materialData.transport_phase) {
        currentHighlightedNode = null;
        handleFreightHighlight(materialData, parentNode, range, selection, selection.toString());
        // * Case: energy
      } else if (materialData.use_phase) {
        currentHighlightedNode = null;
        handleEnergyHighlight(materialData, parentNode, range, selection, selection.toString());
      } else {
        currentHighlightedNode = null;
        setLCAActionBtnState("error");
      }
    }
  }

  function handleRawMaterialHighlight(materialData, parentNode, range, selection){
    const materialList = materialData;
    const { rawMaterialNames, processesNames } = getMaterialNames(materialList);
    addHighlightBold(rawMaterialNames, parentNode, range, selection);
    hideLCAActionBtn();
    initializeChart(materialData);
  }

  /**
   * Handles the behavior for highlighting raw material data.
   */
  // function handleRawMaterialHighlight(materialData, parentNode, range, selection) {
  //   console.log("%j", materialData);
  //   const materialList = materialData;

  //   const fullText = parentNode.textContent;
  //   const startOffset = range.startOffset;
  //   const endOffset = range.endOffset;
  //   const startContainerText = range.startContainer.textContent;
  //   const endContainerText = range.endContainer.textContent;

  //   // Extract the segments of the text
  //   const beforeText = fullText.slice(0, fullText.indexOf(startContainerText) + startOffset);
  //   const highlightedText = selection.toString();
  //   const afterText = fullText.slice(fullText.indexOf(endContainerText) + endOffset);

  //   const div = document.createElement("div");
  //   div.classList.add("lca-viz-inline");

  //   let modifiedText = `<div class="lca-viz-mark lca-viz-inline">${highlightedText}</div>`;
  //   const { rawMaterialNames, processesNames } = getMaterialNames(materialList);
  //   rawMaterialNames.forEach((name) => {
  //     const escapedName = escapeRegExp(name);
  //     const regex = new RegExp(`\\b${escapedName}\\b`, "gi");
  //     modifiedText = modifiedText.replace(regex,`<span class="lca-viz-param-bold"><b>${name}</b></span>`);
  //   });

    // ! Don't delete this. This is for bolding the process name + adding the up-down-button in the sentence.
    // processesNames.forEach((process) => {
    //   const escapedName = escapeRegExp(process.name);
    //   const regexName = new RegExp(`\\b${escapedName}\\b`, "gi");
    //   modifiedText = modifiedText.replace(regexName,`<span class="lca-viz-param-bold"><b>${process.name}</b></span>`);

    //   const escapedPower = escapeRegExp(String(process.power_original));
    //   const regexPower = new RegExp(`\\b${escapedPower}\\b`, "gi");

    //   modifiedText = modifiedText.replace(regexPower,
    //     `
    //       <span class="lca-viz-origin-number lca-viz-hidden">${process.power_original}</span>
    //       <div class="lca-viz-processes-intext-${process.index} lca-viz-inline" data-value="${process.power_original}">
    //         ${createUpDownBtn(process.index, process.power_original_unit, process.power_original, "power")}
    //       </div>
    //     `
    //   );
      // <span class="lca-viz-original-time-text">${process.power_original}</span>
    //   const escapedTime = escapeRegExp(String(process.time_original));
    //   const regexTime = new RegExp(`\\b${escapedTime}\\b`, "gi");
    //   modifiedText = modifiedText.replace(
    //     regexTime,
    //     `
    //       <span class="lca-viz-origin-number lca-viz-hidden">${process.time_original}</span>
    //       <div class="lca-viz-processes-intext-${process.index} lca-viz-inline" data-value="${process.time_original}">
    //         ${createUpDownBtn(process.index, process.time_original_unit, process.time_original, "time")}
    //       </div>
    //     `
    //   );
    // });

  //   modifiedText =
  //     modifiedText +
  //     `
  //     <div class="lca-viz-inline" id="lca-viz-end">
  //       <img src="${off_lca_btn}" alt="Turn off the LCA visualizer" class="icon-10 off-lca-btn lca-viz-hidden">
  //     </div>
  //   `;
  //   // const markElement = `<mark class="lca-viz-mark">${modifiedText}</mark>`;
  //   div.innerHTML = modifiedText;

  //   currentHighlightedNode = div;
  //   console.log("setting currentHighlightedNode: ", div);
  //   const newClasses = ["lca-viz-highlight-container"];
  //   const newParentNode = replaceTagNameAndKeepStyles(parentNode, "div", newClasses);
  //   parentNode.parentNode.replaceChild(newParentNode, parentNode);
  //   parentNode = newParentNode;
  //   parentNode.innerHTML = "";
  //   if (beforeText) {
  //     parentNode.appendChild(document.createTextNode(beforeText));
  //   }
  //   parentNode.appendChild(div);
  //   if (afterText) {
  //     parentNode.appendChild(document.createTextNode(afterText));
  //   }
  //   // If the user clicks on the red 'off-lca-btn', the highlighted text will be removed entirely.
  //   const offLcaBtn = document.querySelector(".off-lca-btn");
  //   offLcaBtn.addEventListener("click", () => {
  //     currentHighlightedNode.removeEventListener("click", redisplayChart);
  //     resetHighlight(currentHighlightedNode);
  //     currentHighlightedNode = null;
  //   });
  //   hideLCAActionBtn();
  //   initializeChart(materialData);
  // }

  /**
   * Performs the action of adding a green highlight and a green bold text onto the highlighted sentence
   * @param {Boolean} addOffBtn Flag to determine if the 'off' button should be added to the end of the
   *                            highlighted sentence or not.
   */
  function addHighlightBold(nameList, parentNode, range, selection) {
    const fullText = parentNode.textContent;
    const startOffset = range.startOffset;
    const endOffset = range.endOffset;
    const startContainerText = range.startContainer.textContent;
    const endContainerText = range.endContainer.textContent;

    // Extract the segments of the text
    const beforeText = fullText.slice(0, fullText.indexOf(startContainerText) + startOffset);
    const highlightedText = selection.toString();
    const afterText = fullText.slice(fullText.indexOf(endContainerText) + endOffset);

    const div = document.createElement("div");
    div.classList.add("lca-viz-inline");

    let modifiedText = `<div class="lca-viz-mark lca-viz-inline">${highlightedText}</div>`;

    nameList.forEach((name) => {
      const escapedName = escapeRegExp(name);
      const regex = new RegExp(`\\b${escapedName}\\b`, "gi");
      modifiedText = modifiedText.replace(regex,`<span class="lca-viz-param-bold"><b>${name}</b></span>`);
    })

    modifiedText = modifiedText +
      `<div class="lca-viz-inline" id="lca-viz-end">
        <img src="${off_lca_btn}" alt="Turn off the LCA visualizer" class="icon-10 off-lca-btn lca-viz-hidden">
      </div>`;
    div.innerHTML = modifiedText;

    currentHighlightedNode = div;
    console.log("setting currentHighlightedNode: ", div);
    const newClasses = ["lca-viz-highlight-container"];
    const newParentNode = replaceTagNameAndKeepStyles(parentNode, "div", newClasses);
    parentNode.parentNode.replaceChild(newParentNode, parentNode);
    parentNode = newParentNode;
    parentNode.innerHTML = "";
    if (beforeText) {
      parentNode.appendChild(document.createTextNode(beforeText));
    }
    parentNode.appendChild(div);
    if (afterText) {
      parentNode.appendChild(document.createTextNode(afterText));
    }
    // If the user clicks on the red 'off-lca-btn', the highlighted text will be removed entirely.
    const offLcaBtn = document.querySelector(".off-lca-btn");
    offLcaBtn.addEventListener("click", () => {
      currentHighlightedNode.removeEventListener("click", redisplayChart);
      resetHighlight(currentHighlightedNode);
      currentHighlightedNode = null;
    });
  }

  // Escape special characters in material names for regex
  function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }


  function handleEnergyHighlight(data, parentNode, range, selection, textSource) {
    const energyData = data.use_phase;
    const processData = energyData.processes[0];
    const isDeviceExist = processData.device;
    let inputMapping;
    if (isDeviceExist) {
      inputMapping = {
        device: "lca-input-from",
        location: "lca-input-to",
      };
    } else {
      inputMapping = {
        name: "lca-input-from",
        location: "lca-input-to",
      };
    }
    const energyHTML = getQuestionLCA(
      "We've detected an energy-consuming process.",
      textSource,
      "energy",
      isDeviceExist
    );
    currScenario = "energy";
    wattage = processData.power;
    energyEFactor = processData.carbon_emission_factor;
    console.log("energyEFactor = " + energyEFactor);
    console.log("currScenario = " + currScenario);
    setupQuestionLCA(energyHTML);

    let nameList = [];
    if (processData.device) nameList.push(processData.device);
    if (processData.power_original) nameList.push(processData.power_original + " " + processData.power_original_unit);
    if (processData.time_original) {
      nameList.push(processData.time_original + " " + processData.time_original_unit);
      eTimeString = processData.time_original;
      eTimeUnitString = processData.time_original_unit;
    }
    addHighlightBold(nameList, parentNode, range, selection);

    autoFillInput(processData, inputMapping);
    // Autofills duration
    if (processData.time_original) {
      let time = processData.time_original;
      let unit = processData.time_original_unit;
      const timeInput = shadowQRoot.getElementById("lca-input-package-weight");
      const unitSelect = shadowQRoot.getElementById("lca-input-package-unit");
      if (time) {
        timeInput.value = time;
        checkAllValid();
      }
      if (unit) {
        if (unit === "second" || unit === "seconds") unit = "s";
        if (unit === "minute" || unit === "minutes") unit = "min";
        if (unit === "hours" || unit === "hour" || unit === "hr") unit = "h";
        unitSelect.value = unit;
        checkAllValid();
      }
    }
    showMasterQContainer();
  }
  /**
   * Handles the behavior of highlighting a sentence that classifies as a "freight" scenario
   * @param {JSON} data The data of the freight in JSON.
   * @param {String} textSource The text of the highlighted sentence.
   */
  function handleFreightHighlight(data, parentNode, range, selection, textSource) {
    const freightData = data.transport_phase;
    const freightHTML = getQuestionLCA("Looks like you plan to transport something.", textSource, "freight");

    // ? new
    currScenario = "freight";
    console.log("currScenario = " + currScenario);
    setupQuestionLCA(freightHTML);

    // Fill in the form using freightData's data.
    const transportData = freightData.transports[0];
    const inputMapping = {
      from_location: "lca-input-from",
      to_location: "lca-input-to",
    };

    addHighlightBold([], parentNode, range, selection);

    autoFillInput(transportData, inputMapping);
    // Autofills package weight and unit
    if (transportData.weight) {
      let { value, unit } = transportData.weight;
      const weightInput = shadowQRoot.getElementById(
        "lca-input-package-weight"
      );
      const unitSelect = shadowQRoot.getElementById("lca-input-package-unit");
      console.log("setting weight value....");
      if (value) {
        weightInput.value = value;
        checkAllValid();
      }
      if (unit) {
        if (unit === "lb") unit = "lbs";
        unitSelect.value = unit;
        checkAllValid();
      }
    }
    showMasterQContainer();
  }

  /**
   * Takes in the JSON data and fills in the value of the input form if there is info. from the JSON data.
   * @param {JSON} data The 'transport' or 'processes' data
   * @param {Object} inputMapping The object containing the following information:
   * format = <val1> : <val2>
   *    val1 = the fields that is from JSON data
   *    val2 = the id of the corresponding html input
   */
  function autoFillInput(data, inputMapping) {
    console.log("data: ");
    console.log(data);
    for (const [key, inputId] of Object.entries(inputMapping)) {
      console.log("key = ", key, "input id = ", inputId);
      const input = shadowQRoot.getElementById(inputId);
      console.log("setting input value: " + data[key]);
      if (data[key]) {
        input.value = data[key];
        checkAllValid();
      }
    }
  }

  /**
   * Creates and injects the HTML for question UI and sets up all of the interactions and listeners.
   * @param {HTMLElement} contentHTML The HTML code of the content. This is either the UI for freight or energy.
   * @param {String} scenario Either "energy" or "freight".
   */
  function setupQuestionLCA(contentHTML) {
    const questionMenuHTML = getLCAFloatingMenu();
    // Initialize and inject the freight question UI.
    masterQContainer.insertAdjacentHTML("beforeend", contentHTML);
    masterQContainer.insertAdjacentHTML("beforebegin", questionMenuHTML);
    floatingQMenu = shadowQRoot.getElementById("lca-viz-question-menu");
    toggleQuestionButtonState();
    isAssistantActive = true;
    setTimeout(() => {
      handleQuestionForm();
      // handleExpandCollapse();
    }, 0);
    hideLCAActionBtn();
  }

  /**
   * Takes in materialList and returns two arrays containing the name of all the raw materials and processes.
   * @param {Object} materialList
   * @returns two arrays containing the name of all the raw materials and processes.
   */
  function getMaterialNames(materialList) {
    let rawMaterialNames = [];
    let processesNames = [];
    // Check for raw materials and related materials -> ratio
    if (materialList.raw_materials?.related_materials) {
      materialList.raw_materials.related_materials.forEach(
        (relatedMaterial) => {
          if (relatedMaterial.ratio) {
            relatedMaterial.ratio.forEach((item) => {
              rawMaterialNames.push(item.name);
            });
          }
        }
      );
    }
    // Check for raw materials and independent materials
    if (materialList.raw_materials?.independent_materials) {
      materialList.raw_materials.independent_materials.forEach(
        (independentMaterial) => {
          rawMaterialNames.push(independentMaterial.name);
        }
      );
    }
    // Check for processes
    if (materialList.processes) {
      materialList.processes.forEach((process) => {
        processesNames.push({
          name: process.name,
          power_original: process.power_original,
          power_original_unit: process.power_original_unit,
          time_original: process.time_original,
          time_original_unit: process.time_original_unit,
          index: process.index,
        });
      });
    }
    console.log("rawMaterialNames: ");
    console.log(rawMaterialNames);
    console.log("processesNames: ");
    console.log(processesNames);
    return {
      rawMaterialNames: rawMaterialNames,
      processesNames: processesNames,
    };
  }

  function initializeChart(rawMaterialData) {
    currentChartData = rawMaterialData;
    let chartConfig = getChartConfig();
    // Remove the previous chart, reset the 'chart' global variable
    const map = document.getElementById("lca-viz-map");
    if (map) {
      map.remove();
      map.innerHTML = ``;
      chart.destroy();
      chart = null;
    }
    createChart(chartConfig);
    const resetChartPosition = true;
    makeChartVisible(resetChartPosition);
  }

  function setLCAActionBtnState(state) {
    const LCAActionBtnText = document.getElementById("lca-viz-action-btn-text");
    const floatingLCAImg = document.querySelector(".floating-lca-img");
    const LCAActionBtn = document.getElementById("lca-viz-action-btn");
    if (state === "default") {
      floatingLCAImg.src = lca_48;
      LCAActionBtnText.textContent = "";
      LCAActionBtnText.classList.add("lca-viz-hidden");
      LCAActionBtnContainer.classList.add("lca-viz-interactable");
      LCAActionBtn.classList.add("lca-viz-green-hover");
      LCAActionBtnContainer.classList.remove("lca-viz-non-interactable");
    }
    //? new code
    else if (state === "analyzing") {
      floatingLCAImg.src = loading_icon_2;
      LCAActionBtnText.textContent = "Analyzing...";
      LCAActionBtnText.classList.remove("lca-viz-hidden");
      LCAActionBtnContainer.classList.remove("lca-viz-interactable");
      LCAActionBtn.classList.remove("lca-viz-green-hover");
      LCAActionBtnContainer.classList.add("lca-viz-non-interactable"); // Make non-clickable
    } else if (state === "error") {
      floatingLCAImg.src = close_icon_red;
      LCAActionBtnText.textContent = "No raw materials detected.";
      LCAActionBtnText.classList.remove("lca-viz-hidden");
      LCAActionBtnContainer.classList.remove("lca-viz-interactable");
      LCAActionBtn.classList.remove("lca-viz-green-hover");
      LCAActionBtnContainer.classList.add("lca-viz-non-interactable"); // Make non-clickable
    }
  }

  /**
   * Hides the LCA Action Button and restores it to "default" stage.
   */
  function hideLCAActionBtn() {
    setLCAActionBtnState("default");
    if (LCAActionBtnContainer) {
      // LCAActionBtn.classList.add('lca-viz-hidden');
      LCAActionBtnContainer.style.opacity = "0";
      LCAActionBtnContainer.style.visibility = "hidden";
    }
  }

  function showLCAActionBtn() {
    setLCAActionBtnState("default");
    if (LCAActionBtnContainer) {
      console.log("SHOWING LCA ACTION BTN: ");
      console.log(LCAActionBtnContainer);
      // LCAActionBtn.classList.remove('lca-viz-hidden');
      LCAActionBtnContainer.style.opacity = "1";
      LCAActionBtnContainer.style.visibility = "visible";
    }
  }

  /**
   * Resets the styling and properties of the current highlighted node.
   * @param {Node} currentNode The currently highlighted node
   */
  function resetHighlight(currentNode) {
    if (currentNode) {
      if (chart) {
        hideChart();
      }
      currentNode.classList.remove("lca-viz-inline", "lca-viz-highlight");
      currentNode
        .querySelectorAll(".lca-viz-origin-number")
        .forEach((numberNode) => {
          numberNode.classList.remove("lca-viz-hidden");
        });
      const mark = currentNode.querySelector("mark");
      if (mark) {
        mark.classList.remove("lca-viz-mark");
      }

      // Restore the text back to its original format
      const originalText = mark ? mark.textContent : currentNode.textContent;
      currentNode.parentNode.replaceChild(
        document.createTextNode(originalText),
        currentNode
      );
    }
  }

  /**
   * Replaces an HTML element with a new tag while retaining its styles, classes, attributes, and content.
   * @param {*} oldNode
   * @param {*} newTagName
   * @param {*} newClasses
   * @returns The modified node
   */
  function replaceTagNameAndKeepStyles(oldNode, newTagName, newClasses) {
    const newNode = document.createElement(newTagName);
    newNode.classList.add(...newClasses);
    // Copy existing classes
    oldNode.classList.forEach((cls) => newNode.classList.add(cls));
    // Copy inline styles
    newNode.style.cssText = oldNode.style.cssText;
    // Copy the content of old node into the new node
    while (oldNode.firstChild) {
      newNode.appendChild(oldNode.firstChild);
    }
    // Copy the atrributes of old node into the new node
    for (const attr of oldNode.attributes) {
      if (attr.name !== "class" && attr.name !== "style") {
        newNode.setAttribute(attr.name, attr.value);
      }
    }
    return newNode;
  }

  /**
   * Takes in a sentence and uses LLM to determine the relevant sentences that can be used to display a carbon chart.
   * Returns a JSON that contains information about each identified raw materials and their parameters.
   * If the highlightedText does not have sufficient information, the data will return null.
   * @param {String} highlightedText
   * @returns a JSON that contains information about each identified raw materials and their parameters.
   */
  async function getValidSentence(highlightedText) {
    console.log("***HIGHLIGHTED TEXT****");
    console.log(highlightedText);
    console.log("***HIGHLIGHTED TEXT****");
    const jsonObject = {
      text: highlightedText,
    };
    try {
      const response = await fetch(LCA_SERVER_URL + "/api/evaluate-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jsonObject),
      });

      if (response.ok) {
        const responseData = await response.json();
        if (responseData) {
          return responseData;
        }
        console.log("responseData doesnt have the expected structure");
        return null; // If responseData doesn't have the expected structure
      } else {
        console.log("response not okay");
        setLCAActionBtnState("error");
        return null;
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setLCAActionBtnState("error"); // Handle errors gracefully
      return null;
    }
  }

  function trackRawMaterial() {
    let allowedDomains = [
      "nature.com",
      "acm.org",
      "arxiv.org",
      "acs.org",
      "wiley.com",
      "fly.dev",
    ];
    if (isDomainValid(allowedDomains)) {
      console.log("trackRawMaterial enabled");
      handleLCAActionBtn();
      recordCurrentMouseCoord();
      handleHighlightText();
    }
  }

  // Enables the highlight text behavior for all scenarios: raw materials, freight, energy
  function trackAllScenario() {
    handleLCAActionBtn();
    recordCurrentMouseCoord();
    handleHighlightText();
  }

  function isNotEmptyString() {
    const selection = window.getSelection();
    return selection.toString().length > 0 && /\S/.test(selection.toString());
  }

  function handleHighlightText() {
    document.addEventListener("mouseup", async (e) => {
      if (highlightTimeout) {
        clearTimeout(highlightTimeout);
      }
      highlightTimeout = setTimeout(() => {
        const selection = window.getSelection();
        if (isNotEmptyString()) {
          if (LCAActionBtnContainer && !LCAActionBtnContainer.contains(e.target)) {
            LCAActionBtnContainer.style.top = `${mouseY + scrollY + 2}px`;
            LCAActionBtnContainer.style.left = `${mouseX + scrollX + 2}px`;
            showLCAActionBtn();
          }
          const range = selection.getRangeAt(0);
          const highlightedNode = range.commonAncestorContainer;
          let parentNode;
          // CASE: If the highlighted text is a standalone html node
          if (highlightedNode.nodeType === 1) {
            parentNode = highlightedNode;
            // CASE: If the highlighted text is in a section of an html node
          } else {
            parentNode = highlightedNode.parentNode;
          }
          globalSelectionData.parentNode = parentNode;
          globalSelectionData.range = range;
          globalSelectionData.selection = selection;
        }
      }, 0);
    });
    document.addEventListener("click", (e) => {
      // Checks if the click is outside of tooltip. If so, hide the tooltip.
      if (LCAActionBtnContainer && !LCAActionBtnContainer.contains(e.target) && window.getSelection().toString() === "") {
        hideLCAActionBtn();
      }
    });
    document.addEventListener("mousedown", (e) => {
      if (!LCAActionBtnContainer.contains(e.target)) {
        hideLCAActionBtn();
      }
    });
  }

  /**
   * Handles the behavior for clicking on the LCA Action Button.
   */
  function handleLCAActionBtn() {
    console.log("handleLCAActionBtn called");

    const actionBtnHTML = getLCAActionBtn();
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = actionBtnHTML;
    document.body.appendChild(tempDiv.firstElementChild);
    // LCAActionBtn = document.getElementById("lca-viz-action-btn");
    LCAActionBtnContainer = document.getElementById("lca-viz-action-btn-container");
    setLCAActionBtnState("default");

    LCAActionBtnContainer.addEventListener("click", async () => {
      if (isNotEmptyString()) {
        chartPosX = mouseX;
        chartScrollX = scrollX;
        chartPosY = mouseY;
        chartScrollY = scrollY;
        setLCAActionBtnState("analyzing");
        await makeHighlightTextInteractive(
          globalSelectionData.parentNode,
          globalSelectionData.range,
          globalSelectionData.selection
        );
      }
    });
  }

  function getLCAActionBtn() {
    const actionBtn = `
      <div id="lca-viz-action-btn-container" class="pd-12">
        <div class="flex-center lca-viz-interactable pd-12 br-8 cg-8" id="lca-viz-action-btn">
          <img src="${lca_48}" alt="LCA Image" class="floating-lca-img icon-20">
          <span class="lca-viz-hidden lca-lexend fz-14" id="lca-viz-action-btn-text"></span>
        </div>
      </div>
    `;
    return actionBtn;
  }

  // Records the current coordinate of the mouse.
  function recordCurrentMouseCoord() {
    document.addEventListener("mousemove", function (event) {
      mouseX = event.clientX;
      mouseY = event.clientY;

      scrollX = window.scrollX;
      scrollY = window.scrollY;
    });
  }

  /**
   * Creates an interactive chart from Chart.js given the chart configuration and info about the raw materials + parameters.
   * @param {Object} chartConfig An object specifying the properties for Chart.js
   * @param {Array} paramList An array of object containing the raw materials and their parameters. For example:
   *        let data = [
                      {
                        "name": "Copper foil",
                        "emissions": "0.97",
                        "emissions_factor": "0.97"
                      },
                ]
   */
  function createChart(chartConfig) {
    clearTimeout(selectionTimeout);
    if (!chart) {
      const map = document.createElement("div");
      map.setAttribute("id", "lca-viz-map");
      map.setAttribute("role", "main");
      map.classList.add("lca-lexend");

      const paramContainer = document.createElement("div");
      paramContainer.classList.add("lca-viz-param-container");

      paramContainer.innerHTML = relatedMaterialHTML + independentMaterialHTML + processesHTML;

      map.innerHTML = `
        <div class="flex-center lca-viz-header cg-12 pd-12">
        <div class="flex-center cg-12 lca-viz-header-title">
          <img alt="logo" src="${lca_48}" class="icon-20 lca-viz-lca-logo">
          <span><b>Living Sustainability</b></span>
        </div>
        <button id="lca-viz-close-map" class="lca-viz-close-button flex-center">
          <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        </div>
        <div class="flex-stretch lca-viz-title-and-question lcz-mt-8">
          <span class="lca-viz-raw-material-title"><b>Estimated Carbon Footprint of Raw Materials</b></span>
          <div class="btn lca-viz-btn-primary lca-viz-tooltip"><img src="${question_icon}" alt="Hover me to get additional information" class="icon-20" id="lca-viz-q-icon">
            <div class="left">
              <h3 class="fz-12 lca-lexend">How are raw material emissions calculated?</h3>
              <p class="fz-12">We are using a large language model (LLM) to extract relevant raw materials and conduct a life cycle assessment (LCA) of the raw materials using available public datasets on the internet.</p>
              <i></i>
            </div>
          </div>
        </div>
        <div class="lca-viz-canvas flex-center lca-viz-justify-center">
          <canvas id="lca-viz-carbon-chart"></canvas>
        </div>
      `;

      const paramSection = document.createElement("div");
      paramSection.classList.add("param-section");

      const paramSpan = document.createElement("span");
      paramSpan.innerHTML = "<b>Parameters:</b>";
      const paramSpan2 = document.createElement("p");
      paramSpan2.classList.add("lcz-mt-4", "fz-16", "lca-viz-param-subtext");
      paramSpan2.innerHTML =
        "Adjust the values below to see the carbon emissions of different materials.";

      paramSection.appendChild(paramSpan);
      paramSection.appendChild(paramSpan2);
      paramSection.appendChild(paramContainer);

      const totalEmissionsSection = document.createElement("div");
      totalEmissionsSection.classList.add("lca-viz-total-emissions-container");
      totalEmissionsSection.classList.add("lcz-mt-8", "mb-8");

      map.appendChild(totalEmissionsSection);
      map.appendChild(paramSection);
      document.body.appendChild(map);

      chartContainer = document.getElementById("lca-viz-map");

      const canvas = document.getElementById("lca-viz-carbon-chart");
      Chart.defaults.font.family = "Lexend";
      chart = new Chart(canvas, {
        type: "pie",
        data: chartConfig.data,
        options: chartConfig.options,
        plugins: [increaseHeight],
      });
      setChartPosition();
      handleCloseMapButton();
      handleUpDownBtnBehavior();
      handleToggleSwitch();

      requestAnimationFrame(() => {
        chartContainer.classList.add("visible");
        map.focus();
      });

      // Injecting the total emissions
      const totalEmissionsContainer = document.querySelector('.lca-viz-total-emissions-container');
      const totalEmissions = getTotalEmissions();
      const totalEmissionsHTML = getTotalEmissionsHTML(totalEmissions);
      totalEmissionsContainer.innerHTML = totalEmissionsHTML;
      handleCO2eEquivalencyChange(true);
    }
  }

  function setChartPosition() {
    chartContainer.style.top = `${chartPosY + chartScrollY + 8}px`;
    chartContainer.style.left = `${chartPosX + chartScrollX + 8}px`;
  }

  /**
   * Handles closing the chart behavior
   */
  function handleCloseMapButton() {
    document
      .getElementById("lca-viz-close-map")
      .addEventListener("click", () => {
        hideChart();
        document
          .querySelector(".lca-viz-mark")
          .classList.add("lca-viz-previously-highlighted");
        // currentHighlightedNode.classList.add('lca-viz-previously-highlighted');
        document
          .querySelector(".off-lca-btn")
          .classList.remove("lca-viz-hidden");
      });

    currentHighlightedNode.addEventListener("click", redisplayChart);
  }

  // Redisplay the chart that was closed by the user
  function redisplayChart() {
    if (chart) {
      console.log("redisplaying chart");
      // const element = event.currentTarget;
      const element = document.querySelector(".lca-viz-mark");
      element.classList.remove("lca-viz-previously-highlighted");
      makeChartVisible();
    }

  }

  function makeChartVisible(resetChartPosition = false) {
    console.log("showing the chart");
    if (resetChartPosition) {
      setChartPosition();
    }
    const mapElement = document.getElementById("lca-viz-map");
    mapElement.classList.add("lca-viz-map-visible");
    handleDraggableMap();
  }

  function hideChart() {
    const mapElement = document.getElementById("lca-viz-map");
    mapElement.classList.remove("lca-viz-map-visible");
    mapElement.classList.add("lca-viz-map-hidden");
    clearTimeout(selectionTimeout);
  }

  // Function to increase the height of the chart.js chart.
  const increaseHeight = {
    beforeInit(chart) {
      // Get a reference to the original fit function
      const origFit = chart.legend.fit;
      chart.legend.fit = function fit() {
        origFit.bind(chart.legend)();
        // Increase the height of the legend
        this.height += 25; // Adjust this value as needed
      };
    },
  };

  // TODO: Implement a function that takes in the carbon info as text and outputs data used to create a Chart.js chart
  /**
   *
   * @param {String} carbonInfo
   * @returns JSON Object
   */
  function getChartConfig() {
    // This is the dummy data
    // const cData = currentChartData;
    console.log("currentChartData = ");
    console.dir(currentChartData);
    const cData = extractNameAndEmissions(currentChartData);
    console.log("cData = ");
    console.dir(cData);

    const rawLabels = cData.map((item) => item.name);
    const emissionsData = cData.map((item) => item.emissions);
    const chartData = {
      labels: rawLabels,
      datasets: [
        {
          label: "",
          data: emissionsData,
          fill: false,
          backgroundColor: [
            "rgba(255, 99, 132, 0.2)",
            "rgba(255, 159, 64, 0.2)",
            "rgba(255, 205, 86, 0.2)",
            "rgba(75, 192, 192, 0.2)",
            "rgba(54, 162, 235, 0.2)",
            "rgba(153, 102, 255, 0.2)",
            "rgba(201, 203, 207, 0.2)",
            "rgba(255, 127, 80, 0.2)",
            "rgba(144, 238, 144, 0.2)",
            "rgba(173, 216, 230, 0.2)",
            "rgba(221, 160, 221, 0.2)",
            "rgba(240, 128, 128, 0.2)",
          ],
          borderColor: [
            "rgb(255, 99, 132)",
            "rgb(255, 159, 64)",
            "rgb(255, 205, 86)",
            "rgb(75, 192, 192)",
            "rgb(54, 162, 235)",
            "rgb(153, 102, 255)",
            "rgb(201, 203, 207)",
            "rgb(255, 127, 80)",
            "rgb(144, 238, 144)",
            "rgb(173, 216, 230)",
            "rgb(221, 160, 221)",
            "rgb(240, 128, 128)",
          ],
          borderWidth: 1,
        },
      ],
    };

    const options = {
      responsive: true,
      layout: {
        padding: {
          bottom: 25,
        },
      },
      plugins: {
        legend: {
          display: true, // Show legend for pie/donut chart
          position: "top",
          labels: {
            padding: 10,
          },
        },
        tooltip: {
          callbacks: {
            label: function (tooltipItem) {
              const label = tooltipItem.label || "";
              const value = tooltipItem.raw;
              return `${label}: ${value} g CO2e`; // Add unit in tooltip
            },
          },
        },
        datalabels: {
          anchor: "end",
          align: "end",
          formatter: function (value) {
            return `${value} g CO2e`;
          },
        },
      },
    };
    return { data: chartData, options: options };
  }

  /**
   * Gets the total emissions of all raw materials in the chart
   * @returns The total emissions of all raw materials in the chart in 'g CO2e'
   */
  function getTotalEmissions() {
    if (!chart || !chart.data || !chart.data.datasets || !chart.data.datasets[0]) {
      console.error("Chart data not found!");
      return 0;
    }
    const emissionsData = chart.data.datasets[0].data;
    const totalEmissions = emissionsData.reduce((sum, value) => sum + value, 0);
    console.log("Total Emissions:", totalEmissions, "g CO2e");
    return totalEmissions.toFixed(2);
  }

  // Handles the behavior of opening and closing the lca question UI.
  function toggleQuestionButtonState() {
    console.log("toggle button state");
    // const openContainer = shadowRoot.getElementById("lca-viz-question-menu");
    const openContainer = floatingQMenu;
    const closeContainer = shadowQRoot.getElementById("lca-viz-close-question");
    closeContainer.addEventListener("click", () => {
      console.log("closing master container");
      hideMasterQContainer();
      openContainer.style.display = "flex";
      requestAnimationFrame(() => {
        openContainer.classList.remove("hidden-b");
        openContainer.classList.add("visible-b");
      });
    });
    openContainer.addEventListener("click", () => {
      console.log("opening master container");
      showMasterQContainer();
      openContainer.style.display = "flex";
      requestAnimationFrame(() => {
        openContainer.classList.add("hidden-b");
        openContainer.classList.remove("visible-b");
      });
    });
  }
}

/**
 * Takes in raw materials data and extracts the name of each raw material and emissions, then returns it
 * as an array of objects.
 * @param {Object} data The raw materials data
 * @returns An array of objects containing raw materials and their emissions.
 */
function extractNameAndEmissions(data) {
  independentMaterialHTML = ``;
  relatedMaterialHTML = ``;
  processesHTML = ``;
  const results = [];
  // Keeps track of the index of every parameter object
  // Process raw materials - related materials ratios
  if (data.raw_materials?.related_materials) {
    data.raw_materials.related_materials.forEach((material, index) => {
      if (material.ratio) {
        const ratioList = material.ratio;
        const textSource = material.text_source;
        relatedMaterialHTML += createRatioSection(ratioList, textSource, index);
        material.ratio.forEach((item) => {
          results.push({
            name: item.name,
            emissions: extractEmissionsFactor(item.carbon_emission_factor)
              .co2e_value,
          });
        });
      }
    });
  }
  // Process raw materials - independent materials
  if (data.raw_materials?.independent_materials) {
    const independentList = data.raw_materials.independent_materials;
    independentMaterialHTML =
      "<div class='lca-viz-independent-container'>" +
        independentList.map((item, index) => {
            const emissionsAmount = item.amount * extractEmissionsFactor(item.carbon_emission_factor).co2e_value;
            results.push({name: item.name, emissions: emissionsAmount,});
            return getParam(item.name, item.index, "g", item.amount, undefined, undefined, undefined);
          }).join("") +
      "</div>";
  }
  // ! Don't delete this. Keep it just in case. This is for processes
  // Process processes
  // if (data.processes) {
  //   const processesList = data.processes;
  //   processesHTML = "<div class='lca-viz-processes-container'>" + processesList.map((process) => {
  //     const emissionsFactor = extractEmissionsFactor(process.carbon_emission_factor).co2e_value;
  //     const emissionsAmount = calculateProcessesEmissions(process.power, process.time, emissionsFactor);
  //     results.push({
  //       name: process.name,
  //       emissions: emissionsAmount,
  //     });
  //     return getParam(process.name, process.index, process.power_original_unit, process.power_original, true, process.time_original_unit, process.time_original);
  //   }).join('')  + "</div>";
  // }
  return results;
}

/**
 * Takes in power, time, and emissionsFactor and returns the carbon emissions
 * @param {Number} power in watts
 * @param {Number} time in seconds
 * @param {Number} emissionsFactor the emissions factor (~ g CO2-eq per kWh)
 */
function calculateProcessesEmissions(power, time, emissionsFactor) {
  const kWh = (power * time) / (1000 * 3600);
  const co2e_value = parseFloat(kWh * emissionsFactor.toFixed(2));
  return co2e_value;
}

export function isDomainValid(domainList) {
  let allowedDomains = domainList;
  const currentDomain = getBaseDomain(window.location.hostname);

  console.log("currentDomain = " + currentDomain);
  if (allowedDomains.includes(currentDomain)) {
    return true;
  } else {
    return false;
  }
}

export function getBaseDomain(hostname) {
  const parts = hostname.split(".");
  if (parts.length > 2) {
    return parts.slice(-2).join(".");
  }
  return hostname;
}

/**
 * Enables the question UI form to function properly
 */
function handleQuestionForm() {
  let inputs;
  if (currScenario === "freight") {
    inputs = [
      {
        id: "lca-input-from",
        errorId: "lca-viz-from-error",
        validate: validateText,
      },
      {
        id: "lca-input-to",
        errorId: "lca-viz-to-error",
        validate: validateText,
      },
      {
        id: "lca-input-package-weight",
        errorId: "lca-viz-package-error",
        validate: validatePackageWeight,
      },
    ];
  } else if (currScenario === "energy") {
    inputs = [
      {
        id: "lca-input-package-weight",
        errorId: "lca-viz-package-error",
        validate: validatePackageWeight,
      },
    ];
    // ! Manually set device/process and location field in 'energy' scenario to be optional
    const input1 = shadowQRoot.getElementById("lca-input-from");
    const input2 = shadowQRoot.getElementById("lca-input-to");
    toggleValidation(input1, "lca-viz-from-error", true);
    toggleValidation(input2, "lca-viz-to-error", true);
  }

  const calculateContainer = shadowQRoot.querySelector(
    ".lca-viz-calculate-container-2"
  );
  const formContainer = shadowQRoot.querySelector(".lca-viz-question-form");
  const btnTxt = shadowQRoot.querySelector(".lca-viz-calculate-btn-txt-2");

  inputs.forEach(({ id }) => {
    const input = shadowQRoot.getElementById(id);
    input.addEventListener("input", checkAllValid);
  });

  let loadingInterval;
  calculateContainer.addEventListener("click", async () => {
    if (!calculateContainer.classList.contains("invalid")) {
      // Start loading animation
      let loadingState = 0;
      loadingInterval = setInterval(() => {
        loadingState = (loadingState + 1) % 4;
        btnTxt.textContent = "Calculating" + ".".repeat(loadingState);
      }, 500);
      if (currScenario === "freight") {
        await handleFreightInput();
      } else if (currScenario === "energy") {
        await handleEnergyInput();
      }
    }
  });

  async function handleEnergyInput() {
    const formData = new FormData(formContainer);
    const deviceProcessName = formData.get("from");
    const durationVal = formData.get("package-weight");
    const durationUnit = formData.get("package-unit");
    const location = formData.get("to");
    const durationInSeconds = convertToSeconds(durationVal, durationUnit);
    const kwh = (wattage / 1000) * (durationInSeconds / 3600);

    let energyEmissions;
    // If location is not given, use the emissions factor from LLM, which is based on US electricity average.
    if (!location || location === "") {
      // The emissions is in this unit: ~ g CO2eq per 1 kwH
      emissionsPerKwh = extractEmissionsFactor(energyEFactor).co2e_value;
      energyEmissions = parseFloat((kwh * emissionsPerKwh) / 1000);
      // Else, use electricity maps API with location.
    } else {
      const objectBody = {
        location_name: location,
        electricity_used: kwh,
      };
      let response = await fetch(
        LCA_PY_SERVER_URL + "/calculate-electricity-footprint",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(objectBody),
        }
      );
      if (response.ok) {
        const responseData = await response.json();
        energyEmissions = parseFloat(responseData.carbon_footprint);
        emissionsPerKwh = parseFloat(responseData.carbon_intensity);
      } else {
        console.log("error: cannot fetch electricity maps API");
        return;
      }
    }
    console.log("emissions in kg CO2eq: " + energyEmissions);
    const data = {
      emissions: energyEmissions,
      device_process: deviceProcessName,
      power: kwh,
      duration: durationVal,
      duration_unit: durationUnit,
      location: location,
    };
    const emissionsResultHTML = getCloudEmissionsResult(data, "energy");
    getMasterContainer();
    setupLCABannerAndFloatingMenu();
    displayCloudEmissions(emissionsResultHTML, false);
    hideQuestionUI();
    showMasterContainer();
    isPopupActive = true;

    handleIntextEnergy(durationVal, durationUnit);
  }

  /**
   * Allows for users to manipulate the time inside the highlighted text and see the change in emissions.
   * @param {String} inputTime The time value that was used to calculate the emissions.
   * @param {String} inputTimeUnit The time unit that was used to calculate the emissions.
   * @param {Number} emissionsPerKwh This will be used to calculate the new emissions.
   * @param {Number} wattage This will be used to calculate the new emissions.
   */
  function handleIntextEnergy(inputTime, inputTimeUnit) {
    durationEUnit = inputTimeUnit;
    const highlightedTextNode = document.querySelector('.lca-viz-highlight-container').children[0].querySelectorAll(".lca-viz-param-bold");
    let editNode;
    highlightedTextNode.forEach((node) => {
      console.log('node.textContent:', node.textContent);
      console.log('eTimeString + " " + eTimeUnitString:', eTimeString + " " + eTimeUnitString);
      if (node.textContent === (eTimeString + " " + eTimeUnitString)) {
        editNode = node;
      }
    });

    const upDownBtn = document.createElement('div');
    upDownBtn.classList.add('lca-viz-param-bold', 'lca-viz-inline');
    upDownBtn.innerHTML = `
        <span class="lca-viz-origin-number lca-viz-hidden">${inputTime}</span>
        <div class="lca-viz-processes-intext-0 lca-viz-inline" data-value="${eTimeString}">
          ${createUpDownBtn(0, inputTimeUnit, inputTime, "time")}
        </div>
        <span class="lca-viz-param-bold"><b>${inputTimeUnit}</b></span>
    `;
    editNode.replaceWith(upDownBtn);

    const selector = document.querySelector('.lca-viz-up-down-btn-master-0');
    const ratioUpBtn = selector.querySelector(".lca-viz-up");
    const ratioDownBtn = selector.querySelector(".lca-viz-down");
    const index = 0;
    ratioUpBtn.addEventListener("click", () => {
      updateValueEnergy(1, index);
    });
    ratioDownBtn.addEventListener("click", () => {
      updateValueEnergy(-1, index);
    });
  }

  /**
   * Updates the carbon emissions value of the energy popup window
   * @param {Number} duration
   * @param {Number} emissionsPerKwh
   * @param {Number} wattage
   */
  function updateEnergyData() {
    const durationInSeconds = convertToSeconds(durationEVal, durationEUnit);
    const kwh = (wattage / 1000) * (durationInSeconds / 3600);
    const energyEmissions = parseFloat((kwh * emissionsPerKwh) / 1000);

    // we need this to make the shadow root active
    getMasterContainer();

    // updates the "Usage Duration"
    const shadowRootTime = shadowRoot.getElementById('lca-viz-e-time-val');
    shadowRootTime.textContent = durationEVal;
    // console.log('shadowRootTime: ');
    // console.log(shadowRootTime);
    console.log('new usage duration: ', durationEVal);

    // updates the carbon emissions
    const readableEmissions = getReadableCO2e(energyEmissions);
    const readableCO2e = readableEmissions.co2e_value;
    const readableUnit = readableEmissions.unit;
    const shadowRootEmissions = shadowRoot.getElementById('lcz-root-emissions');
    shadowRootEmissions.textContent = readableCO2e + " " + readableUnit;
    console.log('new emissions: ', readableCO2e + " " + readableUnit);
    // console.log('shadowRootEmissions: ');
    // console.log(shadowRootEmissions);

    // update the co2e equivalencies
    const milesDriven = formatToSignificantFigures(readableCO2e * 2.5);
    const treesOffset = formatToSignificantFigures(readableCO2e * 0.048);
    let {beefValue, beefUnit} = getBeefInfo(readableCO2e);
    const shadowRootMiles = shadowRoot.getElementById('lcz-miles');
    const shadowRootTrees = shadowRoot.getElementById('lcz-trees');
    const shadowRootBeef = shadowRoot.getElementById('lcz-beef');
    shadowRootMiles.textContent = milesDriven;
    shadowRootTrees.textContent = treesOffset;
    shadowRootBeef.textContent = beefValue + " " + beefUnit;
    console.log('new miles: ', milesDriven);
    console.log('new trees: ', treesOffset);
    console.log('new beef: ', beefValue + " " + beefUnit);
    // console.log('shadowRootMiles: ');
    // console.log(shadowRootMiles);
    // console.log('shadowRootTrees: ');
    // console.log(shadowRootTrees);
    // console.log('shadowRootBeef: ');
    // console.log(shadowRootBeef);
  }

  /**
   * Handles the value update for energy scenario
   * @param {Number} emissionsPerKwh This will be used to calculate the new emissions.
   * @param {Number} wattage This will be used to calculate the new emissions.
   */
  function updateValueEnergy(weightChange, index, newWeight = null) {
    console.log("weightChange = " + weightChange);
    console.log("index = " + index);
    const inputNode = document.getElementById("lca-viz-input-" + index);
    console.log(inputNode);
    let currentWeight = parseInt(inputNode.value);
    if (newWeight !== null) {
      currentWeight = newWeight;
    } else {
      if (weightChange < 0 && currentWeight <= 1) {
        return;
      }
      currentWeight += weightChange;
    }

    // TODO: update the carbon emissions
    durationEVal = currentWeight;
    updateEnergyData();

    inputNode.value = currentWeight;
  }

  /**
   * Returns the HTML for up and down button given the parameter.
   */
  function createUpDownBtn(index, unit, defaultValue, type) {
    const upDownBtn = `
          <div class="lca-viz-special-text-container-2 lca-viz-up-down-btn-master-${index} lca-viz-up-down-btn-master-${index}-${type}">
            <div class="lca-viz-special-text-intext lca-viz-active-st lca-viz-param-fill">
              <input class="lca-viz-parameter-text input-normal lca-viz-parameter-2 lca-viz-fnt-inherit" id="lca-viz-input-${index}" data-type="${type}" data-value-unit="${unit}" type="number" value="${defaultValue}">
              <div class="lca-viz-up-down-btn-container-intext flex-column">
                <div class="lca-viz-active lca-viz-up-down-btn lca-viz-up">
                  <svg width="100%" height="100%" viewBox="0 0 9 7" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3.60595 1.24256C3.99375 0.781809 4.7032 0.781808 5.091 1.24256L8.00777 4.70806C8.53906 5.3393 8.09032 6.30353 7.26525 6.30353L1.4317 6.30353C0.606637 6.30353 0.157892 5.33931 0.689181 4.70807L3.60595 1.24256Z" fill="currentColor"/>
                  </svg>
                </div>
                <div class="lca-viz-active lca-viz-up-down-btn lca-viz-down">
                  <svg width="100%" height="100%" viewBox="0 0 9 7" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.09107 5.74914C4.70327 6.20989 3.99382 6.20989 3.60602 5.74914L0.689251 2.28363C0.157962 1.65239 0.606707 0.688168 1.43177 0.688168L7.26532 0.688168C8.09039 0.688168 8.53913 1.65239 8.00784 2.28363L5.09107 5.74914Z" fill="currentColor"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
    `;
    // ~~ DO NOT DELETE
    // <div title="Click to display CO2 emissions" class="display-chart-btn-container lca-on">
    //   <svg width="24" height="24" class="display-chart-btn eye-on" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    //     <path d="M10.7429 5.09232C11.1494 5.03223 11.5686 5 12.0004 5C17.1054 5 20.4553 9.50484 21.5807 11.2868C21.7169 11.5025 21.785 11.6103 21.8231 11.7767C21.8518 11.9016 21.8517 12.0987 21.8231 12.2236C21.7849 12.3899 21.7164 12.4985 21.5792 12.7156C21.2793 13.1901 20.8222 13.8571 20.2165 14.5805M6.72432 6.71504C4.56225 8.1817 3.09445 10.2194 2.42111 11.2853C2.28428 11.5019 2.21587 11.6102 2.17774 11.7765C2.1491 11.9014 2.14909 12.0984 2.17771 12.2234C2.21583 12.3897 2.28393 12.4975 2.42013 12.7132C3.54554 14.4952 6.89541 19 12.0004 19C14.0588 19 15.8319 18.2676 17.2888 17.2766M3.00042 3L21.0004 21M9.8791 9.87868C9.3362 10.4216 9.00042 11.1716 9.00042 12C9.00042 13.6569 10.3436 15 12.0004 15C12.8288 15 13.5788 14.6642 14.1217 14.1213" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    //   </svg>
    // </div>
    return upDownBtn;
  }

  async function handleFreightInput() {
    const formData = new FormData(formContainer);
    const fromAddress = formData.get("from");
    const toAddress = formData.get("to");
    const unit = formData.get("package-unit");
    let totalWeight = parseFloat(formData.get("package-weight"));
    // Converting the weight to kg if unit is originally in lbs.
    if (unit !== "kg") totalWeight = totalWeight * 0.453;
    const currShippingOptions = null;
    const freightData = await getFreightData(fromAddress, toAddress, totalWeight, currShippingOptions, true);
    console.log(freightData);
    if (shadowQRoot.querySelector(".freight-container") !== null) {
      await updateFreightContent(freightData);
      hideQuestionUI();
    } else {
      // ! Don't delete this. We need this to invoke popup-content.js's initialization.
      getMasterContainer()
        .then(() => {
          hideQuestionUI();
          (async () => {
            await injectPopupContent("freight", freightData);
          })();
        })
        .catch((error) => {
          console.log(error);
        });
      showMasterContainer();
      isPopupActive = true;
    }
  }

  inputs.forEach(({ id, errorId, validate = validateText }) => {
    const input = shadowQRoot.getElementById(id);
    input.addEventListener("input", () => {
      const isValid = validate(input);
      toggleValidation(input, errorId, isValid);
    });
  });
}

// Hides both the question / assistant and the floating menu.
function hideQuestionUI() {
  if (masterQContainer) hideMasterQContainer();
  if (floatingQMenu) {
    hideFloatingQMenu();
  }
}

// Clears the old content of the question UI.
function removeQuestionUI() {
  hideQuestionUI();
  setTimeout(() => {
    if (masterQContainer) {
      masterQContainer.innerHTML = "";
    }
    if (floatingQMenu) floatingQMenu.remove();
  }, 500);
}

function checkAllValid() {
  let inputs;
  if (currScenario === "freight") {
    inputs = [
      {
        id: "lca-input-from",
        errorId: "lca-viz-from-error",
        validate: validateText,
      },
      {
        id: "lca-input-to",
        errorId: "lca-viz-to-error",
        validate: validateText,
      },
      {
        id: "lca-input-package-weight",
        errorId: "lca-viz-package-error",
        validate: validatePackageWeight,
      },
    ];
  } else if (currScenario === "energy") {
    inputs = [
      {
        id: "lca-input-package-weight",
        errorId: "lca-viz-package-error",
        validate: validatePackageWeight,
      },
    ];
  }
  const calculateContainer = shadowQRoot.querySelector(
    ".lca-viz-calculate-container-2"
  );
  let allValid = true;
  inputs.forEach(({ id, errorId, validate }) => {
    const input = shadowQRoot.getElementById(id);
    const isValid = validate(input);
    toggleValidation(input, errorId, isValid);
    if (!isValid) allValid = false; // Ensure all fields are checked
  });
  if (allValid) {
    calculateContainer.classList.add("valid");
    calculateContainer.classList.remove("invalid");
  } else {
    calculateContainer.classList.add("invalid");
    calculateContainer.classList.remove("valid");
  }
}

function validateText(input) {
  return input.value.trim() !== "";
}

function validatePackageWeight(input) {
  const value = parseFloat(input.value.trim());
  return !isNaN(value) && value > 0;
}

/**
 * Adds an error UI to the inputs if any inputs are empty or invalid.
 * @param {HTMLElement} selector The selector HTML node. This should be the shadowRoot node.
 */
function toggleValidation(input, errorId, isValid) {
  const error = shadowQRoot.getElementById(errorId);
  if (isValid) {
    input.classList.remove("invalid");
    input.classList.add("valid");
    error.style.display = "none";
  } else {
    input.classList.remove("valid");
    input.classList.add("invalid");
    error.style.display = "block";
  }
}

/**
 * Handles the expanding and collapsing of the form
 */
function handleExpandCollapse() {
  shadowQRoot
    .querySelector(".lca-viz-expand-collapse-container")
    .addEventListener("click", () => {
      const qExpand = shadowQRoot.querySelector(".lca-viz-question-expand");
      const collapseIcon = shadowQRoot.querySelector(
        ".lca-viz-expand-collapse-icon"
      );
      if (qExpand.classList.contains("expanded")) {
        qExpand.style.height = `40px`;
        qExpand.classList.add("collapsed");
        qExpand.classList.remove("expanded");
        collapseIcon.src = `${expand_icon_wide}`;
      } else if (qExpand.classList.contains("collapsed")) {
        qExpand.style.height = `420px`;
        qExpand.classList.add("expanded");
        qExpand.classList.remove("collapsed");
        collapseIcon.src = `${collapse_icon_wide}`;
      }
    });
}

function getLCAFloatingMenu() {
  const floatingMenu = `
    <div class="flex-center floating-lca-menu pd-12 br-8 hidden-b" id="lca-viz-question-menu">
      <img src="${lca_48}" alt="LCA Image" class="floating-lca-img icon-24">
    </div>
  `;
  return floatingMenu;
}

function hideMasterQContainer() {
  masterQContainer.classList.add("lca-viz-c-hidden");
  masterQContainer.classList.remove("lca-viz-c-visible");
}

function showMasterQContainer() {
  masterQContainer.classList.remove("lca-viz-c-hidden");
  masterQContainer.classList.add("lca-viz-c-visible");
}

function hideFloatingQMenu() {
  floatingQMenu.style.display = "flex";
  requestAnimationFrame(() => {
    floatingQMenu.classList.add("hidden-b");
    floatingQMenu.classList.remove("visible-b");
  });
}
