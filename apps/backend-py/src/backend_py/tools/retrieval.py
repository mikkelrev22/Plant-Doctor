"""Retrieval tool adapter for the ReAct agent."""

import json

from langchain_core.tools import tool

from backend_py.capabilities.retrieval import search_care_profile


@tool
async def lookup_plant_care(species: str) -> str:
    """Look up ideal care conditions and common failure modes for a plant species."""
    profile = await search_care_profile(species)
    return json.dumps(profile.model_dump())
