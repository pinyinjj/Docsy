# 使用 Termux 在 Android 运行 Python 源码

## 1. Termux 安装和配置

### 安装 Termux

**方法一：通过应用商店**
1. 从 F-Droid 或 Google Play 安装 Termux
2. 打开 Termux 应用

**方法二：通过 ADB 安装 APK**
```bash
# 下载 Termux APK 文件
# 从 https://f-droid.org/packages/com.termux/ 下载最新版本

# 通过 ADB 安装
adb install termux.apk

# 或者强制安装（覆盖现有版本）
adb install -r termux.apk

# 检查安装是否成功
adb shell pm list packages | grep termux
```



### ADB 连接与 scrcpy 远程桌面

**USB 连接（推荐）**
```bash
# 1. 使用 USB 线连接设备
# 2. 在设备上启用 USB 调试
# 3. 检查连接
adb devices

# 如果显示设备，说明连接成功
# 运行scrcpy打开安卓桌面
scrcpy
```

**无线 ADB 连接**

```bash
# 1. 确保两个设备在同一网段下，通过 USB 连接并启用无线调试
adb tcpip 5555

adb connect 192.168.0.132:5555

# 4. 检查连接
adb devices

# 运行scrcpy打开安卓桌面
scrcpy
```

在termux上使用清华源加速安装依赖
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt


### 基础环境配置

#### 1. 更新包管理器
```bash
# 更新包列表和系统
pkg update && pkg upgrade

# 清理缓存
pkg clean
```

#### 2. 一键安装所有依赖
```bash
# 安装核心依赖（纯 Python 项目，无需编译工具）
pkg install -y python python-pip git curl wget openssh iproute2 net-tools htop procps rsync tree neofetch android-tools rust clang make pkg-config

```

## 4. 项目部署

### 克隆项目
```bash
# 在 Termux 中
git clone https://github.com/pinyinjj/LLM-Airsim.git
cd LLM-Airsim
```

### 安装依赖
```bash
# 安装 Python 依赖
pip install -r requirements.txt
```

### 运行项目
```bash
# 后台运行
nohup python start_backend.py > drone.log 2>&1 &

# 检查运行状态
ps aux | grep python
curl http://localhost:8000/health
```

## 5. 网络访问配置

### 获取可访问地址
```bash
# 查看所有网络接口
ip addr show

# 获取局域网 IP
hostname -I
```

### 防火墙配置（如果需要）
```bash
# Termux 通常不需要额外防火墙配置
# 但可以检查端口监听
netstat -tlnp | grep 8000
```

## 6. 常用管理命令

### 服务管理
```bash
# 查看运行中的 Python 进程
ps aux | grep python

# 停止服务
pkill -f "python start_backend.py"

# 重启服务
nohup python start_backend.py > drone.log 2>&1 &
```

### 日志查看
```bash
# 查看应用日志
tail -f drone.log

# 查看系统日志
logcat | grep -i python
```

### 文件传输
```bash
# 通过 ADB 传输文件
adb push local_file.txt /data/data/com.termux/files/home/

# 从设备拉取文件
adb pull /data/data/com.termux/files/home/drone.log ./
```

## 7. SSH 连接故障排除

### 常见 SSH 连接问题

**问题1：Connection refused**
```bash
# 检查 ADB 连接
adb devices

# 检查 Termux 是否运行
adb shell pm list packages | grep termux

# 重启 Termux
adb shell am force-stop com.termux
adb shell am start -n com.termux/.HomeActivity
```

**问题2：Connection closed**
```bash
# 在 Termux 中检查 SSH 服务
adb shell run-as com.termux /data/data/com.termux/files/usr/bin/bash -c "ps aux | grep sshd"

# 重新启动 SSH
adb shell run-as com.termux /data/data/com.termux/files/usr/bin/bash -c "pkill sshd && sshd"
```

**问题3：Permission denied**
```bash
# 重新设置密码
adb shell run-as com.termux /data/data/com.termux/files/usr/bin/bash -c "passwd"

# 检查 SSH 配置
adb shell run-as com.termux /data/data/com.termux/files/usr/bin/bash -c "ls -la ~/.ssh/"
```

