"""
DB 테이블 생성 및 샘플 데이터 입력 스크립트
"""
import os
from dotenv import load_dotenv
load_dotenv()

import oracledb
from datetime import datetime

# DB 연결 정보
DB_USER = os.getenv("ORACLE_USER", "lostfound")
DB_PASSWORD = os.getenv("ORACLE_PASSWORD", "secret")
DB_DSN = os.getenv("ORACLE_DSN", "localhost:1521/FREEPDB1")

def main():
    print("🔧 Oracle DB 연결 중...")
    
    # Oracle Instant Client 없이 Thin 모드로 연결
    connection = oracledb.connect(
        user=DB_USER,
        password=DB_PASSWORD,
        dsn=DB_DSN
    )
    
    cursor = connection.cursor()
    print("✅ DB 연결 성공!\n")
    
    # 1. 기존 테이블 삭제 (있다면)
    print("🗑️  기존 테이블 삭제 중...")
    try:
        cursor.execute("DROP TABLE ITEMS CASCADE CONSTRAINTS")
        print("   - ITEMS 테이블 삭제됨")
    except:
        print("   - ITEMS 테이블 없음 (정상)")
    
    try:
        cursor.execute("DROP SEQUENCE SEQ_ITEMS_ID")
        print("   - 시퀀스 삭제됨")
    except:
        print("   - 시퀀스 없음 (정상)")
    
    # 2. 시퀀스 생성
    print("\n📝 시퀀스 생성 중...")
    cursor.execute("""
        CREATE SEQUENCE SEQ_ITEMS_ID
        START WITH 1
        INCREMENT BY 1
        NOCACHE
        NOCYCLE
    """)
    print("✅ SEQ_ITEMS_ID 생성 완료")
    
    # 3. ITEMS 테이블 생성
    print("\n📝 ITEMS 테이블 생성 중...")
    cursor.execute("""
        CREATE TABLE ITEMS (
            ID NUMBER PRIMARY KEY,
            TITLE VARCHAR2(200) NOT NULL,
            DESCRIPTION VARCHAR2(2000),
            CATEGORY VARCHAR2(100),
            BRAND VARCHAR2(100),
            MODEL VARCHAR2(100),
            COLOR VARCHAR2(50),
            MATERIAL VARCHAR2(100),
            PATTERN VARCHAR2(100),
            SIZE_TEXT VARCHAR2(100),
            FEATURES VARCHAR2(400),
            ACCESSORIES VARCHAR2(200),
            SERIAL_MASKED VARCHAR2(100),
            STORED_LAT NUMBER,
            STORED_LNG NUMBER,
            STORED_ADDR VARCHAR2(300),
            STATUS VARCHAR2(20) DEFAULT 'STORED' NOT NULL,
            FINDER_USER_ID NUMBER,
            CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT CHK_STATUS CHECK (STATUS IN ('STORED', 'HANDED_OVER'))
        )
    """)
    print("✅ ITEMS 테이블 생성 완료")
    
    # 4. 트리거 생성 (자동 ID 할당)
    print("\n📝 트리거 생성 중...")
    cursor.execute("""
        CREATE OR REPLACE TRIGGER TRG_ITEMS_ID
        BEFORE INSERT ON ITEMS
        FOR EACH ROW
        BEGIN
            IF :NEW.ID IS NULL THEN
                SELECT SEQ_ITEMS_ID.NEXTVAL INTO :NEW.ID FROM DUAL;
            END IF;
        END;
    """)
    print("✅ TRG_ITEMS_ID 트리거 생성 완료")
    
    # 5. 샘플 데이터 입력
    print("\n📥 샘플 데이터 입력 중...")
    
    samples = [
        {
            'title': '검은색 지갑',
            'description': '루이비통 로고가 있는 검은색 남성용 장지갑입니다',
            'category': '지갑',
            'brand': '루이비통',
            'color': '검은색',
            'features': '카드 여러 장 들어있음, 학생증도 있음',
            'stored_addr': '강남역 3번 출구 안내 데스크',
            'status': 'STORED'
        },
        {
            'title': '갈색 가방',
            'description': 'MCM 백팩, 가죽 재질',
            'category': '가방',
            'brand': 'MCM',
            'color': '갈색',
            'features': '노트북 가방, 측면 포켓 있음',
            'stored_addr': '신사역 근처 편의점',
            'status': 'STORED'
        },
        {
            'title': '아이폰 14 Pro',
            'description': '보라색 아이폰, 케이스 씌워져 있음',
            'category': '핸드폰',
            'brand': 'Apple',
            'model': 'iPhone 14 Pro',
            'color': '보라색',
            'features': '뒷면에 스티커 붙어있음',
            'stored_addr': '역삼역 2번 출구',
            'status': 'STORED'
        },
        {
            'title': '삼성 갤럭시 버즈',
            'description': '흰색 무선 이어폰',
            'category': '이어폰',
            'brand': 'Samsung',
            'model': 'Galaxy Buds2',
            'color': '흰색',
            'features': '충전 케이스와 함께',
            'stored_addr': '선릉역 1번 출구 근처',
            'status': 'STORED'
        },
        {
            'title': '회사 출입증',
            'description': '카드 형태의 출입증',
            'category': '카드',
            'features': '바코드 있음',
            'stored_addr': '강남역 지하상가',
            'status': 'STORED'
        }
    ]
    
    for i, item in enumerate(samples, 1):
        cursor.execute("""
            INSERT INTO ITEMS (
                TITLE, DESCRIPTION, CATEGORY, BRAND, MODEL, COLOR,
                FEATURES, STORED_ADDR, STATUS
            ) VALUES (
                :title, :desc, :cat, :brand, :model, :color,
                :feat, :addr, :status
            )
        """, {
            'title': item['title'],
            'desc': item.get('description'),
            'cat': item.get('category'),
            'brand': item.get('brand'),
            'model': item.get('model'),
            'color': item.get('color'),
            'feat': item.get('features'),
            'addr': item['stored_addr'],
            'status': item['status']
        })
        print(f"   {i}. {item['title']} - 입력 완료")
    
    connection.commit()
    print("\n✅ 모든 샘플 데이터 입력 완료!")
    
    # 6. 데이터 확인
    print("\n📊 입력된 데이터 확인:")
    cursor.execute("SELECT ID, TITLE, BRAND, COLOR, CATEGORY, STORED_ADDR FROM ITEMS ORDER BY ID")
    
    print("\n" + "="*80)
    print(f"{'ID':<5} {'제목':<20} {'브랜드':<15} {'색상':<10} {'카테고리':<10}")
    print("="*80)
    
    for row in cursor:
        item_id, title, brand, color, category, addr = row
        print(f"{item_id:<5} {title:<20} {brand or 'N/A':<15} {color or 'N/A':<10} {category or 'N/A':<10}")
    
    print("="*80)
    
    cursor.close()
    connection.close()
    
    print("\n🎉 DB 설정 완료! 이제 API 서버를 실행하세요!")
    print("\n📝 다음 단계:")
    print("   cd apps/api")
    print("   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        print("\n💡 해결 방법:")
        print("   1. Oracle DB가 실행 중인지 확인")
        print("   2. .env 파일의 DB 설정 확인")
        print("   3. pip install oracledb 실행")
