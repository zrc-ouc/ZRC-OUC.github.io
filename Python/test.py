import DrissionPage
import time
import random

Sign_URL = "https://yunwu.ai/login"

ACCOUNT = "zrc120"
PASSWORD = "Zrc1996"

def open_tncode_panel(tab):
    """
    用 JS 直接触发 #tncode 点击事件，并等待 #tncode_div 变为可见
    """
    result = tab.run_js("""
        const btn = document.querySelector('#tncode');
        if (!btn) return 'tncode_not_found';

        // 方式1：直接调用 click()
        btn.click();
        return 'clicked';
    """)
    print(f"[调试] JS click 结果: {result}")
    time.sleep(1.5)

    # 检查 #tncode_div 是否变为可见
    state = tab.run_js("""
        const div = document.querySelector('#tncode_div');
        if (!div) return 'not_found';
        const s = window.getComputedStyle(div);
        return {display: s.display, offsetW: div.offsetWidth, offsetH: div.offsetHeight};
    """)
    print(f"[调试] 点击后 #tncode_div 状态: {state}")

    if isinstance(state, dict) and state.get('display') != 'none':
        print("[调试] 面板已展开")
        return True

    # 方式2：JS click 无效，尝试触发所有绑定的事件监听器
    print("[调试] JS click 无效，尝试触发 mousedown/mouseup/click 事件链...")
    tab.run_js("""
        const btn = document.querySelector('#tncode');
        ['mousedown','mouseup','click'].forEach(type => {
            btn.dispatchEvent(new MouseEvent(type, {
                bubbles: true, cancelable: true, view: window
            }));
        });
    """)
    time.sleep(1.5)

    state2 = tab.run_js("""
        const div = document.querySelector('#tncode_div');
        const s = window.getComputedStyle(div);
        return {display: s.display, offsetW: div.offsetWidth, offsetH: div.offsetHeight};
    """)
    print(f"[调试] 事件链后 #tncode_div 状态: {state2}")

    if isinstance(state2, dict) and state2.get('display') != 'none':
        return True

    # 方式3：直接强制修改 display 并手动初始化验证码
    print("[调试] 尝试强制显示 #tncode_div...")
    tab.run_js("""
        const div = document.querySelector('#tncode_div');
        div.style.display = 'block';

        // 尝试调用 tncode 的内部初始化函数（常见命名）
        if (typeof tncode !== 'undefined' && typeof tncode.show === 'function') {
            tncode.show();
        }
        if (typeof TnCode !== 'undefined' && typeof TnCode.show === 'function') {
            TnCode.show();
        }
    """)
    time.sleep(1.0)

    state3 = tab.run_js("""
        const div = document.querySelector('#tncode_div');
        const block = document.querySelector('.slide_block');
        return {
            div_display: window.getComputedStyle(div).display,
            div_w: div.offsetWidth,
            block_w: block ? block.offsetWidth : 0,
            block_h: block ? block.offsetHeight : 0,
        };
    """)
    print(f"[调试] 强制显示后状态: {state3}")
    return isinstance(state3, dict) and state3.get('block_w', 0) > 0


def wait_slide_block_ready(tab, timeout=10):
    """等待 .slide_block 有真实尺寸"""
    deadline = time.time() + timeout
    while time.time() < deadline:
        info = tab.run_js("""
            const el = document.querySelector('.slide_block');
            if (!el) return null;
            return {w: el.offsetWidth, h: el.offsetHeight};
        """)
        if info and info['w'] > 0 and info['h'] > 0:
            print(f"[调试] slide_block 就绪: {info['w']}x{info['h']}px")
            return True
        time.sleep(0.4)
    return False

