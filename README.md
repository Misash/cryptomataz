# Cryptomataz 🚀

Viral content generation system for Twitter using multi-agent architecture with LangGraph and AI.

## ✨ Features

- 🤖 **Multi-Agent System**: 3 specialized agents working in sequence
- 📅 **Weekly Content**: Generates 14-21 optimized tweets for a complete week
- 🎯 **Smart Strategy**: Cohesive planning with unique daily themes
- 🔥 **Viral Optimization**: Powerful hooks, clear CTAs and engagement scores
- 📊 **Analytics**: Token tracking and metrics per agent

## 🏗️ Architecture

The system uses 3 specialized agents:

1. **Content Strategist** 🎯: Creates the weekly strategy
2. **Tweet Creator** ✍️: Generates viral tweets per day
3. **Quality Optimizer** 🎨: Optimizes and refines content

## 📋 Requirements

- Python 3.11
- OpenAI API Key
- Dependencies in `requirements.txt`

## 🔧 Install Dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip3 install -r requirements.txt
```

## 🚀 Run

```bash
uvicorn src.main:app --reload
```

The server will be available at `http://localhost:8000`

## 🐳 Run with Docker Compose

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