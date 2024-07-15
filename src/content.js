
import Chart from 'chart.js/auto';

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

handleHighlightText();
recordCurrentMouseCoord();

function handleHighlightText() {
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    if (selection.toString().length > 0) {
      let chartConfig = getCarbonFootprint();
      displayChart(chartConfig);
      makeChartVisible();
    }
  })
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