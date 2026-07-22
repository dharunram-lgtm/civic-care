async function checkDuplicateComplaint(Complaint, lat, lng, category) {
  const nearbyMatch = await Complaint.findOne({
    aiCategory: category,
    status: { $nin: ['RESOLVED', 'CLOSED', 'DUPLICATE'] },
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: 50
      }
    }
  });
  return nearbyMatch;
}

module.exports = { checkDuplicateComplaint };
