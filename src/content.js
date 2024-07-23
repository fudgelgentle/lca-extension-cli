
import Chart from 'chart.js/auto';

// Test sites for raw materials visualizer:
// https://www.nature.com/articles/s41893-024-01333-7
// https://www.allaboutcircuits.com/news/new-vitrimer-pcbs-recycled-many-times-over/

window.onload = () => {
    var newLink = document.createElement("link");
    newLink.rel = "stylesheet";
    newLink.type = "text/css";
    newLink.href = chrome.runtime.getURL("assets/content-style.css");
    document.head.appendChild(newLink);
}

let chart;
let chartContainer;
let selectionTimeout;

let mouseX;
let mouseY;
// Get the scroll offsets
let scrollX;
let scrollY;

// ! Uncomment to renable highlight text behavior
// handleHighlightText();
recordCurrentMouseCoord();
searchAndHighlight();


// Function to search and highlight the searchTerm
function searchAndHighlight() {
  const searchTerms = getRelevantSentences();

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  let node;

  while ((node = walker.nextNode())) {
    const normalizedText = normalizeText(node.textContent);

    searchTerms.forEach((termNode, termIndex) => {
      const normalizedTerm = normalizeText(termNode.sentence);
      const index = normalizedText.indexOf(normalizedTerm);
      if (index !== -1) {
        const beforeText = node.textContent.slice(0, index);
        const highlightedText = node.textContent.slice(
          index,
          index + searchTerms[termIndex].sentence.length
        );
        const afterText = node.textContent.slice(
          index + searchTerms[termIndex].sentence.length
        );

        const div = document.createElement("div");
        div.classList.add("lca-viz-inline");
        div.textContent = highlightedText;
        div.innerHTML = termNode.htmlContent;

        let parentNode = node.parentNode;
        const newClasses = ["lca-viz-highlight"];
        const newParentNode = replaceTagNameAndKeepStyles(parentNode, 'div', newClasses);
        parentNode.parentNode.replaceChild(newParentNode, parentNode);
        parentNode = newParentNode; // Update parentNode reference

        parentNode.insertBefore(document.createTextNode(beforeText), node);
        parentNode.insertBefore(div, node);
        parentNode.insertBefore(document.createTextNode(afterText), node);
        parentNode.removeChild(node);

        let lcaVizParamTarget = document.querySelector(".lca-viz-param-target");
        createUpDownBtn(lcaVizParamTarget, lcaVizParamTarget.textContent);
      }
    });
  }
}

