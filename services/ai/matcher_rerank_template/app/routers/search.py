from fastapi import APIRouter, Request
from app.services.llm import score

router = APIRouter(prefix="/search")

@router.post("")
async def search(req: Request):
    data = await req.json()

    query = data.get("query", "")
    items = data.get("items", [])

    # 1) LLM 재랭킹
    llm_result = score(query, items)

    combined = []
    for item, s, r in zip(items, llm_result["scores"], llm_result["reasons"]):
        combined.append({
            **item,
            "llm_score": s,
            "llm_reason": r
        })

    final = sorted(combined, key=lambda x: x["llm_score"], reverse=True)

    return {
        "status": llm_result["status"],
        "results": final
    }
