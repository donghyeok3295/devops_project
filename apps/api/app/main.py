from fastapi import FastAPI

app = FastAPI(title='Smart Lost&Found API')

@app.get('/health')
def health():
    return {'status': 'ok'}