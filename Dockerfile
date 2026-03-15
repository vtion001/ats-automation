FROM python:3.11-slim

WORKDIR /app

# Install curl for health check
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements-server.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements-server.txt

# Copy application
COPY server/ai_server.py .

# Set environment variables
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["python", "ai_server.py"]
