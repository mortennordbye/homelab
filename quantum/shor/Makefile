IMAGE := quafu-shor
RUN := docker run --rm --platform linux/amd64 -v "$(CURDIR):/work"
TOKEN := QUAFU_TOKEN="$$(BWS_ACCESS_TOKEN=$$(bws-token) bws secret get 48a4423f-ad2b-4f13-8cbc-b4fb00b8ca1f --output json | jq -r .value)"

.PHONY: image sim backends hardware
image:
	@docker build -q --platform linux/amd64 -t $(IMAGE) . >/dev/null

sim: image ## Noiseless simulator, writes results/n*-simulator.json
	@$(RUN) $(IMAGE) sim

backends: image ## List the Quafu chips this token can use
	@$(TOKEN) $(RUN) -e QUAFU_TOKEN $(IMAGE) backends

hardware: image ## Run on a real chip: make hardware BACKEND=<name>
	@test -n "$(BACKEND)" || { echo "usage: make hardware BACKEND=<name>"; exit 1; }
	@$(TOKEN) $(RUN) -e QUAFU_TOKEN $(IMAGE) hardware $(BACKEND)
