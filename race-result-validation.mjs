// Validate recorded finishing order before awarding virtual credits.
export function validateRecordedResult(runners, recording) {
  if (!recording || recording.authorized !== true || !recording.sourceUrl || !recording.resultUrl) throw new Error('Recording provenance required');
  for (const url of [recording.sourceUrl, recording.resultUrl]) {
    if (new URL(url).protocol !== 'https:') throw new Error('HTTPS provenance required');
  }
  const ids = runners.map(r => String(r.id));
  const order = recording.finishingOrder;
  if (!ids.length || new Set(ids).size !== ids.length || !Array.isArray(order) || order.length !== ids.length) throw new Error('Incomplete result');
  const normalized = order.map(String);
  if (new Set(normalized).size !== ids.length || normalized.some(id => !ids.includes(id))) throw new Error('Result does not match runners');
  return Object.freeze(normalized);
}
