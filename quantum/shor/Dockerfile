# pyquafu ships Linux wheels for x86_64 only; build with --platform linux/amd64.
FROM python:3.15-slim@sha256:2da676046630d7bf14c6764ae1143dc7fa0377a53f94bf5a642f0b214aca5bce
COPY requirements.txt /tmp/
RUN pip install -q --root-user-action=ignore --no-cache-dir -r /tmp/requirements.txt
WORKDIR /work
ENTRYPOINT ["python", "shor.py"]
