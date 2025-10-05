# Debugging the Frontend-Backend Connection Issue

## Problem
The backend server works with the test script, but the frontend gets a 400 Bad Request error when trying to start a session.

## Debugging Steps

1. **Restart both servers** after the logging changes:
   - Stop the current Python API server (Ctrl+C)
   - Restart it: `python api_server.py`
   - Refresh the frontend page (Ctrl+F5 for hard refresh)

2. **Try the application again**:
   - Go to `http://localhost:3000`
   - Select a language and scenario
   - Check the browser console and Python terminal for logging output

3. **Check the console output**:
   - **Browser Console**: Will show what data the frontend is sending
   - **Python Terminal**: Will show what data the backend is receiving and validating

## Expected Logging

### Frontend Console
```
Sending session start request: {scenario: "restaurant", language: "french"}
```

### Python Terminal
```
Session start request: scenario=restaurant, language=french
Available scenarios: ['restaurant', 'introductions', 'travel', 'directions']
```

## Possible Issues

1. **Scenario mismatch**: Frontend might be sending a scenario name that doesn't exist in the backend
2. **Language mismatch**: Frontend might be sending a language code that doesn't match the backend's expected values
3. **Request format issue**: The JSON might not be formatted correctly

## Next Steps

Based on the logging output, we can identify the exact issue and fix it. The most likely issues are:

- If scenario is the problem: Update the scenario mapping in the frontend
- If language is the problem: Update the language validation in the backend
- If it's a format issue: Check the JSON parsing in the backend

## Troubleshooting Commands

If you want to test the API directly:
```bash
# Test with curl (replace with your actual values)
curl -X POST http://localhost:8000/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"scenario": "restaurant", "language": "french"}'