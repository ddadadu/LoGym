import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 프론트엔드 전역에서 접근할 수 있는 단일 Supabase 클라이언트 인스턴스 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
