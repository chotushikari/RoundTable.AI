# 18 — TESTING & VALIDATION

## Test pyramid

### Unit
- Candidate State updates
- gap detector
- vagueness detector
- contradiction detection
- action ranking
- role cooldown
- state versioning
- event idempotency

### Integration
- Agora session lifecycle
- transcript events
- runtime role updates
- code execution
- MCP tool calls
- assessment pipeline

### E2E
- complete interview
- interruption
- Technical → Product
- voice → code → voice
- vague answer
- contradiction
- failure recovery

## Golden transcript fixtures

Fixture A:
Strong technical answer → customer gap → Product

Fixture B:
“Improved performance significantly” → metric probe

Fixture C:
Conflicting testing claims → reconciliation

Fixture D:
Strong answer → harder trade-off

Fixture E:
Weak answer → scaffolding

Fixture F:
Code explanation → code task → test failure → debugging follow-up

Fixture G:
MCP context → technical observation → product consequence

## Evaluation harness

For each fixture assert:
- expected role
- expected modality
- expected objective
- required evidence
- expected state transition

Allow wording variation; assert semantic action, not exact wording.

## Manual QA checklist

- microphone permissions
- browser refresh
- slow network
- agent interruption
- candidate interruption
- empty transcript
- long answer
- silence
- malformed model output
- tool timeout
- code timeout
- assessment failure
