IMAGE := quafu-shor
RUN := docker run --rm --platform linux/amd64 -v "$(CURDIR):/work"
TOKEN := QUAFU_TOKEN="$$(security find-generic-password -s quafu -w)"

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
