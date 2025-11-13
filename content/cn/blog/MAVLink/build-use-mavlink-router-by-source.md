sudo apt update
sudo apt install mavlink-router

# 或者从源码编译
git clone https://github.com/mavlink-router/mavlink-router.git
cd mavlink-router
git submodule update --init --recursive
$ sudo apt install git meson ninja-build pkg-config gcc g++ systemd

meson setup build . && ninja -C build
如果提示meson版本问题，使用pip3 install meson==0.55,再执行上述命令
sudo ninja -C build install

https://github.com/mavlink-router/mavlink-router