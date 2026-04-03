import time
import re
import io # 추가됨: 메모리 파일 처리를 위해
import streamlit as st # 추가됨: 웹 UI 구성을 위해
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from docx import Document
from docx.shared import Pt, RGBColor
from docx.oxml.ns import qn

# ==========================================
def parse_time_to_seconds(time_str):
    """ '01:23' 형태의 문자열을 초(seconds) 단위로 변환 """
    try:
        parts = time_str.split(':')
        return int(parts[0]) * 60 + int(parts[1])
    except: return 999

def set_style(run, font_name="Malgun Gothic", size=13, bold=False, color_rgb=None):
    """ 워드 문서 폰트 서식 일괄 적용 """
    run.font.name = font_name
    run._element.rPr.rFonts.set(qn('w:eastAsia'), font_name)
    run.font.size = Pt(size)
    run.font.bold = bold
    if color_rgb:
        run.font.color.rgb = color_rgb

def clean_script(text):
    """ 해시태그 및 제보 안내 문구 정제 """
    text = re.sub(r'#\w+', '', text)
    if "연합뉴스TV 기사문의" in text:
        text = text.split("연합뉴스TV 기사문의")[0]
    return text.strip()

def click_more_button(driver, wait):
    """ 본문 '더보기' 버튼 자동 클릭 """
    try:
        btn = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "button[class*='button_more']")))
        driver.execute_script("arguments[0].click();", btn)
        time.sleep(0.5)
    except: pass

# ==========================================
# 2. 크롤링 핵심 모듈
# ==========================================

def get_mbc_anchors_study(driver, doc, target_count=3):
    """ [1] MBC 앵커멘트 수집 (<앵커멘트1>, <2>, <3>) """
    print("\n--- [1] 앵커멘트 수집 시작 ---")
    driver.get("https://tv.naver.com/imnews?tab=clip")
    time.sleep(3)

    target_links = []
    # 넉넉하게 링크 확보
    while len(target_links) < 10:
        items = driver.find_elements(By.CSS_SELECTOR, "a.ClipCardV2_link_thumbnail__NWYf1")
        for item in items:
            if len(target_links) >= 10: break
            try:
                sec = parse_time_to_seconds(item.find_element(By.CSS_SELECTOR, "span.ClipCardV2_playtime__IHYFQ").text)
                link = item.get_attribute("href")
                if 140 <= sec <= 170 and link not in target_links:
                    target_links.append(link)
            except: continue
        if len(target_links) >= 10: break
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)

    wait = WebDriverWait(driver, 5)
    success_count = 0

    for link in target_links:
        if success_count >= target_count: break
        driver.get(link)
        time.sleep(2)

        try:
            click_more_button(driver, wait)
            body = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "div.ArticleSection_scroll_wrap__ZaUDW"))).text.strip()

            # 필터링 및 절삭 로직
            if "◀ 앵커 ▶" not in body: continue

            # [수정됨] '◀ 리포트 ▶' 뿐만 아니라 '◀ 기자 ▶'도 기준점으로 삼아 절삭
            if "◀ 리포트 ▶" in body:
                body = body.split("◀ 리포트 ▶")[0]
            if "◀ 기자 ▶" in body:
                body = body.split("◀ 기자 ▶")[0]

            body = clean_script(re.sub(r'\[.*?\]', '', body).replace("◀ 앵커 ▶", ""))

            success_count += 1
            title_text = f"<앵커멘트1>" if success_count == 1 else f"<{success_count}>"

            p = doc.add_paragraph()
            run_title = p.add_run(title_text + "\n")
            set_style(run_title, size=14, bold=True, color_rgb=RGBColor(0, 112, 192))

            run_body = p.add_run(body)
            set_style(run_body, size=13)
            p.paragraph_format.line_spacing = 1.6
            p.paragraph_format.space_after = Pt(20)

            print(f"✅ {title_text} 완료")
        except: continue