**问题4：端口转发失败**
```bash
# 清除现有端口转发
adb forward --remove tcp:8022

# 重新设置端口转发
adb forward tcp:8022 tcp:22

# 检查端口转发状态
adb forward --list
```

### 完整 SSH 重置流程
```bash
# 1. 停止所有相关服务
adb shell am force-stop com.termux
adb kill-server
adb start-server

# 2. 重启 Termux
adb shell am start -n com.termux/.HomeActivity
sleep 3

# 3. 重新配置 SSH
adb shell run-as com.termux /data/data/com.termux/files/usr/bin/bash -c "pkg install -y openssh"
adb shell run-as com.termux /data/data/com.termux/files/usr/bin/bash -c "echo '123456' | passwd"
adb shell run-as com.termux /data/data/com.termux/files/usr/bin/bash -c "sshd"

# 4. 设置端口转发
adb forward tcp:8022 tcp:22

# 5. 测试连接
ssh -p 8022 localhost
```

## 8. 其他故障排除

### 端口访问问题
```bash
# 检查端口监听
netstat -tlnp | grep 8000

# 检查防火墙
iptables -L
```

### Python 依赖问题
```bash
# 重新安装依赖
pip install --upgrade -r requirements.txt

# 检查 Python 版本
python --version
```

## 8. 高级配置

### 自动启动脚本
```bash
# 创建启动脚本
cat > ~/start_drone.sh << 'EOF'
#!/bin/bash
cd /data/data/com.termux/files/home/LLM-Airsim
nohup python start_backend.py > drone.log 2>&1 &
EOF

chmod +x ~/start_drone.sh
```

### 系统服务（如果支持）
```bash
# 安装 termux-services
pkg install termux-services

# 创建服务配置
mkdir -p ~/.termux/services
cat > ~/.termux/services/drone-backend << 'EOF'
#!/bin/bash
cd /data/data/com.termux/files/home/LLM-Airsim
python start_backend.py
EOF

chmod +x ~/.termux/services/drone-backend
```

## 9. 安全注意事项

### SSH 安全配置
```bash
# 修改 SSH 配置
nano ~/.ssh/config

# 添加以下内容：
Host *
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
```

### 网络安全
- 使用强密码
- 考虑使用密钥认证
- 限制网络访问范围

## 10. 性能优化

### 内存管理
```bash
# 监控内存使用
free -h

# 清理缓存
sync && echo 3 > /proc/sys/vm/drop_caches
```

### 进程管理
```bash
# 设置进程优先级
nice -n 10 python start_backend.py

# 监控 CPU 使用
top -p $(pgrep python)
```

---

## 快速开始命令

### 1. 获取项目代码

**方法一：Git Clone（公开仓库）**
```bash
# 克隆 Termux 分支
git clone -b Termux https://github.com/pinyinjj/LLM-Airsim.git
cd LLM-Airsim

```

**方法二：文件传输（私有仓库推荐）**
```bash
# 在电脑上执行，复制项目到 Termux
adb -s 192.168.0.132:5555 push /home/yj/Documents/GitHub/LLM-Airsim /data/data/com.termux/files/home/LLM-Airsim

# 排除虚拟环境目录
rsync -avz --exclude='.venv' --exclude='.git' --exclude='__pycache__' /home/yj/Documents/GitHub/LLM-Airsim/ 192.168.0.132:/data/data/com.termux/files/home/LLM-Airsim/
```

### 2. 在 Termux 中执行
```bash
# 更新系统
pkg update && pkg upgrade

# 安装核心依赖
pkg install -y python3.12 python-pip git curl wget openssh iproute2 net-tools htop procps rsync tree neofetch

# 设置 SSH 密码
passwd
# 输入密码（例如：123456）

# 启动 SSH 服务
sshd
```

### 3. 在电脑上执行
```bash
# 设置端口转发
adb forward tcp:8022 tcp:22

# 连接 SSH
ssh -p 8022 localhost
# 输入密码：123456
```

