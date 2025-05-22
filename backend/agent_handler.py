import re
import json
import requests
import pytz
import uuid
from datetime import datetime, timedelta
from typing import Dict, Tuple, Any, Optional, List
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_API_URL = "https://api.openai.com/v1"

class CalendarEventBase(BaseModel):
    summary: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_datetime: datetime
    end_datetime: datetime
    timezone: str = "Asia/Dhaka"
    is_all_day: bool = False
    recurrence: Optional[str] = None

def process_prompt(prompt: str) -> Tuple[str, Dict[str, Any]]:
    """
    Process the user prompt to identify intent and extract parameters.
    """
    current_date = datetime.now(pytz.timezone('Asia/Dhaka')).strftime("%Y-%m-%d")
    
    response = call_openai_api(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": f"""You are an AI assistant that identifies user intents and extracts parameters from their requests.
            For calendar events, extract with precision:
            - summary: Meeting title (required)
            - description: Agenda/details
            - location: Physical/virtual location
            - start_datetime: PRESERVE EXACTLY as specified by user (date and time)
            - end_datetime: PRESERVE EXACTLY as specified by user (date and time)
            - timezone: IANA timezone name (e.g., Asia/Dhaka)
            - is_all_day: true/false if mentioned
            - recurrence: RRULE if mentioned

            Handle these special cases:
            1. "All day" events: Set start/end to 00:00-23:59 same day
            2. Timezone conversions: Convert mentioned times to Asia/Dhaka base
            3. Natural language: "noon"=12:00, "evening"=17:00
            4. Duration: "1h meeting" = end = start + 1h
            5. Relative dates: "next Monday" = nearest future Monday

            Today's date: {current_date}. Never accept past dates.
            
            For image creation, extract: prompt_for_image, size (square, portrait, landscape), quality (standard, hd), style (vivid, natural).
            
            For search requests about recent events, news, or time-sensitive information that might be beyond your knowledge cutoff, categorize as "search_request" and extract:
            - search_query: The specific query to search for
            - time_frame: How recent (e.g., "today", "this week", "this month", "this year")
            
            Return a JSON with 'intent' and 'params' fields. Valid intents: schedule_meeting, create_image, search_request, general_query."""},
            {"role": "user", "content": prompt}
        ]
    )
    
    try:
        content = response.get('choices', [{}])[0].get('message', {}).get('content', '{}')
        json_match = re.search(r'```json\s*([\s\S]*?)\s*```', content)
        if json_match:
            content = json_match.group(1)
        
        result = json.loads(content)
        print(f"Intent extraction result: {result}")  # Debug logging
        return result.get('intent', 'general_query'), result.get('params', {})
    except (json.JSONDecodeError, AttributeError) as e:
        print(f"Error parsing intent: {e}")
        return "general_query", {}

def extract_date_components(datetime_str: str) -> Dict[str, int]:
    """
    Extract key date components (month, day, hour) from a datetime string for validation.
    """
    if not datetime_str:
        return {}
        
    try:
        # Use a simplified parsing approach as fallback validation
        response = call_openai_api(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": """Extract date components from this text. 
                Return a JSON with keys: month (1-12), day (1-31), hour (0-23), minute (0-59).
                If any component is not specified, omit that key."""},
                {"role": "user", "content": datetime_str}
            ],
            temperature=0.1
        )
        
        content = response.get('choices', [{}])[0].get('message', {}).get('content', '{}')
        json_match = re.search(r'```json\s*([\s\S]*?)\s*```', content)
        if json_match:
            content = json_match.group(1)
            
        result = json.loads(content)
        print(f"Extracted date components: {result}")  # Debug logging
        return result
    except Exception as e:
        print(f"Error extracting date components: {e}")
        return {}

def create_event_from_params(params: Dict[str, Any]) -> CalendarEventBase:
    """
    Create a CalendarEventBase object with enhanced time handling.
    """
    dhaka_tz = pytz.timezone('Asia/Dhaka')
    now = datetime.now(dhaka_tz)
    
    # Debug the input parameters
    print(f"Creating event with params: {params}")
    
    # Extract raw date strings for validation
    start_datetime_str = params.get('start_datetime')
    end_datetime_str = params.get('end_datetime')
    
    # Get expected date components for validation
    expected_components = extract_date_components(start_datetime_str)
    
    # Timezone handling
    tz_str = params.get('timezone', 'Asia/Dhaka')
    try:
        event_tz = pytz.timezone(tz_str) if re.match(r"^[A-Za-z_]+/[A-Za-z_]+$", tz_str) else dhaka_tz
    except pytz.exceptions.UnknownTimeZoneError:
        event_tz = dhaka_tz

    # Parse datetimes with timezone awareness
    start_time = parse_datetime_with_openai(start_datetime_str, event_tz)
    end_time = parse_datetime_with_openai(end_datetime_str, event_tz)
    
    # Validate parsed start time against expected components
    if start_time and expected_components:
        is_valid = True
        error_msg = []
        
        if 'month' in expected_components and expected_components['month'] != start_time.month:
            is_valid = False
            error_msg.append(f"Month mismatch: expected {expected_components['month']}, got {start_time.month}")
            
        if 'day' in expected_components and expected_components['day'] != start_time.day:
            is_valid = False
            error_msg.append(f"Day mismatch: expected {expected_components['day']}, got {start_time.day}")
            
        if 'hour' in expected_components and abs(expected_components['hour'] - start_time.hour) > 1:
            is_valid = False
            error_msg.append(f"Hour mismatch: expected {expected_components['hour']}, got {start_time.hour}")
        
        if not is_valid:
            print(f"Date validation failed: {'; '.join(error_msg)}")
            # Try direct fallback parsing
            start_time = direct_datetime_parse(start_datetime_str, expected_components, event_tz)
    
    # Set defaults if parsing failed
    if not start_time:
        # Use expected components if available, otherwise default to tomorrow
        if expected_components and 'month' in expected_components and 'day' in expected_components:
            # Create date from components
            year = now.year
            month = expected_components['month']
            day = expected_components['day']
            hour = expected_components.get('hour', 12)  # Default to noon if not specified
            minute = expected_components.get('minute', 0)
            
            start_time = event_tz.localize(datetime(year, month, day, hour, minute))
            # If this creates a past date, try next year
            if start_time < now:
                start_time = event_tz.localize(datetime(year + 1, month, day, hour, minute))
        else:
            # Default to tomorrow same time
            start_time = now + timedelta(days=1)
    
    if not end_time:
        # Default to 1 hour after start time
        end_time = start_time + timedelta(hours=1)

    # All-day event handling
    if params.get('is_all_day', False):
        start_time = event_tz.localize(datetime.combine(start_time.date(), datetime.min.time()))
        end_time = event_tz.localize(datetime.combine(start_time.date(), datetime.max.time()))
    else:
        # Ensure timezone awareness
        if start_time.tzinfo is None:
            start_time = event_tz.localize(start_time)
        else:
            start_time = start_time.astimezone(event_tz)
            
        if end_time.tzinfo is None:
            end_time = event_tz.localize(end_time)
        else:
            end_time = end_time.astimezone(event_tz)

    # Validation checks
    if (end_time - start_time).total_seconds() < 300:
        end_time = start_time + timedelta(minutes=30)
    
    if start_time < now:
        start_time = now + timedelta(hours=1)
        end_time = start_time + timedelta(hours=1)
    
    # Debug the final parsed times
    print(f"Final start_time: {start_time.isoformat()}")
    print(f"Final end_time: {end_time.isoformat()}")

    return CalendarEventBase(
        summary=params.get('summary', 'Meeting'),
        description=params.get('description'),
        location=params.get('location'),
        start_datetime=start_time,  # Keep timezone info
        end_datetime=end_time,      # Keep timezone info
        timezone=str(event_tz),
        is_all_day=params.get('is_all_day', False),
        recurrence=params.get('recurrence')
    )

def direct_datetime_parse(datetime_str: str, expected_components: Dict[str, int], tz: pytz.BaseTzInfo) -> Optional[datetime]:
    """
    Fallback direct parsing method when AI parsing fails validation.
    """
    if not datetime_str or not expected_components:
        return None
        
    try:
        now = datetime.now(tz)
        year = now.year
        
        # Extract components
        month = expected_components.get('month', now.month)
        day = expected_components.get('day', now.day)
        hour = expected_components.get('hour', 12)  # Default to noon
        minute = expected_components.get('minute', 0)
        
        # Create datetime
        dt = datetime(year, month, day, hour, minute)
        
        # Check if in past
        loc_dt = tz.localize(dt)
        if loc_dt < now:
            # Try next year if it's a past date
            if month < now.month or (month == now.month and day < now.day):
                dt = datetime(year + 1, month, day, hour, minute)
                loc_dt = tz.localize(dt)
        
        print(f"Direct parsed datetime: {loc_dt.isoformat()}")
        return loc_dt
    except Exception as e:
        print(f"Error in direct datetime parsing: {e}")
        return None

def parse_datetime_with_openai(datetime_str: str, tz: pytz.BaseTzInfo) -> Optional[datetime]:
    """
    Improved datetime parsing with timezone awareness.
    """
    if not datetime_str:
        return None
        
    print(f"Parsing datetime string: '{datetime_str}'")
    current_date = datetime.now(tz).strftime("%Y-%m-%d")
    
    try:
        response = call_openai_api(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": f"""
                Convert natural language datetime to ISO 8601 with timezone offset.
                Current date: {current_date} in {tz.zone}.
                IMPORTANT: Preserve the EXACT date and time specified by the user.
                Key rules:
                1. Return in format: YYYY-MM-DDTHH:MM:SS+06:00
                2. "All day" → 00:00:00-23:59:59
                3. Relative dates use {tz.zone} timezone
                4. Handle duration syntax: "2h meeting" → end = start + 2h
                5. DO NOT change dates specified by the user
                6. DO NOT default to today/tomorrow if date is specified
                7. If "7 May 5pm" is specified, use exactly May 7th at 5:00 PM (This an example. You have to use the date and time specified by the user)
                8. Return only the ISO datetime string with no explanation
                """},
                {"role": "user", "content": f"Parse exactly: {datetime_str}"}
            ]
        )
        
        iso_string = response.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
        print(f"Parsed ISO string: '{iso_string}'")
        
        # Clean up the ISO string (remove any explanatory text)
        iso_match = re.search(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:\d{2}|Z)?', iso_string)
        if iso_match:
            iso_string = iso_match.group(0)
            print(f"Cleaned ISO string: '{iso_string}'")
        
        # Handle both formats with and without timezone
        if 'Z' in iso_string:
            parsed_time = datetime.fromisoformat(iso_string.replace('Z', '+00:00'))
        elif '+' in iso_string or ('-' in iso_string and 'T' in iso_string):
            parsed_time = datetime.fromisoformat(iso_string)
        else:
            # If no timezone info, assume local time
            parsed_time = datetime.fromisoformat(iso_string)
            parsed_time = tz.localize(parsed_time)
            print(f"Localized time: {parsed_time.isoformat()}")
            return parsed_time
        
        # Return time in the requested timezone
        result = parsed_time.astimezone(tz)
        print(f"Final parsed time: {result.isoformat()}")
        return result
    except Exception as e:
        print(f"Datetime parsing error: {e} for input '{datetime_str}'")
        return None

def generate_image(prompt: str, size: str = "1024x1024", quality: str = "standard", style: str = "vivid") -> Dict[str, Any]:
    """
    Generate an image using DALL-E 3.
    
    Args:
        prompt: Description of the image to generate
        size: Image size ("1024x1024", "1024x1792", "1792x1024")  
        quality: Image quality ("standard", "hd")
        style: Image style ("vivid", "natural")
        
    Returns:
        Dictionary with image URL and metadata
    """
    try:
        response = requests.post(
            f"{OPENAI_API_URL}/images/generations",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {OPENAI_API_KEY}"
            },
            json={
                "model": "dall-e-3",
                "prompt": prompt,
                "n": 1,
                "size": size,
                "quality": quality,
                "style": style
            }
        )
        
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error generating image: {e}")
        return {"error": str(e)}

def call_openai_api(model: str, messages: List[Dict[str, str]], temperature: float = 0.7) -> Dict[str, Any]:
    """
    Call the OpenAI API with the provided parameters.
    
    Args:
        model: The OpenAI model to use
        messages: List of message dictionaries
        temperature: Sampling temperature
        
    Returns:
        OpenAI API response
    """
    try:
        response = requests.post(
            f"{OPENAI_API_URL}/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {OPENAI_API_KEY}"
            },
            json={
                "model": model,
                "messages": messages,
                "temperature": temperature
            }
        )
        
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error calling OpenAI API: {e}")
        return {"error": str(e)}

def select_openai_model(task: str, complexity: int = 1) -> str:
    """
    Selects the appropriate OpenAI model based on task and complexity.
    
    Args:
        task: Type of task ("general", "reasoning", "creative", etc.)
        complexity: Task complexity level (1-3, where 3 is most complex)
        
    Returns:
        Model name string
    """
    # For complex tasks or reasoning, use GPT-4o
    if complexity >= 2 or task in ["reasoning", "complex", "analysis"]:
        return "gpt-4o"
    
    # For creative tasks with medium complexity, use GPT-4o
    if task == "creative" and complexity >= 2:
        return "gpt-4o"
        
    # For simple to medium tasks, use GPT-3.5 Turbo
    return "gpt-3.5-turbo"

def perform_search_with_gpt4o(query: str, time_frame: str = "recent") -> Dict[str, Any]:
    """
    Use GPT-4o with browsing capabilities to search for information, matching OpenAI's implementation.
    
    Args:
        query: The search query
        time_frame: Time frame for search (today, this week, this month, etc.)
        
    Returns:
        Search results and summary
    """
    try:
        # Create a client for OpenAI's API
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        
        # Format the query to focus on the specified time frame
        search_query = f"{query} {time_frame}"
        if time_frame.lower() == "today":
            search_query = f"{query} in the last 24 hours"
        
        # Call the OpenAI chat completions API with search enabled
        response = openai_client.chat.completions.create(
            model="gpt-4o-search-preview",  # Use the actual search-enabled model
            web_search_options={},  # Enable web search with default options
            messages=[
                {
                    "role": "user",
                    "content": search_query,
                }
            ],
            # temperature=0.5
        )
        
        # Extract the content from the response
        search_content = response.choices[0].message.content
        
        # Extract any citations or sources (in a real implementation)
        sources = []
        # Simple regex to find URLs in the content - this would be more sophisticated in production
        url_pattern = r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+'
        found_urls = re.findall(url_pattern, search_content)
        if found_urls:
            sources = found_urls
        else:
            sources = ["Sources would be extracted from the GPT-4o Search response"]
        
        return {
            "query": query,
            "time_frame": time_frame,
            "results": search_content,
            "sources": sources,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error performing search: {e}")
        # Fallback to simulated search when the actual API is not available
        system_prompt = f"""You are a helpful search assistant simulating web browsing capabilities.
        The user is asking about: "{query}" with focus on {time_frame} information.
        
        Instructions:
        1. Simulate searching for relevant and recent information
        2. Format your response as if you found real search results
        3. Include fictional but plausible source citations
        4. Make it clear this is a simulation of search results
        
        Provide a realistic but clearly simulated search response."""
        
        # Simulate search results
        response = call_openai_api(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Search for information about: {query}, focusing on {time_frame} results."}
            ],
            temperature=0.7
        )
        
        search_content = response.get('choices', [{}])[0].get('message', {}).get('content', '')
        return {
            "query": query,
            "time_frame": time_frame,
            "results": search_content,
            "sources": ["[Simulation] This is a preview of GPT-4o Search capabilities."],
            "timestamp": datetime.now().isoformat(),
            "simulated": True
        }

def process_unified_request(prompt: str, message_history: List[Dict[str, str]]) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Process a unified chat request and generate appropriate response and actions.
    
    Args:
        prompt: The user's prompt string
        message_history: Previous message history
        
    Returns:
        Tuple of (response_text, actions)
    """
    intent, params = process_prompt(prompt)
    actions = []
    
    if intent == "schedule_meeting":
        # This will be handled by the main app, which calls create_event_from_params
        event = create_event_from_params(params)
        
        # Ensure we display the time in the correct local timezone
        local_start = event.start_datetime.astimezone(pytz.timezone(event.timezone))
        
        # Format response with well-formatted date/time
        start_formatted = local_start.strftime("%A, %B %d at %I:%M %p")
        end_formatted = event.end_datetime.strftime("%I:%M %p") if event.start_datetime.date() == event.end_datetime.date() else event.end_datetime.strftime("%A, %B %d at %I:%M %p")
        
        location_text = f" at {event.location}" if event.location else ""
        description_text = f"\n\nDescription: {event.description}" if event.description else ""
        
        # Create a more professional response
        if event.is_all_day:
            response_text = f"I've prepared an all-day event '{event.summary}'{location_text} on {event.start_datetime.strftime('%A, %B %d, %Y')}.{description_text}"
        else:
            response_text = f"I've prepared a calendar event for '{event.summary}'{location_text} from {start_formatted} to {end_formatted}.{description_text}"
        
        # Add calendar action with a unique ID to track event creation status
        event_tracking_id = str(uuid.uuid4()) 
        
        actions.append({
            "type": "calendar_event_pending",
            "id": event_tracking_id,
            "details": {
                "summary": event.summary,
                "start_datetime": event.start_datetime.isoformat(),
                "end_datetime": event.end_datetime.isoformat(),
                "location": event.location,
                "description": event.description,
                "timezone": event.timezone,
                # Reserve placeholder for htmlLink that will be added when event is created
                "htmlLink": None
            }
        })
    
    elif intent == "create_image":
        # Process image creation
        image_prompt = params.get('prompt_for_image', prompt)
        size_map = {
            "square": "1024x1024",
            "portrait": "1024x1792", 
            "landscape": "1792x1024"
        }
        size = size_map.get(params.get('size', 'square'), "1024x1024")
        quality = params.get('quality', 'standard')
        style = params.get('style', 'vivid')
        
        image_result = generate_image(image_prompt, size, quality, style)
        
        if "error" in image_result:
            response_text = f"I'm sorry, I couldn't generate that image. Error: {image_result['error']}"
        else:
            # Extract the image URL
            image_url = image_result.get('data', [{}])[0].get('url', '')
            size_text = "square" if size == "1024x1024" else "portrait" if size == "1024x1792" else "landscape"
            response_text = f"Here's the image I've created based on your description. I hope it matches what you were looking for!\n\nSpecifications: {size_text} format, {quality} quality, {style} style"
            
            actions.append({
                "type": "image_created",
                "image_url": image_url,
                "prompt": image_prompt
            })
    
    elif intent == "search_request":
        # Process search request with GPT-4o Search Preview
        search_query = params.get('search_query', prompt)
        time_frame = params.get('time_frame', 'recent')
        
        search_result = perform_search_with_gpt4o(search_query, time_frame)
        
        if "error" in search_result:
            response_text = f"I'm sorry, I couldn't perform that search. Error: {search_result['error']}"
        else:
            # Check if this was a simulated search or real search
            if search_result.get('simulated', False):
                # Format simulated search results with disclaimer
                response_text = f"""# GPT-4o Search Preview: {search_query}

{search_result['results']}

---
*Note: This is a simulation of GPT-4o Search capabilities. In the actual implementation, real-time web search results would be provided.*
"""
            else:
                # Format real search results with citations
                response_text = f"""# Search Results: {search_query}

{search_result['results']}

---
Sources:
"""
                # Add numbered sources
                for i, source in enumerate(search_result['sources'], 1):
                    response_text += f"{i}. {source}\n"
            
            # Add search metadata as an action
            actions.append({
                "type": "search_performed",
                "query": search_query,
                "time_frame": time_frame,
                "timestamp": search_result['timestamp'],
                "simulated": search_result.get('simulated', False)
            })
    
    else:  # general_query
        # Assess complexity for model selection
        complexity_assessment = call_openai_api(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": """Assess the complexity of this user query on a scale of 1-3.
                1: Simple factual questions, greetings, basic instructions
                2: Multi-step reasoning, creative writing, detailed explanations
                3: Complex reasoning, problem-solving, technical analysis
                Return only the number (1, 2, or 3)."""},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1
        )
        
        # Extract complexity score
        try:
            complexity_text = complexity_assessment.get('choices', [{}])[0].get('message', {}).get('content', '1')
            complexity = int(complexity_text.strip())
        except (ValueError, TypeError):
            complexity = 1
            
        # Determine task type
        task_assessment = call_openai_api(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": """Categorize this user query as one of:
                "general": casual conversation, simple information
                "creative": writing, storytelling, content creation
                "reasoning": problem-solving, analysis, decision-making
                "technical": coding, math, scientific questions
                Return only the category name."""},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1
        )
        
        # Extract task type
        task_type = task_assessment.get('choices', [{}])[0].get('message', {}).get('content', 'general').strip().lower()
        
        # Select appropriate model
        model = select_openai_model(task_type, complexity)
        
        # Use the selected model for the response
        context = [{"role": m["role"], "content": m["content"]} for m in message_history]
        context.append({"role": "user", "content": prompt})
        
        system_prompt = """You are a professional AI assistant that provides helpful, accurate, and thoughtful responses. 
Your answers should be:
- Concise yet comprehensive
- Well-structured with clear organization
- Accurate and factually correct
- Balanced and unbiased
- Tailored to the user's level of understanding"""

        openai_response = call_openai_api(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                *context
            ],
            temperature=0.7
        )
        
        response_text = openai_response.get('choices', [{}])[0].get('message', {}).get('content', 
            "I'm sorry, I couldn't process your request at the moment.")
    
    return response_text, actions