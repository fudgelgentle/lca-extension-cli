import Chart from 'chart.js/auto';

const FREIGHT_URL = 'https://lca-server-api.fly.dev';

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

    createLinkElement("preconnect", "https://fonts.googleapis.com");
    createLinkElement("preconnect", "https://fonts.gstatic.com", "anonymous");
    createLinkElement(
      "stylesheet",
      "https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap"
    );
    createLinkElement(
      "stylesheet",
      chrome.runtime.getURL("assets/content-style.css")
    );
}

let chart;
let chartContainer;
let selectionTimeout;

let mouseX;
let mouseY;
// Get the scroll offsets
let scrollX;
let scrollY;

let currentValidSentenceJSON;
let currentHighlightedNode;
let currentParamNode;

handleHighlightText();
recordCurrentMouseCoord();
// searchAndHighlight();
testClimatiqAPI();

// Populates .master-container with the LCA banner
function prepareLCABanner() {
  const lcaBannerHTML = `
    <section class="lca-banner flex-stretch">
        <div class="flex-center title-container br-8 pd-16">
          <img src="../assets/img/lca-48.png" alt="LCA Image" class="icon-20">
          <p class="title-text fz-20 eco-bold"><b>LCA-Viz</b></p>
        </div>
        <div class="flex-center close-container br-8 pd-16">
          <svg class="icon-20" width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </section>
  `;
}

function testClimatiqAPI() {
  console.log('calling testClimatiqAPI...');
  const data = {
    route: [
      {
        location: {
          query: "Seattle, Washington, 98154, United States"
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
          query: "Suginami City, Tokyo, 168-0063, Japan"
        }
      }
    ],
    cargo: {
      weight: 10,
      weight_unit: "t"
    }
  };

  fetch(FREIGHT_URL + "/api/freight", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(responseData => {
    console.log('API Response: ', responseData);
  })
  .catch(error => {
    console.log(error);
  });
}

function getElementCoordinates(element) {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + window.scrollX,
    y: rect.top + window.scrollY,
  };
}

