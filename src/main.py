from fastapi import FastAPI
from dotenv import load_dotenv

from src.routes import (
    status_check,
    supervisor_agent_endpoint
)

load_dotenv()

app = FastAPI()


app.include_router(status_check.router)
app.include_router(supervisor_agent_endpoint.router)
