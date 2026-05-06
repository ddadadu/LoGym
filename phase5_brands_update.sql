-- 1. equipment_brands 테이블 생성
CREATE TABLE IF NOT EXISTS equipment_brands (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name_ko TEXT NOT NULL,
  name_en TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. gym_equipments 및 infrastructure_requests 테이블 수정
ALTER TABLE gym_equipments 
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES equipment_brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS custom_brand_name TEXT;

ALTER TABLE infrastructure_requests
  ADD COLUMN IF NOT EXISTS equipment_brand_id UUID REFERENCES equipment_brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS custom_brand_name TEXT;

-- 3. 기초 데이터 초기화 (Seed Data)
INSERT INTO equipment_brands (name_ko, name_en, logo_url) VALUES 
('라이프 피트니스', 'Life Fitness', 'https://res.cloudinary.com/dhfbch1ya/image/upload/v1778054184/%EB%8B%A4%EC%9A%B4%EB%A1%9C%EB%93%9C_10_reaqez.png'),
('해머 스트렝스', 'Hammer Strength', 'https://res.cloudinary.com/dhfbch1ya/image/upload/v1778054183/%EB%8B%A4%EC%9A%B4%EB%A1%9C%EB%93%9C_7_idjfgt.png'),
('테크노짐', 'Technogym', 'https://res.cloudinary.com/dhfbch1ya/image/upload/v1778054182/%EB%8B%A4%EC%9A%B4%EB%A1%9C%EB%93%9C_1_kuogvz.png'),
('매트릭스', 'Matrix', 'https://res.cloudinary.com/dhfbch1ya/image/upload/v1778054184/%EB%8B%A4%EC%9A%B4%EB%A1%9C%EB%93%9C_11_b3vlgk.png'),
('싸이벡스', 'Cybex', 'https://res.cloudinary.com/dhfbch1ya/image/upload/v1778054183/%EB%8B%A4%EC%9A%B4%EB%A1%9C%EB%93%9C_6_e1iw4q.png'),
('파나타', 'Panatta', 'https://res.cloudinary.com/dhfbch1ya/image/upload/v1778054183/%EB%8B%A4%EC%9A%B4%EB%A1%9C%EB%93%9C_2_wrmrpv.png'),
('아스날 스트렝스', 'Arsenal Strength', 'https://res.cloudinary.com/dhfbch1ya/image/upload/v1778054183/%EB%8B%A4%EC%9A%B4%EB%A1%9C%EB%93%9C_8_mhntxy.png'),
('짐80', 'Gym80', 'https://res.cloudinary.com/dhfbch1ya/image/upload/v1778054183/%EB%8B%A4%EC%9A%B4%EB%A1%9C%EB%93%9C_9_xzy8kb.png'),
('프리코어', 'Precor', 'https://res.cloudinary.com/dhfbch1ya/image/upload/v1778054183/%EB%8B%A4%EC%9A%B4%EB%A1%9C%EB%93%9C_3_ifh8js.png'),
('뉴텍', 'Newtech', 'https://res.cloudinary.com/dhfbch1ya/image/upload/v1778054183/%EB%8B%A4%EC%9A%B4%EB%A1%9C%EB%93%9C_5_thztnv.png'),
('디랙스', 'DRAX', 'https://res.cloudinary.com/dhfbch1ya/image/upload/v1778054183/%EB%8B%A4%EC%9A%B4%EB%A1%9C%EB%93%9C_4_onayuz.png'),
('렉스코', 'Lexco', 'https://res.cloudinary.com/dhfbch1ya/image/upload/v1778054184/%EB%8B%A4%EC%9A%B4%EB%A1%9C%EB%93%9C_12_plk0hw.png');

-- 4. RLS 정책 설정
ALTER TABLE equipment_brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON equipment_brands;
CREATE POLICY "Enable read access for all users" ON equipment_brands
FOR SELECT USING (true);
