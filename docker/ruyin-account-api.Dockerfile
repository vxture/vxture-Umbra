ARG PYTHON_BASE_IMAGE=python:3.12-alpine
FROM ${PYTHON_BASE_IMAGE}

WORKDIR /app
COPY services/account/account.py /app/account.py

ENV ACCOUNT_PORT=3281
EXPOSE 3281

CMD ["python", "/app/account.py"]
