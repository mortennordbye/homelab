# grafana

Dashboards Grafana manages through Git Sync. Saving a dashboard in the Grafana UI under the
Homelab folder commits to a new branch and links to open a pull request against the JSON
here; once merged, Grafana pulls it within a minute. Edit the JSON by hand the same way.

Keep each dashboard's `uid` when editing by hand; links like `/d/mns9wmn` depend on it.
Setup and traps:
[docs/platform/observability/README.md](../docs/platform/observability/README.md#git-sync).
