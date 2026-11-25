export const formatWon = (value: number) => `${Math.round(value).toLocaleString()}원`;

/** 비율(0~1)을 백분율 문자열로 변환한다. 정수 비율은 소수점을 생략. 예: 0.015 -> "1.5%", 0.02 -> "2%" */
export const formatRate = (rate: number) =>
  `${(rate * 100).toFixed(1).replace(/\.0$/, "")}%`;
