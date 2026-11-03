# pyquafu ships Linux wheels for x86_64 only; build with --platform linux/amd64.
FROM python:3.15-slim@sha256:8c13a3f37a6a5b71498228e902c4b9f51c1f7900d49fabf71f9a650c6120e0d0
COPY requirements.txt /tmp/
RUN pip install -q --root-user-action=ignore --no-cache-dir -r /tmp/requirements.txt
WORKDIR /work
ENTRYPOINT ["python", "shor.py"]