def get_yonhap_shorts_study(driver, doc, target_count=5):
    """ [2] 연합뉴스 단신 및 무예독 수집 (<단신1~2>, <무예독1~3>) """
    print("\n--- [2] 단신 및 무예독 수집 시작 ---")
    driver.get("https://tv.naver.com/yonhapnewstv?tab=clip")
    time.sleep(3)

    target_links = []

    while len(target_links) < target_count:
        items = driver.find_elements(By.CSS_SELECTOR, "a.ClipCardV2_link_thumbnail__NWYf1")
        for item in items:
            if len(target_links) >= target_count: break
            try:
                title = item.get_attribute("aria-label")
                sec = parse_time_to_seconds(item.find_element(By.CSS_SELECTOR, "span.ClipCardV2_playtime__IHYFQ").text)
                link = item.get_attribute("href")
                # 속보는 단신 목록에서 제외
                if 40 <= sec <= 53 and "[속보]" not in title and link not in target_links:
                    target_links.append(link)
            except: continue
        if len(target_links) >= target_count: break
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)

    wait = WebDriverWait(driver, 5)
    for i, link in enumerate(target_links, 1):
        driver.get(link)
        try:
            click_more_button(driver, wait)
            body = clean_script(wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "div.ArticleSection_scroll_wrap__ZaUDW"))).text.strip())

            title_text = f"<단신{i}>" if i <= 2 else f"<무예독{i-2}>"

            p = doc.add_paragraph()
            run_title = p.add_run(title_text + "\n")
            set_style(run_title, size=14, bold=True, color_rgb=RGBColor(0, 112, 192))

            run_body = p.add_run(body)
            set_style(run_body, size=13)
            p.paragraph_format.line_spacing = 1.6
            p.paragraph_format.space_after = Pt(20)

            print(f"✅ {title_text} 완료")
        except: print(f"❌ {i}번 원고 추출 실패")

def add_placeholders(doc):
    """ [3] 방송 대본 타이핑용 템플릿(빈 공간) 생성 """
    print("\n--- [3] 방송 대본 템플릿 생성 ---")
    titles = ["<라디오>", "<MC>", "<스포츠>", "<기상>"]

    for title in titles:
        p = doc.add_paragraph()
        run_title = p.add_run(title + "\n")
        set_style(run_title, size=14, bold=True, color_rgb=RGBColor(0, 112, 192))

        run_body = p.add_run("[여기에 대본을 붙여넣으세요]")
        set_style(run_body, size=12)
        run_body.font.color.rgb = RGBColor(128, 128, 128)

        p.paragraph_format.space_after = Pt(30)
        print(f"✅ {title} 템플릿 추가 완료")

def get_breaking_news_yonhap(driver, doc, target_count=5):
    """ [4] 연합뉴스 TV에서 최신 속보만 별도로 수집 (꼬리표 완벽 제거 버전) """
    print(f"\n--- [4] 실시간 속보 헤드라인 수집 (목표: {target_count}개) ---")
    driver.get("https://tv.naver.com/yonhapnewstv?tab=clip")
    time.sleep(3)

    breaking_titles = []
    last_height = driver.execute_script("return document.body.scrollHeight")

    while len(breaking_titles) < target_count:
        items = driver.find_elements(By.CSS_SELECTOR, "a.ClipCardV2_link_thumbnail__NWYf1")
        for item in items:
            if len(breaking_titles) >= target_count: break
            try:
                title = item.get_attribute("aria-label")
                if "[속보]" in title:

                    # --- [추가된 꼬리표 제거 로직] ---
                    clean_title = title

                    # 1. '재생시간'이라는 단어가 있으면 그 뒷부분을 모두 날립니다.
                    if "재생시간" in clean_title:
                        clean_title = clean_title.split("재생시간")[0]

                    # 2. 혹시 '재생시간' 글자 없이 ' 13초', ' 1분 13초'만 남은 경우를 대비해
                    # 정규표현식으로 문장 맨 끝($)에 있는 시간 표시를 한 번 더 완벽히 지웁니다.
                    clean_title = re.sub(r'\s*\d+분\s*\d+초$', '', clean_title)
                    clean_title = re.sub(r'\s*\d+초$', '', clean_title)

                    # 양끝 공백 제거
                    clean_title = clean_title.strip()
                    # -------------------------------

                    if clean_title not in breaking_titles:
                        breaking_titles.append(clean_title)
                        print(f"🔥 속보 킵(Keep): {clean_title[:15]}...")
            except: continue

        if len(breaking_titles) >= target_count: break

        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)

        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            print("알림: 스크롤 끝에 도달했습니다. 찾은 속보까지만 작성합니다.")
            break
        last_height = new_height

    
    # 💡 [여기 수정됨!] 속보 줄바꿈 뭉개짐 해결 로직
    p_title = doc.add_paragraph()
    run_title = p_title.add_run("<속보>")
    set_style(run_title, size=14, bold=True, color_rgb=RGBColor(255, 0, 0))
    
    if not breaking_titles:
        p_err = doc.add_paragraph()
        run_error = p_err.add_run("현재 연합뉴스TV 채널에 최근 업로드된 속보가 없습니다.")
        set_style(run_error, size=13)
    else:
        for i, title in enumerate(breaking_titles, 1):
            p_item = doc.add_paragraph() # 한 문장에 하나씩 새로운 문단 생성
            run_body = p_item.add_run(f"{i}. {title}")
            set_style(run_body, size=13)
            p_item.paragraph_format.line_spacing = 1.6
            print(f"✅ 속보 {i}번 작성 완료")
            
