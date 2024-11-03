
(function () {
  window.addEventListener("load", init);

  async function init() {
    const closeExtension = document.querySelector(".close-container");
    closeExtension.addEventListener("click", () => {
      window.close();
    });
  }
})();

