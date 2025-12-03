#!/usr/bin/env python3
"""
测试脚本：使用offboard模式测试起飞、悬停、降落
使用方法: python tests/test_mavsdk_takeoff.py
"""

import asyncio
import sys
from pathlib import Path
from typing import Optional, Tuple

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from mavsdk import System
from mavsdk.offboard import PositionNedYaw
from app.utils.color_utils import colors

# 常量
CONNECTION_ADDRESS = "udpin://0.0.0.0:23333"
TAKEOFF_ALTITUDE_M = 1.0
HOVER_DURATION_S = 5.0
OFFBOARD_SETPOINT_RATE_HZ = 40


async def get_position_ned(drone: System, timeout: float = 2.0) -> Optional[tuple]:
    """获取NED位置"""
    try:
        pv = await asyncio.wait_for(drone.telemetry.position_velocity_ned().__anext__(), timeout=timeout)
        p = pv.position
        return (p.north_m, p.east_m, p.down_m)
    except Exception:
        return None


async def send_setpoints(drone: System, n: float, e: float, d: float, yaw: float, stop: asyncio.Event):
    """持续发送offboard设定值"""
    interval = 1.0 / OFFBOARD_SETPOINT_RATE_HZ
    try:
        while not stop.is_set():
            await drone.offboard.set_position_ned(PositionNedYaw(n, e, d, yaw))
            await asyncio.sleep(interval)
    except Exception:
        pass


async def stop_task(task: Optional[asyncio.Task], event: Optional[asyncio.Event]):
    """停止设定值任务"""
    if event:
        event.set()
    if task:
        try:
            await asyncio.wait_for(task, timeout=1.0)
        except (asyncio.TimeoutError, Exception):
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass


async def print_position(drone: System, stop_event: asyncio.Event):
    """持续打印位置信息"""
    last_time = 0
    interval = 0.5
    
    try:
        while not stop_event.is_set():
            try:
                current_time = asyncio.get_event_loop().time()
                if current_time - last_time >= interval:
                    stream = drone.telemetry.position_velocity_ned()
                    pv = await asyncio.wait_for(stream.__anext__(), timeout=0.5)
                    pos = pv.position
                    vel = pv.velocity
                    print(colors.info(
                        f"位置: N={pos.north_m:.2f}m E={pos.east_m:.2f}m D={pos.down_m:.2f}m | "
                        f"速度: Vx={vel.north_m_s:.2f} Vy={vel.east_m_s:.2f} Vz={vel.down_m_s:.2f} m/s"
                    ))
                    last_time = current_time
                await asyncio.sleep(0.05)
            except (asyncio.TimeoutError, StopAsyncIteration):
                await asyncio.sleep(0.05)
            except Exception:
                await asyncio.sleep(0.05)
    except Exception:
        pass


async def connect_drone(drone: System, address: str, timeout: float = 10.0) -> bool:
    """连接飞控"""
    print(colors.info("=" * 60))
    print(colors.info("步骤 1: 连接飞控"))
    print(colors.info("=" * 60))
    
    try:
        await drone.connect(system_address=address)
        async for state in drone.core.connection_state():
            if state.is_connected:
                print(colors.success("✓ 连接成功！"))
                return True
    except Exception as e:
        print(colors.error(f"连接失败: {e}"))
        return False
    return False


async def arm_drone(drone: System, timeout: float = 10.0) -> Tuple[bool, Optional[tuple]]:
    """解锁无人机并记录地面位置"""
    print(colors.info("\n" + "=" * 60))
    print(colors.info("步骤 2: 解锁无人机"))
    print(colors.info("=" * 60))
    
    try:
        await drone.action.arm()
        
        start = asyncio.get_event_loop().time()
        async for armed in drone.telemetry.armed():
            if armed:
                print(colors.success("✓ 解锁成功！"))
                break
            if asyncio.get_event_loop().time() - start > timeout:
                print(colors.error("解锁超时"))
                return (False, None)
            await asyncio.sleep(0.1)
        
        # 记录地面高度
        ground_pos = await get_position_ned(drone, timeout=2.0)
        if ground_pos:
            ground_n, ground_e, ground_d = ground_pos
            print(colors.info(f"地面高度: N={ground_n:.2f}m E={ground_e:.2f}m D={ground_d:.2f}m"))
            return (True, ground_pos)
        else:
            print(colors.error("无法获取地面位置"))
            return (False, None)
    except Exception as e:
        print(colors.error(f"解锁失败: {e}"))
        return (False, None)


