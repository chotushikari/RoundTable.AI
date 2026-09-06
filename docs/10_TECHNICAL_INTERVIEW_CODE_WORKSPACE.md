# 10 — TECHNICAL INTERVIEW + CODE WORKSPACE

## Why code belongs in RoundTable

A technical interview should sometimes move from “can you explain it?” to “can you demonstrate it?”

Voice remains the primary interaction. Code is a modality inside the same interview session.

## Candidate UX

When selected:
1. Interviewer explains transition naturally.
2. Code workspace opens without leaving the interview.
3. Problem statement appears.
4. Monaco editor is available.
5. Candidate can run tests.
6. Results become interview evidence.
7. Interviewer resumes speaking based on results.

## Recommended stack

- Monaco Editor for browser IDE
- Judge0 for sandboxed multi-language execution
- WebContainers as an optional JS/TS execution path
- Never execute arbitrary candidate code in the main app process

## Code event model

- CODE_TASK_OPENED
- CODE_CHANGED
- RUN_STARTED
- RUN_COMPLETED
- TEST_RESULT
- SUBMISSION
- CODE_TIMEOUT
- CODE_ERROR

## Evidence examples

Voice:
“Candidate correctly explained O(1) lookup.”

Code:
“8/10 tests passed.”

Debug:
“Candidate identified stale cache invalidation as failure cause.”

The final assessment should combine these evidence types.

## AI interviewer behavior

The interviewer may:
- clarify requirements
- restate constraints
- explain the interface
- ask the candidate to reason about failures

The interviewer should not:
- solve the problem
- write candidate code
- reveal hidden tests
- debug the candidate’s code for them

## Code task lifecycle

```text
voice reasoning
→ state update
→ code task selected
→ workspace opened
→ code/test events
→ evidence update
→ interviewer follow-up
→ continue/close
```
