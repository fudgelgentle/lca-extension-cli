
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