async def takeoff_to_altitude(
    drone: System, 
    altitude: float, 
    ground_down: float, 
    timeout: float = 30.0
) -> Tuple[bool, Optional[asyncio.Task], Optional[asyncio.Event], float, float, float]:
    """起飞到指定高度（offboard模式）"""
    print(colors.info("=" * 60))
    print(colors.info(f"步骤 3: 起飞到 {altitude} 米"))
    print(colors.info("=" * 60))
    
    pos = await get_position_ned(drone, timeout=3.0)
    if not pos:
        print(colors.error("无法获取当前位置"))
        return (False, None, None, 0.0, 0.0, 0.0)
    
    n, e, d = pos
    target_d = ground_down - altitude
    
    print(colors.info(f"起飞: 当前位置 D={d:.2f}m, 目标 D={target_d:.2f}m (高度={altitude:.2f}m)"))
    
    stop = asyncio.Event()
    task = None
    
    try:
        await drone.offboard.set_position_ned(PositionNedYaw(n, e, target_d, 0.0))
        await drone.offboard.start()
        print(colors.success("✓ offboard模式已启动"))
        
        task = asyncio.create_task(send_setpoints(drone, n, e, target_d, 0.0, stop))
        
        start = asyncio.get_event_loop().time()
        last_report = 0.0
        
        while True:
            elapsed = asyncio.get_event_loop().time() - start
            if elapsed > timeout:
                print(colors.error(f"起飞超时（{timeout}秒）"))
                await stop_task(task, stop)
                return (False, None, None, 0.0, 0.0, 0.0)
            
            pos_now = await get_position_ned(drone, timeout=0.5)
            if pos_now and abs(pos_now[2] - target_d) < 0.2:
                # 到达目标高度后，立即更新水平位置设定值为当前位置
                await stop_task(task, stop)
                stable_n, stable_e, _ = pos_now
                stop = asyncio.Event()
                task = asyncio.create_task(send_setpoints(drone, stable_n, stable_e, target_d, 0.0, stop))
                
                # 等待1秒让飞机稳定
                await asyncio.sleep(1.0)
                pos_stable = await get_position_ned(drone, timeout=1.0)
                if pos_stable:
                    print(colors.success(f"✓ 已到达目标高度！D={pos_stable[2]:.2f}m"))
                    return (True, task, stop, pos_stable[0], pos_stable[1], pos_stable[2])
                else:
                    print(colors.success(f"✓ 已到达目标高度！D={pos_now[2]:.2f}m"))
                    return (True, task, stop, stable_n, stable_e, target_d)
            
            if elapsed - last_report >= 2.0:
                if pos_now:
                    print(colors.info(f"等待中... 当前D={pos_now[2]:.2f}m, 目标D={target_d:.2f}m, 已等待{elapsed:.1f}秒"))
                last_report = elapsed
            
            await asyncio.sleep(0.2)
    except Exception as e:
        print(colors.error(f"起飞失败: {e}"))
        await stop_task(task, stop)
        return (False, None, None, 0.0, 0.0, 0.0)


async def hover_at_position(
    drone: System,
    hover_n: float,
    hover_e: float,
    hover_d: float,
    duration: float,
    setpoint_task: Optional[asyncio.Task],
    setpoint_stop: Optional[asyncio.Event]
) -> Tuple[Optional[asyncio.Task], Optional[asyncio.Event]]:
    """在指定位置悬停"""
    print(colors.info("\n" + "=" * 60))
    print(colors.info(f"步骤 4: 悬停 {duration} 秒"))
    print(colors.info("=" * 60))
    
    print(colors.info(f"悬停位置: N={hover_n:.2f}m E={hover_e:.2f}m D={hover_d:.2f}m"))
    
    # 停止旧的设定值任务
    await stop_task(setpoint_task, setpoint_stop)
    
    # 创建新的悬停任务
    setpoint_stop = asyncio.Event()
    setpoint_task = asyncio.create_task(send_setpoints(drone, hover_n, hover_e, hover_d, 0.0, setpoint_stop))
    
    await asyncio.sleep(duration)
    print(colors.success(f"✓ 悬停完成"))
    
    return (setpoint_task, setpoint_stop)


