---
title: "无人机空地局域网通信的纵深防御体系"
date: 2026-05-25
summary: "针对无人机空地局域网通信环境，设计涵盖传输层、应用层与物理层的纵深安全防护体系，包括证书锁定、HMAC 签名及 VPN 隧道方案。"
tags: ["通信", "后端", "QGroundControl", "C++"]
categories: ["技术文档"]
weight: 20
draft: true
---

针对无人机系统在复杂电磁环境与私有网段下的通信需求，本规范设计了一套完整的纵深防御体系，确保指令与点云数据在传输过程中的完整性与机密性。

## 1. 传输层安全 (TLS)

考虑到无人机空地通信通常处于局域网或私有 IP 网段，无法向公开 CA 机构申请合法证书，本系统设计了基于局域网自签名根 CA 的 `Certificate Pinning` (证书锁定) 方案。

```cpp
// 伪代码：在 C++ 网络层加载自签名证书并强制锁定信任链
QFile certFile(":/security/certs/uav_lan_root_ca.crt");
if (certFile.open(QIODevice::ReadOnly)) {
    QSslCertificate caCert(&certFile, QSsl::Pem);
    QSslConfiguration sslConfig = QSslConfiguration::defaultConfiguration();
    
    QList<QSslCertificate> caList;
    caList.append(caCert);
    sslConfig.setCaCertificates(caList);
    
    // 强制开启局域网下的强加密协议
    sslConfig.setProtocol(QSsl::TlsV1_3);
    QSslConfiguration::setDefaultConfiguration(sslConfig);
}
```

## 2. 应用层安全鉴权

对于接口访问，系统全面引入了 `JWT` (JSON Web Token) 鉴权。更进一步，为防止拦截篡改，请求中融合了预共享密钥 (PSK) 并采用了 `HMAC-SHA256` 接口请求签名校验。

在包头中夹带的 `serverTimestamp` 会在 C++ 拦截层进行时序过滤，若时间戳迟滞超过容忍度即被判定为重放攻击 (Anti-Replay) 并直接丢弃，极大增强了数据管道的防注入能力。

## 3. 网络层与物理层安全

在公开频段的高危环境下，依靠单一的应用层鉴权是不够的。系统支持在底层部署 mTLS (双向 TLS 认证) 与 WireGuard VPN 加密隧道。利用 WireGuard 轻量级的 UDP 握手特性，可以在恶劣链路下为无人机空地通信提供无缝漫游的物理层安全屏障。

---

## 参考文档

- [RFC 7519 - JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519)
- [WireGuard: Fast, Modern, Secure VPN Tunnel](https://www.wireguard.com/)
- [Qt Network Security Programming](https://doc.qt.io/qt-6/qtnetwork-index.html#security-and-encryption)