def cdp_drag(tab, start_x, start_y, distance, steps=30):
    """
    使用 CDP 底层事件模拟真实鼠标拖拽
    完整序列：mouseMoved → mousePressed → mouseMoved×N → mouseReleased
    """
    end_x = start_x + distance

    # Step1：先把鼠标移动到起点（不按下）
    tab.run_cdp('Input.dispatchMouseEvent', **{
        'type': 'mouseMoved',
        'x': start_x,
        'y': start_y,
        'button': 'none',
        'buttons': 0,
    })
    time.sleep(0.2)

    # Step2：在起点按下鼠标左键
    tab.run_cdp('Input.dispatchMouseEvent', **{
        'type': 'mousePressed',
        'x': start_x,
        'y': start_y,
        'button': 'left',
        'buttons': 1,
        'clickCount': 1,
    })
    time.sleep(0.15)

    # Step3：分步移动，缓入缓出模拟人手
    for i in range(1, steps + 1):
        p = i / steps
        eased = p * p * (3 - 2 * p)          # 缓入缓出
        cur_x = start_x + distance * eased
        cur_y = start_y + random.uniform(-1.5, 1.5)

        tab.run_cdp('Input.dispatchMouseEvent', **{
            'type': 'mouseMoved',
            'x': cur_x,
            'y': cur_y,
            'button': 'left',
            'buttons': 1,                     # 保持左键按下状态
        })
        time.sleep(random.uniform(0.012, 0.035))

    # 到终点后微调，模拟对准缺口
    time.sleep(0.1)
    tab.run_cdp('Input.dispatchMouseEvent', **{
        'type': 'mouseMoved',
        'x': end_x,
        'y': start_y,
        'button': 'left',
        'buttons': 1,
    })
    time.sleep(0.25)

    # Step4：释放鼠标
    tab.run_cdp('Input.dispatchMouseEvent', **{
        'type': 'mouseReleased',
        'x': end_x,
        'y': start_y,
        'button': 'left',
        'buttons': 0,
        'clickCount': 1,
    })


def pass_slide_verification(tab):
    max_attempts = 50
    distances = list(range(10, 215, 5))

    for attempt in range(1, max_attempts + 1):
        print(f"\n{'='*50}")
        print(f"[第 {attempt} 轮]")

        if not open_tncode_panel(tab):
            print("[错误] 面板未能打开，重试...")
            time.sleep(1)
            continue

        if not wait_slide_block_ready(tab):
            print("[错误] slide_block 无尺寸，重试...")
            continue

        # 获取实时坐标
        rect = tab.run_js("""
            const el = document.querySelector('.slide_block');
            const r  = el.getBoundingClientRect();
            return {x: r.left, y: r.top, w: r.width, h: r.height};
        """)
        print(f"[调试] slide_block 坐标: {rect}")

        if not rect or rect['w'] == 0:
            print("[错误] 坐标无效，重试...")
            continue

        # 起点取滑块左侧 1/4 处，更接近真实拖拽习惯
        start_x = rect['x'] + rect['w'] * 0.25
        start_y = rect['y'] + rect['h'] * 0.5

        for distance in distances:
            try:
                print(f"  → CDP拖拽 {distance}px", end="  ", flush=True)

                # ── 使用 CDP 底层事件拖拽 ────────────
                cdp_drag(tab, start_x, start_y, distance)
                time.sleep(0.8)  # 等待验证动画

                # ── 截图记录本次结果 ──────────────────
                # shot_path = f"./captcha_shots/r{attempt:02d}_d{distance:03d}.png"
                # tab.get_screenshot(path=shot_path)
                # print(f"截图已保存", end="  ", flush=True)

                # ── 检测验证结果 ──────────────────────
                passed = tab.run_js("""
                    const div = document.querySelector('#tncode_div');
                    if (!div) return 'gone';
                    const s   = window.getComputedStyle(div);
                    const blk = document.querySelector('.slide_block');
                    // 读取滑块当前 transform，判断是否已被拖动
                    const transform = blk ? blk.style.transform : '';
                    return {
                        div_display: s.display,
                        block_w:     blk ? blk.offsetWidth : -1,
                        transform:   transform,
                    };
                """)
                print(f"状态: {passed}")

                # 验证通过判断
                if passed == 'gone':
                    print(f"\n✅ 验证通过！distance={distance}px")
                    tab.get_screenshot(path="./captcha_shots/SUCCESS.png")
                    return True
                if isinstance(passed, dict):
                    if passed.get('div_display') == 'none':
                        print(f"\n✅ 验证通过！distance={distance}px")
                        tab.get_screenshot(path="./captcha_shots/SUCCESS.png")
                        return True
                    # 额外打印 transform 值，确认滑块确实被拖动了
                    print(f"     transform={passed.get('transform', 'N/A')}")

                time.sleep(0.5)  # 等滑块复位

            except Exception as e:
                print(f"\n[错误] {e}")
                time.sleep(0.5)
                break

    print(f"\n[失败] 达到最大尝试次数")
    tab.get_screenshot(path="./captcha_shots/FAILED.png")
    return False

def setup_toast_observer(tab):
    """注入 MutationObserver 实时捕获 Toast，只需调用一次"""
    tab.run_js("""
        if (window._toastObserverActive) return 'already_active';
        window._capturedToasts = [];
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    // 递归收集所有叶子节点文字
                    const collect = (el) => {
                        if (el.children.length === 0) {
                            const t = el.textContent.trim();
                            if (t.length > 0 && t.length < 100) {
                                window._capturedToasts.push({
                                    text: t,
                                    cls: el.className || '',
                                    ts: Date.now()
                                });
                            }
                        } else {
                            for (const child of el.children) collect(child);
                        }
                    };
                    collect(node);
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        window._toastObserver = observer;
        window._toastObserverActive = true;
        return 'started';
    """)


