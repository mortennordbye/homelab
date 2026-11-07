# pyquafu ships Linux wheels for x86_64 only; build with --platform linux/amd64.
# 3.12: on 3.13 a pyquafu dependency builds from source and needs a compiler.
FROM python:3.12-slim@sha256:4840d514c583a4d3d8cad3940e68dee6f0f6f3635c12fcd0a3d74c21a5b93a54
COPY requirements.txt /tmp/
RUN pip install -q --root-user-action=ignore --no-cache-dir -r /tmp/requirements.txt
WORKDIR /work
ENTRYPOINT ["python", "shor.py"]
