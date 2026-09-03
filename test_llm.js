fetch('http://localhost:3001/api/logger', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'TRANSCRIPT_FINAL',
    agentUID: 'test-agent-123',
    restAgentId: 'test-rest-id-456',
    message: {
      uid: '0',
      text: 'Well, if we use a Redis LRU cache here, we can drop the database read latency by 90%, but we have to handle cache invalidation carefully when the user profile updates.'
    }
  })
}).then(r => r.json()).then(console.log).catch(console.error);
