
export function detectPhoneModel(title) {
  const phonePatterns = [
    // iPhone models
    { regex: /iPhone\s?13/, model: "iPhone 13" },
    { regex: /iPhone\s?14\s?Pro/, model: "iPhone 14 Pro" },
    { regex: /iPhone\s?14\s?Max/, model: "iPhone 14 Max" },
    { regex: /iPhone\s?14/, model: "iPhone 14" },
    { regex: /iPhone\s?15\s?Pro/, model: "iPhone 15 Pro" },
    { regex: /iPhone\s?15\s?Max/, model: "iPhone 15 Max" },
    { regex: /iPhone\s?15/, model: "iPhone 15" },
    { regex: /iPhone\s?16\s?Pro/, model: "iPhone 16 Pro" },
    { regex: /iPhone\s?16\s?Max/, model: "iPhone 16 Max" },
    { regex: /iPhone\s?16/, model: "iPhone 16" },

    // Samsung Galaxy models
    { regex: /Galaxy\s?Z-?Flip6/, model: "Galaxy Z-Flip 6" },
    { regex: /Galaxy\s?S24\s?Ultra/, model: "Galaxy S24 Ultra" },
    { regex: /Galaxy\s?S23\s?Ultra/, model: "Galaxy S23 Ultra" },
    { regex: /Galaxy\s?A14\s?5G/, model: "Galaxy A14 5G" },
    { regex: /Galaxy\s?A14\s?4G/, model: "Galaxy A14 4G" },
    { regex: /Galaxy\s?A34\s?5G/, model: "Galaxy A34 5G" },
    { regex: /Galaxy\s?A04e/, model: "Galaxy A04e" },

    // Oppo models
    { regex: /Oppo\s?Find\s?X5\s?Pro|Oppo\s?FindX5\s?Pro/, model: "Oppo Find X5 Pro" },
    { regex: /Oppo\s?Reno\s?8\s?Pro|Oppo\s?Reno8\s?Pro/, model: "Oppo Reno 8 Pro" },
    { regex: /Oppo\s?A16/, model: "Oppo A16" },
    { regex: /Oppo\s?A54/, model: "Oppo A54" },

    // Huawei models
    { regex: /Huawei\s?Mate\s?50\s?Pro|Huawei\s?Mate50\s?Pro/, model: "Huawei Mate 50 Pro" },
    { regex: /Huawei\s?P50\s?Pro|Huawei\s?P50Pro/, model: "Huawei P50 Pro" },
    { regex: /Huawei\s?Nova\s?10\s?Pro|Huawei\s?Nova10\s?Pro/, model: "Huawei Nova 10 Pro" },

    // Lenovo models
    { regex: /Lenovo\s?Legion\s?Duel\s?2|Lenovo\s?LegionDuel\s?2/, model: "Lenovo Legion Duel 2" },
    { regex: /Lenovo\s?K14\s?Plus|Lenovo\s?K14Plus/, model: "Lenovo K14 Plus" },

    // Google Pixel models
    { regex: /Pixel\s?9\s?Pro\s?Fold/, model: "Google Pixel 9 Pro Fold" },
    { regex: /Pixel\s?9\s?Pro/, model: "Google Pixel 9 Pro" },
    { regex: /Pixel\s?9/, model: "Google Pixel 9" },
    { regex: /Pixel\s?8\s?Pro/, model: "Google Pixel 8 Pro" },
    { regex: /Pixel\s?8/, model: "Google Pixel 8" },
    { regex: /Pixel\s?Fold/, model: "Google Pixel Fold" },
    { regex: /Pixel\s?7\s?Pro/, model: "Google Pixel 7 Pro" },
    { regex: /Pixel\s?7a/, model: "Google Pixel 7a" },
    { regex: /Pixel\s?7/, model: "Google Pixel 7" },
    { regex: /Pixel\s?6/, model: "Google Pixel 6" },
    { regex: /Pixel\s?6a/, model: "Google Pixel 6a" },
    { regex: /Pixel\s?6\s?Pro/, model: "Google Pixel 6 Pro" },
    { regex: /Pixel\s?5a/, model: "Google Pixel 5a" },

    // Add more phones as needed
  ];

  // Loop through the map and test the title for each phone model
  for (const { regex, model } of phonePatterns) {
    if (regex.test(title)) {
      // alert(`${model} detected`);
      return model;
    }
  }

  // console.log("Phone model not detected");
  return null;
}
