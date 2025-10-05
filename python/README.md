# Language Learning Chatbot

A simple Python chatbot backend using the Gemini API for guided language-learning conversations.

## Setup

1. Install the required package:
```bash
pip install -r requirements.txt
```

2. Set your Gemini API key as an environment variable:

Option A: Using a .env file (recommended)
```bash
# Create a .env file in the same directory
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

Option B: Setting environment variable directly
```bash
# On Windows
set GEMINI_API_KEY=your_api_key_here

# On macOS/Linux
export GEMINI_API_KEY=your_api_key_here
```

Alternatively, you can modify the `main()` function in `testconvo.py` to directly include your API key.

## Running the Chatbot

You can now run different scenarios by passing a scenario name as a command-line argument:

```bash
# Run the cafe scenario (default)
python testconvo.py
python testconvo.py cafe

# Run the airport check-in scenario
python testconvo.py travel --language chinese
```

### Available Scenarios

1. **cafe** - Ordering Coffee at a Café
   - Role: Barista
   - Steps: Greeting → Taking Order → Confirming Order → Payment → Ending

2. **travel** - Airport Check-in
   - Role: Airline Agent
   - Steps: Greeting → Verification → Baggage → Seat Assignment → Boarding Pass

## How It Works

The chatbot implements guided conversation scenarios with multiple steps. Each scenario has a specific role and set of steps:

### Cafe Scenario (Ordering Coffee at a Café)
1. **Greeting**: The barista welcomes the customer
2. **Taking Order**: The barista asks for the customer's order
3. **Confirming Order**: The barista confirms the order details
4. **Payment**: The barista handles payment
5. **Ending**: The barista concludes the interaction

### Travel Scenario (Airport Check-in)
1. **Greeting**: The airline agent greets the passenger
2. **Verification**: The agent verifies flight details and identification
3. **Baggage**: The agent processes checked baggage
4. **Seat Assignment**: The agent confirms or assigns seats
5. **Boarding Pass**: The agent issues the boarding pass and provides flight information

The AI automatically determines when to advance to the next step based on the conversation flow and specific completion criteria for each step. When all steps are complete, it displays "✅ Conversation complete!".

The chatbot includes several safeguards to prevent conversation loops:
- Each step has specific completion criteria
- Maximum of 3 exchanges per step to prevent getting stuck
- Maximum of 20 total exchanges for the entire conversation
- Special detection for goodbye phrases in the final step

## Features

- Uses Gemini 1.5 Pro for natural language generation
- Step-based conversation flow with automatic progression
- Context-aware responses based on conversation history
- Simple console interface
- Easy to extend with new scenarios

## Extending the Chatbot

To add new scenarios, modify the `SCENARIOS` dictionary at the top of the script. Each scenario should have:
- `title`: Display name of the scenario
- `role`: The role the AI will play (e.g., "barista", "airline agent")
- `steps`: List of steps with the following properties:
  - `id`: Step number
  - `name`: Step identifier
  - `instruction`: What the AI should do in this step
  - `completion_criteria`: When this step should be considered complete
  - `is_complete`: Track completion status (initially False)
  - `exchange_count`: Track number of exchanges in this step (initially 0)

Example of adding a new scenario:
```python
SCENARIOS["restaurant"] = {
    "title": "Restaurant Dining",
    "role": "waiter",
    "steps": [
        {
            "id": 1,
            "name": "greeting",
            "instruction": "Greet the customers and show them to their table.",
            "completion_criteria": "Customers are seated and have menus",
            "is_complete": False,
            "exchange_count": 0
        },
        # ... more steps
    ]
}
```