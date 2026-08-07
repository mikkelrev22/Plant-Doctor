"""Linear diagnosis pipeline API routes."""

from fastapi import APIRouter

from backend_py.graphs.linear import linear_graph
from backend_py.schemas import DiagnoseRequest, DiagnoseResponse

router = APIRouter(prefix="/diagnose", tags=["diagnose"])


@router.post("/linear", response_model=DiagnoseResponse)
async def diagnose_linear(payload: DiagnoseRequest) -> DiagnoseResponse:
    """Run the deterministic triage -> vision -> RAG -> diagnosis pipeline."""
    result = await linear_graph.ainvoke(
        {
            "image_url": payload.image_url,
            "user_text": payload.user_text,
        }
    )
    return DiagnoseResponse(result=result)
