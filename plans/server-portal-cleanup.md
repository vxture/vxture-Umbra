# Production Server: umbra-portal Cleanup Plan

## Background

代码中已完全移除 `umbra-portal` 容器，但服务器上仍有残留：
1. 旧 `umbra-portal` Docker 容器（可能已停止或仍在运行）
2. `DATA_DIR/portal/html/` 目录下的静态页面文件
3. 旧的 rendered nginx vhost 配置（`DATA_DIR/nginx/conf.d/03-vpn-portal.conf`）—— 仍指向 `proxy_pass http://umbra-portal:80`
4. 旧的 `umbra-portal` Docker 镜像（如果是本地构建的）

---

## Local Simulation（在本地先模拟验证）

### 目标

在本地构建一个"模拟生产环境"的 `DATA_DIR`，注入旧版残留物，然后运行完整部署流程，验证：
1. `04-render-configuration-templates.py` 正确重新渲染配置、自动删除旧配置
2. `docker compose up -d` 不会尝试启动 `umbra-portal`
3. 最终 nginx 配置中 **零引用** `umbra-portal`

### 前置条件

本地需要能运行 Docker + Docker Compose（与生产环境一致）。

### 模拟步骤

```bash
# 切换到项目根目录
cd d:/MyWebSite/vxturestudio/umbra

# ── 0. 创建本地模拟用的 .env ──
# 如果还没有，从 .env.example 复制
cp .env.example .env.local

# ── 1. 构建模拟 DATA_DIR ──
set DATA_DIR_LOCAL=d:/umbra-sim/data/umbra
set REPO_DIR_LOCAL=d:/MyWebSite/vxturestudio/umbra

# 创建模拟的旧 portal 静态文件残留
mkdir %DATA_DIR_LOCAL%\portal\html
echo "<html><body>OLD PORTAL</body></html>" > %DATA_DIR_LOCAL%\portal\html\index.html

# 创建模拟的旧 nginx vhost 配置（指向旧的 umbra-portal:80）
mkdir %DATA_DIR_LOCAL%\nginx\conf.d
(
echo # THIS IS A STALE CONFIG -- should be removed by render script
echo server {
echo     listen 8443 ssl proxy_protocol;
echo     server_name vpn.ruyin.ai;
echo     location / {
echo         proxy_pass http://umbra-portal:80/;
echo     }
echo }
) > %DATA_DIR_LOCAL%\nginx\conf.d\03-vpn-portal.conf

# 创建 render 脚本需要的其他目录
mkdir %DATA_DIR_LOCAL%\nginx\stream.d
mkdir %DATA_DIR_LOCAL%\nginx\private
mkdir %DATA_DIR_LOCAL%\nginx\snippets
mkdir %DATA_DIR_LOCAL%\marzban\templates\clash
mkdir %DATA_DIR_LOCAL%\marzban\templates\v2ray
mkdir %DATA_DIR_LOCAL%\marzban\log
mkdir %DATA_DIR_LOCAL%\account
mkdir %DATA_DIR_LOCAL%\vaultwarden\data
mkdir %DATA_DIR_LOCAL%\letsencrypt
mkdir %DATA_DIR_LOCAL%\certbot\www\.well-known\acme-challenge
mkdir %DATA_DIR_LOCAL%\certbot\config
mkdir %DATA_DIR_LOCAL%\certbot\hooks
mkdir %DATA_DIR_LOCAL%\private

# ── 2. 创建假的 reality.json ──
(
echo {
echo     "private_key": "MOCK-private-key-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
echo     "public_key": "MOCK-public-key-BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
echo     "short_ids": ["abcdef01"]
echo }
) > %DATA_DIR_LOCAL%\private\reality.json

# ── 3. 运行渲染脚本 ──
python scripts/deploy/04-render-configuration-templates.py

# ── 4. 验证旧 vhost 配置被自动删除 ──
if not exist "%DATA_DIR_LOCAL%\nginx\conf.d\03-vpn-portal.conf" (
    echo "[PASS] Stale vhost config was auto-removed by render script"
) else (
    echo "[FAIL] Stale vhost config still exists!"
    type "%DATA_DIR_LOCAL%\nginx\conf.d\03-vpn-portal.conf"
)

# ── 5. 验证新 vhost 配置指向 umbra-website ──
findstr "umbra-website" "%DATA_DIR_LOCAL%\nginx\conf.d\03-vpn-portal.conf" >nul
if %errorlevel%==0 (
    echo "[PASS] New vhost config proxies to umbra-website"
) else (
    echo "[FAIL] New vhost config NOT pointing to umbra-website"
    type "%DATA_DIR_LOCAL%\nginx\conf.d\03-vpn-portal.conf"
)

# ── 6. 零容忍扫描 ──
findstr "umbra-portal" "%DATA_DIR_LOCAL%\nginx\conf.d\03-vpn-portal.conf" >nul
if %errorlevel%==1 (
    echo "[PASS] Zero umbra-portal references in rendered config"
) else (
    echo "[FAIL] umbra-portal still found in rendered config!"
)

# ── 7. 运行脚本合约检查 ──
python scripts/deploy/08-check-script-contracts.py

# ── 8. 清空模拟环境 ──
rmdir /s /q %DATA_DIR_LOCAL%
del .env.local
```

