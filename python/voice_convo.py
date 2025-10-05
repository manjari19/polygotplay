import os
import sys
import argparse
import json
import google.generativeai as genai
from typing import Dict, List, Tuple
from dotenv import load_dotenv
from audio_interface import AudioInterface

load_dotenv()

def load_scenarios_from_directory(directory="scenarios"):
    """Load all scenario JSON files from the specified directory."""
    scenarios = {}
    
    # Check if directory exists
    if not os.path.exists(directory):
        print(f"Error: Scenarios directory '{directory}' not found.")
        return scenarios
    
    # Load all JSON files in the directory
    for filename in os.listdir(directory):
        if filename.endswith(".json"):
            scenario_name = filename[:-5]  # Remove .json extension
            file_path = os.path.join(directory, filename)
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    scenario_data = json.load(f)
                    scenarios[scenario_name] = scenario_data
                    print(f"Loaded scenario: {scenario_name}")
            except Exception as e:
                print(f"Error loading scenario {filename}: {str(e)}")
    
    return scenarios

# Load all scenarios from the scenarios directory
SCENARIOS = load_scenarios_from_directory()

class VoiceLanguageLearningChatbot:
    def __init__(self, api_key: str, scenario: Dict, language: str = "english"):
        """Initialize the chatbot with Gemini API key, scenario, and language."""
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('models/gemini-2.5-flash')
        
        # Set the scenario
        self.scenario = scenario
        self.role = scenario["role"]
        self.language = language.lower()
        
        # Map language names to ElevenLabs language codes
        self.language_code_map = {
            "english": "eng",
            "spanish": "spa",
            "french": "fra",
            "chinese": "zho",
            "japanese": "jpn"
        }
        
        # Get the target language code
        self.target_language_code = self.language_code_map.get(self.language, "eng")
        
        self.current_step_index = 0
        self.conversation_history = []
        self.max_exchanges_per_step = 3  # Prevent infinite loops
        
        # Learning mode state
        self.waiting_for_user_practice = False
        self.original_english_phrase = ""
        self.target_language_phrase = ""
        
        # Initialize audio interface
        self.audio_interface = AudioInterface()
        
    def get_current_step(self) -> Dict:
        """Get the current conversation step."""
        return self.scenario["steps"][self.current_step_index]
    
    def is_conversation_complete(self) -> bool:
        """Check if all steps in the scenario are complete."""
        return all(step["is_complete"] for step in self.scenario["steps"])
    
    def generate_system_prompt(self) -> str:
        """Generate the system prompt for the AI based on the current step."""
        current_step = self.get_current_step()
        
        # Determine the role name based on the scenario role
        role_name = self.role
        
        # Language-specific instructions
        language_instruction = ""
        if self.language != "english":
            language_instruction = f"\n- Respond in {self.language.title()}\n- Adapt your responses to reflect the cultural context of {self.language.title()} speakers"
        
        prompt = f"""
You are a friendly {role_name} having a conversation with someone who is practicing their language skills.

Current scenario: {self.scenario['title']}
Language: {self.language.title()}
Current step: {current_step['name']}

For this step:
- {current_step['instruction']}

Guidelines:
- Stay in character as a {role_name} throughout the conversation
- Respond naturally to what the other person says
- Keep your responses concise and conversational
- Focus on your role as a {role_name}, not on language teaching{language_instruction}
- Unless you are ending the conversation, always end your reply with ONE short, relevant, open-ended question that invites the learner to speak.
- Keep responses to 1–2 short sentences followed by a single question. Do not ask multiple questions at once and do not answer your own question.
- For the final part of the conversation, recognize when the other person is saying goodbye and end the conversation

Conversation history:
"""
        
        # Add conversation history
        for entry in self.conversation_history:
            role = f"{role_name.title()}" if entry["role"] == "assistant" else "Customer"
            prompt += f"{role}: {entry['content']}\n"
            
        return prompt
    
    def generate_response(self, user_input: str, language_code: str = "") -> Tuple[str, bool]:
        """Generate AI response and determine if we should advance to the next step."""
        
        # Check if we're waiting for the user to practice the target language
        if self.waiting_for_user_practice:
            # Add user input to conversation history
            self.conversation_history.append({"role": "user", "content": user_input})
            
            # Check if user spoke in the target language (not English)
            if language_code != "eng":
                # User responded correctly in target language
                self.waiting_for_user_practice = False
                
                # Generate the normal response for the original input
                normal_response, is_complete = self.generate_normal_response(self.original_english_phrase, language_code)
                
                # Add AI response to conversation history
                self.conversation_history.append({"role": "assistant", "content": normal_response})
                
                return normal_response, is_complete
            else:
                # User still speaking English, encourage them again
                encouragement = f"Good try! But let's practice saying it in {self.language.title()}. "
                encouragement += (
                    f"To say '{self.original_english_phrase}' in {self.language.title()}, say '{self.target_language_phrase}'. "
                    f"Can you say it now?"
                )
                
                # Add AI response to conversation history
                self.conversation_history.append({"role": "assistant", "content": encouragement})
                
                return encouragement, self.is_conversation_complete()
        
        # Normal conversation flow
        # Add user input to conversation history
        self.conversation_history.append({"role": "user", "content": user_input})
        
        # Increment exchange count for current step
        self.scenario["steps"][self.current_step_index]["exchange_count"] += 1
        
        # Check if user spoke English and indicated confusion
        if language_code == "eng" and self.language != "english":
            # Check if user is expressing confusion
            if self.is_confusion_phrase(user_input.lower()):
                # Find the previous AI response and translate it to English
                previous_ai_response = self.get_previous_ai_response()
                if previous_ai_response:
                    # Translate the previous AI response to English
                    english_translation = self.translate_to_english(previous_ai_response)
                    # Add this response to conversation history
                    self.conversation_history.append({"role": "assistant", "content": english_translation})
                    return english_translation, self.is_conversation_complete()
            
            # Generate educational response for English input
            return self.generate_educational_response(user_input)
        
        # Generate normal response for non-English input
        return self.generate_normal_response(user_input, language_code)
    
    def generate_educational_response(self, user_input: str) -> Tuple[str, bool]:
        """Generate an educational response that teaches the user how to say their phrase in the target language."""
        try:
            # Get the translation of the user's input
            target_language_phrase = self.generate_translation(user_input)
            
            # Store the original and translated phrases for later reference
            self.original_english_phrase = user_input
            self.target_language_phrase = target_language_phrase
            
            # Create an educational response
            language_map = {
                "spanish": "Spanish",
                "french": "French",
                "chinese": "Chinese",
                "japanese": "Japanese",
                "german": "German",
                "italian": "Italian",
                "portuguese": "Portuguese",
                "russian": "Russian",
                "korean": "Korean"
            }
            
            target_language_name = language_map.get(self.language, self.language.title())
            
            educational_response = (
                f"To say '{user_input}' in {target_language_name}, say '{target_language_phrase}'. "
                f"Can you try saying it now?"
            )
            
            # Set the flag to wait for user practice
            self.waiting_for_user_practice = True
            
            # Add AI response to conversation history
            self.conversation_history.append({"role": "assistant", "content": educational_response})
            
            return educational_response, self.is_conversation_complete()
            
        except Exception as e:
            return f"Sorry, I encountered an error: {str(e)}", False
    
    def generate_normal_response(self, user_input: str, language_code: str = "") -> Tuple[str, bool]:
        """Generate a normal response without educational content."""
        # Generate the system prompt
        system_prompt = self.generate_system_prompt()
        
        # Create the full prompt with explicit questioning behavior
        full_prompt = (
            f"{system_prompt}\n\n"
            f"Customer just said: '{user_input}'\n\n"
            f"Your response as the {self.role} (end with one short, open-ended follow-up question):"
        )
        
        try:
            # Generate response from Gemini
            response = self.model.generate_content(full_prompt)
            ai_response = response.text
            
            # Add AI response to conversation history
            self.conversation_history.append({"role": "assistant", "content": ai_response})
            
            # Determine if we should advance to the next step
            should_advance = self.should_advance_to_next_step(user_input, ai_response)
            
            # Also check if we've exceeded max exchanges for this step
            current_step = self.get_current_step()
            max_exceeded = current_step["exchange_count"] >= self.max_exchanges_per_step
            
            if should_advance or max_exceeded:
                self.mark_current_step_complete()
                if not self.is_conversation_complete():
                    self.advance_to_next_step()
            
            return ai_response, self.is_conversation_complete()
            
        except Exception as e:
            return f"Sorry, I encountered an error: {str(e)}", False
    
    def is_confusion_phrase(self, user_input: str) -> bool:
        """Check if the user input indicates confusion."""
        confusion_phrases = [
            "i don't understand",
            "i dont understand",
            "what does that mean",
            "what do you mean",
            "can you repeat",
            "can you say that again",
            "sorry",
            "pardon",
            "what",
            "huh",
            "come again",
            "say again",
            "repeat",
            "explain",
            "clarify"
        ]
        
        # Check if any confusion phrase is in the user input
        for phrase in confusion_phrases:
            if phrase in user_input:
                return True
        
        return False
    
    def get_previous_ai_response(self) -> str:
        """Get the previous AI response from conversation history."""
        # Look backwards through conversation history to find the last AI response
        for entry in reversed(self.conversation_history[:-1]):  # Exclude the current user input
            if entry["role"] == "assistant":
                return entry["content"]
        
        return ""  # No previous AI response found
    
    def translate_to_english(self, text: str) -> str:
        """Translate text to English using Gemini."""
        try:
            translation_prompt = f"""
Translate the following text to English.
Only return the translation, nothing else.

Text: "{text}"

Translation:"""
            
            # Generate translation from Gemini
            response = self.model.generate_content(translation_prompt)
            translation = response.text.strip()
            
            return translation
            
        except Exception as e:
            print(f"Error in translation to English: {e}")
            return text  # Fallback to original text
    
    def generate_translation(self, user_input: str) -> str:
        """Generate a translation of the user's input into the target language."""
        try:
            # Create a translation prompt
            language_map = {
                "spanish": "Spanish",
                "french": "French",
                "chinese": "Chinese",
                "japanese": "Japanese",
                "german": "German",
                "italian": "Italian",
                "portuguese": "Portuguese",
                "russian": "Russian",
                "korean": "Korean"
            }
            
            target_language = language_map.get(self.language, "the target language")
            
            translation_prompt = f"""
Translate the following English text to {target_language}.
Only return the translation, nothing else.

Text: "{user_input}"

Translation:"""
            
            # Generate translation from Gemini
            response = self.model.generate_content(translation_prompt)
            translation = response.text.strip()
            
            return translation
            
        except Exception as e:
            print(f"Error in translation: {e}")
            return user_input  # Fallback to original text
    
    def normalize_language_code(self, language_code: str) -> str:
        """Normalize language code to either 'eng' or the target language code."""
        # If it's already English, return as is
        if language_code == "eng":
            return "eng"
        
        # If it's the target language, return as is
        if language_code == self.target_language_code:
            return self.target_language_code
        
        # If it's None, empty, or any other value, fallback to target language
        if not language_code or language_code not in ["eng", self.target_language_code]:
            if language_code:  # Only log if there was an unrecognized code
                print(f"Unrecognized language '{language_code}' detected — defaulting to target language.")
            return self.target_language_code
        
        return language_code  # This line should not be reached, but just in case
    
    def should_advance_to_next_step(self, user_input: str, ai_response: str) -> bool:
        """Determine if the conversation should advance to the next step."""
        current_step = self.get_current_step()
        
        # Special handling for the ending step - check for goodbye indicators
        if current_step["name"] == "ending":
            goodbye_indicators = ["goodbye", "bye", "thank you", "thanks", "see you", "farewell"]
            if any(indicator in user_input.lower() for indicator in goodbye_indicators):
                return True
        
        # Create a prompt to evaluate if the current step is complete
        evaluation_prompt = f"""
You are evaluating a conversation between a {self.role} and a customer.

Current task: {current_step['name']}
Task instruction: {current_step['instruction']}
Completion criteria: {current_step['completion_criteria']}

Customer said: "{user_input}"
{self.role.title()} responded: "{ai_response}"

Based on the completion criteria, is the current task complete? Answer with only "yes" or "no".
"""
        
        try:
            evaluation = self.model.generate_content(evaluation_prompt)
            return "yes" in evaluation.text.lower()
        except:
            # If evaluation fails, don't advance
            return False
    
    def mark_current_step_complete(self):
        """Mark the current step as complete."""
        self.scenario["steps"][self.current_step_index]["is_complete"] = True
    
    def advance_to_next_step(self):
        """Advance to the next step in the scenario."""
        if self.current_step_index < len(self.scenario["steps"]) - 1:
            self.current_step_index += 1
    
    def start_conversation(self) -> str:
        """Start the conversation with the initial greeting."""
        current_step = self.get_current_step()
        
        # Language-specific instruction for the initial greeting
        language_instruction = ""
        if self.language != "english":
            language_instruction = f" Respond in {self.language.title()} and adapt your greeting to reflect the cultural context of {self.language.title()} speakers."
        
        initial_prompt = f"""
You are a friendly {self.role}. Start the conversation with a customer who just approached you.

Language: {self.language.title()}

Begin the conversation with a warm greeting as the {self.role}. Keep it natural and concise.{language_instruction}
End your greeting with one short, friendly question that invites the learner to respond.
"""
        
        try:
            response = self.model.generate_content(initial_prompt)
            ai_response = response.text
            self.conversation_history.append({"role": "assistant", "content": ai_response})
            return ai_response
        except Exception as e:
            return f"Sorry, I encountered an error: {str(e)}"
    
    def cleanup(self):
        """Clean up resources."""
        self.audio_interface.cleanup()


