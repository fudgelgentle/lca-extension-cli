/* eslint-disable no-unused-vars */
// content.js handles the following scenario:
// 1. Displaying carbon chart on raw materials

import Chart from 'chart.js/auto';
const lca_48 = chrome.runtime.getURL("../assets/img/lca-48.png");
const off_lca_btn = chrome.runtime.getURL("../assets/img/off-lca-btn.png");
const loading_icon_2 = chrome.runtime.getURL("../assets/img/loading-icon-2.gif");
const close_icon_red = chrome.runtime.getURL("../assets/img/close-icon-red.png");

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
    const allowedDomains = ["nature.com", "acm.org", "fedex.com", "azure.com"];
    const allowedDomains2 = ["amazon.com", "bestbuy.com", "apple.com", "store.google.com", "samsung.com", "oppo.com", "huawei.com", "lenovo.com"];
    if (isDomainValid(allowedDomains) || isDomainValid(allowedDomains2)) {
      console.log('current domain is allowed, injecting css');
      createLinkElement("preconnect", "https://fonts.googleapis.com");
      createLinkElement("preconnect", "https://fonts.gstatic.com", "anonymous");
      createLinkElement(
        "stylesheet",
        "https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap"
      );
      createLinkElement("stylesheet", chrome.runtime.getURL("assets/content-style.css"));
      createLinkElement("stylesheet", chrome.runtime.getURL("assets/popup-content.css"));
      init();
    }
}

