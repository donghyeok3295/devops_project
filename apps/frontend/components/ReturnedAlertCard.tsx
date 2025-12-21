import React from "react";

type Props = {
  visible?: boolean;
  delta: number;
  title?: string;
  onConfirm: () => void;
};

export default function ReturnedAlertCard({ visible = true, delta, title, onConfirm }: Props) {
  if (!visible || delta <= 0) return null;

  const mainText =
    delta === 1 && title
      ? `‘${title}’이(가) 반환 완료 처리되었습니다`
      : `새 반환 완료 ${delta}건이 있습니다`;

  return (
    <section aria-label="반환 완료 알림">
      <div className="lf-card lf-alert-card">
        <div className="lf-alert-text">
          <div className="lf-alert-kicker">알림</div>
          <div className="lf-alert-title" title={mainText}>
            {mainText}
          </div>
          <div className="lf-alert-desc">내가 등록한 분실물의 반환 완료 기록입니다.</div>
        </div>
        <div className="lf-alert-actions">
          <button
            type="button"
            className="lf-alert-btn"
            onClick={onConfirm}
            aria-label="반환 완료 알림 확인하기"
          >
            확인하기
          </button>
        </div>
      </div>
    </section>
  );
}
