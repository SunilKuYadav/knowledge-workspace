/**
 * Deep equality comparison for test case validation.
 * Compares two values recursively, handling primitives, arrays, objects, and nested structures.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  // Identical references or both same primitive
  if (a === b) return true;

  // Handle null/undefined
  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;

  // Handle NaN (NaN !== NaN in JS, but we consider them equal)
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
    return false;
  }

  // Different types
  if (typeof a !== typeof b) return false;

  // Primitives that aren't equal by === already failed above
  if (typeof a !== "object") return false;

  // At this point both are non-null objects
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;

  // Array comparison
  const aIsArray = Array.isArray(objA);
  const bIsArray = Array.isArray(objB);

  if (aIsArray !== bIsArray) return false;

  if (aIsArray && bIsArray) {
    const arrA = a as unknown[];
    const arrB = b as unknown[];
    if (arrA.length !== arrB.length) return false;
    for (let i = 0; i < arrA.length; i++) {
      if (!deepEqual(arrA[i], arrB[i])) return false;
    }
    return true;
  }

  // Object comparison
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key)) return false;
    if (!deepEqual(objA[key], objB[key])) return false;
  }

  return true;
}
