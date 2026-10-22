# pyquafu ships Linux wheels for x86_64 only; build with --platform linux/amd64.
FROM python:3.15-slim@sha256:044d5bd747976e21f8bc4d746c3479b19a84bb8ae6261b802acdd26b29036c93
COPY requirements.txt /tmp/
RUN pip install -q --root-user-action=ignore --no-cache-dir -r /tmp/requirements.txt
WORKDIR /work
ENTRYPOINT ["python", "shor.py"]
