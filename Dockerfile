FROM python:3.11-slim

WORKDIR /app

# Install curl for health check and build tools for faster-whisper
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements-server.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements-server.txt

# Install faster-whisper for audio transcription
RUN pip install --no-cache-dir faster-whisper

# Copy application
COPY server/ai_server.py .

# Copy clients folder for knowledge base
COPY clients/ ./clients/

# Set environment variables
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["python", "ai_server.py"]
