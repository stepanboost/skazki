FROM python:3.13-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install poetry
ENV POETRY_NO_INTERACTION=1
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app
COPY pyproject.toml poetry.lock* ./

RUN poetry config virtualenvs.create false && poetry install --only=main --no-root
COPY src/ ./src/

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
