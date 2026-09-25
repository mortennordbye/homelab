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
  ap_group_ids  = [local.all_aps]
  security      = "wpapsk"
  passphrase    = var.wifi_passphrases["trusted"]

  wpa_mode        = "wpa2"
  wpa3_support    = true
  wpa3_transition = true
  pmf_mode        = "optional"

  wlan_band      = "both"
  wlan_bands     = ["2g", "5g"]
  bss_transition = true
  group_rekey    = 0
  no2ghz_oui     = true

  # Unset, the provider plans this as unknown on every run and re-pushes the
  # SSID, dropping every client. It must stay declared.
  bandsteering_mode = "off"
}

# 2.4 GHz only: ESPHome and most IoT radios have no 5 GHz.
resource "unifi_wlan" "iot" {
  name          = "Eden-IoT"
  network_id    = unifi_network.iot.id
  user_group_id = local.default_user_group
  ap_group_ids  = [local.all_aps]
  security      = "wpapsk"
  passphrase    = var.wifi_passphrases["iot"]

  wpa_mode        = "wpa2"
  wpa3_support    = true
  wpa3_transition = true
  pmf_mode        = "optional"

  wlan_band      = "2g"
  wlan_bands     = ["2g"]
  bss_transition = true
  group_rekey    = 0
  no2ghz_oui     = false

  # Unset, the provider plans this as unknown on every run and re-pushes the
  # SSID, dropping every client. It must stay declared.
  bandsteering_mode = "off"
}

resource "unifi_wlan" "guest" {
  name          = "Eden-Guest"
  network_id    = unifi_network.guest.id
  user_group_id = local.default_user_group
  ap_group_ids  = [local.all_aps]
  security      = "wpapsk"
  passphrase    = var.wifi_passphrases["guest"]
  is_guest      = true

  wpa_mode        = "wpa2"
  wpa3_support    = true
  wpa3_transition = true
  pmf_mode        = "optional"

  l2_isolation = true

  wlan_band      = "both"
  wlan_bands     = ["2g", "5g"]
  bss_transition = true
  group_rekey    = 0
  no2ghz_oui     = true

  # Unset, the provider plans this as unknown on every run and re-pushes the
  # SSID, dropping every client. It must stay declared.
  bandsteering_mode = "off"
}
