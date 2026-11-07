# Site-level settings. The provider writes only the sections declared here and
# leaves the rest of the site untouched.
resource "unifi_setting" "site" {
  # 578 is Norway; it decides which Wi-Fi channels and transmit powers are legal.
  country = {
    code = 578
  }

  auto_speedtest = {
    enabled   = true
    cron_expr = "0 15 * * *"
  }

  ntp = {
    setting_preference = "auto"
    ntp_server_1       = "0.ubnt.pool.ntp.org"
    ntp_server_2       = "1.ubnt.pool.ntp.org"
    ntp_server_3       = "2.ubnt.pool.ntp.org"
    ntp_server_4       = "3.ubnt.pool.ntp.org"
  }

  dpi = {
    enabled                = true
    fingerprinting_enabled = true
  }

  # The gateway's touchscreen.
  lcm = {
    enabled      = true
    brightness   = 80
    idle_timeout = 300
    sync         = true
    touch_event  = true
  }

  network_optimization = {
    enabled = true
  }

  doh = {
    state = "off"
  }

  syslog = {
    enabled          = true
    log_all_contents = true
    debug            = false

    this_controller = {
      enabled        = true
      encrypted_only = true
    }

    netconsole = {
      enabled = false
    }
  }

  igmp_snooping = {
    enabled = false
  }

  # SSH is left out on purpose: the provider keeps the live values for any mgmt
  # field not declared, and the SSH credentials do not belong in this repo.
  mgmt = {
    advanced_feature_enabled = true
    debug_tools_enabled      = false
    unifi_idp_enabled        = true
    wifiman_enabled          = true

    auto_upgrade = {
      enabled = true
      hour    = 3
    }
  }

  # The provider does not model ad blocking and DNS filtering, so they stay as
  # set in the console; a partial write leaves them in place.
  ips = {
    ips_mode                                = "ids"
    advanced_filtering_preference           = "manual"
    content_filtering_blocking_page_enabled = true
    honeypot_enabled                        = false
    memory_optimized                        = true
    restrict_torrents                       = false
    enabled_networks = [
      unifi_network.trusted.id,
      unifi_network.iot.id,
      unifi_network.guest.id,
    ]
    enabled_categories = [
      "emerging-activex",
      "emerging-attackresponse",
      "botcc",
      "ciarmy",
      "compromised",
      "emerging-dns",
      "emerging-dos",
      "dshield",
      "emerging-exploit",
      "emerging-ftp",
      "emerging-imap",
      "emerging-malware",
      "emerging-mobile",
      "emerging-netbios",
      "emerging-p2p",
      "emerging-pop3",
      "emerging-rpc",
      "emerging-scan",
      "emerging-shellcode",
      "emerging-smtp",
      "emerging-snmp",
      "emerging-sql",
      "emerging-telnet",
      "emerging-tftp",
      "tor",
      "emerging-useragent",
      "emerging-voip",
      "emerging-webclient",
      "emerging-webserver",
      "emerging-webapps",
      "emerging-worm",
      "emerging-misc",
      "dark-web-blocker-list",
      "malicious-hosts",
    ]
  }

  # The conntrack timeouts are left out: with timeout_setting_preference "auto"
  # the controller computes them, and the provider keeps the live values.
  usg = {
    timeout_setting_preference = "auto"
    mss_clamp                  = "auto"
    broadcast_ping             = false
    syn_cookies                = true
    receive_redirects          = false
    send_redirects             = true
    unbind_wan_monitors        = false

    ftp_module  = true
    gre_module  = true
    h323_module = true
    pptp_module = true
    sip_module  = false
    tftp_module = true

    upnp = {
      enabled         = false
      nat_pmp_enabled = false
      secure_mode     = false
      wan_interface   = "WAN"
    }

    offload = {
      accounting  = true
      l2_blocking = true
      sch         = true
    }

    dns_verification = {
      setting_preference   = "auto"
      domain               = "ui.com"
      primary_dns_server   = "1.1.1.1"
      secondary_dns_server = "8.8.8.8"
    }
  }
}
