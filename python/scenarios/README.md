# Scenarios Directory

This directory contains conversation scenarios for the language learning chatbot. Each scenario is defined in a separate JSON file.

## File Structure

Each scenario file should follow this structure:

```json
{
    "title": "Human-Readable Title",
    "role": "AI's Role",
    "steps": [
        {
            "id": 1,
            "name": "step_name",
            "instruction": "What the AI should do in this step",
            "completion_criteria": "When this step is considered complete",
            "is_complete": false,
            "exchange_count": 0
        },
        {
            "id": 2,
            "name": "next_step_name",
            "instruction": "What the AI should do in this step",
            "completion_criteria": "When this step is considered complete",
            "is_complete": false,
            "exchange_count": 0
        }
    ]
}
```

## Adding New Scenarios

To add a new scenario:

1. Create a new JSON file in this directory with a descriptive name (e.g., `doctor.json`)
2. Follow the structure above, defining:
   - A clear title for the scenario
   - The role the AI will play
   - A series of steps that make up the conversation
3. Each step should have:
   - A unique ID (sequential numbers)
   - A descriptive name
   - Clear instructions for the AI
   - Specific completion criteria
   - Set `is_complete` to false and `exchange_count` to 0

## Multi-Language Support

The chatbot supports multiple languages without needing separate scenario files. You can specify the language when running the script:

```bash
python testconvo.py cafe --language french
python testconvo.py cafe --language chinese
python testconvo.py travel --language spanish
```

Supported languages:
- english (default)
- spanish
- french
- chinese
- japanese
- german
- italian
- portuguese
- russian
- korean

The AI will automatically:
- Respond in the specified language
- Adapt its responses to reflect the cultural context of that language
- Maintain the same scenario structure and flow

## Best Practices

- Keep scenarios focused on specific real-world interactions
- Ensure steps flow logically from one to the next
- Make completion criteria specific enough for the AI to determine when to advance
- Include 3-7 steps per scenario for optimal conversation length
- Tailor instructions to match the AI's role in each scenario

## Current Scenarios

- `cafe.json`: Ordering coffee at a café (AI as barista)
- `travel.json`: Airport check-in process (AI as airline agent)
- `restaurant.json`: Dining at a restaurant (AI as waiter)