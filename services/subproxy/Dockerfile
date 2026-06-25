ARG PYTHON_BASE_IMAGE=python:3.12-alpine
FROM ${PYTHON_BASE_IMAGE}

WORKDIR /app
COPY subproxy.py /app/subproxy.py

ENV SUBPROXY_PORT=8080
EXPOSE 8080

CMD ["python", "/app/subproxy.py"]
