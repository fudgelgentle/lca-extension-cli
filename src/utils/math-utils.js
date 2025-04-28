
// Utilities function relating to calculation


export function LbtoKg(lbs) {
  return lbs * 0.453;
}

/**
 * Takes in a weight value in kg and determines if the weight needs
// unit conversion (to grams or tons) to make it more readable.
* @param {number} kg
*/
export function getReadableUnit(kg) {
  if (kg < 1.0) {
    const grams = parseFloat((kg * 100).toFixed(2));
    return { weight: grams, unit: "g" };
  } else if (kg >= 1000) {
    const tons = parseFloat((kg / 1000).toFixed(2));
    return { weight: tons, unit: "tons" };
  } else {
    const kilograms = parseFloat(kg.toFixed(2));
    return { weight: kilograms, unit: "kg" };
  }
}


/**
 * Takes in the storage value and returns a numerical value in gigabytes (e.g. "256 GB" --> 256)
 * @param {String} storage the storage of a phone model (e.g. "256 GB", "1 TB")
 */
export function toGB(storage) {
  const storageValue = parseFloat(storage);
  if (storage.includes("TB")) {
    return storageValue * 1024;
  } else if (storage.includes("GB")) {
    return storageValue;
  } else if (storage.includes("MB")) {
    return storageValue / 1024;
  }
  return storageValue;
}

/**
 * @param {String} emissionsOne
 * @param {String} emissionsTwo
 * @returns returns null if co2e value is NaN, returns "one" if emissionsOne is less than emissionsTwo, returns "two" otherwise.
 */
export function findGreener(emissionsOne, emissionsTwo) {
  const eOne = parseInt(emissionsOne);
  const eTwo = parseInt(emissionsTwo);
  if (isNaN(eOne) || isNaN(eTwo)) {
    // This is a .greener class used to identify which phone is more eco-friendly
    return null;
  } else if (eOne < eTwo) {
    return "one";
  } else if (eOne > eTwo) {
    return "two";
  }
}