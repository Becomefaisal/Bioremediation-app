const express = require('express');
const router = express.Router();
const SampleEntry = require('../models/SampleEntry');

// New POST route for combined before/after entry
router.post('/add', async (req, res) => {
  try {
    console.log('Received body:', JSON.stringify(req.body, null, 2)); // Debug log
    const { location, method, sampleMeta, beforeMeasurements, afterMeasurements, note } = req.body;
    if (!location || !method || !sampleMeta || !beforeMeasurements || !afterMeasurements) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Prepare before and after documents
    const beforeDoc = {
      location,
      method,
      sampleMeta: {
        ...sampleMeta,
        stage: 'before',
      },
      measurements: beforeMeasurements,
      note: note || ''
    };
    const afterDoc = {
      location,
      method,
      sampleMeta: {
        ...sampleMeta,
        stage: 'after',
      },
      measurements: afterMeasurements,
      note: note || ''
    };

    // Insert both documents
    const result = await SampleEntry.insertMany([beforeDoc, afterDoc]);
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to submit' });
  }
});

router.get('/all', async (req, res) => {
  try {
    const allSamples = await SampleEntry.find({});
    res.json(allSamples);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch data' });
  }
});

// Compare average reduction for a parameter between two methods (now GET)
router.get('/compare-methods', async (req, res) => {
  try {
    const { param, methodA, methodB } = req.query;
    if (!param || !methodA || !methodB) return res.status(400).json({ message: 'Missing fields' });
    // Find all 'after' samples for both methods
    const afterSamples = await SampleEntry.find({
      'sampleMeta.stage': 'after',
      'method.name': { $in: [methodA, methodB] }
    });
    // For each after sample, find its before sample by batchId
    const results = {};
    for (const method of [methodA, methodB]) {
      const methodAfter = afterSamples.filter(s => s.method.name === method);
      let reductions = [];
      for (const after of methodAfter) {
        const before = await SampleEntry.findOne({
          'sampleMeta.batchId': after.sampleMeta.batchId,
          'sampleMeta.stage': 'before'
        });
        if (before && after.measurements.waterQuality[param] !== undefined && before.measurements.waterQuality[param] !== undefined) {
          const beforeVal = before.measurements.waterQuality[param];
          const afterVal = after.measurements.waterQuality[param];
          if (typeof beforeVal === 'number' && beforeVal !== 0) {
            const reduction = ((beforeVal - afterVal) / beforeVal) * 100;
            reductions.push(reduction);
          }
        }
      }
      results[method] = {
        avgReduction: reductions.length ? (reductions.reduce((a, b) => a + b, 0) / reductions.length) : null,
        count: reductions.length
      };
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Error comparing methods' });
  }
});

// Get before/after pair for a batch
router.get('/batch-pair/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const samples = await SampleEntry.find({ 'sampleMeta.batchId': batchId });
    res.json(samples);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching batch pair' });
  }
});

// Get timeline data for a method and parameter
router.get('/timeline/:method/:param', async (req, res) => {
  try {
    const { method, param } = req.params;
    const afterSamples = await SampleEntry.find({
      'method.name': method,
      'sampleMeta.stage': 'after',
      [`measurements.waterQuality.${param}`]: { $exists: true }
    }).sort({ 'sampleMeta.timestamp': 1 });
    const timeline = afterSamples.map(s => ({
      timestamp: s.sampleMeta.timestamp,
      value: s.measurements.waterQuality[param],
      batchId: s.sampleMeta.batchId
    }));
    res.json(timeline);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching timeline' });
  }
});

// Get all unique treatment method names
router.get('/method-names', async (req, res) => {
  try {
    const methods = await SampleEntry.distinct('method.name');
    res.json(methods);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch method names' });
  }
});

module.exports = router;