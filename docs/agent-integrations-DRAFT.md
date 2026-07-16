# Agent Integrations (backend-py)

# Workflow #1: Linear diagnosis --------

## Overview
The agent receives the follow-up question from the user, reasons in the context of a plant report, and answers the question.
User interface: textarea with Submit button on report page. 
Results displayed with no future interactions?

## Initial input
- **User question**
- Plant context (what exactly agent needs to start with?)
- Plant from the report (URL or BASE64?)
- [later] Plant location (Seattle, WA, United States)

## Tool use
It's crucial to document all node backend API requests to make obvious what it can do and what not. So we don't repeat endpoints or give too much access to the agent.

### 1. Get plant history `plant_history(id)`
Get summary of the previous plant reports.

NODE API `GET /agent/plantHistory/:plant_id`

**Response:**
```text
The plant has these report history:
Report date: July 3, 2026 (5 days ago). Stressors: mold, curved leaves
Report date: June 26, 2026 (11 days ago). Stressors: curved leaves, brown/crispy tips
```

### 2. Get weather `weather(location_name)`
Get current weather in the provided location. (note: we don't currently have user location, just an expample that's not node backend dependent but good to document)

External api `GET https://openweathermap.org/api/.....`

**Response:**
```json
{
  "temperature": 76,
  "humidity": 50,
  "condition": "sunny"
}
```



## Final output
- Text answer displayed to user
- DB update (if so, what exactly? Saving the note as example below)

### Save diagnosis `save_diagnosis(plant_id, diagnosis_text)`
Save diagnosis result to the plant note context.

NODE API `POST /agent/saveDiagnosisNote/:plant_id`

**Posted data (diagnosis to save):**
```text
User watered the plant every day, when the recommendation was to water it every week.
```
**Response:**
```text
Diagnosis note saved.
```


# Workflow #2: Chat with agent --------

.....