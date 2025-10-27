# apps/api/app/utils/response.py
def ok(data):
    return {"data": data, "error": None}

def fail(code: str, message: str, http_status: int | None = None):
    # http_status는 라우터에서 HTTPException으로 쓰고 body만 통일할 때 사용
    return {"data": None, "error": {"code": code, "message": message}}