### 4. 在 Termux SSH 中部署项目
```bash
# 克隆项目（如果还没克隆）
git clone -b Termux https://github.com/pinyinjj/LLM-Airsim.git
cd LLM-Airsim

# 安装 Python 依赖
pip install -r requirements.txt

# 启动服务
nohup python start_backend.py > drone.log 2>&1 &
```

## 11. 一键部署脚本

### 完整自动化部署
```bash
# 创建一键部署脚本
cat > deploy_to_termux.sh << 'EOF'
#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== LLM-Airsim Termux 一键部署脚本 ===${NC}"

# 检查 ADB 连接
echo -e "${YELLOW}检查 ADB 连接...${NC}"
if ! adb devices | grep -q "device$"; then
    echo -e "${RED}错误: 未检测到 Android 设备${NC}"
    echo "请确保:"
    echo "1. 设备已连接 USB"
    echo "2. 已启用 USB 调试"
    echo "3. 已授权调试权限"
    exit 1
fi
echo -e "${GREEN}✓ ADB 连接正常${NC}"

# 安装 Termux（如果需要）
echo -e "${YELLOW}检查 Termux 安装...${NC}"
if ! adb shell pm list packages | grep -q "com.termux"; then
    echo -e "${YELLOW}安装 Termux...${NC}"
    if [ ! -f "termux.apk" ]; then
        echo "下载 Termux APK..."
        curl -L -o termux.apk "https://f-droid.org/repo/com.termux_118.apk"
    fi
    adb install -r termux.apk
    echo -e "${GREEN}✓ Termux 安装完成${NC}"
else
    echo -e "${GREEN}✓ Termux 已安装${NC}"
fi

# 启动 Termux
echo -e "${YELLOW}启动 Termux...${NC}"
adb shell am start -n com.termux/.HomeActivity
sleep 3

# 设置端口转发
echo -e "${YELLOW}设置端口转发...${NC}"
adb forward tcp:8022 tcp:22
adb forward tcp:8000 tcp:8000
echo -e "${GREEN}✓ 端口转发设置完成${NC}"

# 在 Termux 中执行部署命令
echo -e "${YELLOW}在 Termux 中部署项目...${NC}"
adb shell << 'TERMUX_EOF'
# 更新包管理器
pkg update -y && pkg upgrade -y

# 安装必要工具
pkg install -y python python-pip git openssh curl wget

# 设置 SSH 密码（默认密码：termux123）
echo "termux123" | passwd

# 启动 SSH 服务
sshd

# 克隆项目（替换为你的仓库地址）
if [ ! -d "LLM-Airsim" ]; then
    git clone https://github.com/pinyinjj/LLM-Airsim.git
fi

cd LLM-Airsim

# 安装 Python 依赖
pip install -r requirements.txt

# 后台运行服务
nohup python start_backend.py > drone.log 2>&1 &

echo "部署完成！"
echo "SSH 连接: ssh -p 8022 localhost"
echo "API 访问: http://localhost:8000"
TERMUX_EOF

echo -e "${GREEN}=== 部署完成 ===${NC}"
echo -e "${GREEN}SSH 连接命令: ssh -p 8022 localhost${NC}"
echo -e "${GREEN}API 访问地址: http://localhost:8000${NC}"
echo -e "${GREEN}API 文档地址: http://localhost:8000/api/v1/docs${NC}"
echo ""
echo -e "${YELLOW}默认 SSH 密码: termux123${NC}"
echo -e "${YELLOW}建议首次连接后修改密码${NC}"
EOF

chmod +x deploy_to_termux.sh
./deploy_to_termux.sh
```

### 使用说明
```bash
# 1. 运行一键部署脚本
./deploy_to_termux.sh

# 2. 连接 SSH（密码: termux123）
ssh -p 8022 localhost

# 3. 检查服务状态
curl http://localhost:8000/health

# 4. 查看 API 文档
# 在浏览器中访问: http://localhost:8000/api/v1/docs
```
