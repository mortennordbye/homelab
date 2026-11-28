# pyquafu ships Linux wheels for x86_64 only; build with --platform linux/amd64.
# 3.12: on 3.13 a pyquafu dependency builds from source and needs a compiler.
FROM python:3.12-slim@sha256:5b5fe805d367f8f5a359ded6ab2652b7f9a206453ee6ee789c0045ba6ec15016
COPY requirements.txt /tmp/
RUN pip install -q --root-user-action=ignore --no-cache-dir -r /tmp/requirements.txt
WORKDIR /work
ENTRYPOINT ["python", "shor.py"]
