FROM python:3.11-slim
WORKDIR /app
RUN useradd -m worker
COPY workers/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY workers/src ./src
USER worker
ENV PORT=8081
EXPOSE 8081
CMD ["python", "-m", "src.main"]
