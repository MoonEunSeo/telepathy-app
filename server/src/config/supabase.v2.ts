import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';
import supabase from './supabase';

/**
 * 런타임 인스턴스는 config/supabase.ts 와 완전히 동일하다. 타입만 다르다.
 *
 * 기존 싱글톤에 직접 제네릭을 붙이면, 레거시 스키마를 조회하는
 * comment·user·payments·sp_payments·flush 가 전부 타입 에러가 난다.
 *
 * V2 스키마엔 그 테이블들이 없거나 구조가 다르기 때문이다.
 * 그래서 같은 인스턴스에 다른 타입을 씌운 창구를 따로 둔다.
 */
export default supabase as unknown as SupabaseClient<Database>;