async def get_position_velocity_ned(drone: System, timeout: float = 2.0) -> Optional[tuple]:
    """获取NED位置和速度"""
    try:
        pv = await asyncio.wait_for(drone.telemetry.position_velocity_ned().__anext__(), timeout=timeout)
        p = pv.position
        v = pv.velocity
        return (p.north_m, p.east_m, p.down_m, v.north_m_s, v.east_m_s, v.down_m_s)
    except Exception:
        return None


async def land_to_position(
    drone: System,
    ground_n: float,
    ground_e: float,
    ground_d: float,
    setpoint_task: Optional[asyncio.Task],
    setpoint_stop: Optional[asyncio.Event],
    timeout: float = 30.0
) -> bool:
    """降落到指定位置（offboard模式）"""
    print(colors.info("\n" + "=" * 60))
    print(colors.info("步骤 5: 降落"))
    print(colors.info("=" * 60))
    
    # 停止之前的设定值任务
    await stop_task(setpoint_task, setpoint_stop)
    
    # 创建降落设定值任务
    landing_stop = asyncio.Event()
    landing_task = asyncio.create_task(send_setpoints(drone, ground_n, ground_e, ground_d, 0.0, landing_stop))
    
    print(colors.info(f"目标位置: N={ground_n:.2f}m E={ground_e:.2f}m D={ground_d:.2f}m（回到地面）"))
    print(colors.info("等待降落..."))
    
    # 降落判断参数
    POSITION_TOLERANCE_M = 0.15  # 位置容差（米）
    VELOCITY_TOLERANCE_M_S = 0.15  # 速度容差（米/秒）
    STABLE_DURATION_S = 2.0  # 稳定持续时间（秒）
    
    start = asyncio.get_event_loop().time()
    stable_start = None
    last_report = 0.0
    
    while True:
        elapsed = asyncio.get_event_loop().time() - start
        if elapsed > timeout:
            print(colors.warning(f"降落超时（{timeout}秒），强制停止"))
            break
        
        pv_data = await get_position_velocity_ned(drone, timeout=0.5)
        if pv_data:
            n, e, d, vn, ve, vd = pv_data
            
            # 计算位置和速度误差
            pos_error = ((n - ground_n)**2 + (e - ground_e)**2 + (d - ground_d)**2)**0.5
            vel_magnitude = (vn**2 + ve**2 + vd**2)**0.5
            
            # 检查是否到达地面（位置接近且速度接近0）
            if pos_error < POSITION_TOLERANCE_M and vel_magnitude < VELOCITY_TOLERANCE_M_S:
                if stable_start is None:
                    stable_start = asyncio.get_event_loop().time()
                elif asyncio.get_event_loop().time() - stable_start >= STABLE_DURATION_S:
                    print(colors.success(f"✓ 已到达地面！位置: N={n:.2f}m E={e:.2f}m D={d:.2f}m"))
                    break
            else:
                stable_start = None
            
            # 定期报告进度
            if elapsed - last_report >= 2.0:
                print(colors.info(
                    f"降落中... 位置误差={pos_error:.2f}m, 速度={vel_magnitude:.2f}m/s, "
                    f"当前D={d:.2f}m, 目标D={ground_d:.2f}m"
                ))
                last_report = elapsed
        
        await asyncio.sleep(0.2)
    
    # 停止设定值任务
    await stop_task(landing_task, landing_stop)
    
    # 停止offboard模式（可能需要多次尝试）
    offboard_stopped = False
    for attempt in range(3):
        try:
            await drone.offboard.stop()
            print(colors.success("✓ offboard模式已停止"))
            offboard_stopped = True
            break
        except Exception as e:
            error_str = str(e)
            if "COMMAND_DENIED" in error_str or "Command Denied" in error_str:
                # 可能是已经停止了，或者需要等待
                if attempt < 2:
                    await asyncio.sleep(1.0)
                    continue
                else:
                    print(colors.warning(f"停止offboard模式被拒绝（可能已经停止）: {e}"))
            else:
                print(colors.warning(f"停止offboard模式失败: {e}"))
                break
    
    # 等待模式切换完成
    await asyncio.sleep(2.0)
    
    return True


