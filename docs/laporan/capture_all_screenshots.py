#!/usr/bin/env python3
"""
Agrinex Weather Station - Comprehensive UI Screenshot Automation
Captures all distinct UI screens, views, tabs, and modals using headless Chrome.
"""

import os
import time
from playwright.sync_api import sync_playwright

ASSETS_DIR = "/home/ghiffa/Documents/Projects_IoT/PlatformIO_Workspace/weather-station-agrinex/docs/laporan/assets"
os.makedirs(ASSETS_DIR, exist_ok=True)

TARGET_URL = "https://web-vert-tau-abafcrdbgk.vercel.app"
CHROME_PATH = "/home/ghiffa/.local/bin/google-chrome"

def capture_all():
    print(f"Connecting to {TARGET_URL} with Playwright Chrome...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROME_PATH,
            headless=True,
            args=['--no-sandbox', '--disable-gpu', '--window-size=1440,960']
        )
        
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()
        
        # 1. SCREENSHOT 01: Login Page
        page.goto(TARGET_URL)
        page.evaluate("() => { localStorage.clear(); sessionStorage.clear(); }")
        page.goto(TARGET_URL)
        page.wait_for_selector("input[type='password']", timeout=10000)
        time.sleep(1)
        p1 = os.path.join(ASSETS_DIR, "ui_01_login_page.png")
        page.screenshot(path=p1, full_page=False)
        print(f"[OK] 01 Login: {p1}")
        
        # 2. SCREENSHOT 02: Onboarding Wizard (Single-card 5-step)
        page.evaluate("""() => {
            const adminUser = {
                uid: 'station-usr-admin',
                email: 'admin@agrinex.id',
                displayName: 'Haikal Jibran Al-Ghiffarry',
                role: 'Administrator',
                stationAccess: 'Stasiun Kuningan (ESP32-01)',
                loginTime: new Date().toISOString(),
                isDemo: false
            };
            const session = {
                user: adminUser,
                token: 'mock-token-' + Date.now(),
                expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000)
            };
            localStorage.setItem('agrinex_auth_session', JSON.stringify(session));
            localStorage.setItem('agrinex_auth_user', JSON.stringify(adminUser));
            localStorage.removeItem('agrinex_onboarding_completed');
        }""")
        page.goto(TARGET_URL)
        time.sleep(2)
        p2 = os.path.join(ASSETS_DIR, "ui_02_onboarding_wizard.png")
        page.screenshot(path=p2, full_page=False)
        print(f"[OK] 02 Onboarding Wizard: {p2}")

        # Set persistent full login & completed onboarding for main views
        page.evaluate("""() => {
            localStorage.setItem('agrinex_onboarding_completed', 'true');
        }""")
        page.goto(TARGET_URL)
        page.wait_for_selector("nav", timeout=10000)
        time.sleep(2)

        # 3. SCREENSHOT 03: Dashboard Overview
        page.click("button:has-text('Dashboard')")
        time.sleep(1.5)
        p3 = os.path.join(ASSETS_DIR, "ui_03_dashboard_overview.png")
        page.screenshot(path=p3, full_page=False)
        print(f"[OK] 03 Dashboard Overview: {p3}")

        # 4. SCREENSHOT 04: Dashboard Extremes & Forecast Matrix
        page.evaluate("window.scrollTo(0, 550)")
        time.sleep(1)
        p4 = os.path.join(ASSETS_DIR, "ui_04_dashboard_extremes_and_forecast.png")
        page.screenshot(path=p4, full_page=False)
        print(f"[OK] 04 Dashboard Extremes & Forecast: {p4}")

        # 5. SCREENSHOT 05: Dashboard Telemetry Log Table
        page.evaluate("window.scrollTo(0, 1150)")
        time.sleep(1)
        p5 = os.path.join(ASSETS_DIR, "ui_05_dashboard_telemetry_table.png")
        page.screenshot(path=p5, full_page=False)
        print(f"[OK] 05 Dashboard Telemetry Table: {p5}")

        # 6. SCREENSHOT 06: Chart Trends
        page.evaluate("window.scrollTo(0, 350)")
        time.sleep(1)
        p6 = os.path.join(ASSETS_DIR, "ui_06_chart_trends.png")
        page.screenshot(path=p6, full_page=False)
        print(f"[OK] 06 Chart Trends: {p6}")

        # 7. SCREENSHOT 07: Analytics View - KPI Grid
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(0.5)
        page.click("button:has-text('Analisis'), button:has-text('Analitik')")
        time.sleep(2)
        p7 = os.path.join(ASSETS_DIR, "ui_07_analytics_kpi_overview.png")
        page.screenshot(path=p7, full_page=False)
        print(f"[OK] 07 Analytics KPI: {p7}")

        # 8. SCREENSHOT 08: Analytics View - AgroClimate Advisory Panel
        page.evaluate("window.scrollTo(0, 600)")
        time.sleep(1)
        p8 = os.path.join(ASSETS_DIR, "ui_08_analytics_advisory_panel.png")
        page.screenshot(path=p8, full_page=False)
        print(f"[OK] 08 Analytics Advisory: {p8}")

        # 9. Settings View Tabs
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(0.5)
        page.click("button:has-text('Pengaturan'), button:has-text('Settings')")
        time.sleep(2)

        # Tab 1: Modul & Pinout
        tab1 = page.query_selector("button:has-text('1. Modul')")
        if tab1:
            tab1.click()
            time.sleep(1.2)
            p10 = os.path.join(ASSETS_DIR, "ui_10_settings_tab1_modules.png")
            page.screenshot(path=p10, full_page=False)
            print(f"[OK] 10 Settings Tab 1 Modules: {p10}")

        # Tab 2: Backend & Protocol
        tab2 = page.query_selector("button:has-text('2. Backend')")
        if tab2:
            tab2.click()
            time.sleep(1.2)
            p11 = os.path.join(ASSETS_DIR, "ui_11_settings_tab2_backend.png")
            page.screenshot(path=p11, full_page=False)
            print(f"[OK] 11 Settings Tab 2 Backend: {p11}")

        # Tab 3: Sync & WiFi Network
        tab3 = page.query_selector("button:has-text('3. Sinkron')")
        if tab3:
            tab3.click()
            time.sleep(1.2)
            p12 = os.path.join(ASSETS_DIR, "ui_12_settings_tab3_sync.png")
            page.screenshot(path=p12, full_page=False)
            print(f"[OK] 12 Settings Tab 3 Sync: {p12}")

        # Tab 4: Export Center
        tab4 = page.query_selector("button:has-text('4. Ekspor')")
        if tab4:
            tab4.click()
            time.sleep(1.2)
            p13 = os.path.join(ASSETS_DIR, "ui_13_settings_tab4_export.png")
            page.screenshot(path=p13, full_page=False)
            print(f"[OK] 13 Settings Tab 4 Export: {p13}")

        # Tab 5: Inline User Management
        tab5 = page.query_selector("button:has-text('5. Pengguna')")
        if tab5:
            tab5.click()
            time.sleep(1.2)
            p14 = os.path.join(ASSETS_DIR, "ui_14_settings_tab5_users.png")
            page.screenshot(path=p14, full_page=False)
            print(f"[OK] 14 Settings Tab 5 Users: {p14}")

        # Diagnostics Modal (Click "Cek Modul" at the very end)
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(0.5)
        diag_btn = page.query_selector("button:has-text('Cek Modul')")
        if diag_btn:
            diag_btn.click()
            time.sleep(2)
            p_diag = os.path.join(ASSETS_DIR, "ui_09_module_diagnostics_modal.png")
            page.screenshot(path=p_diag, full_page=False)
            print(f"[OK] 09 Module Diagnostics Modal: {p_diag}")

        browser.close()
        print("All UI screenshots captured successfully!")

if __name__ == "__main__":
    capture_all()
