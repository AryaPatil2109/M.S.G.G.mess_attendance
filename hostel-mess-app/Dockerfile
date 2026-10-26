# Stage 1: Build the React frontend
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn

COPY . .

# Copy built frontend assets from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 5000

# Ensure database tables/seed are initialized, then start Gunicorn
CMD ["sh", "-c", "python -c 'import app; app.init_db()' && gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 2 app:app"]