def get_captured_toasts(tab):
    """读取并清空已捕获的 Toast 列表"""
    result = tab.run_js("""
        const t = window._capturedToasts || [];
        window._capturedToasts = [];
        return t;
    """)
    return result or []


def open_captcha(tab):
    """打开验证码弹窗，并等待背景图和拼图块图片全部加载完成"""
    tab.ele('@class=w-7 h-7 rounded-full border-2 border-green-500 border-dashed flex items-center justify-center animate-pulse shadow-sm').click()

    # 等待两张图片都加载完成，最多等 10 秒
    timeout   = 10
    interval  = 1
    elapsed   = 0

    while elapsed < timeout:
        time.sleep(interval)
        elapsed += interval

        loaded = tab.run_js("""
            const bg    = document.querySelector('img[alt="captcha-bg"]');
            const thumb = document.querySelector('img[alt="captcha-thumb"]');
            if (!bg || !thumb) return { ok: false, reason: 'elements_not_found' };
            if (bg.naturalWidth === 0)    return { ok: false, reason: 'bg_not_loaded' };
            if (thumb.naturalWidth === 0) return { ok: false, reason: 'thumb_not_loaded' };
            return { ok: true, bg_w: bg.naturalWidth, thumb_w: thumb.naturalWidth };
        """)

        if loaded and loaded.get('ok'):
            print(f"  图片加载完成（bg={loaded['bg_w']}px, thumb={loaded['thumb_w']}px），耗时 {elapsed:.2f}s")
            return True

        print(f"  等待图片加载... {loaded.get('reason', '?')} ({elapsed:.2f}s)")

    print("  ⚠️ 图片加载超时，强制继续")
    return False



def close_captcha(tab):
    """关闭验证码弹窗"""
    try:
        tab.ele('@class=semi-icon semi-icon-default semi-icon-close').click()
        time.sleep(0.5)
    except:
        pass  # 弹窗已经关了就忽略


def drag_slider_to_value(tab, target_value):
    """用 CDP 鼠标事件拖拽滑块到指定 value"""
    slider_info = tab.run_js("""
        const s = document.querySelector('.gc-range');
        if (!s) return null;
        const r = s.getBoundingClientRect();
        return { x: r.left, y: r.top + r.height / 2, w: r.width };
    """)
    if not slider_info:
        return False

    slider_x = slider_info['x']
    slider_y = slider_info['y']
    slider_w = slider_info['w']
    max_val  = 343.6066666666667
    thumb_w  = 56
    usable_w = slider_w - thumb_w
    ratio    = usable_w / max_val

    start_x  = slider_x + thumb_w / 2
    target_x = slider_x + thumb_w / 2 + target_value * ratio

    # ease-in-out 轨迹，模拟人手拖拽
    steps  = 45
    points = []
    for i in range(steps + 1):
        t    = i / steps
        ease = t * t * (3 - 2 * t)
        px   = start_x + (target_x - start_x) * ease
        py   = slider_y + random.uniform(-0.8, 0.8)
        points.append((px, py))

    tab.run_cdp('Input.dispatchMouseEvent', type='mousePressed',
                x=start_x, y=slider_y, button='left', clickCount=1)
    time.sleep(0.05)
    for px, py in points:
        tab.run_cdp('Input.dispatchMouseEvent', type='mouseMoved',
                    x=px, y=py, button='left')
        time.sleep(random.uniform(0.007, 0.015))
    tab.run_cdp('Input.dispatchMouseEvent', type='mouseReleased',
                x=target_x, y=slider_y, button='left', clickCount=1)
    return True


def wait_for_toast(tab, timeout=2.5):
    """拖拽后轮询 Toast，返回捕获到的全部文字"""
    deadline = time.time() + timeout
    while time.time() < deadline:
        time.sleep(0.1)
        toasts = get_captured_toasts(tab)
        if toasts:
            return ' '.join(t.get('text', '') for t in toasts)
    return ''

