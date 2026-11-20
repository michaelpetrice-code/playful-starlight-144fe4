FROM python:3.12-slim
RUN useradd --uid 1000 --create-home launch && mkdir /data && chown launch:launch /data
WORKDIR /app
COPY --chown=launch:launch server.py ./
COPY --chown=launch:launch web ./web
USER launch
ENV DATA_DIR=/data ADMIN_BIND=0.0.0.0 PUBLIC_BIND=0.0.0.0 PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
EXPOSE 8080 8081
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/healthz',timeout=3)"
CMD ["python", "server.py"]