async def disarm_drone(drone: System, timeout: float = 10.0) -> bool:
    """锁定无人机"""
    print(colors.info("\n" + "=" * 60))
    print(colors.info("步骤 6: 锁定无人机"))
    print(colors.info("=" * 60))
    
    try:
        # 先尝试切换到HOLD模式，确保不在offboard模式
        try:
            await drone.action.hold()
            await asyncio.sleep(2.0)  # 等待模式切换完成
            print(colors.info("已切换到HOLD模式"))
        except Exception as e:
            # 如果切换模式失败，继续尝试锁定
            error_str = str(e)
            if "COMMAND_DENIED" not in error_str and "Command Denied" not in error_str:
                print(colors.warning(f"切换模式失败: {e}，继续尝试锁定"))
            await asyncio.sleep(1.0)
        
        # 尝试锁定
        await drone.action.disarm()
        
        start = asyncio.get_event_loop().time()
        async for armed in drone.telemetry.armed():
            if not armed:
                print(colors.success("✓ 锁定成功！"))
                return True
            if asyncio.get_event_loop().time() - start > timeout:
                print(colors.error("锁定超时"))
                return False
            await asyncio.sleep(0.1)
        return False
    except Exception as e:
        print(colors.error(f"锁定失败: {e}"))
        return False


async def run():
    """主函数"""
    drone = System()
    stop_print = asyncio.Event()
    print_task = None
    setpoint_task = None
    setpoint_stop = None
    
    try:
        # 1. 连接
        if not await connect_drone(drone, CONNECTION_ADDRESS):
            return
        
        print_task = asyncio.create_task(print_position(drone, stop_print))
        
        # 2. 解锁
        armed, ground_pos = await arm_drone(drone)
        if not armed or not ground_pos:
            return
        
        ground_n, ground_e, ground_d = ground_pos
        
        # 3. 起飞
        success, setpoint_task, setpoint_stop, hover_n, hover_e, hover_d = await takeoff_to_altitude(
            drone, TAKEOFF_ALTITUDE_M, ground_d
        )
        if not success:
            print(colors.error("起飞失败"))
            try:
                await drone.offboard.stop()
                await drone.action.land()
            except Exception:
                pass
            return
        
        # 4. 悬停
        setpoint_task, setpoint_stop = await hover_at_position(
            drone, hover_n, hover_e, hover_d, HOVER_DURATION_S, setpoint_task, setpoint_stop
        )
        
        # 5. 降落
        await land_to_position(drone, ground_n, ground_e, ground_d, setpoint_task, setpoint_stop)
        
        # 6. 锁定
        await disarm_drone(drone)
        
        stop_print.set()
        await stop_task(print_task, None)
        
        print(colors.info("\n" + "=" * 60))
        print(colors.success("✓ 测试完成！"))
        print(colors.info("=" * 60))
        
    except KeyboardInterrupt:
        print(colors.warning("\n收到中断信号，紧急降落..."))
        await stop_task(setpoint_task, setpoint_stop)
        try:
            await drone.offboard.stop()
            await drone.action.land()
            await asyncio.sleep(5.0)
            await drone.action.disarm()
        except Exception:
            pass
    except Exception as e:
        print(colors.error(f"发生错误: {e}"))
        import traceback
        traceback.print_exc()
        await stop_task(setpoint_task, setpoint_stop)
        try:
            await drone.offboard.stop()
            await drone.action.land()
            await asyncio.sleep(5.0)
            await drone.action.disarm()
        except Exception:
            pass
    finally:
        stop_print.set()
        await stop_task(print_task, None)
        print(colors.info("正在清理资源..."))


if __name__ == "__main__":
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        print(colors.warning("\n程序已终止"))
