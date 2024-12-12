
(function () {
  window.addEventListener("load", init);

  let brushEnabled;
  let autoDetectEnabled;

  async function init() {
    const closeExtension = document.querySelector(".lca-viz-close-button-small");
    closeExtension.addEventListener("click", () => {
      window.close();
    });

    // Loading stored states
    const storedStates = await chrome.storage.sync.get(['brush', 'autodetect']);
    brushEnabled = storedStates.brush || false;
    autoDetectEnabled = storedStates.autodetect || false;

    toggleSwitch('toggle1', 'switch1', brushEnabled, 'brush');
    toggleSwitch('toggle2', 'switch2', autoDetectEnabled, 'autodetect');
  }

  function toggleSwitch(containerId, switchId, isOn, scenario) {
    const toggleSwitch = document.getElementById(switchId);
    const toggleContainer = document.getElementById(containerId);

    // Set initial UI state
    updateSwitchUI(toggleSwitch, toggleContainer, isOn);

    toggleContainer.addEventListener('click', () => {
      isOn = !isOn;
      updateSwitchUI(toggleSwitch, toggleContainer, isOn);
      if (scenario === 'brush') {
        brushEnabled = isOn;
        chrome.storage.sync.set({ brush: brushEnabled });
        sendToContentScript('brush', brushEnabled);
      } else if (scenario === 'autodetect') {
        autoDetectEnabled = isOn;
        chrome.storage.sync.set({ autodetect: autoDetectEnabled });
        sendToContentScript('autodetect', autoDetectEnabled);
      }
    });
  }

  function sendToContentScript(feature, state) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { feature, state }, () => {
        chrome.tabs.reload(tabs[0].id);
      })
    });
  }

  // function reloadActiveTab() {
  //   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  //       const tabId = tabs[0].id;
  //       const code = 'window.location.reload();';
  //       chrome.tabs.executeScript(tabId, { code });
  //   });
  // }

  function updateSwitchUI(toggleSwitch, toggleContainer, isOn) {
    if (isOn) {
        toggleSwitch.style.backgroundColor = 'white';
        // toggleContainer.style.backgroundColor = '#E4F5E7';
        toggleContainer.style.backgroundColor = 'rgb(138,180,145)';
        toggleContainer.style.background = 'linear-gradient(90deg, rgba(138,180,145,1) 0%, rgba(152,196,161,1) 100%)';
        toggleSwitch.style.transform = 'translateX(23px)';
    } else {
        toggleSwitch.style.backgroundColor = '#909090';
        toggleContainer.style.background = '#F0F0F0';
        toggleSwitch.style.transform = 'translateX(0)';
    }
  }
})();