function handleDraggableMap() {
  const map = document.getElementById('map');
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

function handleDisplayBtn(parameter, legendTitle) {
  let displayBtn = document.querySelector(".display-chart-btn-container");

  const svgEyeOff = `
      <svg width="24" height="24" class="display-chart-btn eye-off" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10.7429 5.09232C11.1494 5.03223 11.5686 5 12.0004 5C17.1054 5 20.4553 9.50484 21.5807 11.2868C21.7169 11.5025 21.785 11.6103 21.8231 11.7767C21.8518 11.9016 21.8517 12.0987 21.8231 12.2236C21.7849 12.3899 21.7164 12.4985 21.5792 12.7156C21.2793 13.1901 20.8222 13.8571 20.2165 14.5805M6.72432 6.71504C4.56225 8.1817 3.09445 10.2194 2.42111 11.2853C2.28428 11.5019 2.21587 11.6102 2.17774 11.7765C2.1491 11.9014 2.14909 12.0984 2.17771 12.2234C2.21583 12.3897 2.28393 12.4975 2.42013 12.7132C3.54554 14.4952 6.89541 19 12.0004 19C14.0588 19 15.8319 18.2676 17.2888 17.2766M3.00042 3L21.0004 21M9.8791 9.87868C9.3362 10.4216 9.00042 11.1716 9.00042 12C9.00042 13.6569 10.3436 15 12.0004 15C12.8288 15 13.5788 14.6642 14.1217 14.1213" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
  const svgEyeOn = `
      <svg width="24" height="24" class="display-chart-btn eye-on" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.42012 12.7132C2.28394 12.4975 2.21584 12.3897 2.17772 12.2234C2.14909 12.0985 2.14909 11.9015 2.17772 11.7766C2.21584 11.6103 2.28394 11.5025 2.42012 11.2868C3.54553 9.50484 6.8954 5 12.0004 5C17.1054 5 20.4553 9.50484 21.5807 11.2868C21.7169 11.5025 21.785 11.6103 21.8231 11.7766C21.8517 11.9015 21.8517 12.0985 21.8231 12.2234C21.785 12.3897 21.7169 12.4975 21.5807 12.7132C20.4553 14.4952 17.1054 19 12.0004 19C6.8954 19 3.54553 14.4952 2.42012 12.7132Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12.0004 15C13.6573 15 15.0004 13.6569 15.0004 12C15.0004 10.3431 13.6573 9 12.0004 9C10.3435 9 9.0004 10.3431 9.0004 12C9.0004 13.6569 10.3435 15 12.0004 15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

  // initializing the default behavior
  let chartConfig = getCarbonFootprint(legendTitle);
  createChart(chartConfig, parameter);
  makeChartVisible();

  displayBtn.addEventListener("click", () => {
    if (displayBtn.classList.contains("lca-off")) {
      replaceClass(displayBtn, "lca-off", "lca-on");
      displayBtn.innerHTML = svgEyeOn;

      if (!chart) {
        let chartConfig = getCarbonFootprint(legendTitle);
        createChart(chartConfig, parameter);
      }
      makeChartVisible();
    } else {
      replaceClass(displayBtn, "lca-on", "lca-off");
      displayBtn.innerHTML = svgEyeOff;
      hideChart();
    }
    activeUpDownBtn();
  });
}

function activeUpDownBtn() {
  const upDownBtn = document.querySelectorAll(".up-down-btn");
  const specialText = document.querySelectorAll(".special-text-2");

  upDownBtn.forEach((btn) => {
    if (btn.classList.contains("active")) {
      replaceClass(btn, "active", "inactive");
    } else {
      replaceClass(btn, "inactive", "active");
    }
  });
  specialText.forEach((text) => {
    if (text.classList.contains("active-st")) {
      replaceClass(text, "active-st", "inactive-st");
    } else {
      replaceClass(text, "inactive-st", "active-st");
    }
  });
}

function handleUpDownBtnBehavior() {
  const upBtn = document.getElementById("up");
  const downBtn = document.getElementById("down");
  upBtn.addEventListener("click", () => {
    updateValue(1);
  });
  downBtn.addEventListener("click", () => {
    updateValue(-1);
  });
}

function updateValue(change) {
  const upBtn = document.getElementById("up");
  const downBtn = document.getElementById("down");
  if (upBtn.classList.contains("inactive") || downBtn.classList.contains("inactive")) {
    return;
  }
  const parameter = document.getElementById("parameter-2");
  const display = document.getElementById("display");
  display.innerText = parseInt(parameter.innerText);

  const newValue = parseInt(parameter.innerText) + change;
  parameter.innerText = newValue;
  display.innerText = newValue;
  updateChartData(chart, newValue);
}

function updateChartData(chart, multiplier) {
  let chartConfig = getCarbonFootprint();
  let data = chartConfig.data.datasets[0].data;
  let newData = data.map((val) => val * multiplier);
  const chartData = chart.data.datasets[0].data;
  for (let i = 0; i < data.length; i++) {
    chartData[i] = newData[i];
  }
  chart.update();
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

function makeHighlightTextInteractive(parentNode, range, selection) {
  currentValidSentenceJSON = getValidSentence(selection.toString())[0];
  if (currentValidSentenceJSON) {
    const fullText = parentNode.textContent;
    const startOffset = range.startOffset;
    const endOffset = range.endOffset;
    const startContainerText = range.startContainer.textContent;
    const endContainerText = range.endContainer.textContent;

    // Extract the segments of the text
    const beforeText = fullText.slice(
      0,
      fullText.indexOf(startContainerText) + startOffset
    );
    const highlightedText = selection.toString();
    const afterText = fullText.slice(
      fullText.indexOf(endContainerText) + endOffset
    );

    let div = document.createElement("div");
    div.classList.add("lca-viz-inline");
    div.classList.add("lca-viz-highlight");
    div.textContent = highlightedText;
    div.innerHTML = currentValidSentenceJSON.htmlContent;
    currentHighlightedNode = div;

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

    let lcaVizParamTarget = document.querySelector(".lca-viz-param-target");
    createUpDownBtn(lcaVizParamTarget, lcaVizParamTarget.textContent);
    currentParamNode = lcaVizParamTarget;
    let parameter = currentValidSentenceJSON.parameter;
    let materialName = currentValidSentenceJSON.rawMaterials;
    handleUpDownBtnBehavior();

    let chartConfig = getCarbonFootprint(materialName);
    createChart(chartConfig, parameter);
    makeChartVisible();

    // handleDisplayBtn(parameter, materialName);
  }

}

function createUpDownBtn(element, parameter) {
  const upDownBtn = `
        <div class="special-text-container-2">
          <div class="special-text-2 active-st">
            <span id="parameter-2">${parameter}</span>
            <div class="up-down-btn-container">
              <div class="active up-down-btn" id="up">
                <svg width="100%" height="100%" viewBox="0 0 9 7" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.60595 1.24256C3.99375 0.781809 4.7032 0.781808 5.091 1.24256L8.00777 4.70806C8.53906 5.3393 8.09032 6.30353 7.26525 6.30353L1.4317 6.30353C0.606637 6.30353 0.157892 5.33931 0.689181 4.70807L3.60595 1.24256Z" fill="currentColor"/>
                </svg>
              </div>
              <div class="active up-down-btn" id="down">
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


// TODO: WIP. Currently returns a mock/example sentence.
// Uses LLM to determine the relevant sentences that can be used to display a carbon chart.
// Returns the sentence
function getValidSentence(highlightedText) {
  let isValidSentence = true;
  if (isValidSentence) {
    return [
      {
        sentence:
          "The epoxy was poured into a beaker, then placed in a 100 °C heated bath and stirred at 100 r.p.m. for 10 min.",
        parameter: "10",
        rawMaterials: "Epoxy",
        htmlContent:
          'The epoxy was poured into a beaker, then placed in a 100 °C heated bath and stirred at 100 r.p.m. for <div class="lca-viz-param-target">10</div> min.',
      }
    ];
  }

  // return normalizeText("epoxy (EPON 828, Skygeek), adipic acid (Sigma Aldrich) and 1,5,7-triazabicyclo[4.4.0]dec-5-ene (TBD, Sigma Aldrich). The epoxy was poured into a beaker, then placed in a 100 °C heated bath and stirred at 100 r.p.m. for 10 min.");
}

function normalizeText(text) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function handleHighlightText() {
  let debounceTimeout;
  document.addEventListener('mouseup', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      const selection = window.getSelection();
      if (selection.toString().length > 0) {
        console.log("Highlighting something");
        const range = selection.getRangeAt(0);
        const highlightedNode = range.commonAncestorContainer;
        //
        let result;
        // CASE: If the highlighted text is a standalone html node
        if (highlightedNode.nodeType === 1) {
          result = highlightedNode;
        // CASE: If the highlighted text is in a section of an html node
        } else {
          result = highlightedNode.parentNode;
        }
        makeHighlightTextInteractive(result, range, selection);
      }
    }, 500);
  });
}

// Records the current coordinate of the mouse.
function recordCurrentMouseCoord() {
  document.addEventListener('mousemove', function(event) {
    mouseX = event.clientX;
    mouseY = event.clientY;

    scrollX = window.scrollX;
    scrollY = window.scrollY;
  });
}

function getCarbonFootprint(materialName) {
  const textContent = document.body.innerText;
  const carbonInfo = extractCarbonInfo(textContent);
  const chartConfig = getCarbonData(carbonInfo, materialName);
  return chartConfig;
}

// TODO: Implement a function that only extract relevant keywords and parameters
function extractCarbonInfo(text) {
  return text;
}

function createChart(chartConfig, parameter) {
  clearTimeout(selectionTimeout);
  if (!chart) {
    const map = document.createElement('div');
    map.setAttribute('id', 'map');

    map.innerHTML = `
      <canvas id="carbonChart" width="480" height="320"></canvas>
      <div class="slidercontainer">
        <span class="lca-lexend">Duration: <span id="display">${parameter}</span> minute(s)</span>
      </div>
      <button id="closeMap" class="close-button">
        <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    `;

    document.body.appendChild(map);
    chartContainer = document.getElementById("map");

    const canvas = document.getElementById('carbonChart');
    chart = new Chart(canvas, {
        type: 'bar',
        data: chartConfig.data,
        options: chartConfig.options
    });

    // document.getElementById('closeMap').addEventListener('click', () => {
    //   hideChart();
    // });
    setChartPosition();
    handleCloseButton();

  }
}

function setChartPosition() {
  console.log('setting chart position');
  let paramContainer = document.querySelector('.special-text-container-2');
  let pos = getElementCoordinates(paramContainer);
  let posX = pos.x;
  let posY = pos.y;
  chartContainer.style.top = `${posY + 72}px`;
  chartContainer.style.left = `${posX + 72}px`;
}

function handleCloseButton() {
  document.getElementById("closeMap").addEventListener("click", () => {
    hideChart();

    // Hides the up-down-btn
    currentParamNode.children[0].classList.add('hidden');

    // Adds in a placeholder for the parameter
    const paramPlaceholder = document.createElement('span');
    paramPlaceholder.classList.add("temporary-text");
    paramPlaceholder.textContent = currentValidSentenceJSON.parameter;
    currentParamNode.appendChild(paramPlaceholder);

    currentHighlightedNode.classList.add('previously-highlighted');
  });

  // Redisplay the chart, highlighted sentence
  currentHighlightedNode.addEventListener("click", () => {
    currentParamNode.children[0].classList.remove("hidden");
    currentHighlightedNode.classList.remove("previously-highlighted");
    document.querySelector(".temporary-text")?.remove();

    makeChartVisible();
  });
}


function makeChartVisible() {
  console.log('showing the chart');
  // chartContainer.style.top = `${mouseY + scrollY + 60}px`;
  // chartContainer.style.left = `${mouseX + scrollX + 30}px`;
  chartContainer.classList.add("visible");

  handleDraggableMap();

  // const selection = window.getSelection().toString().trim();

  // if (selection) {
  //   console.log('showing the chart');
  //   chartContainer.style.top = `${mouseY + scrollY + 10}px`;
  //   chartContainer.style.left = `${mouseX + scrollX + 10}px`;
  //   chartContainer.classList.add("visible");
  // } else {
  //   console.log('hiding the chart');
  //   chartContainer.classList.remove("visible");
  // }
}

function hideChart() {
    chartContainer.classList.remove("visible");
    clearTimeout(selectionTimeout);
}

// function removeChart() {
//   document.body.removeChild(chartContainer);
//   chart = '';
// }

// TODO: Implement a function that takes in the carbon info as text and outputs data used to create a Chart.js chart
/**
 *
 * @param {String} carbonInfo
 * @returns JSON Object
 */
function getCarbonData(carbonInfo, legendTitle) {
  carbonInfo;
  // This is the dummy data
  const chartData = {
    labels: ['Raw material', 'Electricity', 'Something else'],
    datasets: [{
      label: legendTitle + ' Carbon Footprint (g CO2-eq)',
      data: [1, 0.89, 9],
      backgroundColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)'
      ],
      borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)'
      ],
      borderWidth: 1,
    }],
  };

  const options = {
    scales: {
      y: {
        beginAtZero: true,
        max: 150 // Set the maximum value for the y-axis
      }
    },
    plugins : {
      legend: {
        onClick: null,
        labels: {
          boxHeight: 0,
          boxWidth: 0
        }
      }
    }
  };
  return { data: chartData, options: options };
}