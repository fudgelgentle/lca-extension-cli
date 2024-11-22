/* eslint-disable no-unused-vars */
// content.js handles the following scenario:
// 1. Displaying carbon chart on raw materials

import Chart from 'chart.js/auto';
const lca_48 = chrome.runtime.getURL("../assets/img/lca-48.png");
const off_lca_btn = chrome.runtime.getURL("../assets/img/off-lca-btn.png");
const loading_icon_2 = chrome.runtime.getURL("../assets/img/loading-icon-2.gif");
const close_icon_red = chrome.runtime.getURL("../assets/img/close-icon-red.png");

import { convertToWatts } from "./material-utils";
import { convertToSeconds } from "./material-utils";
import { findByIndex } from "./material-utils";
import { createRatioSection } from "./material-utils";
import { getParam } from "./material-utils";
import { extractEmissionsFactor } from "./material-utils";

window.onload = () => {
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
    const allowedDomains = ["nature.com", "acm.org", "arxiv.org", "acs.org", "wiley.com", "fedex.com", "azure.com", "fly.dev"];
    const allowedDomains2 = ["amazon.com", "bestbuy.com", "apple.com", "store.google.com", "samsung.com", "oppo.com", "huawei.com", "lenovo.com"];
    if (isDomainValid(allowedDomains) || isDomainValid(allowedDomains2)) {
      console.log('current domain is allowed, injecting css');
      createLinkElement("stylesheet", chrome.runtime.getURL("assets/content-style.css"));
      createLinkElement("stylesheet", chrome.runtime.getURL("assets/popup-content.css"));

      let fontRegular = new FontFace("Lexend", `url(${chrome.runtime.getURL("assets/fonts/lexend-regular.woff")})`, {
        weight: "400"
      });
      let fontBold = new FontFace("Lexend", `url(${chrome.runtime.getURL("assets/fonts/lexend-bold.woff")})`, {
        weight: "700"
      });
      document.fonts.add(fontRegular);
      document.fonts.add(fontBold);
      fontRegular.load();
      fontBold.load();

      init();
    }
}

let chart;
let chartContainer;
let currentChartData;
let selectionTimeout;
let LCAActionBtn;

let mouseX;
let mouseY;
// Get the scroll offsets
let scrollX;
let scrollY;

let chartPosX, chartScrollX, chartPosY, chartScrollY;

let highlightTimeout;

// Global variable to keep track of the previously highlighted node
let previousHighlightedNode = null;
let currentHighlightedNode = null;

let globalSelectionData = {
  parentNode: null,         // Will store a Node
  range: null,        // Will store a Range
  selection: null     // Will store a Selection
};

let relatedMaterialHTML = ``;
let independentMaterialHTML = ``;
let processesHTML = ``;

const LCA_SERVER_URL = "https://lca-server-api.fly.dev";

