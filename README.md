# Cryptomataz

Viral content generation system for Twitter using multi-agent architecture with LangGraph and AI.
Autonomous AI agents that buy, sell, and trade computational resources from each other—without human intervention

## Features

- **Multi-Agent System**: Three specialized agents working in sequence
- **Weekly Content Generation**: Produces 14-21 optimized tweets for a complete week
- **Strategic Planning**: Cohesive content strategy with unique daily themes
- **Viral Optimization**: Engagement-focused hooks, clear CTAs, and performance scoring
- **Analytics**: Token usage tracking and performance metrics per agent

## Architecture

The system consists of three specialized agents:

1. **Content Strategist**: Creates the weekly content strategy
2. **Tweet Creator**: Generates viral tweets for each day
3. **Quality Optimizer**: Optimizes and refines content quality

## Requirements

- Python 3.11+
- OpenAI API Key
- Dependencies listed in `requirements.txt`

## Installation

```bash
python3 -m venv .venv
source .venv/bin/activate
pip3 install -r requirements.txt
```

## Running the Application

```bash
uvicorn src.main:app --reload
```

The server will be available at `http://localhost:8000`

## Docker Deployment

### Start containers

```bash
# Windows
docker-compose up --build

# Linux
docker compose up --build
```

### Stop containers

```bash
# Windows
docker-compose down

# Linux
docker compose down
```
