# Supabase 사용 규약


## ⚠️ 에러는 예외가 아니라 반환값이다

`supabase-js`는 DB 오류를 **throw하지 않고 `{ data, error }`로 반환**한다.
`error`를 확인하지 않으면 `try/catch`가 있어도 **조용히 실패**한다.

```ts
// ❌ 실패해도 아무 일도 일어나지 않음
await supabase.from('t').insert([row]);

// ✅
const { error } = await supabase.from('t').insert([row]);
if (error) console.error('insert 실패:', error.message, row);
```

## null 비교

SQL 3값 논리 때문에 `= NULL`은 참이 될 수 없다. `.eq()`로는 null을 못 잡는다.

```ts
query.eq('partner_id', null)     // ❌ 항상 매칭 실패
query.is('partner_id', null)     // ✅ IS NULL
```

## 기타

- 조회는 필요한 컬럼만 `.select('id, word, …')` — **수정 대상을 특정하려면 `id`를 반드시 포함**한다.
- 0/1건 조회는 `.maybeSingle()` (`single()`은 0건일 때 에러).
- 사용자 소유 리소스 수정은 **반드시 소유권 필터**를 함께 건다 (IDOR 방지).
  ```ts
  .update(patch).eq('id', id).eq('user_id', userId)
  ```
- 요청 바디(camelCase)와 DB 컬럼(snake_case)은 **다른 계약**이다.
  라우트에서 필드를 하나씩 옮기며 변환한다 — `req.body`를 통째로 넘기면
  클라이언트가 임의 컬럼을 덮어쓸 수 있다(mass assignment).

