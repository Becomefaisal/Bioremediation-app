// DEBUG: This will log the number of valid pairs and their values for each parameter pair in the regression matrix.
// Add this just before the regression/correlation matrix calculation in AnalysisPage.jsx

console.log('DEBUG: Batches', batches);
const debugMatrix = [];
for (let i = 0; i < PARAM_OPTIONS.length; ++i) {
  for (let j = 0; j < PARAM_OPTIONS.length; ++j) {
    if (i === j) continue;
    const keyX = PARAM_OPTIONS[i].key;
    const keyY = PARAM_OPTIONS[j].key;
    const pairs = Object.values(batches)
      .map(batch => {
        const x = extractParamFromSample(batch['before'], keyX);
        const y = extractParamFromSample(batch['before'], keyY);
        return (typeof x === 'number' && !isNaN(x) && typeof y === 'number' && !isNaN(y)) ? [x, y] : null;
      })
      .filter(Boolean);
    debugMatrix.push({ x: keyX, y: keyY, count: pairs.length, pairs });
  }
}
console.log('DEBUG: Regression matrix pairs', debugMatrix);
