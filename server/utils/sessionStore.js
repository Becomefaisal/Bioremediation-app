// In-memory session store for last prediction context per user (by sessionId)
// In production, use Redis or DB for persistence and scaling
const sessionMap = new Map();

function setLastPrediction(sessionId, sample) {
  sessionMap.set(sessionId, sample);
}

function getLastPrediction(sessionId) {
  return sessionMap.get(sessionId);
}

function clearLastPrediction(sessionId) {
  sessionMap.delete(sessionId);
}

module.exports = { setLastPrediction, getLastPrediction, clearLastPrediction };
