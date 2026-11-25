# pyquafu ships Linux wheels for x86_64 only; build with --platform linux/amd64.
# 3.12: on 3.13 a pyquafu dependency builds from source and needs a compiler.
FROM python:3.12-slim@sha256:191083cdf6c7bda8c76158983163ead5d5cf7b77cf3033e805bb0f5296f51b4b
COPY requirements.txt /tmp/
RUN pip install -q --root-user-action=ignore --no-cache-dir -r /tmp/requirements.txt
WORKDIR /work
ENTRYPOINT ["python", "shor.py"]
