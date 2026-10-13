async function addUniquePaperRequester(PaperRequest, request, userId, email) {
  const filter = { _id: request._id, 'requestedUsers.userId': { $ne: userId } };
  if (email) filter['requestedUsers.email'] = { $ne: email };
  const updated = await PaperRequest.findOneAndUpdate(filter, {
    $push: { requestedUsers: { userId, email } },
    $inc: { requestCount: 1 },
    $set: { status: 'open' }
  }, { new: true });
  return { request: updated || await PaperRequest.findById(request._id), alreadyRequested: !updated };
}

module.exports = { addUniquePaperRequester };