function init() {
  trackRawMaterial();
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
    const map = document.getElementById('lca-viz-map');
    map.addEventListener('mousedown', (e) => {
      console.log('detected mousedown');
      let shiftX = e.clientX - map.getBoundingClientRect().left;
      let shiftY = e.clientY - map.getBoundingClientRect().top;

      function moveAt(clientX, clientY) {
        map.style.left = clientX - shiftX + scrollX + 'px';
        map.style.top = clientY - shiftY + scrollY + 'px';
      }

      function onMouseMove(e) {
        moveAt(e.clientX, e.clientY);
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);

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
    const toggleOnContainers = document.querySelectorAll('.lca-viz-param-toggle-on');
    if (toggleOnContainers) {
      toggleOnContainers.forEach((container) => {
        const ratioUpBtnList = container.querySelectorAll(".lca-viz-up");
        const ratioDownBtnList = container.querySelectorAll(".lca-viz-down");
        for (let j = 0; j < ratioUpBtnList.length; j++) {
          const index = parseInt(ratioUpBtnList[j].parentElement.querySelector('.lca-viz-parameter-text').id.match(/\d+$/)[0]);
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
          })
        });
      });
    }

    // ! case: independent - togle off
    const toggleOffContainers = document.querySelectorAll('.lca-viz-param-toggle-off');
    if (toggleOffContainers) {
      toggleOffContainers.forEach((container) => {
        const ratioUpBtnList = container.querySelectorAll(".lca-viz-up");
        const ratioDownBtnList = container.querySelectorAll(".lca-viz-down");
        for (let j = 0; j < ratioUpBtnList.length; j++) {
          const index = parseInt(ratioUpBtnList[j].parentElement.querySelector('.lca-viz-parameter-text').id.match(/\d+$/)[0]);
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
    const independentContainer = document.querySelector('.lca-viz-independent-container');
    if (independentContainer) {
      const ratioUpBtnList = independentContainer.querySelectorAll(".lca-viz-up");
      const ratioDownBtnList = independentContainer.querySelectorAll(".lca-viz-down");
      for (let j = 0; j < ratioUpBtnList.length; j++) {
        const index = parseInt(ratioUpBtnList[j].parentElement.querySelector('.lca-viz-parameter-text').id.match(/\d+$/)[0]);
        ratioUpBtnList[j].addEventListener("click", () => {
          updateValue(1, index);
        });
        ratioDownBtnList[j].addEventListener("click", () => {
          updateValue(-1, index);
        });
      }
      const inputNodeList = independentContainer.querySelectorAll(".input-normal");
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
    handleProcesses();
    handleIntextProcesses();
  }

  function handleProcesses() {
    // Select all instances of lca-viz-param-fill parameters
    const flexCenterContainers = document.querySelectorAll('.lca-viz-processes-container .lca-viz-param-fill');

    flexCenterContainers.forEach((flexCenterContainer) => {
      const processesContainers = flexCenterContainer.querySelectorAll('.lca-viz-processes');

      if (processesContainers) {
        processesContainers.forEach((container) => {
          const ratioUpBtnList = container.querySelectorAll(".lca-viz-up");
          const ratioDownBtnList = container.querySelectorAll(".lca-viz-down");

          for (let i = 0; i < ratioUpBtnList.length; i++) {
            const inputNode = ratioUpBtnList[i].parentElement.querySelector('.lca-viz-parameter-text');
            const index = parseInt(inputNode.id.match(/\d+$/)[0]);
            const type = inputNode.dataset.type;

            ratioUpBtnList[i].addEventListener("click", () => {
              updateValueProcesses(1, index, inputNode);
              const selector = '.lca-viz-up-down-btn-master-' + index + '-' + type;
              const syncContainer = document.querySelector(selector);
              const targetInput = syncContainer.querySelector(`.lca-viz-parameter-text[data-type="${type}"]`);

              syncInputs(targetInput, inputNode);
            });

            ratioDownBtnList[i].addEventListener("click", () => {
              updateValueProcesses(-1, index, inputNode);
              const selector = '.lca-viz-up-down-btn-master-' + index + '-' + type;
              const syncContainer = document.querySelector(selector);
              const targetInput = syncContainer.querySelector(`.lca-viz-parameter-text[data-type="${type}"]`);

              syncInputs(targetInput, inputNode);
            });
          }

          const inputNodeList = container.querySelectorAll(".input-normal");
          inputNodeList.forEach((inputNode) => {
            inputNode.addEventListener("input", () => {
              const newWeight = parseFloat(inputNode.value);
              const type = inputNode.dataset.type;
              const index = parseInt(inputNode.id.match(/\d+$/)[0]);

              const selector = '.lca-viz-up-down-btn-master-' + index + '-' + type;
              const syncContainer = document.querySelector(selector);
              const targetInput = syncContainer.querySelector(`.lca-viz-parameter-text[data-type="${type}"]`);

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
    const highlightContainer = document.querySelector('.lca-viz-highlight-container');

    // up button
    const upBtnList = highlightContainer.querySelectorAll('.lca-viz-up');
    for (let i = 0; i < upBtnList.length; i++) {
      const inputNode = upBtnList[i].parentElement.parentElement.querySelector('.lca-viz-parameter-text');
      const index = parseInt(inputNode.id.match(/\d+$/)[0]);
      const type = inputNode.dataset.type;

      upBtnList[i].addEventListener("click", () => {
        updateValueProcesses(1, index, inputNode, undefined, true);
        const selector = '.lca-viz-control-' + index + '-' + type;
        const syncContainer = document.querySelector(selector);
        const targetInput = syncContainer.querySelector(`.lca-viz-parameter-text[data-type="${type}"]`);
        syncInputs(targetInput, inputNode);
      });
    }
    // down button
    const downBtnList = highlightContainer.querySelectorAll('.lca-viz-down');
    for (let i = 0; i < downBtnList.length; i++) {
      const inputNode = downBtnList[i].parentElement.parentElement.querySelector('.lca-viz-parameter-text');
      const index = parseInt(inputNode.id.match(/\d+$/)[0]);
      const type = inputNode.dataset.type;

      downBtnList[i].addEventListener("click", () => {
        updateValueProcesses(-1, index, inputNode, undefined, true);
        const selector = '.lca-viz-control-' + index + '-' + type;
        const syncContainer = document.querySelector(selector);
        const targetInput = syncContainer.querySelector(`.lca-viz-parameter-text[data-type="${type}"]`);
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

        const selector = '.lca-viz-control-' + index + '-' + type;
        const syncContainer = document.querySelector(selector);
        const targetInput = syncContainer.querySelector(`.lca-viz-parameter-text[data-type="${type}"]`);

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

  function updateValueProcesses(weightChange, index, thisInput, newWeight = null, isIntext = false) {
    // Gets the other input node
    let inputList;
    let otherInput;
    if (isIntext) {
      // Selects all elements that have this format: 'lca-viz-up-down-btn-master-0-<something>'
      const highlightContainer = document.querySelector('.lca-viz-highlight-container');
      inputList = highlightContainer.querySelectorAll('.lca-viz-up-down-btn-master-' + index);
      console.log('finding: lca-viz-up-down-btn-master-' + index);
      console.log('intext inputList = ');
      console.log(inputList);
      if (inputList.length > 1 && inputList[0].querySelector('input') === thisInput) {
        otherInput = inputList[1].querySelector('input');
      } else {
        otherInput = inputList[0].querySelector('input');
      }
    } else {
      const parentContainer = thisInput.closest('.lca-viz-param-fill');
      inputList = parentContainer.querySelectorAll('.lca-viz-parameter-text');
      console.log('inputList = ');
      console.log(inputList);
      if (inputList.length > 1 && inputList[0] === thisInput) {
        otherInput = inputList[1];
      } else {
        otherInput = inputList[0];
      }
    }

    console.log('thisInput = ');
    console.log(thisInput);
    console.log('otherInput = ');
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
    if (thisInput.dataset.type === 'power') {
      console.log('thisInput.value = ' + thisInput.value);
      console.log('thisInput unit = ' + thisInput.dataset.valueUnit);
      console.log('otherInput.value = ' + otherInput.value);
      console.log('otherInput unit = ' + otherInput.dataset.valueUnit);
      power = convertToWatts(thisInput.value, thisInput.dataset.valueUnit);
      time = convertToSeconds(otherInput.value, otherInput.dataset.valueUnit);
    } else if (thisInput.dataset.type === 'time') {
      console.log('thisInput.value = ' + thisInput.value);
      console.log('thisInput unit = ' + thisInput.dataset.valueUnit);
      console.log('otherInput.value = ' + otherInput.value);
      console.log('otherInput unit = ' + otherInput.dataset.valueUnit);
      power = convertToWatts(otherInput.value, otherInput.dataset.valueUnit);
      time = convertToSeconds(thisInput.value, thisInput.dataset.valueUnit);
    }
    // This is the 'weight' in kWh that will be used to update chart data
    const weightKwh = (power * time) / (1000 * 3600);
    console.log('power = ' + power);
    console.log('time = ' + time);
    console.log('weightKwh = ' + weightKwh);
    updateChartData(weightKwh, index);
  }

  function updateValueRatio(weightChange, index, newWeight = null) {
    console.log('index = ' + index);
    const inputNode = document.getElementById('input-ratio-no-' + index);
    const closestToggleContainer = inputNode.closest('.lca-viz-param-toggle-on');
    const inputNodetoggleOff = document.getElementById('lca-viz-input-' + index);
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
    const otherInputs = closestToggleContainer.querySelectorAll('.input-ratio');
    otherInputs.forEach((otherInputNode) => {
      if ( otherInputNode.id !== ('input-ratio-no-' + index) ) {
        console.log('currentWeight = ' + otherInputNode.value);
        const otherNewWeight = parseFloat((otherInputNode.dataset.ratioValue * scalingFactor).toFixed(2));
        console.log('newWeight = ' + otherNewWeight);
        const otherIndex = parseInt(otherInputNode.id.match(/\d+$/)[0]);
        updateChartData(otherNewWeight, otherIndex);
        const otherInputNodeToggleOff = document.getElementById('lca-viz-input-' + otherIndex);
        otherInputNode.value = otherNewWeight;
        // otherInputNodeToggleOff.value = otherNewWeight;
      }
    });
  }

  /**
   * This update value works for independent materials, and toggle-off materials
   */
  function updateValue(weightChange, index, newWeight = null) {
    console.log('weightChange = ' + weightChange);
    console.log('index = ' + index);
    const inputNode = document.getElementById('lca-viz-input-' + index);
    console.log('inputNode = ');
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
      emissionsFactor = extractEmissionsFactor(obj.carbon_emission_factor).co2e_value;
      // emissionsFactor calculates the CO2-eq per kg value of a specific material.
      console.log('emissions factor = ' + emissionsFactor);
      console.log('old emissions value: ', chart.data.datasets[0].data[index]);

      let newEmissionsValue = parseFloat((emissionsFactor * newWeight).toFixed(2));
      console.log('new emissions value: ', newEmissionsValue);
      chart.data.datasets[0].data[index] = newEmissionsValue;
      chart.update();
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
    console.log('originalWidth = ' + originalWidth);

    function show(element) {
      element.classList.remove('hidden');
    }
    function hide(element) {
      element.classList.add('hidden');
    }

    toggleSwitches.forEach((toggleSwitch, index) => {
      toggleSwitch.addEventListener("change", () => {
        console.log('detected toggle switch clicking');
        const uniqueId = document.getElementById("lca-viz-r-section-" + index);
        const textDetails = uniqueId.querySelector('.lca-viz-ratio-detail-text');
        const paramToggleOn = uniqueId.querySelector('.lca-viz-param-toggle-on');
        const paramToggleOff = uniqueId.querySelector('.lca-viz-param-toggle-off');
        // const originalWidth = lcaVizMap.scrollWidth;
        const ratioTextList = uniqueId.querySelectorAll('.control-section');
        ratioTextList.forEach((div) => {
          if (div.innerText.length > 16) {
            div.classList.add("fz-12")
          }
        })

        if (toggleSwitch.checked) {
          const ratioContainer = toggleSwitch.closest(".lca-viz-ratio-container");
          const inputList = ratioContainer.querySelectorAll(".input-ratio");
          inputList.forEach((input) => {
            const newWeight = input.dataset.ratioValue;
            const index = parseInt(input.id.match(/\d+$/)[0]);
            updateValue(0, index, newWeight);
          });
          lcaVizMap.style.width = `${originalWidth}px`;
          setTimeout(() => {
            show(textDetails);
            hide(paramToggleOff);
            show(paramToggleOn);
            const newWidth = paramToggleOn.scrollWidth + 40;
            lcaVizMap.style.width = `${newWidth}px`;
          }, 0);
          paramToggleOn.style.width = "auto";
          textDetails.style.height = "auto";
        } else {
          const ratioContainer = toggleSwitch.closest(".lca-viz-ratio-container");
          const inputList = ratioContainer.querySelectorAll(".input-normal");
          inputList.forEach((input) => {
            const newWeight = 1;
            const index = parseInt(input.id.match(/\d+$/)[0]);
            updateValue(0, index, newWeight);
          });

          setTimeout(() => {
            hide(textDetails);
            hide(paramToggleOn);
            show(paramToggleOff);
            lcaVizMap.style.width = `${originalWidth}px`;
          }, 0);
        }
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
   * Makes the highlighted text background color turn green, and displays a carbon emission chart
   * @param {Node} parentNode The parent node
   * @param {Range} range The range of the selected text
   * @param {Selection} selection The selected text
   */
  async function makeHighlightTextInteractive(parentNode, range, selection) {
    if (selection.toString() !== "" && selection.toString().length > 2) {
      // Reset the previous highlighted node if it exists
      if (currentHighlightedNode) {
        // Store the current highlighted node as the previous highlighted node
        previousHighlightedNode = currentHighlightedNode;
        previousHighlightedNode.removeEventListener("click", redisplayChart);
        resetHighlight(currentHighlightedNode);
      }
      const materialData = await getValidSentence(selection.toString());
      if (materialData) {
        console.log("%j", materialData);
        const materialList = materialData;
        console.log('materialList: ', materialList);

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
        // div.classList.add("lca-viz-highlight");

        let modifiedText = `<div class="lca-viz-mark lca-viz-inline">${highlightedText}</div>`;
        const { rawMaterialNames, processesNames } = getAllNames(materialList);
        rawMaterialNames.forEach((name) => {
          const escapedName = escapeRegExp(name);
          const regex = new RegExp(`\\b${escapedName}\\b`, 'gi');
          modifiedText = modifiedText.replace(regex, `<span class="lca-viz-param-bold"><b>${name}</b></span>`);
        });
        processesNames.forEach((process) => {
          const escapedName = escapeRegExp(process.name);
          const regexName = new RegExp(`\\b${escapedName}\\b`, 'gi');
          modifiedText = modifiedText.replace(regexName, `<span class="lca-viz-param-bold"><b>${process.name}</b></span>`);

          const escapedPower = escapeRegExp(String(process.power_original));
          const regexPower = new RegExp(`\\b${escapedPower}\\b`, 'gi');

          // getParam(process.name, process.index, process.power_original_unit, process.power_original, true, process.time_original_unit, process.time_original);
          modifiedText = modifiedText.replace(regexPower,
            `
              <span class="lca-viz-origin-number lca-viz-hidden">${process.power_original}</span>
              <div class="lca-viz-processes-intext-${process.index} lca-viz-inline" data-value="${process.power_original}">
              ${createUpDownBtn(process.index, process.power_original_unit, process.power_original, "power")}
              </div>
            `
          );
          // <span class="lca-viz-original-time-text">${process.power_original}</span>
          const escapedTime = escapeRegExp(String(process.time_original));
          const regexTime = new RegExp(`\\b${escapedTime}\\b`, 'gi');
          modifiedText = modifiedText.replace(regexTime,
            `
              <span class="lca-viz-origin-number lca-viz-hidden">${process.time_original}</span>
              <div class="lca-viz-processes-intext-${process.index} lca-viz-inline" data-value="${process.time_original}">
              ${createUpDownBtn(process.index, process.time_original_unit, process.time_original, "time")}
              </div>
            `
          );
          // <span class="lca-viz-original-time-text">${process.time_original}</span>
        });

        modifiedText = modifiedText + `
          <div class="lca-viz-inline" id="lca-viz-end">
            <img src="${off_lca_btn}" alt="Turn off the LCA visualizer" class="icon-10 off-lca-btn lca-viz-hidden">
          </div>
        `;

        // const markElement = `<mark class="lca-viz-mark">${modifiedText}</mark>`;
        div.innerHTML = modifiedText;

        currentHighlightedNode = div;
        console.log('setting currentHighlightedNode: ', div);

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
        const offLcaBtn = document.querySelector('.off-lca-btn');
        offLcaBtn.addEventListener("click", () => {
          currentHighlightedNode.removeEventListener("click", redisplayChart);
          resetHighlight(currentHighlightedNode);
          currentHighlightedNode = null;
        })

        hideLCAActionBtn();
        initializeChart(materialData);
      } else {
        console.log('rawMaterial data is null');
        setLCAActionBtnState("error");
      }
    }
  }

  /**
   * Takes in materialList and returns two arrays containing the name of all the raw materials and processes.
   * @param {Object} materialList
   * @returns two arrays containing the name of all the raw materials and processes.
   */
  function getAllNames(materialList) {
    let rawMaterialNames = [];
    let processesNames = [];
    // Check for raw materials and related materials -> ratio
    if (materialList.raw_materials?.related_materials) {
      materialList.raw_materials.related_materials.forEach((relatedMaterial) => {
        if (relatedMaterial.ratio) {
          relatedMaterial.ratio.forEach((item) => {
            rawMaterialNames.push(item.name);
          });
        }
      });
    }
    // Check for raw materials and independent materials
    if (materialList.raw_materials?.independent_materials) {
      materialList.raw_materials.independent_materials.forEach((independentMaterial) => {
        rawMaterialNames.push(independentMaterial.name);
      });
    }
    // Check for processes
    if (materialList.processes) {
      materialList.processes.forEach((process) => {
        processesNames.push({
          "name": process.name,
          "power_original": process.power_original,
          "power_original_unit": process.power_original_unit,
          "time_original": process.time_original,
          "time_original_unit": process.time_original_unit,
          "index": process.index
        });
      });
    }
    console.log('rawMaterialNames: ');
    console.log(rawMaterialNames);
    console.log('processesNames: ');
    console.log(processesNames);
    return {
      rawMaterialNames: rawMaterialNames,
      processesNames: processesNames
    };
  }

  // Escape special characters in material names for regex
  function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    // const LCAActionBtn = document.getElementById("lca-viz-action-btn");
    const floatingLCAImg = document.querySelector('.floating-lca-img');
    if (state === "default") {
      floatingLCAImg.src = lca_48;
      LCAActionBtnText.textContent = "";
      LCAActionBtnText.classList.add("lca-viz-hidden");
      LCAActionBtn.classList.add("lca-viz-interactable");
    } else if (state === "analyzing") {
      floatingLCAImg.src = loading_icon_2;
      LCAActionBtnText.textContent = "Analyzing...";
      LCAActionBtnText.classList.remove("lca-viz-hidden");
      LCAActionBtn.classList.remove("lca-viz-interactable");
    } else if (state === "error") {
      floatingLCAImg.src = close_icon_red;
      LCAActionBtnText.textContent = "No raw materials detected."
      LCAActionBtnText.classList.remove("lca-viz-hidden");
      LCAActionBtn.classList.remove("lca-viz-interactable");
    }
  }

  function hideLCAActionBtn() {
    setLCAActionBtnState("default");
    if (LCAActionBtn) {
      LCAActionBtn.classList.add('lca-viz-hidden');
    }
  }

  function showLCAActionBtn() {
    setLCAActionBtnState("default");
    if (LCAActionBtn) {
      console.log('SHOWING LCA ACTION BTN: ');
      console.log(LCAActionBtn);
      LCAActionBtn.classList.remove('lca-viz-hidden');
    }
  }

  /**
   * Resets the styling and properties of the current highlighted node.
   * @param {Node} currentNode The currently highlighted node
   */
  function resetHighlight(currentNode) {
    if (currentNode) {
      hideChart();
      currentNode.classList.remove("lca-viz-inline", "lca-viz-highlight");
      currentNode.querySelectorAll('.lca-viz-origin-number').forEach((numberNode) => {
        numberNode.classList.remove("lca-viz-hidden");
      })
      const mark = currentNode.querySelector("mark");
      if (mark) {
        mark.classList.remove("lca-viz-mark");
      }

      // Restore the text back to its original format
      const originalText = mark ? mark.textContent : currentNode.textContent;
      currentNode.parentNode.replaceChild(document.createTextNode(originalText), currentNode);
    }
  }

  /**
   * Returns the HTML for up and down button given the parameter.
   * @param {String || Number} parameter The parameter of the raw material
   */
  function createUpDownBtn(index, unit, defaultValue, type) {
    const upDownBtn = `
          <div class="lca-viz-special-text-container-2 lca-viz-up-down-btn-master-${index} lca-viz-up-down-btn-master-${index}-${type}">
            <div class="lca-viz-special-text-intext lca-viz-active-st lca-viz-param-fill">
              <input class="lca-viz-parameter-text input-normal lca-viz-parameter-2" id="lca-viz-input-${index}" data-type="${type}" data-value-unit="${unit}" type="number" value="${defaultValue}">
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
    console.log('***HIGHLIGHTED TEXT****');
    console.log(highlightedText);
    console.log('***HIGHLIGHTED TEXT****');
    const jsonObject = {
      "text": highlightedText
    }
    try {
      const response = await fetch(LCA_SERVER_URL + "/api/evaluate-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(jsonObject),
      });

      if (response.ok) {
        const responseData = await response.json();
        if (responseData) {
          return responseData;
        }
        console.log('responseData doesnt have the expected structure');
        return null; // If responseData doesn't have the expected structure
      } else {
        console.log('response not okay');
        setLCAActionBtnState("error");
        return null;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setLCAActionBtnState("error"); // Handle errors gracefully
      return null;
    }
  }

  function trackRawMaterial() {
    let allowedDomains = ["nature.com", "acm.org", "arxiv.org", "acs.org", "wiley.com", "fly.dev"];
    if (isDomainValid(allowedDomains)) {
      console.log('trackRawMaterial enabled');
      handleLCAActionBtn();
      recordCurrentMouseCoord();
      handleHighlightText();
    }
  }

  function isNotEmptyString() {
    const selection = window.getSelection();
    return selection.toString().length > 0 && /\S/.test(selection.toString());
  }

  function handleHighlightText() {
    document.addEventListener('mouseup', async (e) => {
      if (highlightTimeout) {
        clearTimeout(highlightTimeout);
      }
      highlightTimeout = setTimeout(() => {
        const selection = window.getSelection();
        if (isNotEmptyString()) {
          if (LCAActionBtn && !LCAActionBtn.contains(e.target)) {
            LCAActionBtn.style.top = `${mouseY + scrollY + 8}px`;
            LCAActionBtn.style.left = `${mouseX + scrollX + 4}px`;
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
      }, 200);
    });
    document.addEventListener('click', (e) => {
      // Checks if the click is outside of tooltip. If so, hide the tooltip.
      if (LCAActionBtn && !LCAActionBtn.contains(e.target) && window.getSelection().toString() === '') {
        hideLCAActionBtn();
      }
    });
    document.addEventListener('mousedown', (e) => {
      if (!LCAActionBtn.contains(e.target)) {
        hideLCAActionBtn();
      }
    });
  }

  function handleLCAActionBtn() {
    console.log('handleLCAActionBtn called');
    if (!LCAActionBtn) {
      const actionBtnHTML = getLCAActionBtn();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = actionBtnHTML;
      document.body.appendChild(tempDiv.firstElementChild);
      LCAActionBtn = document.getElementById('lca-viz-action-btn');
      setLCAActionBtnState("default");

      LCAActionBtn.addEventListener("click", async () => {
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

    } else {
      if (LCAActionBtn.classList.contains('lca-viz-hidden')) {
        showLCAActionBtn();
      }
    }
    // LCAActionBtn.style.top = `${mouseY + scrollY + 8}px`;
    // LCAActionBtn.style.left = `${mouseX + scrollX + 4}px`;
  }

  function getLCAActionBtn() {
    const actionBtn = `
      <div class="flex-center lca-viz-interactable pd-12 br-8 cg-8 lca-viz-hidden" id="lca-viz-action-btn">
        <img src="${lca_48}" alt="LCA Image" class="floating-lca-img icon-20">
        <span class="lca-viz-hidden lca-lexend fz-14" id="lca-viz-action-btn-text"></span>
      </div>
    `;
    return actionBtn;
  }

  // Records the current coordinate of the mouse.
  function recordCurrentMouseCoord() {
    document.addEventListener('mousemove', function (event) {
      mouseX = event.clientX;
      mouseY = event.clientY;

      scrollX = window.scrollX;
      scrollY = window.scrollY;
    });
  }

  // TODO: Implement a function that only extract relevant keywords and parameters
  function extractCarbonInfo(text) {
    return text;
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
      const map = document.createElement('div');
      map.setAttribute('id', 'lca-viz-map');
      map.setAttribute('role', 'main');
      map.classList.add('lca-lexend');

      const paramContainer = document.createElement('div');
      paramContainer.classList.add('lca-viz-param-container');

      paramContainer.innerHTML = relatedMaterialHTML + independentMaterialHTML + processesHTML;

      map.innerHTML = `
        <div class="flex-center lca-viz-header cg-12 pd-12">
        <div class="flex-center cg-12 lca-viz-header-title">
          <img alt="logo" src="${lca_48}" class="icon-20">
          <span><b>LCA-Viz</b></span>
        </div>
        <button id="lca-viz-close-map" class="lca-viz-close-button flex-center">
          <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        </div>
        <span class="lca-viz-raw-material-title"><b>Raw Materials Carbon Emissions</b></span>
        <div class="lca-viz-canvas flex-center lca-viz-justify-center">
          <canvas id="lca-viz-carbon-chart"></canvas>
        </div>

      `;

      const paramSection = document.createElement('div');
      paramSection.classList.add('param-section');

      const paramSpan = document.createElement('span');
      paramSpan.innerHTML = '<b>Parameters:</b>';
      const paramSpan2 = document.createElement('p');
      paramSpan2.classList.add('mt-0');
      paramSpan2.classList.add('fz-16');
      paramSpan2.classList.add('lca-viz-param-subtext');
      paramSpan2.innerHTML = 'Adjust the values below to see the carbon emissions of different materials.';

      paramSection.appendChild(paramSpan);
      paramSection.appendChild(paramSpan2);
      paramSection.appendChild(paramContainer);

      map.appendChild(paramSection);
      document.body.appendChild(map);

      chartContainer = document.getElementById("lca-viz-map");

      const canvas = document.getElementById('lca-viz-carbon-chart');
      Chart.defaults.font.family = "Lexend";
      chart = new Chart(canvas, {
        type: 'pie',
        data: chartConfig.data,
        options: chartConfig.options
      });
      setChartPosition();
      handleCloseButton();
      handleUpDownBtnBehavior();
      handleToggleSwitch();

      requestAnimationFrame(() => {
        chartContainer.classList.add('visible');
        map.focus();
      });
    }
  }

  function setChartPosition() {
    chartContainer.style.top = `${chartPosY + chartScrollY + 8}px`;
    chartContainer.style.left = `${chartPosX + chartScrollX + 8}px`;
  }

  /**
   * Handles closing the chart behavior
   */
  function handleCloseButton() {
    document.getElementById("lca-viz-close-map").addEventListener("click", () => {
      hideChart();
      document.querySelector('.lca-viz-mark').classList.add('lca-viz-previously-highlighted');
      // currentHighlightedNode.classList.add('lca-viz-previously-highlighted');
      document.querySelector('.off-lca-btn').classList.remove('lca-viz-hidden');
    });

    currentHighlightedNode.addEventListener("click", redisplayChart);
  }

  // Redisplay the chart that was closed by the user
  function redisplayChart(event) {
    console.log('redisplaying chart');
    // const element = event.currentTarget;
    const element = document.querySelector('.lca-viz-mark');
    element.classList.remove("lca-viz-previously-highlighted");
    makeChartVisible();
  }


  function makeChartVisible(resetChartPosition = false) {
    console.log('showing the chart');
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

  // TODO: Implement a function that takes in the carbon info as text and outputs data used to create a Chart.js chart
  /**
   *
   * @param {String} carbonInfo
   * @returns JSON Object
   */
  function getChartConfig() {
    // This is the dummy data
    // const cData = currentChartData;
    console.log('currentChartData = ');
    console.dir(currentChartData);
    const cData = extractNameAndEmissions(currentChartData);
    console.log('cData = ');
    console.dir(cData);

    const rawLabels = cData.map(item => item.name);
    const emissionsData = cData.map(item => item.emissions);
    const chartData = {
      labels: rawLabels,
      datasets: [{
        label: '',
        data: emissionsData,
        fill: false,
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(255, 159, 64, 0.2)',
          'rgba(255, 205, 86, 0.2)',
          'rgba(75, 192, 192, 0.2)',
          'rgba(54, 162, 235, 0.2)',
          'rgba(153, 102, 255, 0.2)',
          'rgba(201, 203, 207, 0.2)',
          'rgba(255, 127, 80, 0.2)',
          'rgba(144, 238, 144, 0.2)',
          'rgba(173, 216, 230, 0.2)',
          'rgba(221, 160, 221, 0.2)',
          'rgba(240, 128, 128, 0.2)'
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(255, 159, 64)',
          'rgb(255, 205, 86)',
          'rgb(75, 192, 192)',
          'rgb(54, 162, 235)',
          'rgb(153, 102, 255)',
          'rgb(201, 203, 207)',
          'rgb(255, 127, 80)',
          'rgb(144, 238, 144)',
          'rgb(173, 216, 230)',
          'rgb(221, 160, 221)',
          'rgb(240, 128, 128)'
        ],
        borderWidth: 1
      }]
    };

    const options = {
      responsive: true,
      plugins: {
        legend: {
          display: true, // Show legend for pie/donut chart
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(tooltipItem) {
              const label = tooltipItem.label || '';
              const value = tooltipItem.raw;
              return `${label}: ${value} kg CO2-eq`; // Add unit in tooltip
            }
          }
        }
      }
    };
    return { data: chartData, options: options };
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

        material.ratio.forEach(item => {
          results.push({
            name: item.name,
            emissions: extractEmissionsFactor(item.carbon_emission_factor).co2e_value
          });
        });
      }
    });
  }
  // Process raw materials - independent materials
  if (data.raw_materials?.independent_materials) {
    const independentList = data.raw_materials.independent_materials;
    independentMaterialHTML = "<div class='lca-viz-independent-container'>" + independentList.map((item, index) => {
      const emissionsAmount = item.amount * extractEmissionsFactor(item.carbon_emission_factor).co2e_value
      results.push({
        name: item.name,
        emissions: emissionsAmount,
      });
      return getParam(item.name, item.index, 'g', item.amount, undefined, undefined, undefined);
    }).join('') + "</div>";
  }
  // Process processes
  if (data.processes) {
    const processesList = data.processes;
    processesHTML = "<div class='lca-viz-processes-container'>" + processesList.map((process) => {
      const emissionsFactor = extractEmissionsFactor(process.carbon_emission_factor).co2e_value;
      const emissionsAmount = calculateProcessesEmissions(process.power, process.time, emissionsFactor);
      results.push({
        name: process.name,
        emissions: emissionsAmount,
      });
      return getParam(process.name, process.index, process.power_original_unit, process.power_original, true, process.time_original_unit, process.time_original);
    }).join('')  + "</div>";
  }
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

  console.log('currentDomain = ' + currentDomain);
  // Manually allow the specific URL
  if (currentDomain === "fly.dev") {
    return true;
  }

  if (allowedDomains.includes(currentDomain)) {
    return true;
  } else {
    return false;
  }
}

export function getBaseDomain(hostname) {
  const parts = hostname.split('.');
  if (parts.length > 2) {
    return parts.slice(-2).join('.');
  }
  return hostname;
}