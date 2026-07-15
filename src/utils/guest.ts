// 게스트 신원 - 로그인 없이 랜던채팅에 참여하기 위한 로컬 임시 신원
import { v4 as uuidv4 } from 'uuid'
import type {Id, UserProfile} from '../types'
import { getStorage, setStorage } from '../types'

// 게스트 여부는 저장해둔 guestId 와 일치하는지로 판별한다.

// 게스트 id 가져오거나 (없으면) 생성해 영속
export function getOrCreateGuestId(): string {
    let id = getStorage("guestId")
    if (!id){
        id = uuidv4();
        setStorage('guestId', id)
    }
    return id
}

// 현재 프로필 id가 "내가 저장한 게스트 id"와 같으면 게스트
// 로그인 사용자의 서버 uuid 는 이 값과 절대 겹치지 않음
export function isGuestId(id: Id | undefined | null): boolean {
    if (id == null) return false
    const gid = getStorage('guestId')
    return gid != null && id === gid
}

export function getGuestNickname(): string | null {
    return getStorage('guestNickname')
}
export function setGuestNickname(nickname: string): void {
    setStorage('guestNickname', nickname)
}

// 게스트 프로필 조립 (닉네임 없으면 null -> 호출부에서 NicknameModal 유도)
export function buildGuestProfile(): UserProfile {
    const id = getOrCreateGuestId()
    return { userId: id as Id, username: id, nickname: getGuestNickname()}
}