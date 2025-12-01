const str = "const val = 3/*[0..1]*/; other text";

// Regex explanation:
// ([-+]?                  // Capture group 1 (optional sign)
//  (?:0x[a-fA-F0-9]+      // Non-capturing group: starts with 0x followed by hex digits (for hex numbers)
//  |\\d*\\.?\\d+)         // OR digits, optional dot, digits (for int/float/etc.)
// )                      // End non-capturing group for number alternatives
// \\s*                   // Optional whitespace
// /\\*                   // Match "/*" literally (need to escape '*')
// \\[                     // Match "[" literally (need to escape '[')
// (.*?)                  // Capture group 2: any character non-greedily until the next part
// \\]                    // Match "]" literally (need to escape ']')
// \\*/                   // Match "*/" literally (need to escape '*')

const regex = /([-+]?(?:0x[a-fA-F0-9]+|\d*\.?\d+))\s*\/\*\[(.*?)\]\*\//;

const match = str.match(regex);

if (match) {
  const value = match[1]; // The extracted number as a string (e.g., "0.3")
  const range = match[2]; // The extracted range string (e.g., "0..1")

  console.log("Extracted Value:", value);
  console.log("Extracted Range:", range);

  // You can parse the value to a number if needed
  const numericValue = parseFloat(value) || parseInt(value, 16);
  console.log("Numeric Value:", numericValue);
} else {
  console.log("No match found.");
}
