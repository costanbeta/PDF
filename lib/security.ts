export function isSafeUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);

    // Only allow HTTP/HTTPS protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check for local domains / hostnames
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "[::1]" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".test") ||
      hostname.endsWith(".invalid") ||
      hostname.endsWith(".localhost")
    ) {
      return false;
    }

    // Check IPv4 ranges
    const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipv4Match = hostname.match(ipv4Pattern);
    if (ipv4Match) {
      const parts = ipv4Match.slice(1).map(Number);
      if (parts.some((p) => p < 0 || p > 255)) {
        return false;
      }

      // Loopback: 127.0.0.0/8
      if (parts[0] === 127) return false;

      // Class A private: 10.0.0.0/8
      if (parts[0] === 10) return false;

      // Class B private: 172.16.0.0/12
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;

      // Class C private: 192.168.0.0/16
      if (parts[0] === 192 && parts[1] === 168) return false;

      // Link-local: 169.254.0.0/16
      if (parts[0] === 169 && parts[1] === 254) return false;

      // Broadcast/Zero-configuration: 0.0.0.0/8
      if (parts[0] === 0) return false;
    }

    // Check IPv6 addresses (enclosed in brackets)
    if (hostname.startsWith("[") && hostname.endsWith("]")) {
      const ipv6 = hostname.slice(1, -1);

      // Loopback: ::1 or 0:0:0:0:0:0:0:1
      if (ipv6 === "::1" || ipv6 === "0:0:0:0:0:0:0:1") return false;

      // Link-local: fe80::/10
      if (ipv6.startsWith("fe80:")) return false;

      // Unique local address: fc00::/7
      if (ipv6.startsWith("fc") || ipv6.startsWith("fd")) return false;

      // Loopback/Unspecified/Wildcard prefix
      if (ipv6 === "::" || ipv6 === "0:0:0:0:0:0:0:0") return false;
    }

    return true;
  } catch {
    return false;
  }
}