# ==========================================

# ==========================================
# 3. Streamlit 웹페이지 UI 및 실행 컨트롤러
# ==========================================
def main():
    # 웹페이지 탭 제목 및 아이콘 설정
    st.set_page_config(page_title="아나운서 원고 자판기", page_icon="🎙️")
    
    st.title("🎙️ 오늘의 스터디 원고 자판기")
    st.markdown("클릭 한 번으로 **MBC 앵커멘트, 연합뉴스 단신, 실시간 속보**가 담긴 맞춤형 대본을 뽑아보세요.")
    st.info("💡 처음 오셨나요? 아래 버튼을 누르면 약 1~2분 뒤에 최신 원고가 생성됩니다.")

    # 사용자가 '생성하기' 버튼을 클릭했을 때만 아래 로직 실행
    if st.button("🚀 최신 스터디 원고 생성하기", type="primary"):
        
        # 로딩 스피너(빙글빙글 도는 UI) 표시
        with st.spinner("뉴스 채널을 돌며 최신 기사를 수집하고 있습니다. 잠시만 기다려주세요..."):
            try:
                # [수정됨] 크롬 브라우저를 백그라운드(화면 없이)에서 실행하기 위한 필수 옵션
                options = Options()
                options.add_argument("--headless=new") 
                options.add_argument("--no-sandbox")
                options.add_argument("--disable-dev-shm-usage")

                # 💡 [여기 추가됨!] 창 크기를 Full HD 모니터 꽉 차게 강제 설정하고, 윈도우 PC인 척 속입니다.
                options.add_argument("--window-size=1920,1080")
                options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                
                options.binary_location = "/usr/bin/chromium" 
                service = Service("/usr/bin/chromedriver")

                # 💡 [수정] 자동 다운로더(ChromeDriverManager)를 빼고, 위에서 지정한 service를 넣습니다.
                driver = webdriver.Chrome(service=service, options=options)
                # 문서 뼈대 만들기
                doc = Document()
                for sec in doc.sections:
                    sec.top_margin, sec.bottom_margin = Pt(40), Pt(40)
                    sec.left_margin, sec.right_margin = Pt(50), Pt(50)
                
                # 크롤링 함수 실행
                get_mbc_anchors_study(driver, doc, target_count=3)
                get_yonhap_shorts_study(driver, doc, target_count=5)
                add_placeholders(doc)
                get_breaking_news_yonhap(driver, doc, target_count=5)
                
                driver.quit()
                
                # [수정됨] 컴퓨터에 바로 저장하지 않고, 웹에서 다운로드할 수 있게 메모리에 담기
                bio = io.BytesIO()
                doc.save(bio)
                
                st.success("🎉 원고 작성이 완료되었습니다! 아래 버튼을 눌러 다운로드하세요.")
                
                # 짠! 다운로드 버튼 생성
                st.download_button(
                    label="📥 완성된 원고 다운로드 (.docx)",
                    data=bio.getvalue(),
                    file_name=f"Study_Scripts_{time.strftime('%Y%m%d')}.docx",
                    mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                )
                
            except Exception as e:
                st.error(f"❌ 원고 생성 중 오류가 발생했습니다: {e}")
                if 'driver' in locals():
                    driver.quit()

if __name__ == "__main__":
    main()