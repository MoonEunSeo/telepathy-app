# 자체 호스팅 웹폰트

Google Fonts 가 서빙하던 woff2 를 그대로 가져왔다. **손으로 고치거나 개별 파일을 지우지 않는다.**

| 패밀리 | 굵기 | 파일 수 | 라이선스 |
|---|---|---:|---|
| Gowun Batang | 400 | 95 | [OFL-gowunbatang.txt](OFL-gowunbatang.txt) |
| Gowun Dodum | 400 | 95 | [OFL-gowundodum.txt](OFL-gowundodum.txt) |
| Judson | 400 · 700 | 6 | [OFL-judson.txt](OFL-judson.txt) |

세 폰트 모두 **SIL Open Font License 1.1** 이다. 재배포·웹 임베딩이 허용되며,
조건은 라이선스 파일 동봉과 폰트 파일 자체를 판매하지 않는 것이다.

Judson italic 은 코드에 사용처가 0건이라 받지 않았다.

파일명 뒤 번호는 `unicode-range` 조각 번호다. 어느 조각이 어떤 글자를 담는지는
[`src/fonts.css`](../../fonts.css) 의 `unicode-range` 에 있다.

받아오는 방법과 근거는 [docs/perf/s13-self-host-fonts](../../../../docs/perf/s13-self-host-fonts/README.md) 에 있다.