### 预期结果

| 检查项 | 预期 |
|--------|------|
| 旧 `03-vpn-portal.conf` | 自动删除（render 脚本第 204-207 行） |
| 新 `03-vpn-portal.conf` | `proxy_pass http://umbra-website:3210/` |
| 零容忍 `umbra-portal` 扫描 | 0 匹配 |
| 脚本合约检查 | 全部 PASS |


---

## Step 1: Pre-deployment Cleanup（部署前执行）

在生产服务器上，**先于** `bash scripts/deploy.sh all` 执行。

```bash
# 1.1 停止所有容器（保留数据）
cd /srv/vxture/repo/umbra
docker compose down

# 1.2 强制移除 umbra-portal 容器（防止 orphan 残留）
docker rm -f umbra-portal 2>/dev/null && echo "Removed umbra-portal container" || echo "umbra-portal container not found"

# 1.3 清理 portal 静态文件目录
rm -rf /srv/vxture/data/umbra/portal
echo "Removed DATA_DIR/portal/"

# 1.4 可选：清理旧镜像（如果是本地构建的）
docker rmi umbra-portal 2>/dev/null && echo "Removed umbra-portal image" || echo "umbra-portal image not found"
```

**说明**：
- `docker compose down` 会停止当前 Compose 管理的所有容器，但不会移除 Compose YAML 中不再定义的服务（orphan）。
- `docker rm -f umbra-portal` 确保旧容器被彻底删除。
- `rm -rf $DATA_DIR/portal/` 删除遗留的静态 HTML 文件。

---

## Step 2: Deploy New Code（拉取新代码并部署）

```bash
# 2.1 拉取最新代码（已包含所有 portal 清理）
git pull

# 2.2 完整部署（渲染配置 → 构建 → 启动 → 验证）
bash scripts/deploy.sh all
```

部署脚本会自动处理：
- `04-render-configuration-templates.py` → 生成新的 `03-vpn-portal.conf`，`/` 指向 `umbra-website:3210`
- `docker compose up -d --build` → 启动所有服务，`umbra-portal` 不在 YAML 中所以不会启动
- nginx reload → 加载新配置

---

## Step 3: Post-deployment Verification（部署后验证）

```bash
# 3.1 确认无 umbra-portal 容器残留
docker ps -a --format '{{.Names}}' | grep -q umbra-portal && echo "STILL EXISTS!" || echo "umbra-portal container: CLEAN"

# 3.2 确认无 portal 目录残留
ls /srv/vxture/data/umbra/portal 2>/dev/null && echo "STILL EXISTS!" || echo "portal directory: CLEAN"

# 3.3 验证 VPN 边缘域名正确路由
curl -skI https://vpn.ruyin.ai | head -5
# 期望: HTTP/2 200, Server: nginx

# 3.4 验证 /guide/ 跳转到 /
curl -sk -o /dev/null -w "%{redirect_url}" https://vpn.ruyin.ai/guide/
# 期望: https://vpn.ruyin.ai/

# 3.5 确认 nginx vhost 配置已更新
grep 'umbra-website' /srv/vxture/data/umbra/nginx/conf.d/03-vpn-portal.conf
# 期望: proxy_pass http://umbra-website:3210/;
```

---

## Rollback Plan（回退方案）

如果新网站路由有问题，快速回退到指向旧 portal：

```bash
# 1. 恢复旧配置
sed -i 's|proxy_pass http://umbra-website:3210/|proxy_pass http://umbra-portal:80/|' \
  /srv/vxture/data/umbra/nginx/conf.d/03-vpn-portal.conf

# 2. 从旧代码启动 portal 容器（如果镜像还在）
docker run -d --name umbra-portal --network umbra-net \
  -v /srv/vxture/data/umbra/portal/html:/usr/share/nginx/html:ro \
  nginx:alpine

# 3. 重载 nginx
docker exec umbra-nginx nginx -s reload
```

---

## Summary (One-liner)

在执行 `git pull && bash scripts/deploy.sh all` **之前**，先运行：

```bash
docker compose down && docker rm -f umbra-portal 2>/dev/null; rm -rf /srv/vxture/data/umbra/portal
```