def attempt_checkin(tab, max_attempts=80):
    """
    随机枚举签到：每次失败后关闭并重新打开验证码弹窗，
    重置次数限制，直到成功或达到最大尝试次数。
    """
    setup_toast_observer(tab)
    time.sleep(0.2)

    max_val = 343.6066666666667
    tried   = set()
    attempt = 0

    while attempt < max_attempts:
        attempt += 1
        print(f"\n=== 第 {attempt} 次尝试 ===")

        # 确认验证码弹窗已打开
        gc_exists = tab.run_js("return !!document.querySelector('.gc-range');")
        while not gc_exists:
            print("  弹窗未打开，尝试打开...")
            open_captcha(tab)
            time.sleep(1)
            gc_exists = tab.run_js("return !!document.querySelector('.gc-range');")

        # 随机选一个未试过的 value（每次重新打开弹窗后 tried 会被清空）
        remaining = [v for v in range(5, int(max_val) - 5) if v not in tried]
        if not remaining:
            # 理论上不会走到这里，但防御性处理
            tried.clear()
            remaining = list(range(5, int(max_val) - 5))
        v = random.choice(remaining)
        tried.add(v)

        print(f"  目标 value = {v}  (已试 {len(tried)} 个)")

        # 清空上次残留的 Toast
        get_captured_toasts(tab)

        # 执行拖拽
        ok = drag_slider_to_value(tab, v)
        tab.get_screenshot(path="./yunwu_shots/Drag.png")
        if not ok:
            print("  滑块元素消失，弹窗可能已关闭")
            open_captcha(tab)
            tried.clear()
            continue

        # 等待 Toast 结果：Toast: '人机验证通过'/'错误：验证失败'
        result_text = wait_for_toast(tab, timeout=2.5)
        print(f"  Toast: '{result_text}'")

        # 判断结果
        if '通过' in result_text:
            print("  ✅ 签到成功！")
            return True

        if '失败' in result_text or '错误' in result_text:
            # 验证失败：关闭 → 重新打开，重置次数限制
            print("  验证失败，关闭并重新打开验证码...")
            close_captcha(tab)
            tab.get_screenshot(path="./yunwu_shots/FAILED.png")
            open_captcha(tab)
            tab.get_screenshot(path="./yunwu_shots/Reopen.png")
            # 重新打开后图片会刷新，之前试过的 value 作废
            tried.clear()
            continue

        # Toast 为空：可能弹窗超时自动关闭了，重新打开
        print("  未捕获到 Toast，重新打开验证码...")
        close_captcha(tab)
        time.sleep(.5)
        open_captcha(tab)
        time.sleep(.5)
        tried.clear()

    print("达到最大尝试次数，签到失败")
    return False

#%%

co = DrissionPage.ChromiumOptions()
co.set_user_agent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.92 Safari/537.36')
co.set_pref('credentials_enable_service', False)
co.set_argument('--hide-crash-restore-bubble')
co.auto_port()
co.headless(True)
# 初始化浏览器
tab = DrissionPage.ChromiumPage(co)
print('初始化成功！')
tab.get(Sign_URL)
print('前往登陆页面！')
print(tab.rect.window_size)
time.sleep(10)
tab.set.window.size(1920, 1080)
print(tab.rect.window_size)
tab.get_screenshot()
tab.ele('@name=username').input(ACCOUNT)
print('输入用户名！')
tab.ele('@name=password').input(PASSWORD)
print('输入密码！')
tab.ele('@class=semi-checkbox-inner-display').click()
print('用户协议！')
tab.ele('@class=semi-button semi-button-primary semi-button-size-large semi-button-solid w-full !rounded-full gradient-btn').click()
print('登录！')
time.sleep(10)

tab.get_screenshot()
layout_data = tab.run_js('''
    function getLayoutInfo() {
        const elements = document.querySelectorAll('*');
        return Array.from(elements).map(el => {
            const rect = el.getBoundingClientRect();
            const styles = window.getComputedStyle(el);
            return {
                tag: el.tagName,
                id: el.id,
                class: el.className,
                rect: {
                    left: rect.left,
                    top: rect.top,
                    right: rect.right,
                    bottom: rect.bottom,
                    width: rect.width,
                    height: rect.height
                },
                display: styles.display,
                visibility: styles.visibility,
                position: styles.position
            };
        });
    }
    return getLayoutInfo();
''')
# 保存为 JSON 文件
import json
with open('layout_info.json', 'w', encoding='utf-8') as f:
    json.dump(layout_data, f, ensure_ascii=False, indent=2)
    
tab.ele('@class=w-7 h-7 rounded-full border-2 border-green-500 border-dashed flex items-center justify-center animate-pulse shadow-sm').click()
print('开始签到！')
result = attempt_checkin(tab)
print("签到结果：", result)
# 关闭浏览器
tab.quit()

#%%
# tab.get_screenshot()





