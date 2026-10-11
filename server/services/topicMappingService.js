const { generateForTask, aiAvailable } = require('./aiService');
const { parseAiJson, topicMappingSchema } = require('./aiSchemas');
const aiCache = require('./aiCacheService');
const { inferSubject, listCanonicalTopics, localTopicMatches } = require('./topicCatalogService');

async function mapLearningTopics(input, dependencies = {}) {
  const text = String(input.text || '').trim();
  if (!text || text.length > 3000) throw Object.assign(new Error('Learning text must be between 1 and 3000 characters.'), { statusCode: 400 });
  const subject = inferSubject(text, input);
  if (!subject?.code) throw Object.assign(new Error('Select a subject so PaperStack can map your topics.'), { statusCode: 400 });
  const topics = await listCanonicalTopics(subject.code, dependencies);
  const local = localTopicMatches(text, topics);
  if (!topics.length || local.filter((item) => item.confidence >= 0.8).length >= 1 || dependencies.disableAi) {
    return { subject, topics: local, mappingMode: 'local', requiresConfirmation: !local.length || local.some((item) => item.confidence < 0.8), availableTopics: topics };
  }

  const env = dependencies.env || process.env;
  if (!aiAvailable(env, 'TOPIC_MAPPING')) {
    return { subject, topics: local, mappingMode: 'local', requiresConfirmation: true, availableTopics: topics };
  }
  const cacheKey = aiCache.buildAiCacheKey('TOPIC_MAPPING', subject.code, { text: text.toLowerCase(), topics: topics.map((item) => item.topicKey) }, 'u4-v1');
  let mapped = await aiCache.get(cacheKey, env);
  if (!mapped) {
    const prompt = [
      'Map the student learning note only to the supplied canonical topic keys.',
      'Never create or rename a topic. Return at most 8 topics. Confidence is 0 to 1.',
      `Subject: ${subject.name} (${subject.code})`,
      `Student note: ${text}`,
      `Canonical topics: ${JSON.stringify(topics.map(({ topicKey: key, name }) => ({ topicKey: key, name })))}`,
      'Return JSON: {"topics":[{"topicKey":"...","confidence":0.9}]}',
    ].join('\n');
    try {
      const response = await generateForTask('TOPIC_MAPPING', prompt, {
        temperature: 0.05,
        maxOutputTokens: 700,
        json: true,
        validateResponse: (value) => parseAiJson(value, topicMappingSchema),
      }, dependencies);
      mapped = parseAiJson(response, topicMappingSchema);
      await aiCache.set(cacheKey, mapped, 24 * 60 * 60, env);
    } catch {
      return { subject, topics: local, mappingMode: 'local', requiresConfirmation: true, availableTopics: topics };
    }
  }
  const byKey = new Map(topics.map((topic) => [topic.topicKey, topic]));
  const aiTopics = mapped.topics.map((item) => {
    const canonical = byKey.get(item.topicKey);
    return canonical ? { ...canonical, confidence: item.confidence } : null;
  }).filter(Boolean);
  const result = aiTopics.length ? aiTopics : local;
  return { subject, topics: result, mappingMode: aiTopics.length ? 'ai' : 'local', requiresConfirmation: !result.length || result.some((item) => item.confidence < 0.8), availableTopics: topics };
}

module.exports = { mapLearningTopics };
