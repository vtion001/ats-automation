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

# Copy entire app
COPY . .

# Set environment variables
ENV PORT=8000
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

EXPOSE 8000

# Run modular server from server directory
CMD ["python", "-m", "server.main"]