let chart;
let chartContainer;
let currentChartData;
let selectionTimeout;
let LCAToolTip;

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
    const upBtnList = document.querySelectorAll(".lca-viz-up");
    const downBtnList = document.querySelectorAll(".lca-viz-down");
    const upDownBtnCount = upBtnList.length;
    for (let i = 0; i < upDownBtnCount; i++) {
      const parameterNode = getParameterNode(i);
      parameterNode.addEventListener("input", () => {
        const newWeight = parseFloat(parameterNode.value);
        if (newWeight >= 1) {
          const currentWeight = newWeight;
          updateChartData(newWeight, i);
        }
      })
      upBtnList[i].addEventListener("click", () => {
        updateValue(1, i);
      });
      downBtnList[i].addEventListener("click", () => {
        updateValue(-1, i)
      });
    }
  }

  function getParameterNode(index) {
    const paramId = "lca-viz-param-" + index;
    return document.getElementById(paramId);
  }

  /**
   *
   * @param {number} emissionsFactor Represents the multiplier that adjusts the emissions value based on changes in the material's weight
   * @param {number} weightChange Indicates the amount by which the material's weight is increased or decreased.
   * @param {number} index The index used for identifying the parameter.
   */
  function updateValue(weightChange, index) {
    const parameterNode = getParameterNode(index);
    const currentWeight = parseInt(parameterNode.value);
    // If we are decreasing weight, make sure the current weight won't go below 1
    if (weightChange < 0 && currentWeight <= 1) {
      return;
    }
    const newWeight = currentWeight + weightChange;
    parameterNode.value = newWeight;
    updateChartData(newWeight, index);
  }

  /**
   *
   * @param {number} newWeight The new value that is being displayed in the UI
   * @param {number} currentWeight The current weight of the parameter
   * @param {number} index The index of the raw material
   */
  function updateChartData(newWeight, index) {
    if (index !== -1) {
      console.log('newWeight = ' + newWeight);
      console.log('index = ' + index);
      // emissionsFactor calculates the CO2-eq per kg value of a specific material.
      const emissionsFactor = currentChartData[index].emissions_factor;
      console.log('emissions factor = ' + emissionsFactor);
      console.log('old emissions value: ', chart.data.datasets[0].data[index]);
      let newEmissionsValue = emissionsFactor * newWeight;
      newEmissionsValue = parseFloat(newEmissionsValue.toFixed(2));
      console.log('new emissions value: ', newEmissionsValue);
      chart.data.datasets[0].data[index] = newEmissionsValue;
      chart.update();
    }
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
      const rawMaterialData = await getValidSentence(selection.toString());
      if (rawMaterialData) {
        console.log("%j", rawMaterialData);
        const rawMaterialsList = rawMaterialData.data.raw_materials;
        console.log('rawMaterialsList: ', rawMaterialsList);

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
        div.classList.add("lca-viz-highlight");

        let modifiedText = `<mark class="lca-viz-mark">${highlightedText}</mark>`;
        rawMaterialsList.forEach((material) => {
          const escapedMaterial = escapeRegExp(material);
          const regex = new RegExp(`\\b${escapedMaterial}\\b`, 'gi');
          console.log('regex = ' + regex);
          modifiedText = modifiedText.replace(regex, `<span class="lca-viz-param-bold"><b>${material}</b></span>`);
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
        initializeChart(rawMaterialData);
      } else {
        console.log('rawMaterial data is null');
        setLCAActionBtnState("error");
      }
    }
  }

  // Escape special characters in material names for regex
  function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function initializeChart(data) {
    const chartData = getChartEmissionsData(data);

    // ! Later on this should be a for-loop to get the key-value pair from each raw material object
    let parameter = chartData[0].emissions;
    let materialName = chartData[0].name;
    let chartConfig = getChartConfig(materialName);
    // Remove the previous chart, reset the 'chart' global variable
    const chartContainer = document.getElementById("lca-viz-map");
    if (chartContainer) {
      chartContainer.remove();
      chart.destroy();
      chart = null;
    }
    createChart(chartConfig, chartData);
    const resetChartPosition = true;
    makeChartVisible(resetChartPosition);
  }

  // TODO: Return the real emissions of each raw material (how many kg CO2-eq) using
  // TODO: the '/api/material-emissions' api.
  /**
   *
   * @param {JSON} rawMaterialData A list of different raw materials in JSON format.
   * @returns The name for each raw material and its corresponding carbon emissions.
   */
  function getChartEmissionsData(rawMaterialData) {
    // ! This is the mock data
    let data = [
      {
        "name": "Copper foil",
        "emissions": "0.97",
        "emissions_factor": "0.97"
      },
      {
        "name": "Vitrimer polymer",
        "emissions": "2.5",
        "emissions_factor": "2.5",
      },
      {
        "name": "Epoxy (EPON 828)",
        "emissions": "0.2",
        "emissions_factor": "0.2",
      },
      {
        "name": "Adipic acid",
        "emissions": "0.1",
        "emissions_factor": "0.1",
      },
      {
        "name": "1,5,7-triazabicyclo[4.4.0]dec-5-ene (TBD)",
        "emissions": "3.24",
        "emissions_factor": "3.24"
      },
      {
        "name": "Woven glass fibre sheets",
        "emissions": "9.1",
        "emissions_factor": "9.1"
      }
    ];
    return data;
  }

  function setLCAActionBtnState(state) {
    const LCAActionBtnText = document.getElementById("lca-viz-action-btn-text");
    const LCAActionBtn = document.getElementById("lca-viz-action-btn");
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
    if (LCAToolTip) {
      LCAToolTip.classList.add('lca-viz-hidden');
    }
  }

  function showLCAActionBtn() {
    setLCAActionBtnState("default");
    if (LCAToolTip) {
      LCAToolTip.classList.remove('lca-viz-hidden');
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
      const mark = currentNode.querySelector("mark");
      if (mark) {
        mark.classList.remove("lca-viz-mark");
      }

      // Restore the text back to its original format
      const originalText = mark ? mark.textContent : currentNode.textContent;
      currentNode.parentNode.replaceChild(document.createTextNode(originalText), currentNode);
    }
  }

  function createUpDownBtn(element, parameter) {
    const upDownBtn = `
          <div class="lca-viz-special-text-container-2">
            <div class="lca-viz-special-text-2 lca-viz-active-st">
              <span id="lca-viz-parameter-2">${parameter}</span>
              <div class="lca-viz-up-down-btn-container">
                <div class="lca-viz-active lca-viz-up-down-btn" id="up">
                  <svg width="100%" height="100%" viewBox="0 0 9 7" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3.60595 1.24256C3.99375 0.781809 4.7032 0.781808 5.091 1.24256L8.00777 4.70806C8.53906 5.3393 8.09032 6.30353 7.26525 6.30353L1.4317 6.30353C0.606637 6.30353 0.157892 5.33931 0.689181 4.70807L3.60595 1.24256Z" fill="currentColor"/>
                  </svg>
                </div>
                <div class="lca-viz-active lca-viz-up-down-btn" id="down">
                  <svg width="100%" height="100%" viewBox="0 0 9 7" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.09107 5.74914C4.70327 6.20989 3.99382 6.20989 3.60602 5.74914L0.689251 2.28363C0.157962 1.65239 0.606707 0.688168 1.43177 0.688168L7.26532 0.688168C8.09039 0.688168 8.53913 1.65239 8.00784 2.28363L5.09107 5.74914Z" fill="currentColor"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
    `;
    // * Original code for the display button:
    // ~~ DO NOT DELETE
    // <div title="Click to display CO2 emissions" class="display-chart-btn-container lca-on">
    //   <svg width="24" height="24" class="display-chart-btn eye-on" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    //     <path d="M10.7429 5.09232C11.1494 5.03223 11.5686 5 12.0004 5C17.1054 5 20.4553 9.50484 21.5807 11.2868C21.7169 11.5025 21.785 11.6103 21.8231 11.7767C21.8518 11.9016 21.8517 12.0987 21.8231 12.2236C21.7849 12.3899 21.7164 12.4985 21.5792 12.7156C21.2793 13.1901 20.8222 13.8571 20.2165 14.5805M6.72432 6.71504C4.56225 8.1817 3.09445 10.2194 2.42111 11.2853C2.28428 11.5019 2.21587 11.6102 2.17774 11.7765C2.1491 11.9014 2.14909 12.0984 2.17771 12.2234C2.21583 12.3897 2.28393 12.4975 2.42013 12.7132C3.54554 14.4952 6.89541 19 12.0004 19C14.0588 19 15.8319 18.2676 17.2888 17.2766M3.00042 3L21.0004 21M9.8791 9.87868C9.3362 10.4216 9.00042 11.1716 9.00042 12C9.00042 13.6569 10.3436 15 12.0004 15C12.8288 15 13.5788 14.6642 14.1217 14.1213" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    //   </svg>
    // </div>

    element.innerHTML = upDownBtn;
  }

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


  // Uses LLM to determine the relevant sentences that can be used to display a carbon chart.
  // Returns a JSON that contains information about each identified raw materials and their parameters.
  // If the highlightedText does not have sufficient information, the data will return null.
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
        if (responseData.data) {
          return responseData;
        }
        return null; // If responseData doesn't have the expected structure
      } else {
        setLCAActionBtnState("error");
        return null;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setLCAActionBtnState("error"); // Handle errors gracefully
      return null;
    }
  }

  function normalizeText(text) {
    return text.toLowerCase().replace(/\s+/g, " ").trim();
  }

  function trackRawMaterial() {
    let allowedDomains = ["nature.com", "acm.org"];
    if (isDomainValid(allowedDomains)) {
      recordCurrentMouseCoord();
      handleHighlightText();
    }
  }

  function isEmptyString() {
    const selection = window.getSelection();
    return selection.toString().length > 0 && /\S/.test(selection.toString());
  }

  function handleHighlightText() {
    document.addEventListener('selectionchange', async () => {
      if (highlightTimeout) {
        clearTimeout(highlightTimeout);
      }
      highlightTimeout = setTimeout(() => {
        const selection = window.getSelection();
        if (isEmptyString()) {
          if (LCAToolTip) {
            LCAToolTip.classList.remove('lca-viz-hidden');
          }
          const range = selection.getRangeAt(0);
          const highlightedNode = range.commonAncestorContainer;
          let parentNode;
          // CASE: If the highlighted text is a standalone html node
          if (highlightedNode.nodeType === 1) {
            console.log('highlighted text is a standalone html node');
            parentNode = highlightedNode;
            // CASE: If the highlighted text is in a section of an html node
          } else {
            console.log('highlighted text is in a section of an html node')
            parentNode = highlightedNode.parentNode;
          }
          globalSelectionData.parentNode = parentNode;
          globalSelectionData.range = range;
          globalSelectionData.selection = selection;
          handleLCAActionBtn();
        }
      }, 500);
    });
    document.addEventListener('click', (e) => {
      // Checks if the click is outside of tooltip. If so, hide the tooltip.
      if (LCAToolTip && !LCAToolTip.contains(e.target) && window.getSelection().toString() === '') {
        hideLCAActionBtn();
      }
    });
  }

  function handleLCAActionBtn() {
    console.log('handleLCAActionBtn called');
    if (!LCAToolTip) {
      const actionBtnHTML = getLCAActionBtn();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = actionBtnHTML;
      document.body.appendChild(tempDiv.firstElementChild);
      setLCAActionBtnState("default");

      LCAToolTip = document.getElementById('lca-viz-action-btn');

      LCAToolTip.addEventListener("click", async () => {
        if (isEmptyString()) {
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
      if (LCAToolTip.classList.contains('lca-viz-hidden')) {
        showLCAActionBtn();
      }
    }

    LCAToolTip.style.top = `${mouseY + scrollY + 8}px`;
    LCAToolTip.style.left = `${mouseX + scrollX + 4}px`;
  }

  function getLCAActionBtn() {
    const actionBtn = `
      <div class="flex-center floating-lca-action-btn lca-viz-interactable pd-12 br-8 cg-8" id="lca-viz-action-btn">
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

  function getChartConfig(materialName) {
    const textContent = document.body.innerText;
    const carbonInfo = extractCarbonInfo(textContent);
    const chartConfig = getCarbonData(carbonInfo, materialName);
    return chartConfig;
  }

  // TODO: Implement a function that only extract relevant keywords and parameters
  function extractCarbonInfo(text) {
    return text;
  }

  function createChart(chartConfig, paramList) {
    clearTimeout(selectionTimeout);
    if (!chart) {
      const map = document.createElement('div');
      map.setAttribute('id', 'lca-viz-map');
      map.classList.add('lca-lexend');

      const paramContainer = document.createElement('div');
      paramContainer.classList.add('lca-viz-param-container');

      let i = 0;
      paramList.forEach((param) => {
        const placeholder = document.createElement('div');
        placeholder.innerHTML = getParam(param.name, i);
        paramContainer.appendChild(placeholder);
        i++;
      })

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
        <canvas id="lca-viz-carbon-chart" width="480" height="320"></canvas>
      `;

      const paramSection = document.createElement('div');
      paramSection.classList.add('param-section');

      const paramSpan = document.createElement('span');
      paramSpan.innerHTML = '<b>Parameters:</b>';
      const paramSpan2 = document.createElement('p');
      paramSpan2.classList.add('mt-0');
      paramSpan2.classList.add('fz-16');
      paramSpan2.classList.add('lca-viz-param-subtext');
      paramSpan2.innerHTML = 'Adjust the values below to see how the emissions data change.';

      paramSection.appendChild(paramSpan);
      paramSection.appendChild(paramSpan2);
      paramSection.appendChild(paramContainer);

      map.appendChild(paramSection);
      document.body.appendChild(map);
      chartContainer = document.getElementById("lca-viz-map");

      const canvas = document.getElementById('lca-viz-carbon-chart');
      Chart.defaults.font.family = "Lexend";
      chart = new Chart(canvas, {
        type: 'bar',
        data: chartConfig.data,
        options: chartConfig.options
      });

      setChartPosition();
      handleCloseButton();
      handleUpDownBtnBehavior();
    }
  }

  function getParam(rawMaterialName, index) {
    const paramId = "lca-viz-param-" + index;
    const paramDiv = `
      <div class="lca-viz-param-fill flex-center br-8 fz-16">
            <span>${rawMaterialName}</span>
            <div class="flex-center cg-4">
              <div class="lca-viz-special-text-container-2">
                <div class="lca-viz-special-text-2 lca-viz-active-st">
                  <div class="lca-viz-up-down-btn-container">
                    <div class="lca-viz-active lca-viz-up-down-btn lca-viz-down">
                      <svg width="100%" height="100%" viewBox="0 0 9 7" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5.09107 5.74914C4.70327 6.20989 3.99382 6.20989 3.60602 5.74914L0.689251 2.28363C0.157962 1.65239 0.606707 0.688168 1.43177 0.688168L7.26532 0.688168C8.09039 0.688168 8.53913 1.65239 8.00784 2.28363L5.09107 5.74914Z" fill="currentColor"/>
                      </svg>
                    </div>
                    <input class="lca-viz-parameter-text" id="${paramId}" type="number" value="1">
                    <div class="lca-viz-active lca-viz-up-down-btn lca-viz-up">
                      <svg width="100%" height="100%" viewBox="0 0 9 7" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3.60595 1.24256C3.99375 0.781809 4.7032 0.781808 5.091 1.24256L8.00777 4.70806C8.53906 5.3393 8.09032 6.30353 7.26525 6.30353L1.4317 6.30353C0.606637 6.30353 0.157892 5.33931 0.689181 4.70807L3.60595 1.24256Z" fill="currentColor"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              <span>kg</span>
            </div>
          </div>
    `;
    return paramDiv;
  }

  function setChartPosition() {
    chartContainer.style.top = `${chartPosY + chartScrollY + 8}px`;
    chartContainer.style.left = `${chartPosX + chartScrollX + 8}px`;
  }

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
    chartContainer.classList.add("lca-viz-visible");
    handleDraggableMap();
  }

  function hideChart() {
    console.log('hiding chart!!!!!!');
    const c = chartContainer;
    console.log('chartContainer: ', c);
    chartContainer.classList.remove("lca-viz-visible");
    clearTimeout(selectionTimeout);
  }

  // TODO: Implement a function that takes in the carbon info as text and outputs data used to create a Chart.js chart
  /**
   *
   * @param {String} carbonInfo
   * @returns JSON Object
   */
  function getCarbonData(carbonInfo, legendTitle) {
    carbonInfo;
    // This is the dummy data
    const cData = [
      {
        "name": "Copper foil",
        "emissions": "0.97",
        "emissions_factor": "0.97"
      },
      {
        "name": "Vitrimer polymer",
        "emissions": "2.5",
        "emissions_factor": "2.5",
      },
      {
        "name": "Epoxy (EPON 828)",
        "emissions": "0.2",
        "emissions_factor": "0.2",
      },
      {
        "name": "Adipic acid",
        "emissions": "0.1",
        "emissions_factor": "0.1",
      },
      {
        "name": "1,5,7-triazabicyclo[4.4.0]dec-5-ene (TBD)",
        "emissions": "3.24",
        "emissions_factor": "3.24"
      },
      {
        "name": "Woven glass fibre sheets",
        "emissions": "9.1",
        "emissions_factor": "9.1"
      }
    ];

    currentChartData = cData;

    const rawLabels = cData.map(item => item.name);
    const emissionsData = cData.map(item => item.emissions);
    const chartData = {
      labels: rawLabels,
      datasets: [{
        axis: 'y',
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
          'rgba(201, 203, 207, 0.2)'
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(255, 159, 64)',
          'rgb(255, 205, 86)',
          'rgb(75, 192, 192)',
          'rgb(54, 162, 235)',
          'rgb(153, 102, 255)',
          'rgb(201, 203, 207)'
        ],
        borderWidth: 1
      }]
    };

    const options = {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          font: {
            weight: 'bold'
          },
          ticks: {
            callback: function (value) {
              // truncate the labels only in this axis
              const lbl = this.getLabelForValue(value);
              if (typeof lbl === 'string' && lbl.length > 30) {
                return `${lbl.substring(0, 30)}...`;
              }
              return lbl;
            },
          },
        },
        x: {
          title: {
            display: true,
            text: 'Emissions (kg CO2-eq)',
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(tooltipItem) {
              return `Estimated Emissions: ${tooltipItem.raw} kg CO2-eq`; // Add unit in tooltip
            }
          }
        }
      },
      indexAxis: 'y',
    };
    return { data: chartData, options: options };
  }
}

export function isDomainValid(domainList) {
  let allowedDomains = domainList;
  const currentDomain = getBaseDomain(window.location.hostname);
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