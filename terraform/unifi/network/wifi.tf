# The controller's Default user group and "All APs" group; the provider has no
# data source for either.
locals {
  default_user_group = "68e6e1cf62bce7649414de8f"
  all_aps            = "68e6e1cf62bce7649414de94"
}

resource "unifi_wlan" "trusted" {
  name          = "Eden-Trusted"
  network_id    = unifi_network.trusted.id
  user_group_id = local.default_user_group
  security      = "wpapsk"
  passphrase    = var.wifi_passphrases["trusted"]

  pmf_mode = "optional"

  ap_group = {
    ids = [local.all_aps]
  }

  wpa = {
    mode = "wpa2"
  }

  wpa3 = {
    support    = true
    transition = true
  }

  wlan_band      = "both"
  wlan_bands     = ["2g", "5g"]
  bss_transition = true
  group_rekey    = 0
  no2ghz_oui     = true
}

# 2.4 GHz only: ESPHome and most IoT radios have no 5 GHz.
resource "unifi_wlan" "iot" {
  name          = "Eden-IoT"
  network_id    = unifi_network.iot.id
  user_group_id = local.default_user_group
  security      = "wpapsk"
  passphrase    = var.wifi_passphrases["iot"]

  pmf_mode = "optional"

  ap_group = {
    ids = [local.all_aps]
  }

  wpa = {
    mode = "wpa2"
  }

  wpa3 = {
    support    = true
    transition = true
  }

  wlan_band      = "2g"
  wlan_bands     = ["2g"]
  bss_transition = true
  group_rekey    = 0
  no2ghz_oui     = false
}

resource "unifi_wlan" "guest" {
  name          = "Eden-Guest"
  network_id    = unifi_network.guest.id
  user_group_id = local.default_user_group
  security      = "wpapsk"
  passphrase    = var.wifi_passphrases["guest"]
  is_guest      = true

  pmf_mode = "optional"

  ap_group = {
    ids = [local.all_aps]
  }

  wpa = {
    mode = "wpa2"
  }

  wpa3 = {
    support    = true
    transition = true
  }

  l2_isolation = true

  wlan_band      = "both"
  wlan_bands     = ["2g", "5g"]
  bss_transition = true
  group_rekey    = 0
  no2ghz_oui     = true
}
