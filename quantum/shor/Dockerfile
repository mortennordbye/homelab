# pyquafu ships Linux wheels for x86_64 only; build with --platform linux/amd64.
# 3.12: on 3.13 a pyquafu dependency builds from source and needs a compiler.
FROM python:3.12-slim@sha256:5e2bdb1b0d542d5039cffb8181c65930093949194a65c365dfb1b0fe13a4fa5b
COPY requirements.txt /tmp/
RUN pip install -q --root-user-action=ignore --no-cache-dir -r /tmp/requirements.txt
WORKDIR /work
ENTRYPOINT ["python", "shor.py"]
