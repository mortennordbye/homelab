# pyquafu ships Linux wheels for x86_64 only; build with --platform linux/amd64.
FROM python:3.12-slim
COPY requirements.txt /tmp/
RUN pip install -q --root-user-action=ignore --no-cache-dir -r /tmp/requirements.txt
WORKDIR /work
ENTRYPOINT ["python", "shor.py"]
