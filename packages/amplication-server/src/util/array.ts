export const arrayAllIncluded = (arr1: string[], arr2: string[]): boolean => {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    if (!arr1[i].includes(arr2[i])) {
      return false;
    }
  }
  return true;
};
