const ROUTING_MATRIX = {
  'Garbage': 'Sanitation Department',
  'Pothole': 'Roads Department',
  'Water Leakage': 'Municipality Department',
  'Drainage Issue': 'Municipality Department',
  'Streetlight': 'Electricity Department',
  'Traffic Signal': 'Traffic Police Department',
  'Illegal Dumping': 'Municipal Corporation',
  'Fallen Tree': 'Parks & Horticulture Department'
};

const CATEGORY_KEYWORDS = {
  'Garbage': ['garbage', 'trash', 'waste', 'litter', 'rubbish', 'bin', 'dumpster', 'refuse'],
  'Pothole': ['pothole', 'crack', 'road damage', 'hole in road', 'road surface'],
  'Water Leakage': ['water leak', 'leaking pipe', 'water flowing', 'pipe burst', 'water wasting'],
  'Drainage Issue': ['drain', 'blocked drain', 'sewer', 'flood', 'water logging', 'stagnant water'],
  'Streetlight': ['streetlight', 'light not working', 'lamp post', 'street lamp', 'dark street'],
  'Traffic Signal': ['traffic light', 'signal not working', 'traffic signal', 'stoplight broken'],
  'Illegal Dumping': ['illegal dumping', 'fly tipping', 'unauthorized waste', 'dumped trash'],
  'Fallen Tree': ['fallen tree', 'tree down', 'broken branch', 'uprooted tree', 'blocking road']
};

const SEVERITY_KEYWORDS = {
  CRITICAL: ['emergency', 'immediate', 'urgent', 'dangerous', 'hazard', 'accident', 'injured', 'blocking traffic'],
  HIGH: ['severe', 'serious', 'major', 'bad', 'terrible', 'large', 'widespread'],
  MEDIUM: ['moderate', 'annoying', 'inconvenient', 'several', 'multiple'],
  LOW: ['minor', 'small', 'slight', 'barely', 'little', 'cosmetic']
};

function simulateYOLO(imageBase64) {
  const categories = Object.keys(CATEGORY_KEYWORDS);
  const idx = Math.floor(Math.random() * categories.length);
  const confidence = 0.75 + Math.random() * 0.24;
  return {
    detected_class: categories[idx],
    confidence_score: Math.round(confidence * 100) / 100
  };
}

function extractEntities(description) {
  const desc = description.toLowerCase();
  let bestCategory = null;
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let matchCount = 0;
    for (const kw of keywords) {
      if (desc.includes(kw)) {
        matchCount++;
      }
    }
    if (matchCount > bestScore) {
      bestScore = matchCount;
      bestCategory = category;
    }
  }

  if (!bestCategory) {
    const keys = Object.keys(CATEGORY_KEYWORDS);
    bestCategory = keys[Math.floor(Math.random() * keys.length)];
  }

  let severityScore = 0;
  for (const [level, words] of Object.entries(SEVERITY_KEYWORDS)) {
    for (const w of words) {
      if (desc.includes(w)) {
        if (level === 'CRITICAL') severityScore = Math.max(severityScore, 9);
        else if (level === 'HIGH') severityScore = Math.max(severityScore, 7);
        else if (level === 'MEDIUM') severityScore = Math.max(severityScore, 5);
        else if (level === 'LOW') severityScore = Math.max(severityScore, 2);
      }
    }
  }
  if (severityScore === 0) severityScore = 4;

  return {
    implied_class: bestCategory,
    severity: severityScore,
    locationCriticality: Math.floor(Math.random() * 5) + 3,
    timeSimilarity: Math.floor(Math.random() * 7) + 1
  };
}

function validateImageText(detectedClass, confidence, impliedClass) {
  if (confidence > 0.75 && detectedClass === impliedClass) {
    return { valid: true, status: 'PENDING_AI_REVIEW' };
  }
  return { valid: false, status: 'PENDING_ADMIN_REVIEW' };
}

function calculatePriority(severity, locationCriticality, timeSimilarity) {
  const P = (severity * 0.5) + (locationCriticality * 0.3) + (timeSimilarity * 0.2);

  if (P >= 8.5) return { priority: 'CRITICAL', score: Math.round(P * 10) / 10 };
  if (P >= 6.5) return { priority: 'HIGH', score: Math.round(P * 10) / 10 };
  if (P >= 4.0) return { priority: 'MEDIUM', score: Math.round(P * 10) / 10 };
  return { priority: 'LOW', score: Math.round(P * 10) / 10 };
}

function routeToDepartment(category) {
  return ROUTING_MATRIX[category] || null;
}

async function processComplaint(Complaint, Department, description, imageBase64, lat, lng) {
  const yoloResult = simulateYOLO(imageBase64);
  const entities = extractEntities(description);
  const validation = validateImageText(yoloResult.detected_class, yoloResult.confidence_score, entities.implied_class);
  const priorityResult = calculatePriority(entities.severity, entities.locationCriticality, entities.timeSimilarity);
  const departmentName = routeToDepartment(entities.implied_class);

  let departmentId = null;
  if (departmentName) {
    const dept = await Department.findOne({ name: departmentName });
    if (dept) departmentId = dept._id;
  }

  return {
    aiCategory: entities.implied_class,
    aiConfidenceScore: Math.round(yoloResult.confidence_score * 100),
    priority: priorityResult.priority,
    priorityScore: priorityResult.score,
    status: validation.status,
    departmentId,
    departmentName,
    validation
  };
}

module.exports = {
  simulateYOLO,
  extractEntities,
  validateImageText,
  calculatePriority,
  routeToDepartment,
  processComplaint,
  ROUTING_MATRIX,
  CATEGORY_KEYWORDS
};
