ARG PYTHON_BASE_IMAGE=python:3.12-alpine
FROM ${PYTHON_BASE_IMAGE}

WORKDIR /app

# redis-py: read the OIDC RP session store (rpsess) written by the console
# app-bff. Pure-Python, no build toolchain needed on alpine.
RUN pip install --no-cache-dir redis==5.0.8

COPY account.py /app/account.py

ENV ACCOUNT_PORT=3281
EXPOSE 3281

CMD ["python", "/app/account.py"]