function createUpDownBtn(element, parameter) {
  const upDownBtn = `
        <div class="special-text-container-2">
          <div class="special-text-2 inactive-st">
            <span id="parameter-2">${parameter}</span>
            <div class="up-down-btn-container">
              <div class="inactive up-down-btn" id="up">
                <svg width="9" height="7" viewBox="0 0 9 7" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.60595 1.24256C3.99375 0.781809 4.7032 0.781808 5.091 1.24256L8.00777 4.70806C8.53906 5.3393 8.09032 6.30353 7.26525 6.30353L1.4317 6.30353C0.606637 6.30353 0.157892 5.33931 0.689181 4.70807L3.60595 1.24256Z" fill="currentColor"/>
                </svg>
              </div>
              <div class="inactive up-down-btn" id="down">
                <svg width="9" height="7" viewBox="0 0 9 7" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.09107 5.74914C4.70327 6.20989 3.99382 6.20989 3.60602 5.74914L0.689251 2.28363C0.157962 1.65239 0.606707 0.688168 1.43177 0.688168L7.26532 0.688168C8.09039 0.688168 8.53913 1.65239 8.00784 2.28363L5.09107 5.74914Z" fill="currentColor"/>
                </svg>
              </div>
            </div>
          </div>
          <div title="Click to display CO2 emissions"><img src="../assets/img/eye-off.png" class="display-chart-btn eye-off em-regular"></div>
        </div>
  `;
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

function getPageTextContent() {
  return document.body.innerHTML;
  // return normalizeText(document.body.innerText);
}

// TODO: WIP. Currently returns a mock/example sentence.
// Uses LLM to determine the relevant sentences that can be used to display a carbon chart.
// Returns the sentence
function getRelevantSentences(pageTextContent) {
  // return [
  //   "epoxy (EPON 828, Skygeek), adipic acid (Sigma Aldrich) and 1,5,7-triazabicyclo[4.4.0]dec-5-ene (TBD, Sigma Aldrich). The epoxy was poured into a beaker, then placed in a 100 °C heated bath and stirred at 100 r.p.m. for 10 min.",
  //   "2.4-GHz transmitter using vPCB to simulate a typical IoT device"
  // ];
  return [
    {
      // sentence: "The epoxy was poured into a beaker, then placed in a 100&thinsp;°C heated bath and stirred at 100&thinsp;r.p.m. for 10&thinsp;min.",
      sentence:
        "epoxy (EPON 828, Skygeek), adipic acid (Sigma Aldrich) and 1,5,7-triazabicyclo[4.4.0]dec-5-ene (TBD, Sigma Aldrich). The epoxy was poured into a beaker, then placed in a 100 °C heated bath and stirred at 100 r.p.m. for 10 min.",
      parameter: "10",
      htmlContent:
        'epoxy (EPON 828, Skygeek), adipic acid (Sigma Aldrich) and 1,5,7-triazabicyclo[4.4.0]dec-5-ene (TBD, Sigma Aldrich). The epoxy was poured into a beaker, then placed in a 100 °C heated bath and stirred at 100 r.p.m. for <div class="lca-viz-param-target">10</div> min.',
    },
    {
      sentence:
        "2.4-GHz transmitter using vPCB to simulate a typical IoT device",
      parameter: null,
      htmlContent: null,
    },
  ];
  // return normalizeText("epoxy (EPON 828, Skygeek), adipic acid (Sigma Aldrich) and 1,5,7-triazabicyclo[4.4.0]dec-5-ene (TBD, Sigma Aldrich). The epoxy was poured into a beaker, then placed in a 100 °C heated bath and stirred at 100 r.p.m. for 10 min.");
}

function normalizeText(text) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function handleHighlightText() {
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    if (selection.toString().length > 0) {
      let chartConfig = getCarbonFootprint();
      displayChart(chartConfig);
      makeChartVisible();
    }
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

function getCarbonFootprint() {
  const textContent = document.body.innerText;
  const carbonInfo = extractCarbonInfo(textContent);
  const chartConfig = getCarbonData(carbonInfo);
  return chartConfig;
}

// TODO: Implement a function that only extract relevant keywords and parameters
function extractCarbonInfo(text) {
  return text;
}

function displayChart(chartConfig) {
  clearTimeout(selectionTimeout);
  if (!chart) {
    const map = document.createElement('div');
    map.setAttribute('id', 'map');

    map.innerHTML = `
      <canvas id="carbonChart" width="360" height="249"></canvas>
      <div class="slidercontainer">
        <input
          type="range"
          min="1"
          max="10"
          value="1"
          class="slider"
          id="myRange"
        />
        <p>Duration: <span id="display"></span> minute(s)</p>
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

    document.getElementById('closeMap').addEventListener('click', () => {
      // document.body.removeChild(map);
      // chart = '';
      hideChart();
    });
  }
}

function makeChartVisible() {
  const selection = window.getSelection().toString().trim();

  if (selection) {
    console.log('showing the chart');
    chartContainer.style.top = `${mouseY + scrollY + 10}px`;
    chartContainer.style.left = `${mouseX + scrollX + 10}px`;
    chartContainer.classList.add("visible");
  } else {
    console.log('hiding the chart');
    chartContainer.classList.remove("visible");
  }
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
function getCarbonData(carbonInfo) {
  carbonInfo;
  // This is the dummy data
  const chartData = {
    labels: ['Raw material', 'Electricity', 'Something else'],
    datasets: [{
      label: 'Carbon Footprint (g CO2-eq)',
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
        max: 100 // Set the maximum value for the y-axis
      }
    }
  };
  return { data: chartData, options: options };
}