def main():
    """Main function to run the voice chatbot."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Voice Language Learning Chatbot')
    parser.add_argument('scenario', nargs='?', default='cafe',
                        choices=list(SCENARIOS.keys()),
                        help='Scenario to run (default: cafe)')
    parser.add_argument('--list', action='store_true',
                        help='List all available scenarios')
    parser.add_argument('--language', '-l', default='english',
                        help='Language for the conversation (default: english)')
    parser.add_argument('--auto-record', '-a', action='store_true',
                        help='Use automatic recording mode (speak when prompted)')
    args = parser.parse_args()
    
    # Default to push-to-talk mode unless auto-record is specified
    push_to_talk = not args.auto_record
    
    # List available scenarios if requested
    if args.list:
        print("Available scenarios:")
        for name, scenario in SCENARIOS.items():
            print(f"  {name}: {scenario['title']}")
        print("\nSupported languages:")
        print("  english, spanish, french, chinese, japanese, german, italian, portuguese, russian, korean")
        return
    
    # Check if any scenarios were loaded
    if not SCENARIOS:
        print("Error: No scenarios found. Please check the scenarios directory.")
        return
    
    # Get API key from environment variable or replace with your key
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Please set your GEMINI_API_KEY environment variable or modify the script to include your key.")
        return
    
    # Get the selected scenario
    if args.scenario not in SCENARIOS:
        print(f"Error: Scenario '{args.scenario}' not found.")
        print("Available scenarios:")
        for name in SCENARIOS.keys():
            print(f"  {name}")
        return
        
    selected_scenario = SCENARIOS[args.scenario]
    
    # Initialize the chatbot with the selected scenario and language
    chatbot = VoiceLanguageLearningChatbot(api_key, selected_scenario, args.language)
    
    print("=== Voice Language Learning Chatbot ===")
    print(f"Scenario: {chatbot.scenario['title']}")
    print(f"Role: {chatbot.role.title()}")
    print(f"Language: {chatbot.language.title()}")
    if push_to_talk:
        print("Mode: Push-to-talk (hold SPACEBAR to record)")
    else:
        print("Mode: Voice activated (speak when prompted)")
    print("Press Ctrl+C to exit the conversation.\n")
    
    try:
        # Start the conversation
        ai_response = chatbot.start_conversation()
        print(f"{chatbot.role.title()}: {ai_response}")
        
        # Speak the AI response
        print("🔊 Playing AI response...")
        success = chatbot.audio_interface.text_to_speech(ai_response, chatbot.language)
        if not success:
            print("⚠️ Failed to play audio response")
        
        # Main conversation loop with safety checks
        max_total_exchanges = 20  # Maximum total exchanges to prevent infinite loops
        total_exchanges = 0
        
        while not chatbot.is_conversation_complete() and total_exchanges < max_total_exchanges:
            # Get user input through speech-to-text
            if push_to_talk:
                stt_result = chatbot.audio_interface.record_and_transcribe_push_to_talk()
            else:
                stt_result = chatbot.audio_interface.record_and_transcribe()
            
            # Extract text and language code from STT result
            if isinstance(stt_result, dict):
                user_input = stt_result.get('text', '')
                language_code = stt_result.get('language_code', '')
            else:
                # Backward compatibility for string results
                user_input = stt_result
                language_code = ''
            
            if not user_input:
                print("No speech detected. Please try again.")
                continue
            
            # Apply language code fallback logic
            original_language_code = language_code
            language_code = chatbot.normalize_language_code(language_code)
            
            # Log if language code was changed
            if original_language_code != language_code and original_language_code:
                print(f"Unrecognized language '{original_language_code}' detected — defaulting to target language.")
            
            print(f"You: {user_input}")
            if language_code:
                print(f"Detected language: {language_code}")
            
            # Check for exit commands
            if user_input.lower() in ['quit', 'exit', 'stop', 'end']:
                print("Conversation ended.")
                break
            
            # Generate AI response with language code
            ai_response, is_complete = chatbot.generate_response(user_input, language_code)
            print(f"{chatbot.role.title()}: {ai_response}")
            
            # Speak the AI response
            print("🔊 Playing AI response...")
            success = chatbot.audio_interface.text_to_speech(ai_response, chatbot.language)
            if not success:
                print("⚠️ Failed to play audio response")
            
            # Check if conversation is complete
            if is_complete:
                print("\n✅ Conversation complete!")
                break
                
            total_exchanges += 1
        
        # Check if we exited due to max exchanges
        if total_exchanges >= max_total_exchanges and not chatbot.is_conversation_complete():
            print("\n⚠️ Maximum conversation length reached. Ending conversation.")
            print("✅ Conversation complete!")
    
    except KeyboardInterrupt:
        print("\nConversation interrupted by user.")
    finally:
        chatbot.cleanup()


if __name__ == "__main__":
    main()
